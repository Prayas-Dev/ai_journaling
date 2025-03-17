import {z} from "zod";

export const journalEmbeddingSchema = z.object({
    journalId:z.number().int().positive(), //positive primary key generated
    journalEmbedding:z.array(z.number()).length(768), //array of 768 floating point embeddings genedated by gemini's text-embedding-004 model
});