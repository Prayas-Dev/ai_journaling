import express from "express";

import { createJournalEntry, getJournalEntries, getPrompt } from "./journalController";

const router = express.Router();

router.post("/", createJournalEntry);

router.get("/:userId", getJournalEntries);

router.post("/prompt", getPrompt);

export default router;
