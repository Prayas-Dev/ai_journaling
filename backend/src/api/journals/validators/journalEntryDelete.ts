import { z } from "zod";
import { journalUpdateSchema } from "./journalEntryUpdate";


export const journalDeleteSchema = z.object({
    entryDate: z.date()
});