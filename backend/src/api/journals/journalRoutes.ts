import express from "express";

import { createOrUpdateJournalEntry, getJournalEntries, getPrompt, deleteJournalEntry } from "./journalController";


const router = express.Router();

router.post("/", createOrUpdateJournalEntry);

router.get("/:userId", getJournalEntries);

router.post("/prompt", getPrompt);

router.delete("/:date", deleteJournalEntry);



export default router;
