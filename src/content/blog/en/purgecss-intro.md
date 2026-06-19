---
title: 'PurgeCSS: How It Works and How to Configure It Safely'
pubDate: 2026-05-25
description: 'A practical guide to PurgeCSS: how it finds unused CSS, when it can help, and how to configure content paths and safelists without breaking pages.'
category: 'Website'
tags: ['PurgeCSS', 'CSS', 'Frontend Optimization']
author: 'Tena'
---

PurgeCSS is a build-time tool that removes CSS selectors it believes are unused. It can help when a site imports a large stylesheet but only uses a small part of it. The important detail is that PurgeCSS does not understand your application like a browser does; it mainly compares CSS selectors with strings found in your source files.

## How PurgeCSS Works

PurgeCSS compares two groups of files:

1. CSS files that contain selectors.
2. Content files that may contain class names, such as HTML, JavaScript, Astro components, Markdown, MDX, templates, or generated markup.

If a selector is not found in the scanned content, PurgeCSS may remove it from the final CSS output. That is useful when the selector is truly unused, but risky when the selector is generated dynamically or appears only after Markdown rendering.

## When It Can Help

PurgeCSS is most useful when a project ships a large CSS framework or legacy stylesheet and uses only a small part of it. Smaller CSS files can reduce download and parse cost, especially on slow networks or low-end devices.

It is less useful when your CSS is already generated on demand, split into small component styles, or carefully scoped. Before adding PurgeCSS, measure the CSS size first and confirm that CSS is actually a performance bottleneck.

## Basic Configuration

A minimal configuration usually needs two things: content paths and CSS paths. Content paths must cover every file that can contain class names.

```js
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}',
    './public/**/*.html',
  ],
  css: ['./dist/**/*.css'],
};
```

For Astro projects, remember to include Markdown and MDX when article content can produce HTML that depends on typography styles. If content is loaded from a CMS or generated before build, include that generated output or add a safelist.

## Dynamic Class Names

Dynamic class names are the most common source of broken styles. This pattern is risky:

```js
const color = 'red';
element.className = `text-${color}-500`;
```

PurgeCSS may see `text-`, `red`, and `-500`, but never the complete `text-red-500` class. Prefer complete class names:

```js
const colorClass = color === 'red' ? 'text-red-500' : 'text-blue-500';
element.className = colorClass;
```

## Safelist Important Selectors

Use a safelist for selectors that are created at runtime, injected by third-party widgets, or produced by Markdown rendering. Keep the safelist narrow so it does not undo the benefit of PurgeCSS.

```js
export default {
  content: ['./src/**/*.{astro,js,ts,md,mdx}'],
  css: ['./dist/**/*.css'],
  safelist: [
    'is-active',
    'is-visible',
    /^language-/,
    /^token/,
  ],
};
```

## Test Before Deploying

After enabling PurgeCSS, test real production output instead of only checking the development server. Verify article pages, navigation states, pagination, code blocks, dialogs, forms, dark/light modes, and any third-party embeds. Visual regression tests are the safest option for larger sites.

PurgeCSS can be useful, but it should be treated as an optimization step that needs measurement, a complete content list, and careful safelist maintenance.
