# Bookmark Section Guide

The homepage bookmark section is maintained in [src/components/BookmarkLinks.astro](E:/Astro/Astro_Theme_Simpleblog/src/components/BookmarkLinks.astro).

This guide is separate from the deployment guide because bookmarks are site content, not deployment configuration.

## Add a New Group

Add a translated group label to `groupLabels`:

```ts
const groupLabels = {
  code: lang === 'en' ? 'Code' : lang === 'zh-cn' ? '\u4ee3\u7801' : '\u7a0b\u5f0f\u78bc',
  shopping: lang === 'en' ? 'Shopping' : lang === 'zh-cn' ? '\u8d2d\u7269\u7f51\u7ad9' : '\u8cfc\u7269\u7db2\u7ad9',
};
```

Then add a row to `bookmarkRows`:

```ts
{
  group: groupLabels.shopping,
  items: [
    { label: 'PChome', href: 'https://www.pchome.com.tw/' },
    { label: 'Momo', href: 'https://www.momoshop.com.tw/' },
  ],
},
```

## Add a Link to an Existing Group

Find the target row in `bookmarkRows` and append an item:

```ts
{
  group: groupLabels.code,
  items: [
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'Gitea', href: 'https://gitea.com/' },
  ],
},
```

## Safety Notes

- Prefer `https://` URLs.
- Keep external links using `target="_blank"` and `rel="noopener noreferrer"`.
- Do not insert visitor input, API responses, or other untrusted values into `href`.
- The bookmark panel has bounded scrolling so many groups or links will not stretch the homepage indefinitely.
- After editing, run `pnpm check`, `pnpm lint`, `pnpm lint:css`, and `pnpm build`.
