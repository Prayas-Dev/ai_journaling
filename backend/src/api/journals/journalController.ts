import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from "../../config/db";
import { journalEmbeddingSchema } from "./validators/journalEmbeddings";
import { journalEntrySchema } from './validators/journalEntry';
import { getPromptSchema } from './validators/getPrompt';
import { journalChatSchema } from './validators/journalChat';
import { generateImageFromJournalEntry,getGeminiResponse,analyzeEmotions, generateEmbeddings, emotionAnalysisAndGeneratePrompt, generateGeminiPrompt } from '../../utils/geminiHelpers';
import { z } from "zod";
import fs from 'fs/promises';
import path from 'path';

export const createJournalChat: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { entry_text, mode, user_uuid, conversation_id } = journalChatSchema.parse(req.body);
    console.log(mode);
    const chatHistoryResult = await pool.query(
      `SELECT sender, message_text FROM journal_messages WHERE user_uuid = $1 ORDER BY created_at DESC LIMIT 5`,
      [user_uuid]
    );

    const chatHistoryText = chatHistoryResult.rows
      .map((chat: { sender: string, message_text: string }) => `${chat.sender}: ${chat.message_text}`)
      .join("\n");

    const aiReply = await getGeminiResponse(entry_text, mode, chatHistoryText);

    await pool.query(
      `INSERT INTO journal_messages (user_uuid, conversation_id, sender, message_text, mode) VALUES ($1, $2, $3, $4, $5)`,
      [user_uuid, conversation_id, "user", entry_text, mode]
    );
    await pool.query(
      `INSERT INTO journal_messages (user_uuid, conversation_id, sender, message_text, mode) VALUES ($1, $2, $3, $4, $5)`,
      [user_uuid, conversation_id, "ai", aiReply, mode]
    );

    res.status(200).json({ response_text: aiReply });
  } catch (error) {
    console.error("Error in createJournalChat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Existing getPrompt function (unchanged)
export const getPrompt: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const result = getPromptSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid input", details: result.error.errors });
      return;
    }
    const { entryText } = result.data;
    const geminiPrompt = await generateGeminiPrompt(entryText);
    res.status(200).json({ prompt: geminiPrompt });
  } catch (error) {
    next(error);
  }
};

