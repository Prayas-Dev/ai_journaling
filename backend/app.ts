import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config({path:"src/config/.env"});
import journalRoutes from "./src/api/journals/journalRoutes";
import session from "express-session";
import passport from "passport";
import "./src/middleware/auth"; 


const app = express();
// Enable CORS for all routes
app.use(cors({
    origin: "*",
  }));

// Middleware
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: true,
  })
);


// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/api/journals", journalRoutes);
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/dashboard"); // Or wherever you want after login
  }
);

export default app;
