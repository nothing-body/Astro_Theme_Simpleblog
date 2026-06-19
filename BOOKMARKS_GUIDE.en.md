# Bookmark Section Guide

The homepage bookmark section is maintained in:

```text
src/components/BookmarkLinks.astro
```

Bookmarks are site content, not deployment configuration. Do not put API keys, tokens, private dashboard URLs, or private server addresses in this file.

## Add a New Group

Add a translated group label to `groupLabels`:

```ts
const groupLabels = {
  code: lang === 'en' ? 'Code' : lang === 'zh-cn' ? '代码' : '程式碼',
  shopping: lang === 'en' ? 'Shopping' : lang === 'zh-cn' ? '购物网站' : '購物網站',
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

## Link Behavior

Bookmark links are rendered as external links with:

```html
target="_blank" rel="noopener noreferrer"
```

The global Markdown external-link warning rewrite does not change this component automatically, because these links are written directly in Astro component markup. If you want bookmark clicks to go through the leaving notice page, set the `href` manually:

```ts
{ label: 'Example', href: `/leaving?to=${encodeURIComponent('https://example.com/')}` }
```

For Traditional Chinese and Simplified Chinese bookmark variants, use `/zh-tw/leaving?to=` or `/zh-cn/leaving?to=`.

## Safety Notes

- Prefer `https://` URLs.
- Keep external links using `target="_blank"` and `rel="noopener noreferrer"`.
- Do not insert visitor input, API responses, or other untrusted values into `href`.
- Do not add private control panels, private IPs, internal hostnames, API tokens, or personal account URLs to a public template.
- The bookmark panel has bounded scrolling so many groups or links will not stretch the homepage indefinitely.
- After editing, run `pnpm check`, `pnpm lint`, `pnpm lint:css`, `pnpm build`, and `pnpm selfcheck -- --quick`.
