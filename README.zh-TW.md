# Astro 多語系部落格範本

這是一套可安全公開的 Astro 靜態部落格範本，包含多語系路由、SEO、隱私偏好、書籤功能，以及 Cloudflare Pages、VPS 和 Vercel 部署工具。

## 功能

- 英文根路由，以及繁體中文、簡體中文語系
- Markdown/MDX 文章、分類、標籤、分頁與置頂文章
- 響應式導覽列、書籤、時鐘、Cookie 偏好與無障礙支援
- Sitemap、robots.txt、Canonical URL、JSON-LD、Open Graph 與安全標頭
- 自動讀取 Cloudflare Pages Production 分支的部署流程
- Astro、ESLint、Stylelint、Jest、Playwright 與專案自檢

## 說明文件

- [English README](./README.md)
- [Markdown 寫作指南](./MARKDOWN_GUIDE.md)
- [英文書籤指南](./BOOKMARKS_GUIDE.en.md)
- [繁體中文書籤指南](./BOOKMARKS_GUIDE.zh-TW.md)
- [英文部署指南](./DEPLOYMENT.en.md)
- [繁體中文部署指南](./部屬前須知.md)
- [部署腳本說明](./scripts/README.en.md)

## 路由

英文是預設語系並使用根路由 `/`；繁體中文使用 `/zh-tw/`；簡體中文使用 `/zh-cn/`。

三語系範例文章位於：

```text
src/content/blog/en/
src/content/blog/zh-tw/
src/content/blog/zh-cn/
```

## 快速開始

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

也可使用 npm：

```bash
npm install
npm run build
```

## 設定

將 `.env.example` 複製為 `.env`，並設定：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

請勿提交真實憑證或部署環境檔。

## 部署

使用互動式部署選單：

```bash
pnpm deploy:menu
```

或直接部署：

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Cloudflare 部署腳本會自動讀取 Pages 專案設定的 Production 分支；只有需要明確覆寫時才傳入 `--branch=<分支名稱>`。

## 驗證

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm test
pnpm analyze
```
