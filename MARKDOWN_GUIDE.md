# Markdown 文章寫作指南

這份文件說明本 Astro 部落格模板目前支援的 `.md` / `.mdx` 文章寫法。新文章請放在：

```text
src/content/blog/zh-tw/
src/content/blog/en/
src/content/blog/zh-cn/
```

檔名建議使用小寫英文、數字與連字號，例如：

```text
my-first-post.md
docker-setup-guide.md
how-to-pin-posts.md
```

不要在檔名使用空白、特殊符號、私密資訊或 API key。

## 最小文章範本

```markdown
---
title: 'Post title'
description: 'A short summary for post cards and SEO.'
pubDate: 2026-05-24
category: 'Site Setup'
tags: ['Astro', 'Markdown']
author: 'Astro Blog Template'
draft: false
---

Write your post content here.
```

## Frontmatter 欄位

文章最上方兩個 `---` 中間的區塊叫 frontmatter，用來描述文章資料。

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `title` | 是 | 文章標題，最多 200 字元。 |
| `pubDate` | 是 | 發布日期，建議使用 `YYYY-MM-DD`。 |
| `description` | 否 | 文章摘要，最多 500 字元。 |
| `updatedDate` | 否 | 更新日期，建議使用 `YYYY-MM-DD`。 |
| `category` | 否 | 分類，不填會使用預設分類。 |
| `tags` | 否 | 標籤陣列，例如 `['Astro', 'Docker']`。 |
| `author` | 否 | 作者，不填預設為 `Astro Blog Template`。 |
| `draft` | 否 | `true` 表示草稿，不會出現在正式列表。 |
| `pinned` | 否 | `true` 表示置頂文章。 |
| `pinOrder` | 否 | 多篇置頂文章的排序，數字越小越前面。 |
| `ogImage` | 否 | 社群分享圖片 URL。 |

## 置頂文章

```yaml
pinned: true
pinOrder: 1
```

`pinned: true` 會讓文章優先顯示在首頁、所有文章、分頁、分類頁與標籤頁。

多篇置頂文章可以使用 `pinOrder` 控制順序：

```yaml
pinned: true
pinOrder: 2
```

取消置頂時可以刪除 `pinned` / `pinOrder`，或改成：

```yaml
pinned: false
```

## 草稿文章

```yaml
draft: true
```

草稿文章不會出現在首頁、所有文章、分類頁與標籤頁。正式發布前請改成：

```yaml
draft: false
```

## 標題

```markdown
# 一級標題
## 二級標題
### 三級標題
#### 四級標題
```

文章內通常從 `##` 開始即可，因為文章頁面已經會用文章 `title` 顯示主標題。

## 段落與換行

```markdown
這是第一段。

這是第二段。
```

如果只是按一次 Enter，Markdown 通常仍會視為同一段。要分段請空一行。

## 粗體、斜體、刪除線

```markdown
**粗體文字**
*斜體文字*
~~刪除線文字~~
```

## 清單

```markdown
- 第一項
- 第二項
- 第三項

1. 第一步
2. 第二步
3. 第三步

- [x] 已完成
- [ ] 尚未完成
```

## 連結

```markdown
[連結文字](https://example.com)
```

不要把私密後台、一次性 token、API key 或帶登入憑證的網址放進文章。

## 圖片

建議把圖片放在 `public/images/`：

```text
public/images/example.png
```

文章中這樣引用：

```markdown
![圖片替代文字](/images/example.png)
```

圖片替代文字很重要，能幫助 SEO、無障礙閱讀器與圖片載入失敗時的顯示。

## 引用區塊

```markdown
> 這是一段引用文字。
```

## 程式碼

行內程式碼：

```markdown
Please run `pnpm build`.
```

多行程式碼請使用 fenced code block，並標示語言：

````markdown
```bash
pnpm install
pnpm build
```
````

常見語言標記：

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
| 名稱 | 說明 |
| --- | --- |
| Astro | 靜態網站框架 |
| Markdown | 文章格式 |
```

## 分隔線

```markdown
---
```

注意：文章最上方 frontmatter 的 `---` 是必要語法；正文中的 `---` 則是水平分隔線。

## 註腳

```markdown
這是一段帶註腳的文字。[^note]

[^note]: 這是註腳內容。
```

## HTML 與危險內容

請避免在文章中手寫 `<script>`、iframe、未知第三方嵌入碼、追蹤碼或不可信 HTML。

這個專案是靜態網站，文章內容應盡量保持為 Markdown。若需要互動功能，應建立 Astro 元件並經過檢查後再使用，不要直接把外部網站提供的程式碼貼進文章。

## 安全注意事項

不要把以下內容寫進文章、圖片檔名、程式碼範例或 commit：

- API key
- Cloudflare token
- GitHub / GitLab / Codeberg token
- VPS IP、SSH 私鑰、私鑰密碼
- Cookie、session、一次性登入連結
- 內部後台網址或未公開服務位址

教學範例請使用 placeholder：

```text
example.com
your_api_key_here
your_username
your_server_ip
```

## 發布前檢查

寫完文章後建議執行：

```bash
pnpm check
pnpm lint
pnpm build
```

如果使用 npm：

```bash
npm run check
npm run lint
npm run build
```

確認 build 成功後，再部署產生的 `dist`。
