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
    // Validate and extract request body using your schema
    const { entry_text, mode, user_uuid, conversation_id } = journalChatSchema.parse(req.body);

    // Generate embedding for semantic search and format it as a string for SQL
    const queryEmbedding = await generateEmbeddings(entry_text);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Extract keywords from input for flexible substring matching
    const keywords =
      entry_text.toLowerCase().match(/\w+/g)?.filter((w) => w.length > 2) || [];
    // Dynamically build ILIKE conditions for full-text search on journal_entries
    const keywordConditions =
      keywords.length > 0
        ? keywords
            .map((_, i) => `entry_text ILIKE '%' || $${i + 2} || '%'`)
            .join(" OR ")
        : "FALSE";

    // Build query values:
    // $1: user_id for both semantic and keyword search,
    // $2...: keywords,
    // Last parameter: the embeddingString.
    const queryValues = [user_uuid, ...keywords, embeddingString];

    // Hybrid search: semantic search on chunks (with cosine similarity) and keyword search on full entries.
    // The keyword search is assigned a fallback similarity value of 1.5.
    const journalContextResult = await pool.query(
      `
      WITH semantic_search AS (
        SELECT 
          journal_id,
          MIN(embedding <-> $${queryValues.length}::vector) AS similarity
        FROM journal_entry_chunks
        WHERE journal_id IN (
          SELECT journal_id FROM journal_entries WHERE user_id = $1
        )
        GROUP BY journal_id
        ORDER BY similarity ASC
        LIMIT 3
      ),
      keyword_search AS (
        SELECT
          journal_id,
          1.5 AS similarity
        FROM journal_entries
        WHERE user_id = $1
          AND (${keywordConditions})
        LIMIT 3
      ),
      combined AS (
        SELECT * FROM semantic_search
        UNION
        SELECT * FROM keyword_search
      )
      SELECT
        je.journal_id,
        je.entry_text,
        je.entry_date,
        je.image_path,
        MIN(similarity) AS similarity
      FROM combined
      JOIN journal_entries je ON combined.journal_id = je.journal_id
      GROUP BY je.journal_id, je.entry_text, je.entry_date, je.image_path
      ORDER BY similarity ASC
      LIMIT 3;
      `,
      queryValues
    );

    console.log("Journal Context Result:", journalContextResult.rows);


    // Format the retrieved journal entries as context text
    const relevantEntries = journalContextResult.rows
      .map(
        (entry: { entry_text: string; entry_date: string }) =>
          `- (${entry.entry_date}): ${entry.entry_text}`
      )
      .join("\n");

    const journalContext = relevantEntries
      ? `Here are some of your previous journal entries that might be relevant:\n${relevantEntries}\n\n`
      : "";

    // Fetch recent chat history to provide context
    const chatHistoryResult = await pool.query(
      `SELECT sender, message_text FROM journal_messages WHERE user_uuid = $1 ORDER BY created_at DESC LIMIT 5`,
      [user_uuid]
    );

    const chatHistoryText = chatHistoryResult.rows
      .map(
        (msg: { sender: string; message_text: string }) =>
          `${msg.sender}: ${msg.message_text}`
      )
      .join("\n");

    // Generate AI reply using your Gemini API (or similar)
    const aiReply = await getGeminiResponse(
      `${journalContext}User: ${entry_text}\n\nAI (Keep it brief and to the point):`,
      mode,
      chatHistoryText
    );

    // Store both the user and AI messages
    const insertMessage = `
      INSERT INTO journal_messages (user_uuid, conversation_id, sender, message_text, mode)
      VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(insertMessage, [user_uuid, conversation_id, "user", entry_text, mode]);
    await pool.query(insertMessage, [user_uuid, conversation_id, "ai", aiReply, mode]);

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

    // Tokenize search query into keywords (e.g., "feeling gloomy today" => ['feeling', 'gloomy', 'today'])
    const keywords =
      searchQuery.toLowerCase().match(/\w+/g)?.filter((w) => w.length > 2) || [];

    // Dynamically build ILIKE conditions for full-text search on journal entries
    const keywordConditions =
      keywords.length > 0
        ? keywords
            .map((_, idx) => `entry_text ILIKE '%' || $${idx + 3} || '%'`)
            .join(" OR ")
        : "FALSE";

    // Generate embedding for the search query and format it as a string
    const queryEmbedding = await generateEmbeddings(searchQuery);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Build query values:
    // $1: embeddingString for semantic search
    // $2: userId for both semantic and keyword search
    // $3...: keywords for the text search conditions
    const queryValues = [embeddingString, userId, ...keywords];

    // Run a combined query: semantic search on chunks and text search on full entries.
    // Here, keyword_search assigns a fallback similarity value of 1.5.
    const result = await pool.query(
      `
      WITH semantic_search AS (
        SELECT 
          journal_id,
          MIN(embedding <-> $1::vector) AS similarity
        FROM journal_entry_chunks
        WHERE journal_id IN (
          SELECT journal_id FROM journal_entries WHERE user_id = $2
        )
        GROUP BY journal_id
        ORDER BY similarity ASC
        LIMIT 5
      ),
      keyword_search AS (
        SELECT 
          journal_id,
          1.5 AS similarity
        FROM journal_entries
        WHERE user_id = $2
          AND (${keywordConditions})
        LIMIT 5
      ),
      combined AS (
        SELECT * FROM semantic_search
        UNION
        SELECT * FROM keyword_search
      )
      SELECT 
        je.journal_id, 
        je.entry_text,
        je.entry_date,
        MIN(similarity) AS similarity
      FROM combined
      JOIN journal_entries je ON combined.journal_id = je.journal_id
      GROUP BY je.journal_id, je.entry_text, je.entry_date
      ORDER BY similarity ASC
      LIMIT 5;
      `,
      queryValues
    );

    console.log(result.rows);

    // Optionally, log the results for debugging
    console.log("Search Query Embedding:", embeddingString);
    console.log("Keyword Conditions:", keywordConditions);
    console.log("Hybrid Search Results:", result.rows);

    res.json(result.rows);
  } catch (error) {
    console.error("Error in hybrid search:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


const splitIntoSentences = (text: string): string[] => {
  return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|!)\s+(?=[A-Z])/);
};


export const createOrUpdateJournalEntry: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { userId, entryText, journalId } = req.body;
    const entryDate = new Date().toISOString();
    let createdAtTimestamp: number;
    let existingJournalId: number | null = null;
    let isNewEntry = false;

    if (!userId || !entryText) {
      res
        .status(400)
        .json({ error: "Missing required fields: userId and entryText" });
      return;
    }

    // We'll eventually store emotion analysis in our response.
    let emotionAnalysisResults: { emotion: string; emoji: string }[] = [];
    // This will be the array of valid emotion labels to store in the DB.
    let emotionLabels: string[] = [];

    if (journalId) {
      existingJournalId = parseInt(journalId, 10);
      const existingJournalResult = await client.query(
        `SELECT entry_date FROM journal_entries WHERE journal_id = $1 AND user_id = $2`,
        [existingJournalId, userId]
      );
      if (existingJournalResult.rows.length > 0) {
        createdAtTimestamp = new Date(
          existingJournalResult.rows[0].entry_date
        ).getTime();
        // Delete existing entry chunks so that we can reinsert them
        await client.query(
          `DELETE FROM journal_entry_chunks WHERE journal_id = $1`,
          [existingJournalId]
        );
        const updateJournalQuery = `
          UPDATE journal_entries
          SET entry_text = $1, last_modified = NOW(), image_path = NULL -- Reset image path on update
          WHERE journal_id = $2 AND user_id = $3
          RETURNING entry_date;
        `;
        const updateResult = await client.query(updateJournalQuery, [
          entryText.trim(),
          existingJournalId,
          userId,
        ]);
        if (updateResult.rowCount === 0) {
          await client.query("ROLLBACK");
          res.status(404).json({
            error: "Journal entry not found or does not belong to the user.",
          });
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
      const journalInsertResult = await client.query(insertJournalQuery, [
        userId,
        entryText.trim(),
        emotionLabels,
        entryDate,
      ]);
      existingJournalId = journalInsertResult.rows[0].journal_id;
      createdAtTimestamp = new Date(
        journalInsertResult.rows[0].entry_date
      ).getTime();
    }

    if (existingJournalId !== null) {
      const sentences = splitIntoSentences(entryText);
      const insertChunkQuery = `
        INSERT INTO journal_entry_chunks (journal_id, chunk_index, chunk_text, embedding)
        VALUES ($1, $2, $3, $4::vector);
      `;
      // Prepare embedding promises for all sentences concurrently
      const embeddingPromises = sentences.map((sentence, i) => {
        const trimmed = sentence.trim();
        if (trimmed) {
          return generateEmbeddings(trimmed)
            .then((vectorEmbeddings) => {
              const vectorString = `[${vectorEmbeddings.join(",")}]`;
              return client.query(insertChunkQuery, [
                existingJournalId,
                i,
                trimmed,
                vectorString,
              ]);
            })
            .catch((embeddingError) => {
              console.error(
                "Error generating embedding for chunk:",
                trimmed,
                embeddingError
              );
              // Continue even if one embedding fails
            });
        } else {
          // If the sentence is empty, return a resolved promise.
          return Promise.resolve();
        }
      });

      // Fire off image generation and emotion analysis concurrently
      const imagePromise = generateImageFromJournalEntry(
        entryText,
        existingJournalId.toString()
      );
      const emotionPromise = analyzeEmotions(entryText);

      // Wait for all promises (embeddings, image generation, and emotion analysis) to complete
      const results = await Promise.all([
        ...embeddingPromises,
        imagePromise,
        emotionPromise,
      ]);

      // Extract the image result and emotion analysis result from the returned array.
      // The image result is at the index equal to embeddingPromises.length and the emotion analysis is right after.
      const imagePath = results[embeddingPromises.length];
      emotionAnalysisResults = results[embeddingPromises.length + 1];

      // Update the journal entry with the image path if available.
      if (imagePath) {
        const updateImagePathQuery = `
          UPDATE journal_entries
          SET image_path = $1
          WHERE journal_id = $2;
        `;
        await client.query(updateImagePathQuery, [imagePath, existingJournalId]);
      }

      // Extract only the emotion labels from the analysis result (ignore the emojis)
      emotionLabels = emotionAnalysisResults.map((item) => item.emotion);
      // Update the emotion_labels column (type text[]) in the journal entry.
      const updateEmotionQuery = `
        UPDATE journal_entries
        SET emotion_labels = $1
        WHERE journal_id = $2;
      `;
      await client.query(updateEmotionQuery, [emotionLabels, existingJournalId]);
    }

    await client.query("COMMIT");
    res.status(200).json({
      message: "Success",
      journalId: existingJournalId,
      emotions: emotionAnalysisResults,
    });
  } catch (error: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};


export const deleteJournalEntryByIdAndUserId: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { journalId, userid } = req.params; // Get both journalId and userid from URL parameters

    if (!userid) {
      res.status(401).json({ error: "Unauthorized: User ID not provided in the URL." });
      return;
    }

    if (!journalId) {
      res.status(400).json({ error: "Missing required parameter: journalId in the URL." });
      return;
    }

    const parsedJournalId = parseInt(journalId, 10);
    if (isNaN(parsedJournalId)) {
      res.status(400).json({ error: "Invalid journalId format." });
      return;
    }

    // Verify if the provided userid in the URL matches the user making the request
    // You might still want to compare this with the authenticated user's ID from a token or session
    const userIdFromUrl = userid; // Assuming userid in the URL is the user's ID

    // Verify if the journal entry belongs to the user
    const checkOwnershipQuery = `
      SELECT journal_id
      FROM journal_entries
      WHERE journal_id = $1 AND user_id = $2;
    `;
    const ownershipResult = await client.query(checkOwnershipQuery, [parsedJournalId, userIdFromUrl]);

    if (ownershipResult.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Journal entry not found or does not belong to the user." });
      return;
    }

    // Delete related embeddings and chunks first
    await client.query(`DELETE FROM journal_embeddings WHERE journal_id = $1`, [parsedJournalId]);
    await client.query(`DELETE FROM journal_entry_chunks WHERE journal_id = $1`, [parsedJournalId]);

    // Finally, delete the journal entry
    const deleteJournalQuery = `
      DELETE FROM journal_entries
      WHERE journal_id = $1 AND user_id = $2;
    `;
    const deleteResult = await client.query(deleteJournalQuery, [parsedJournalId, userIdFromUrl]);

    if (deleteResult.rowCount > 0) {
      await client.query("COMMIT");
      res.status(200).json({ message: "Journal entry deleted successfully." });
    } else {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Journal entry not found or could not be deleted." });
    }

  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("Error deleting journal entry:", error);
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

