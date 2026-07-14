import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DEFAULT_AUTHOR } from './lib/site';

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: 'src/content/blog',
  }),
  schema: z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required.')
      .max(200, 'Title must be 200 characters or fewer.'),
    pubDate: z.coerce.date(),
    description: z
      .string()
      .trim()
      .min(12, 'Description must be at least 12 characters.')
      .max(300, 'Description must be 300 characters or fewer.'),
    updatedDate: z.coerce.date().optional(),
    category: z.string().trim().min(1, 'Category cannot be empty.').max(100).default('Uncategorized'),
    categoryPath: z
      .array(z.string().trim().min(1, 'Category path segment cannot be empty.').max(100))
      .min(1, 'Category path must contain at least one segment.')
      .max(5, 'Category path supports up to five levels.')
      .optional(),
    tags: z
      .array(z.string().trim().min(1, 'Tag cannot be empty.').max(64))
      .max(20, 'At most 20 tags are allowed.')
      .refine(tags => new Set(tags).size === tags.length, 'Tags must be unique.')
      .default([]),
    author: z.string().trim().min(1).max(100).default(DEFAULT_AUTHOR),
    pinned: z.boolean().default(false),
    pinOrder: z.number().int().min(1).max(9999).optional(),
    draft: z.boolean().default(false),
    ogImage: z
      .string()
      .refine(value => value.startsWith('/images/') || /^https:\/\//.test(value), {
        message: 'ogImage must be an /images/ path or an HTTPS URL.',
      })
      .optional(),
  }).superRefine((data, context) => {
    if (data.updatedDate && data.updatedDate < data.pubDate) {
      context.addIssue({
        code: 'custom',
        path: ['updatedDate'],
        message: 'updatedDate cannot be earlier than pubDate.',
      });
    }
    if (data.pinOrder !== undefined && !data.pinned) {
      context.addIssue({
        code: 'custom',
        path: ['pinOrder'],
        message: 'pinOrder requires pinned: true.',
      });
    }
    if (data.categoryPath && data.categoryPath[0] !== data.category) {
      context.addIssue({
        code: 'custom',
        path: ['categoryPath'],
        message: 'categoryPath must start with category.',
      });
    }
  }),
});

export const collections = { blog };
