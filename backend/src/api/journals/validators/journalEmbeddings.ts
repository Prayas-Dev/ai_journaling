import {z} from "zod";

export const journalEmbeddingSchema = z.object({
    journalId: z.string().uuid(),
    journalEmbedding: z.array(z.number()).length(768),
});
