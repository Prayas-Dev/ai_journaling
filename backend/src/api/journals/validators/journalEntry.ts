import {z} from "zod";

//List of valid emotions recieved from gemini sentimental analysis
const validEmotions = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "optimism", "pride", "realization",
    "relief", "remorse", "sadness", "surprise", "neutral"
  ] as const;

  export const journalEntrySchema = z.object({
    userId: z.string(), // Ensure it's a valid UUID
    entryText: z.string()
      .min(30, "Entry must have at least 30 characters.")
      .max(1000, "Entry must not exceed 1000 characters."), // Added max limit
    emotionLabel: z.array(z.enum(validEmotions)).nonempty("At least one emotion required"), // Ensures it's not empty
    entryDate: z.preprocess(arg => {
      return typeof arg === "string" ? new Date(arg) : arg;
    }, z.date())
  });

