# Markdown 撰寫指南

這份指南說明如何在這個 Astro 多語系部落格模板中撰寫 `.md` 與 `.mdx` 文章。

## 文章資料夾

文章依語系放在不同資料夾：

```text
src/content/blog/en/
src/content/blog/zh-tw/
src/content/blog/zh-cn/
```

同一篇文章的翻譯版本建議使用相同 slug：

```text
src/content/blog/en/my-first-post.md
src/content/blog/zh-tw/my-first-post.md
src/content/blog/zh-cn/my-first-post.md
```

它們會產生 `/posts/my-first-post`、`/zh-tw/posts/my-first-post`、`/zh-cn/posts/my-first-post`。

## Frontmatter

每篇文章都要在最前面放 frontmatter，並用 `---` 包起來：

```markdown
---
title: '文章標題'
description: '用於文章卡片與 SEO 的簡短摘要。'
pubDate: 2026-05-24
updatedDate: 2026-06-19
category: '網站設定'
tags: ['Astro', 'Markdown']
author: 'Astro Blog Template'
draft: false
pinned: false
pinOrder: 10
---

在這裡撰寫文章內容。
```

## Frontmatter 欄位

| 欄位          | 必填 | 說明                                        |
| ------------- | ---- | ------------------------------------------- |
| `title`       | 是   | 文章標題，建議清楚且不要過長。              |
| `description` | 是   | 文章卡片、SEO 與社群預覽用摘要。            |
| `pubDate`     | 是   | 發布日期，格式為 `YYYY-MM-DD`。             |
| `updatedDate` | 否   | 內容有實質更新時填寫，格式為 `YYYY-MM-DD`。 |
| `category`    | 否   | 單一分類名稱。                              |
| `tags`        | 否   | 陣列，例如 `['Astro', 'Markdown']`。        |
| `author`      | 否   | 預設值依專案設定而定。                      |
| `draft`       | 否   | `true` 代表草稿，不會出現在公開文章列表。   |
| `pinned`      | 否   | `true` 代表置頂文章。                       |
| `pinOrder`    | 否   | 多篇置頂文章的排序，數字越小越前面。        |
| `ogImage`     | 否   | 社群預覽圖片路徑或網址。                    |

## 草稿

撰寫中可使用：

```yaml
draft: true
```

發布前改成：

```yaml
draft: false
```

## 置頂文章

置頂文章：

```yaml
pinned: true
pinOrder: 1
```

多篇文章置頂時，用 `pinOrder` 控制排序。數字越小越前面。

## 標題

通常頁面已經會用 frontmatter 的 `title` 當主標題，所以文章內文建議從 `##` 開始。

```markdown
## 主要段落

### 子段落
```

## 連結

Markdown 文章內指向外部 origin 的 HTTP/HTTPS 連結，建置時會自動改寫到外部網站確認頁。

```markdown
[Example](https://example.com)
```

站內連結請使用網站路徑：

```markdown
[About](/about)
[繁體中文關於頁](/zh-tw/about)
```

不要在公開文章中貼上 token、私人控制台網址、私人 IP 或內部 hostname。

## 圖片

公開圖片放在 `public/images/`：

```text
public/images/example.png
```

Markdown 內使用網站絕對路徑引用：

```markdown
![圖片替代文字](/images/example.png)
```

替代文字應描述圖片內容，有助於無障礙與 SEO。

## 程式碼區塊

使用 fenced code block，並盡量標明語言：

````markdown
```bash
pnpm install
pnpm build
```
````

常用語言：

```text
bash
powershell
js
ts
html
css
yaml
json
dockerfile
nginx
```

## 表格

```markdown
| 名稱     | 說明         |
| -------- | ------------ |
| Astro    | 靜態網站框架 |
| Markdown | 文章撰寫格式 |
```

## 註腳

```markdown
這句話有一個註腳。[^note]

[^note]: 這是註腳內容。
```

## Raw HTML

除非必要，避免在 Markdown 內寫 raw HTML。不要在文章內加入 `<script>`、iframe 或不可信 HTML。若需要互動內容或可信任 markup，優先使用 Astro 元件。

## 安全檢查

發布前確認文章沒有包含：

- API key 或服務商 token
- Cloudflare、Vercel、GitHub、GitLab、Codeberg token
- VPS IP、SSH 私鑰或 SSH passphrase
- Session cookie 或私人控制台網址
- 不應公開的個人資料

## 驗證

編輯文章後執行：

```bash
pnpm check
pnpm lint
pnpm build
pnpm selfcheck -- --quick
```

如果使用 npm：

```bash
npm run check
npm run lint
npm run build
```
