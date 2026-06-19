# 腳本總覽

這個資料夾包含跨平台 Node.js 腳本，用於部署、專案分析、自檢、測試與 Astro 升級。

## 部署腳本

- `deploy_menu.mjs`：互動式部署選單，適合一步一步選擇部署目標與選項。
- `deploy_switch.mjs`：命令列部署模式切換器，適合直接指令或 CI/CD。
- `deploy_i18n.mjs`：部署腳本共用語系字典，支援英文與繁體中文輸出。
- `deploy_lib.mjs`：共用部署模式與指令產生邏輯。
- `deploy_runtime.mjs`：偵測 Node.js、npm、pnpm 與跨平台 package runner。
- `deploy_safety.mjs`：部署前 `.gitignore` 與敏感檔案安全檢查。
- `uploaddist_cf.mjs`：建置 Astro 並部署 `dist/` 到 Cloudflare Pages。
- `uploaddist_vps.mjs`：建置 Astro 並透過 SSH/rsync 上傳 `dist/` 到 VPS。
- `uploaddist_vercel.mjs`：透過 Vercel CLI 建置或部署。
- `upgrade_astro.mjs`：安全升級 Astro 相關套件，並執行既有 `check`、`lint`、`build`。

## 根目錄需要哪些檔案

部署腳本會讀取專案根目錄的 env 檔：

```text
.env                 共用公開網站設定
.env.cloudflare      Cloudflare Pages 部署設定
.env.vps             VPS SSH/rsync 部署設定
.env.vercel          Vercel 部署設定
```

從已提交的範例檔複製：

```bash
cp .env.example .env
cp .env.cloudflare.example .env.cloudflare
cp .env.vps.example .env.vps
cp .env.vercel.example .env.vercel
```

真實檔案必須被 git ignore。只提交 `.env.example`、`.env.cloudflare.example`、`.env.vps.example`、`.env.vercel.example`。

## 部署前需要取得的資料

Cloudflare Pages：

- `CLOUDFLARE_API_TOKEN`：Cloudflare Dashboard > My Profile > API Tokens > Create Token
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 帳號頁面右側資訊欄
- `CLOUDFLARE_PAGES_PROJECT_NAME`：Cloudflare Pages 專案名稱
- `PUBLIC_SITE_URL`：正式網站 URL

VPS：

- `VPS_HOST`、`VPS_PORT`、`VPS_USER`：從 VPS 服務商面板或伺服器設定取得
- `VPS_TARGET_DIR`：web server 服務目錄，或部署暫存目錄
- `VPS_SSH_KEY_PATH`：本機私鑰路徑
- `VPS_SSH_PASSPHRASE`：可選；能用 `ssh-agent` 時優先用 `ssh-agent`

Vercel：

- `VERCEL_TOKEN`：Vercel Account Settings > Tokens
- `VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`：執行 `vercel link` 後從 `.vercel/project.json` 取得

## 使用方式

互動式部署：

```bash
pnpm deploy:menu
npm run deploy:menu
```

指定介面語言：

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
```

直接部署：

```bash
pnpm deploy:switch -- --mode=direct:cf --lang=zh-tw
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

## 非部署腳本

- `analysis.mjs`：專案檢查與分析。
- `run-e2e.mjs`：端對端測試。

發布 template 變更前建議跑快速自檢：

```bash
pnpm selfcheck -- --quick
```

較大的變更可跑完整分析：

```bash
pnpm analyze
```

自檢腳本會檢查 `.gitignore` 覆蓋、危險程式碼模式、重要元件串接、public scripts 與可疑敏感檔案。

## VPS 使用者與權限

VPS 上傳使用 `.env.vps` 的 `VPS_USER`。

```env
VPS_HOST=203.0.113.10
VPS_PORT=22
VPS_USER=deploy
VPS_TARGET_DIR=/var/www/example.com
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_SSH_PASSPHRASE=your_private_key_passphrase
```

如果 `VPS_USER` 不是 `root`，可能無法直接寫入 `/var/www/...`。這種情況可先上傳到 `/home/<user>/site-dist`，再由伺服器端同步到 web server 服務的目錄。

## Git Ignore 要求

`.gitignore` 應阻擋機密與產生物：

```text
.env
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

如果新增部署平台或改 env 檔名，請同時更新 `.gitignore`、相關 `.env.*.example` 與本說明。
