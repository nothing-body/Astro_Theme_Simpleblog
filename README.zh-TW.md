# Astro 多語部落格模板

這是一個可公開上傳 Git 平台的 Astro 靜態多語部落格模板，內建 Cloudflare Pages、VPS、Vercel 的自動部署腳本。

[線上示範](https://blog.ouoxo.com/)

## 語言

<table>
  <tr>
    <td align="center"><strong>English</strong><br><a href="./README.en.md">Open English README</a></td>
    <td align="center"><strong>繁體中文</strong><br><a href="./README.zh-TW.md">開啟繁體中文 README</a></td>
  </tr>
</table>

## 指南

- [Markdown 寫作指南](./MARKDOWN_GUIDE.md)
- [英文部署指南](./DEPLOYMENT.en.md)
- [繁體中文部署前須知](./部屬前須知.md)
- [腳本總覽](./scripts/README.en.md)

## 公開版專案架構

```text
.
├─ public/
│  ├─ _headers
│  ├─ favicon.svg
│  ├─ robots.txt
│  └─ images/
├─ scripts/
│  ├─ deploy_menu.mjs
│  ├─ deploy_switch.mjs
│  ├─ deploy_lib.mjs
│  ├─ uploaddist_cf.mjs
│  ├─ uploaddist_vps.mjs
│  ├─ uploaddist_vercel.mjs
│  ├─ upgrade_astro.mjs
│  └─ README.en.md
├─ src/
│  ├─ components/
│  ├─ content/
│  │  └─ blog/
│  │     ├─ zh-tw/
│  │     ├─ en/
│  │     └─ zh-cn/
│  ├─ i18n/
│  ├─ layouts/
│  ├─ lib/
│  ├─ pages/
│  └─ styles/
├─ .github/workflows/
├─ astro.config.mjs
├─ package.json
├─ wrangler.toml
├─ DEPLOYMENT.en.md      英文部署指南
├─ 部屬前須知.md          繁體中文部署指南
└─ MARKDOWN_GUIDE.md
```

### 目錄說明

- `public/`：會直接複製到最終網站的靜態資源。可放 favicon、robots 規則、站長驗證檔、公開圖片與平台 header 檔；不要放任何密鑰。
- `public/_headers`：給支援 header 檔的平台使用的安全標頭。加入分析工具、外部腳本、字型或圖片 CDN 前，請檢查 CSP 規則。
- `scripts/`：跨平台部署與維護腳本。使用 Node.js 撰寫，可在 Windows、macOS、Linux 上用 pnpm 或 npm 執行。
- `scripts/deploy_menu.mjs`：雙語互動式部署選單。
- `scripts/deploy_switch.mjs`：可直接用指令列指定部署模式的切換腳本。
- `scripts/deploy_lib.mjs`：部署腳本共用工具庫。
- `scripts/uploaddist_cf.mjs`：建置網站並把產生的 `dist` 部署到 Cloudflare Pages。
- `scripts/uploaddist_vps.mjs`：建置網站並透過 SSH/SCP 或 rsync 類指令把 `dist` 上傳到 VPS。
- `scripts/uploaddist_vercel.mjs`：建置網站並把產生的 `dist` 部署到 Vercel。
- `scripts/upgrade_astro.mjs`：安全升級 Astro 的輔助腳本，支援 dry run 與升級後檢查。
- `src/content/blog/`：依語系分類的 Markdown 文章。每篇文章使用 frontmatter 設定標題、日期、語言、標籤、草稿狀態與選用的置頂排序。
- `src/content/blog/zh-tw/`：繁體中文文章。
- `src/content/blog/en/`：英文文章。
- `src/content/blog/zh-cn/`：簡體中文文章。
- `src/components/`：可重用 Astro UI 元件，例如文章卡片、導覽、標籤、麵包屑與內容區塊。
- `src/layouts/`：文章頁與網站頁面共用版型。
- `src/lib/`：共用網站邏輯、文章排序、metadata helper 與其他可重用工具。共同行為應優先放這裡，避免在頁面中重複。
- `src/i18n/`：多語文字與語系相關工具。
- `src/pages/`：Astro 路由，包含首頁、文章頁、分頁列表、分類頁、標籤頁、RSS、sitemap 相關頁面與站長驗證檔。
- `src/styles/`：全域 CSS 與共用樣式。大範圍版面與主題規則放這裡，讓元件樣式更可預測。
- `.github/workflows/`：GitHub Actions 範例。使用前請在 GitHub 專案設定啟用 Actions 並設定 secrets。
- `.gitlab-ci.yml`：GitLab CI/CD 範例。使用前請先設定 GitLab variables。
- `.woodpecker.yml`：Codeberg/Woodpecker CI 範例。使用前請先設定 Woodpecker secrets。
- `.env.*.example`：安全的環境變數範本。請在本機建立真正的 `.env.cloudflare`、`.env.vps` 或 `.env.vercel`，不要提交密鑰、token、SSH 私鑰、建置產物或依賴資料夾。
- `astro.config.mjs`：Astro 專案設定。部署到子路徑前請檢查 `site`、integrations 與 `base`。
- `wrangler.toml`：Cloudflare Pages 與 Wrangler 相關設定。
- `DEPLOYMENT.en.md`：英文部署指南。
- `部屬前須知.md`：繁體中文部署指南。
- `MARKDOWN_GUIDE.md`：給新手使用的 Markdown 文章寫作指南。

## 快速開始

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

也支援 npm：

```bash
npm install
npm run check
npm run build
npm run dev
```

## 公開安全模板

這份模板已整理成適合公開 Git 託管的狀態：

- 真實 `.env` 檔案已排除。
- 私人文章、GA4 ID、API key、token 與個人網域已移除。
- 範例值使用 `example.com`。
- 部署腳本是跨平台 Node.js 腳本。
- 支援 pnpm 與 npm。

## 文章內容

部落格文章放在：

```text
src/content/blog
```

模板內每個支援語系都包含一篇公開安全範例文章：

```text
src/content/blog/zh-tw/getting-started.md
src/content/blog/en/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

這些文章使用 `draft: false`，所以 clone 後首頁、文章列表、分類頁、標籤頁、sitemap 與部署檢查都能立即正常運作。

## 部署前請先改名與設定

請檢查並修改：

- `package.json`：專案 package 名稱。
- `wrangler.toml`：Cloudflare Pages project name。
- `.env.cloudflare`：`CLOUDFLARE_PAGES_PROJECT_NAME`。
- `src/lib/site.ts`：網站名稱、作者、網址、描述與聯絡信箱。
- `astro.config.mjs`：`site` fallback 與任何 `base` 設定。
- `public/_headers`：真實網域與第三方資源需要的 CSP 與安全標頭。

## 部署

雙語互動選單：

```bash
pnpm deploy:menu
npm run deploy:menu
```

直接部署範例：

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Dry run：

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
npm run deploy:switch -- --mode=direct:cf --dry-run
```

## 安全升級 Astro

```bash
pnpm upgrade:astro -- --lang=zh-tw --dry-run
pnpm upgrade:astro -- --lang=zh-tw
npm run upgrade:astro -- --lang=zh-tw --dry-run
```

升級腳本會偵測 Astro 相關套件，預設拒絕在 dirty git 狀態下升級，支援 pnpm/npm，並使用既有的 `check`、`lint`、`build` 腳本驗證升級結果。
