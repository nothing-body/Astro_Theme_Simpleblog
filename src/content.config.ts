import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DEFAULT_AUTHOR } from './lib/site';

const blog = defineCollection({
  loader: glob({
    pattern: ['**/*.{md,mdx}', '!**/getting-started.md'],
    base: 'src/content/blog',
  }),
  schema: z.object({
    title: z
      .string()
      .min(1, 'Title is required.')
      .max(200, 'Title must be 200 characters or fewer.'),
    pubDate: z.coerce.date(),
    description: z.string().max(500, 'Description must be 500 characters or fewer.').optional(),
    updatedDate: z.coerce.date().optional(),
    category: z.string().trim().min(1, 'Category cannot be empty.').default('Uncategorized'),
    categoryPath: z
      .array(z.string().trim().min(1, 'Category path segment cannot be empty.'))
      .min(1, 'Category path must contain at least one segment.')
      .max(5, 'Category path supports up to five levels.')
      .optional(),
    tags: z.array(z.string().trim().min(1, 'Tag cannot be empty.')).default([]),
    author: z.string().default(DEFAULT_AUTHOR),
    pinned: z.boolean().default(false),
    pinOrder: z.number().int().min(1).max(9999).optional(),
    draft: z.boolean().default(false),
    ogImage: z.url().optional(),
  }),
});

export const collections = { blog };
