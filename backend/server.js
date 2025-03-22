import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Route to add a new journal entry (User & AI response)
app.post("/api/journal-entries", async (req, res) => {
  const { entry_text, response_text } = req.body;

  if (!entry_text) {
    return res.status(400).json({ error: "Entry text is required." });
  }

  try {
    // ✅ Store user entry and AI response in the same row
    const result = await pool.query(
      "INSERT INTO journal_entries (entry_text, response_text) VALUES ($1, $2) RETURNING *",
      [entry_text, response_text || null]
    );

    res.status(201).json({
      message: "Entry added successfully",
      entry: result.rows[0],
    });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route to get all journal entries (Newest first)
app.get("/api/journal-entries", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM journal_entries ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route to get a specific journal entry by ID
app.get("/api/journal-entries/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM journal_entries WHERE journal_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Route to delete a journal entry by ID
app.delete("/api/journal-entries/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM journal_entries WHERE journal_id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    res.json({ message: "Entry deleted successfully", deletedEntry: result.rows[0] });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
