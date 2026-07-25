# Astro Theme SimpleBlog

一套 Astro 三語靜態部落格範本，支援 Markdown、Pagefind 搜尋、Partytown、SEO、安全標頭，以及跨 Windows、macOS、Linux 的 TypeScript 部署工具。

<p align="center">
  <a href="https://blog.gkbb.de/">Live Demo</a>
  &middot;
  <a href="./README.md">English</a>
  &middot;
  <a href="./README.zh-CN.md">简体中文</a>
</p>

## 快速開始

需要 Node.js 22.12 以上。專案提交 `pnpm-lock.yaml`，因此建議使用 pnpm。

```bash
pnpm install
Copy-Item .env.example .env
pnpm dev
```

macOS／Linux 可用 `cp .env.example .env`。沒有 pnpm 時，腳本會自動改用 npm：

```bash
npm install
npm run dev
npm run check
npm run build
```

## 語系與路由

- 英文預設路由：`/`
- 繁體中文：`/zh-tw/`
- 簡體中文：`/zh-cn/`
- 第一頁文章列表固定使用 `/posts/`，第二頁起使用 `/page/2`。
- 不保留重複的 `/page/1` 或舊 `/en` 路由。

翻譯文章請使用相同檔名：

```text
src/content/blog/en/getting-started.md
src/content/blog/zh-tw/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

## 技術棧

- Astro 靜態輸出、Vite 與 strict TypeScript
- 透過 `@tailwindcss/vite` 使用 Tailwind CSS v4，搭配 Astro scoped CSS 與共用 CSS
- Astro Sitemap 與自訂三語 alternate 產出
- Pagefind 靜態全文搜尋與三語篩選
- Partytown 將經同意的 GA4 移出主執行緒
- Astro Markdown／Remark、GFM、自訂指令、Prism 與 raw HTML 禁止策略
- Sharp 與 Astro assets 處理有界限的響應式文章圖片
- Jest、Playwright、Astro Check、ESLint、Stylelint、Knip、OSV 與 Lighthouse
- Cloudflare、Vercel、Netlify、VPS、VPS Docker、Supabase Edge Functions 的 TypeScript 部署工具

## 現有架構

```text
src/content/blog/          Markdown 文章與共用文章圖片
src/pages/                 英文及共用 Astro 路由
src/pages/zh-tw/           繁體中文路由
src/pages/zh-cn/           簡體中文路由
src/components/            共用 Astro 元件
src/layouts/               文件與文章 Layout
src/i18n/                  三語介面與跨語路由
src/integrations/          sitemap 與 hreflang 產出後處理
src/lib/                   URL、文章、分類與網站 helper
src/markdown/              Markdown 安全與圖片處理
src/scripts/               瀏覽器端 TypeScript
scripts/                   自檢與部署工具
deploy/                    Nginx 與 VPS Docker 設定
public/                    靜態資產與跨平臺安全標頭
tests/                     瀏覽器測試
```

主要元件：

- `BaseLayout.astro`：HTML 外殼、SEO、導覽、隱私設定與共用腳本。
- `PostsPage.astro`：三語文章列表與分頁共用唯一呈現實作。
- `BlogPostLayout.astro`：文章 metadata、JSON-LD、麵包屑、Pagefind、分類及標籤。
- `SearchPage.astro`：三語搜尋介面；`src/scripts/search.ts` 使用安全 DOM API 建立結果。
- `HeadMeta.astro`：canonical、hreflang、Open Graph、Twitter 與 GA4 設定。
- `ExternalLink.astro` 與 `LeavingNotice.astro`：把外部目的地保留在 URL fragment，顯示不呼叫 API 的三語提示。
- `src/markdown/processor.ts`：禁止 raw HTML、保護外部連結並套用文章圖片政策。
- `src/integrations/localized-output.ts`：在產出後驗證及補充三語 sitemap alternates。
- `scripts/checks/`：檢查原始碼、文章、圖片、秘密、安全標頭、SEO、正式產物、文件與選用信譽整合。

預設資料流：

```text
Markdown -> 安全 Markdown／圖片流程 -> Astro 靜態路由 -> Pagefind 索引
外部連結 -> 三語靜態離站提示 -> 使用者確認後前往
部署選單 -> 驗證 TypeScript 目標 -> 上傳 dist 產物
```

## 主要功能

- 英文、繁中、簡中 Markdown 文章、分類、標籤、置頂、草稿及分頁
- Pagefind 全文搜尋、分類與標籤篩選
- Astro 響應式圖片、尺寸、`srcset`、延遲載入及檔案大小限制
- canonical、hreflang、sitemap、robots.txt、JSON-LD 與社群預覽
- 經同意後使用 Partytown 將 GA4 移出主執行緒
- 不使用 `unsafe-inline` 的 CSP、防 MIME sniffing、防 iframe 嵌入
- reduced-motion、低 CPU／RAM、Save-Data 與慢速網路模式
- Windows、macOS、Linux 共用 TypeScript 部署腳本
- 雙模式離站自檢：預設靜態提示，明確宣告後可檢查 `local-feed` 或 `remote-api` 信譽整合

Pagefind 目前不支援 `zh-tw`、`zh-cn` 詞幹分析。建置 Note 不是錯誤，中文搜尋仍能使用；只想隱藏資訊提示時，可在 Pagefind 指令加入 `--quiet`。

## 設定

範例：

```text
.env.example
.env.cloudflare.example
.env.vercel.example
.env.netlify.example
.env.supabase.example
.env.vps.example
.env.vps-docker.example
```

共用公開設定：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=Astro Simple Blog
PUBLIC_SITE_AUTHOR=Site Author
PUBLIC_SITE_DESCRIPTION=A multilingual Astro blog for notes, guides, and articles.
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

不可提交真實 `.env*`、Token、帳號／專案 ID、SSH 私鑰、密碼、私人文章或圖片；`.gitignore` 已預設排除。

## 部署

```bash
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
```

Cloudflare Pages、Vercel、Netlify、VPS 與 VPS Docker 部署靜態網站。Supabase 指令只部署 `supabase/functions/<名稱>/index.ts` 的 Edge Functions，Supabase Edge Functions 不是靜態網站主機。

`pnpm deploy:menu` 提供英文、繁體中文、簡體中文介面；專案也包含 GitHub Actions、GitLab CI 與 Codeberg/Woodpecker 範例。完整步驟請閱讀 [DEPLOYMENT.zh-TW.md](./DEPLOYMENT.zh-TW.md)。

## 選用網址信譽檢測

`OPENPHISH_GUIDE.*.md` 提供獨立建置教學，可使用 Cloudflare、Netlify、Vercel、Supabase 或其他後端。自檢支援：

- `local-feed`：OpenPhish、URLhaus 或其他同步到私人儲存空間的清單
- `remote-api`：Google Safe Browsing、Google Web Risk、VirusTotal 或其他固定 server-to-server 供應商

完成實作後才把 `link-reputation.audit.example.json` 複製為 `link-reputation.audit.json`，選擇策略、填寫供應商名稱並列出實際 client／後端／揭露文件。Manifest 只能保存路徑與架構資訊，不可放 endpoint、API key、Token、帳號／專案／儲存 ID 或資料庫憑證。

使用前必須確認供應商授權與資料流。Google Safe Browsing 直接 URL 查詢會把待查網址送到 Google，因此對使用者的說明不可聲稱網址只留在本站。

## 教學

- [部署](./DEPLOYMENT.zh-TW.md)
- [Markdown 與設定](./MARKDOWN_GUIDE.zh-TW.md)
- [書籤](./BOOKMARKS_GUIDE.zh-TW.md)
- [選用網址信譽檢測](./OPENPHISH_GUIDE.zh-TW.md)
- [腳本](./scripts/README.zh-TW.md)
- [自檢規則](./SELF_CHECK_GUIDE.zh-TW.md)

## 驗證

```bash
pnpm check
pnpm audit:security
pnpm build
pnpm test:e2e
pnpm selfcheck -- --quick
pnpm analyze
```

`pnpm analyze` 會完整檢查建置輸出、SEO、CSP、路由、文章、依賴、部署規劃及瀏覽器行為。
