import express from "express";
import { createOrUpdateJournalEntry, getPrompt, deleteJournalEntry, getAllJournalEntries, searchJournalEntries } from "./journalController";

const router = express.Router();

// Create or update a journal entry (with embeddings)
router.post("/", createOrUpdateJournalEntry);

// Get all journal entries for a given user
router.get("/all/:userId", getAllJournalEntries);

// Search journal entries for a given user with a query parameter
router.get("/search/:userId", searchJournalEntries);

// Get prompt endpoint
router.post("/prompt", getPrompt);

// Delete a journal entry by date
router.delete("/:date", deleteJournalEntry);

export default router;
