import express from "express";
import { deleteJournalEntryByIdAndUserId,getJournalEntryById,createJournalChat, createOrUpdateJournalEntry, getPrompt, deleteJournalEntry, getAllJournalEntries, searchJournalEntries } from "./journalController";
const path = require('path');

const router = express.Router();

router.get("/entry/:journalId/:userId", getJournalEntryById);

router.use('/default_images', express.static(path.join(__dirname, 'default_images')));

// Create or update a journal entry (with embeddings)
router.post("/", createOrUpdateJournalEntry);

router.post("/chat", createJournalChat);

// Get all journal entries for a given user
router.get("/all/:userId", getAllJournalEntries);

// Search journal entries for a given user with a query parameter
router.get("/search/:userId", searchJournalEntries);

// Get prompt endpoint
router.post("/prompt", getPrompt);

// Delete a journal entry by date
router.delete("/:date", deleteJournalEntry);

  router.get("/simple", (req, res) => {
    // Use res.send() to send a plain string response.
    // Express will typically set the Content-Type to text/html for this.
    res.send("This is the simple string response from the server.");
  });


router.delete("/:journalId/:userid", deleteJournalEntryByIdAndUserId);
  
  
export default router;
