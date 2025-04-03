// backend/app.ts
import express from "express";
const cors = require("cors");
import session from "express-session";
import passport from "passport";
import jwt from "jsonwebtoken";
import "./src/middleware/auth"; // Loads passport configuration
import journalRoutes from "./backend/src/api/journals/journalRoutes";

const app = express();

// Enable CORS for all routes
app.use(
  cors({
    origin: "*",
  })
);

// Middleware to parse JSON
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// Mount journal routes on "/api/journals"
app.use("/api/journals", journalRoutes);

// Google authentication routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

// Custom user interface for typecasting
interface CustomUser {
  id: string;
  email: string;
  token?: string;
}

// Callback route for Google authentication
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user) {
      return res.status(401).redirect("/login");
    }
    const user = req.user as CustomUser;
    // Use the token from the strategy if available, otherwise sign a new token
    const token =
      user.token ||
      jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET as string, {
        expiresIn: "1h",
      });      
    res.redirect(`http://localhost:5173/home?token=${token}`);
  }
);

export default app;