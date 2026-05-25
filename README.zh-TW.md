# Astro 多語部落格模板

這是一個可公開上傳 GitHub 的 Astro 靜態部落格模板，內建繁體中文、英文、簡體中文頁面，並提供 Cloudflare Pages、VPS、Vercel 的自動部署腳本。

<p align="center">
  <a href="https://blog.ouoxo.com/en/">Live Demo</a>
  &middot;
  <a href="./README.md">English README</a>
</p>

## 指南

- [Markdown 寫作指南](./MARKDOWN_GUIDE.md)
- [英文書籤區維護指南](./BOOKMARKS_GUIDE.en.md)
- [書籤區維護指南](./BOOKMARKS_GUIDE.zh-TW.md)
- [英文部署指南](./DEPLOYMENT.en.md)
- [繁體中文部署指南](./部屬前須知.md)
- [腳本總覽](./scripts/README.en.md)

## 專案架構

```text
.
|-- public/
|   |-- _headers
|   |-- google6985a4c1e557f41b.html
|   `-- images/
|-- scripts/
|   |-- deploy_menu.mjs
|   |-- deploy_switch.mjs
|   |-- deploy_lib.mjs
|   |-- uploaddist_cf.mjs
|   |-- uploaddist_vps.mjs
|   |-- uploaddist_vercel.mjs
|   |-- upgrade_astro.mjs
|   `-- README.en.md
|-- src/
|   |-- components/
|   |-- content/blog/
|   |   |-- zh-tw/
|   |   |-- en/
|   |   `-- zh-cn/
|   |-- i18n/
|   |-- layouts/
|   |-- lib/
|   |-- pages/
|   |   |-- en/
|   |   |-- zh-cn/
|   |   `-- index.astro
|   `-- styles/
|-- astro.config.mjs
|-- package.json
|-- DEPLOYMENT.en.md
`-- 部屬前須知.md
```

繁體中文是預設語系，網址使用根路徑 `/`。英文使用 `/en/`，簡體中文使用 `/zh-cn/`。

## 快速開始

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

也可以使用 npm：

```bash
npm install
npm run build
```

## 部署

使用互動選單：

```bash
pnpm deploy:menu
```

常用直接部署指令：

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

部署前請先閱讀 [部屬前須知.md](./部屬前須知.md)。請從範例檔建立自己的 `.env` 設定，並確認不要把金鑰或私密設定提交到公開倉庫。

## 維護

- 發布或部署前執行 `pnpm selfcheck -- --quick`。
- 更新 Astro 時執行 `pnpm upgrade:astro`，走安全升級流程。
- 程式碼註解請使用英文，避免跨平台編碼問題。
- 除非真的量測到 CSS 體積問題並準備好完整視覺測試，否則不要重新加入 PurgeCSS。
