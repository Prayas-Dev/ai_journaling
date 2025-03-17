import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config({path:"src/config/.env"});
import journalRoutes from "./src/api/journals/journalRoutes";


const app = express();
// Enable CORS for all routes
app.use(cors({
    origin: "*",
  }));

// Middleware
app.use(express.json());

// Routes
app.use("/api/journals", journalRoutes);

export default app;
