---
title: 'Your First Post: A Simple Reading Journal'
description: 'A complete example post for your new Astro blog: try headings, lists, tables and TypeScript, then replace the sample with your own writing.'
pubDate: 2026-09-19
category: 'Writing'
categoryPath: ['Writing', 'Getting Started']
tags: ['Markdown', 'Blogging']
author: 'Example Author'
---

Welcome to your new Astro blog. This is a fictional reading journal that you can edit or remove. It contains no real account details or private information.

## A small plan for this week

I want to make a little time for reading each day. Instead of aiming for a whole book, I will start with one chapter and write down one useful idea.

1. Choose a topic that interests me.
2. Read for fifteen minutes.
3. Describe what I learned in my own words.

> A short note written today is a useful starting point for tomorrow.

## My sample reading list

| Topic | Plan | Progress |
| --- | --- | --- |
| Writing clearly | Read one chapter | Started |
| Organizing notes | Try a weekly summary | Planned |

Use **bold text** for an important idea, *italics* for emphasis, and lists when several items belong together.

## A small TypeScript example

Code fences display code as an example; this snippet does not run in the reader's browser.

```ts
type ReadingGoal = {
  topic: string;
  minutesPerDay: number;
};

const goal: ReadingGoal = {
  topic: 'Writing clearly',
  minutesPerDay: 15,
};
```

## Make this post your own

Open `src/content/blog/en/first-post.md`. Change the title, description, date and body, then save the file. Replace `Example Author` with the name you want to publish. The block between the first two `---` lines controls the article metadata.

This example also has Traditional Chinese and Simplified Chinese versions. Keep the same filename in `en`, `zh-tw` and `zh-cn` for translations of the same article. Keep corresponding tags in the same order so language switching can match them.

Run `pnpm dev` to preview your edits and `pnpm build` to check the generated site. Before publishing, run `pnpm selfcheck`. Keep passwords, tokens and private notes out of articles and images: anything published here is readable by visitors.

Browse [all posts](/posts/) or try [search](/search/).
