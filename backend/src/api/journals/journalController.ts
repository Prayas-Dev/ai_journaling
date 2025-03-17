import { Request, Response, NextFunction, RequestHandler } from 'express';
import pool from "../../config/db"
import { journalEmbeddingSchema } from "./validators/journalEmbeddings";
import { journalEntrySchema } from './validators/journalEntry';
import { getPromptSchema} from './validators/getPrompt'
import { analyzeEmotions,generateEmbeddings, emotionAnalysisAndGeneratePrompt, generateGeminiPrompt } from '../../utils/geminiHelpers';
import { z } from "zod";


export const getPrompt: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const result = getPromptSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Invalid input", details: result.error.errors });
      return; // Exit the function without returning a value
    }

    const { entryText } = result.data;
    const geminiPrompt = await generateGeminiPrompt(entryText);
    res.status(200).json({ prompt: geminiPrompt });
  } catch (error) {
    next(error);
  }
};

export const getJournalEntries: RequestHandler = async (req, res) => {
  try {
    const userId = req.params.userId;
    const searchQuery = req.query.query;

    // Validate query parameter
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
        MIN(similarity) AS similarity
      FROM combined
      GROUP BY journal_id, entry_text
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

export const createOrUpdateJournalEntry: RequestHandler = async (req, res, next) => {
  const client = await pool.connect(); 
  try {
      await client.query("BEGIN");
      const emotionsAndPrompt = await emotionAnalysisAndGeneratePrompt(req.body.entryText);
      const validatedData = journalEntrySchema.parse({
          userId: req.body.userId,
          entryText: req.body.entryText,
          emotionLabel: emotionsAndPrompt.emotions,
          entryDate: req.body.entry_date
      });

      const upsertJournalQuery = `
      INSERT INTO journal_entries (user_id, entry_text, emotion_labels, entry_date)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (entry_date)
      DO UPDATE SET
          user_id = EXCLUDED.user_id,
          entry_text = EXCLUDED.entry_text,
          emotion_labels = EXCLUDED.emotion_labels,
          last_modified = NOW()
      RETURNING journal_id;
  `;

  const upsertJournalParams = [
    validatedData.userId,
    validatedData.entryText,
    validatedData.emotionLabel,
    validatedData.entryDate
];


      const journalInsertResult = await client.query(upsertJournalQuery, upsertJournalParams);
      const journalId = journalInsertResult.rows[0].journal_id;

      // Generate embeddings and format as vector string
      const vectorEmbeddings = await generateEmbeddings(validatedData.entryText);
      const vectorString = `[${vectorEmbeddings.join(',')}]`; // Correct format

      // Validate embeddings data (optional, adjust schema as needed)
      const validatedEmbedding = journalEmbeddingSchema.parse({
          journalId,
          journalEmbedding: vectorEmbeddings // Ensure this is an array of numbers
      });

      // Insert embeddings with vector cast
      const upsertEmbeddingQuery = `
          INSERT INTO journal_embeddings (journal_id, embedding)
          VALUES ($1, $2::vector)
          ON CONFLICT(journal_id)
          DO UPDATE SET embedding = EXCLUDED.embedding;
      `;
      const embeddingUpsertParams = [journalId, vectorString];
      await client.query(upsertEmbeddingQuery, embeddingUpsertParams);

      await client.query('COMMIT');
      res.status(200).json({ message: "Success", journalId });
  } catch (error: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: error.errors || error.message });
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
