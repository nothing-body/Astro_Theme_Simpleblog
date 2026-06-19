# 部署前須知

這份文件說明如何準備、檢查、升級與部署這個 Astro 部落格專案。部署腳本會先執行專案的 `build` script，再上傳產生的 `dist/`。

## 1. 基本需求

建議版本：

```bash
node --version
pnpm --version
npm --version
```

建議使用 Node.js 22.12.0 或更新版本。專案偏好 pnpm，但也支援 npm。

如果尚未安裝 pnpm：

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## 2. 需要哪些檔案

專案根目錄應保留這些範例檔與本機設定檔：

```text
.env.example                 可提交的公開設定範例
.env.cloudflare.example      可提交的 Cloudflare 範例
.env.vps.example             可提交的 VPS 範例
.env.vercel.example          可提交的 Vercel 範例
.env                         本機公開網站設定，不提交
.env.cloudflare              Cloudflare 部署設定，不提交
.env.vps                     VPS 部署設定，不提交
.env.vercel                  Vercel 部署設定，不提交
.gitignore                   阻擋憑證、建置輸出、本機狀態與報告
```

從範例檔複製出真實本機檔：

```bash
cp .env.example .env
cp .env.cloudflare.example .env.cloudflare
cp .env.vps.example .env.vps
cp .env.vercel.example .env.vercel
```

只提交 `.example` 檔。不要提交真實 token、私鑰、Account ID、SSH passphrase、provider project ID 或網站驗證檔。

建議 `.gitignore` 至少包含：

```text
.env
.env.local
.env.production
.env.*.local
.env.cloudflare
.env.vps
.env.vercel
.env*.secret
.npmrc
.yarnrc
.pnpmrc
.ssh/
*.pem
*.key
id_rsa
id_ed25519
dist/
.astro/
node_modules/
.wrangler/
.vercel/
playwright-report/
test-results/
```

## 3. 安裝、檢查、建置

pnpm：

```bash
pnpm install
pnpm check
pnpm lint
pnpm build
```

npm：

```bash
npm install
npm run check
npm run lint
npm run build
```

`build` 會產生部署用的 `dist/` 目錄。

## 4. 網站 URL、SEO、robots.txt

在 `.env` 或部署環境中設定正式網址：

```env
PUBLIC_SITE_URL=https://example.com
```

這個值會用於 sitemap、canonical URL 與 structured data。公開模板請使用 `https://example.com` 這類 placeholder；私人站才填真實網域。

## 5. Google Search Console 驗證

如果使用 HTML 檔驗證，把 Google Search Console 提供的檔案放進 `public/`。

```text
public/googlexxxxxxxxxxxxxxxx.html
```

建置後 Astro 會把 `public/` 複製到網站根目錄。部署後確認這個網址能打開：

```text
https://example.com/googlexxxxxxxxxxxxxxxx.html
```

公開模板通常不應提交真實 Google 驗證檔。

## 6. Google Analytics

GA4 使用：

```env
PUBLIC_GA4_ID=G-XXXXXXXXXX
```

只有在 `PUBLIC_GA4_ID` 有設定、格式正確，且訪客允許 analytics cookie 時才會載入。公開模板可留空。

## 7. Cloudflare Pages

建立 `.env.cloudflare`：

```bash
cp .env.cloudflare.example .env.cloudflare
```

典型內容：

```env
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_PAGES_PROJECT_NAME=your-pages-project-name
PUBLIC_SITE_URL=https://example.com
```

取得方式：

- API token：Cloudflare Dashboard > My Profile > API Tokens > Create Token
- 權限：至少需要目標帳號的 Cloudflare Pages edit 權限
- Account ID：Cloudflare 帳號頁面的右側資訊欄
- Pages project name：Cloudflare Pages 專案名稱；若專案不存在，腳本可建立專案並寫回 `.env.cloudflare`

部署：

```bash
pnpm deploy:cf:only
npm run deploy:cf:only
```

## 8. VPS

建立 `.env.vps`：

```bash
cp .env.vps.example .env.vps
```

典型內容：

```env
VPS_HOST=xxx.xxx.xxx
VPS_PORT=22
VPS_USER=deploy
VPS_TARGET_DIR=/var/www/example.com
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_SSH_PASSPHRASE=your_private_key_passphrase
```

取得方式與注意事項：

- `VPS_HOST`、`VPS_PORT`、SSH 使用者可從 VPS 服務商面板或伺服器設定取得
- 若沒有 SSH key，可用 `ssh-keygen` 建立，然後把 public key 加到伺服器使用者的 `~/.ssh/authorized_keys`
- `VPS_TARGET_DIR` 應是 web server 實際服務的目錄，或是你會再同步到 web root 的暫存目錄
- 優先使用 `ssh-agent` 管理有 passphrase 的私鑰
- `VPS_SSH_PASSPHRASE` 只能放在本機未提交的 `.env.vps` 或 CI/CD secret

部署：

```bash
pnpm deploy:vps:only
npm run deploy:vps:only
```

## 9. Vercel

建立 `.env.vercel`：

```bash
cp .env.vercel.example .env.vercel
```

典型內容：

```env
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_or_user_id
VERCEL_PROJECT_ID=your_project_id
```

取得方式：

- `VERCEL_TOKEN`：Vercel Account Settings > Tokens
- `VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`：執行 `vercel link` 後可從 `.vercel/project.json` 讀取
- `.vercel/` 通常不要提交，除非你明確想提交專案綁定資訊

部署：

```bash
pnpm deploy:vercel:only
npm run deploy:vercel:only
```

## 10. 雙語部署選單

互動式選單：

```bash
pnpm deploy:menu
npm run deploy:menu
```

指定介面語言：

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
```

非互動式部署：

```bash
pnpm deploy:switch -- --mode=direct:cf --lang=zh-tw
pnpm deploy:switch -- --mode=direct:vps --lang=zh-tw
DEPLOY_LANG=zh-tw pnpm deploy:cf:only
```

常用組合：

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:cf:vps
pnpm deploy:cf:vercel
pnpm deploy:vps:vercel
pnpm deploy:all
```

## 11. 自檢腳本

快速檢查：

```bash
pnpm selfcheck -- --quick
```

完整專案分析：

```bash
pnpm analyze
```

自檢腳本會檢查常見危險語法、必要元件串接、重要 public scripts、`.gitignore` 規則與可疑敏感檔案。同步公開版或發布前建議先跑一次。

## 12. 書籤

書籤元件位於：

```text
src/components/BookmarkLinks.astro
```

在 `groupLabels` 新增三語分類名稱，再到 `bookmarkRows` 新增連結。建議使用 `https://`，外部連結保留 `target="_blank"` 與 `rel="noopener noreferrer"`。

範例請看 [繁體中文書籤指南](./BOOKMARKS_GUIDE.zh-TW.md)。

## 13. 外部網站確認頁

Markdown 內指向外部 origin 的 HTTP/HTTPS 連結，建置時會自動改寫到離站提示頁。

路由：

```text
/leaving
/zh-tw/leaving
/zh-cn/leaving
```

相關檔案：

```text
astro.config.mjs                         remark 改寫與建置後語系修正
src/components/LeavingNotice.astro       提示頁文字與目標 URL 驗證
src/pages/leaving.astro                  英文路由
src/pages/zh-tw/leaving.astro            繁體中文路由
src/pages/zh-cn/leaving.astro            簡體中文路由
```

要改提示文字，編輯 `src/components/LeavingNotice.astro`。要調整哪些連結會被改寫，編輯 `astro.config.mjs` 的 helper functions，然後執行 `pnpm build` 並檢查 `dist/` 內產生的連結。
