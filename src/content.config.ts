import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The document collection.
 * An id starts with a language code, as in `ko/index`.
 * The Korean and English versions of a document must agree on everything
 * after that language code.
 */
const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    /** One sentence, used in listings and at the head of the document */
    lead: z.string(),
    /** A small label set above the title */
    eyebrow: z.string().optional(),
    status: z.enum(['complete', 'partial', 'planned']),
    /** The sections, equations and figures of the paper this covers, e.g. ['§3.2.1', 'eq. (1)'] */
    paperRefs: z.array(z.string()).default([]),
    /** What this document leaves to a later stage */
    notYet: z.array(z.string()).default([]),
    updated: z.string(),
  }),
});

export const collections = { docs };
