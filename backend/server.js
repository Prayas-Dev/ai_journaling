import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Route to handle AI response submission
app.post("/api/ai-response", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    // Save prompt to the database (optional)
    const result = await pool.query(
      "INSERT INTO journal_entries (prompt) VALUES ($1) RETURNING *",
      [prompt]
    );

    // Placeholder AI response
    const aiResponse = `AI Response to: "${prompt}"`;

    res.json({ answer: aiResponse, entry: result.rows[0] });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