// New endpoint: Get all journal entries for a given user
export const getAllJournalEntries: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    const result = await pool.query(
      `
      SELECT journal_id, entry_text, entry_date
      FROM journal_entries
      WHERE user_id = $1
      ORDER BY entry_date DESC;
      `,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching all journal entries:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// New endpoint: Search journal entries using hybrid search
export const searchJournalEntries: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;
    const searchQuery = req.query.query;
    if (!userId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    if (!searchQuery || typeof searchQuery !== 'string') {
      res.status(400).json({ error: "Valid query parameter is required" });
      return;
    }

    const queryEmbedding = await generateEmbeddings(searchQuery);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    const result = await pool.query(
      `
      WITH keyword_search AS (
        SELECT 
          journal_id, 
          entry_text,
          entry_date,
          0 AS similarity
        FROM journal_entries
        WHERE user_id = $1
          AND entry_text ILIKE '%' || $2 || '%'
        LIMIT 5
      ),
      semantic_search AS (
        SELECT 
          journal_entries.journal_id, 
          journal_entries.entry_text,
          journal_entries.entry_date,
          journal_embeddings.embedding <=> $3::vector AS similarity
        FROM journal_entries
        JOIN journal_embeddings ON journal_entries.journal_id = journal_embeddings.journal_id
        WHERE journal_entries.user_id = $1
        ORDER BY similarity ASC
        LIMIT 5
      ),
      combined AS (
        SELECT * FROM keyword_search
        UNION ALL
        SELECT * FROM semantic_search
      )
      SELECT 
        journal_id, 
        entry_text,
        entry_date,
        MIN(similarity) AS similarity
      FROM combined
      GROUP BY journal_id, entry_text, entry_date
      ORDER BY similarity ASC
      LIMIT 5;
      `,
      [userId, searchQuery, embeddingString]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error in hybrid search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const splitIntoSentences = (text: string): string[] => {
  return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+(?=[A-Z])/);
};


export const createOrUpdateJournalEntry: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { userId, entryText, journalId } = req.body;
    const entryDate = new Date().toISOString();
    let createdAtTimestamp: number;
    let existingJournalId: number | null = null;
    let isNewEntry = false;

    if (!userId || !entryText) {
      res.status(400).json({ error: "Missing required fields: userId and entryText" });
      return;
    }

    const emotion_labels: string[] = [];

    if (journalId) {
      existingJournalId = parseInt(journalId, 10);
      const existingJournalResult = await client.query(
        `SELECT entry_date FROM journal_entries WHERE journal_id = $1 AND user_id = $2`,
        [existingJournalId, userId]
      );
      if (existingJournalResult.rows.length > 0) {
        createdAtTimestamp = new Date(existingJournalResult.rows[0].entry_date).getTime();
        await client.query(`DELETE FROM journal_entry_chunks WHERE journal_id = $1`, [existingJournalId]);
        const updateJournalQuery = `
          UPDATE journal_entries
          SET entry_text = $1, last_modified = NOW(), image_path = NULL -- Reset image path on update
          WHERE journal_id = $2 AND user_id = $3
          RETURNING entry_date;
        `;
        const updateResult = await client.query(updateJournalQuery, [entryText.trim(), existingJournalId, userId]);
        if (updateResult.rowCount === 0) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Journal entry not found or does not belong to the user." });
          return;
        }
      } else {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Journal entry not found." });
        return;
      }
    } else {
      isNewEntry = true;
      const insertJournalQuery = `
        INSERT INTO journal_entries (user_id, entry_text, emotion_labels, entry_date)
        VALUES ($1, $2, $3, $4)
        RETURNING journal_id, entry_date;
      `;
      const journalInsertResult = await client.query(insertJournalQuery, [userId, entryText.trim(), emotion_labels, entryDate]);
      existingJournalId = journalInsertResult.rows[0].journal_id;
      createdAtTimestamp = new Date(journalInsertResult.rows[0].entry_date).getTime();
    }

    if (existingJournalId !== null) {
      const sentences = splitIntoSentences(entryText);
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (sentence) {
          try {
            const vectorEmbeddings = await generateEmbeddings(sentence);
            const vectorString = `[${vectorEmbeddings.join(',')}]`;
            const insertChunkQuery = `
              INSERT INTO journal_entry_chunks (journal_id, chunk_index, chunk_text, embedding)
              VALUES ($1, $2, $3, $4::vector);
            `;
            await client.query(insertChunkQuery, [existingJournalId, i, sentence, vectorString]);
          } catch (embeddingError) {
            console.error("Error generating embedding for chunk:", sentence, embeddingError);
            // Decide how to handle embedding errors: skip the chunk, rollback, etc.
            // For now, we'll log the error and continue.
          }
        }
      }

      // Generate and store the image
      const imagePath = await generateImageFromJournalEntry(entryText, existingJournalId.toString()); // Pass journalId

      if (imagePath) {
        const updateImagePathQuery = `
          UPDATE journal_entries
          SET image_path = $1
          WHERE journal_id = $2;
        `;
        await client.query(updateImagePathQuery, [imagePath, existingJournalId]);
      }
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Success", journalId: existingJournalId });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};


export const deleteJournalEntry: RequestHandler = async (req, res, next): Promise<void> => {
  const client = await pool.connect();
  try {
    const entryDate = req.params.date;
    if (!entryDate) {
      res.status(400).json({ message: "Entry date is required" });
      return;
    }
    await client.query('BEGIN');
    const deleteJournalEntryQuery = `
      DELETE FROM journal_entries WHERE entry_date = $1 CASCADE;
    `;
    await client.query(deleteJournalEntryQuery, [entryDate]);
    await client.query('COMMIT');
    res.status(200).json({ message: "Journal entry deleted successfully" });
  } catch (error: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: "Failed to delete journal entry", error: error.message });
  } finally {
    client.release();
  }
};

export const getJournalEntryById: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;
    const journalId = req.params.journalId;

    if (!userId || !journalId) {
      res.status(400).json({ error: "User ID and Journal ID are required" });
      return;
    }

    const result = await pool.query(
      `
      SELECT journal_id, entry_text, entry_date
      FROM journal_entries
      WHERE user_id = $1 AND journal_id = $2;
      `,
      [userId, journalId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Journal entry not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching journal entry by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

