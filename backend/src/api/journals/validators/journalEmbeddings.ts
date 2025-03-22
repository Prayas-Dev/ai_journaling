import {z} from "zod";

export const journalEmbeddingSchema = z.object({
    journalId: z.string(),
    journalEmbedding: z.array(z.number()).length(768),
});
