import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from "../../config/db";
import { journalEmbeddingSchema } from "./validators/journalEmbeddings";
import { journalEntrySchema } from './validators/journalEntry';
import { getPromptSchema } from './validators/getPrompt';
import { analyzeEmotions, generateEmbeddings, emotionAnalysisAndGeneratePrompt, generateGeminiPrompt } from '../../utils/geminiHelpers';
import { z } from "zod";

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

// Fixed and consolidated controller functions
export const createOrUpdateJournalEntry: RequestHandler = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Extract required fields from the request body
    const { userId, entryText } = req.body;
    // Use full ISO timestamp (including time) so that each entry is unique even on the same day.
    const entryDate = new Date().toISOString();
    console.log(entryDate);    
    if (!userId || !entryText || !entryDate) {
      res.status(400).json({ error: "Missing required fields: userId, entryText, entry_date" });
      return;
    }
    console.log("Entry Text:", entryText);
    
    // For the prototype, we'll use an empty array for emotion_labels
    const emotion_labels: string[] = [];

    // Use a plain INSERT to allow multiple entries on the same day
    const insertJournalQuery = `
      INSERT INTO journal_entries (user_id, entry_text, emotion_labels, entry_date)
      VALUES ($1, $2, $3, $4)
      RETURNING journal_id;
    `;
    const insertJournalParams = [userId, entryText.trim(), emotion_labels, entryDate];
    const journalInsertResult = await client.query(insertJournalQuery, insertJournalParams);
    const journalId = journalInsertResult.rows[0].journal_id;
    console.log("Insert Parameters:", insertJournalParams);

    // Generate embeddings for the entry text
    const vectorEmbeddings = await generateEmbeddings(entryText);
    // Convert the embedding array into a format accepted by the vector column.
    // (If your PostgreSQL driver accepts arrays for the vector type, you might be able to pass vectorEmbeddings directly.)
    const vectorString = `[${vectorEmbeddings.join(',')}]`;

    // Upsert the embedding into the journal_embeddings table using journal_id as the unique key.
    const upsertEmbeddingQuery = `
      INSERT INTO journal_embeddings (journal_id, embedding)
      VALUES ($1, $2::vector)
      ON CONFLICT(journal_id)
      DO UPDATE SET embedding = EXCLUDED.embedding;
    `;
    await client.query(upsertEmbeddingQuery, [journalId, vectorString]);

    await client.query("COMMIT");
    res.status(200).json({ message: "Success", journalId });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};


// Remove duplicate controller functions - ensure this is only declared once in the file


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
