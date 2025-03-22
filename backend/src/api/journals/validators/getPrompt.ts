import {z} from "zod";

export const getPromptSchema = z.object({
    entryText: z.string().nonempty({ message: "entryText is required and must be a non-empty string." })
  });