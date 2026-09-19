# 從下載到自動部署：零基礎操作指南

搭配[平台部署教學](DEPLOYMENT.zh-TW.md)、[文章範例](MARKDOWN_GUIDE.zh-TW.md)與[書籤設定](BOOKMARKS_GUIDE.zh-TW.md)使用。以下網域、IP、ID 都是範例；不要把真實 token 寫進公開文章。

## 1. 準備工具並在本機開站

安裝 Node.js（受支援的 LTS，至少 22.12）、Git、pnpm。Windows 開 PowerShell；macOS／Linux 開終端機。先切換到下載的專案資料夾，確認裡面有 `package.json`，再執行：

```sh
node --version
git --version
corepack enable
corepack prepare pnpm@10.33.4 --activate
pnpm install --frozen-lockfile
```

沒有 Corepack 時參考 [pnpm 安裝說明](https://pnpm.io/installation)。版本應符合 `package.json` 的 `packageManager`；不要靠刪除鎖定檔解決安裝錯誤。

Windows 執行 `Copy-Item .env.example .env`；macOS／Linux 執行 `cp .env.example .env`。用文字編輯器開啟新建立的 `.env`：

```dotenv
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的筆記
PUBLIC_SITE_AUTHOR=Alex
PUBLIC_SITE_DESCRIPTION=記錄我的專案與閱讀心得。
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

執行 `pnpm dev`，開啟終端機印出的本機網址。修改文字、儲存後重新整理；按 Ctrl+C 停止。`PUBLIC_` 表示會公開，不能放部署密碼或 token。聯絡信箱也會公開顯示。

## 2. 各種 .env 要怎麼分工

| 檔案 | 放什麼 | 誰會讀取 |
| --- | --- | --- |
| `.env` | 共用公開站點設定 | Astro |
| `.env.production` | 正式建置的公開設定 | `pnpm build` 的 Astro |
| `.env.cloudflare` | Cloudflare 部署憑證 | Cloudflare 部署命令 |
| `.env.vercel` | Vercel 部署憑證 | Vercel 部署命令 |
| `.env.netlify` | Netlify 部署憑證 | Netlify 部署命令 |
| `.env.vps` | SSH 與靜態網站目錄 | VPS 部署命令 |
| `.env.vps-docker` | SSH 與 Docker 目錄 | VPS Docker 部署命令 |
| `.env.supabase` | 函式部署憑證 | Supabase 部署命令 |

需要正式設定時，複製 `.env.example` 為 `.env.production` 再修改公開值；平台檔案從各自的 `.example` 複製。它們不會互相代替：`pnpm dev` 不會自動讀 `.env.cloudflare`。已存在的程序／CI 環境變數優先於部署檔；Astro 正式模式的設定優先於共用 `.env`，但仍低於程序變數。每個名稱只寫一次，不使用 shell 運算式或多行值。SSH 私鑰放獨立檔案，不要塞進本機 `.env`。

提交前執行 `git status --short`、`git check-ignore .env .env.production .env.cloudflare`，確認真實設定被忽略。`.gitignore` 不會清除已提交的秘密，也不能阻止 Astro 把 `public/` 內的秘密複製到網站。不要在 `public/`、`src/`、文章放金鑰。若已公開，先到供應商撤銷並更換，再處理 Git 歷史。

## 3. 取得平台憑證並部署

先選一個平台，複製對應範例檔、填好欄位，再從專案資料夾執行命令。

| 平台 | 取得方式與欄位 | 命令 |
| --- | --- | --- |
| Cloudflare | 個人資料 → API Tokens → Create Token，選目標帳號的 **Cloudflare Pages: Edit**。Token 填 `CLOUDFLARE_API_TOKEN`；控制台 Account ID 填 `CLOUDFLARE_ACCOUNT_ID`；Pages 專案的完整名稱填 `CLOUDFLARE_PAGES_PROJECT_NAME`。 | `pnpm deploy:cf:only` |
| Vercel | 帳號設定建立 token，選正確範圍與期限。專案設定複製 Project ID，分別填 `VERCEL_TOKEN`、`VERCEL_PROJECT_ID`。團隊專案另填團隊 ID 至 `VERCEL_ORG_ID`，實際小寫專案名稱填 `VERCEL_PROJECT_NAME`。 | `pnpm deploy:vercel:only` |
| Netlify | 使用者設定 → Applications → Personal access tokens，填 `NETLIFY_AUTH_TOKEN`；專案設定的 Project ID 填 `NETLIFY_SITE_ID`。 | `pnpm deploy:netlify:only` |
| Supabase | 帳號 Access Tokens 建立 token；可用細分權限時限定目標專案與 Edge Functions 讀寫。填 `SUPABASE_ACCESS_TOKEN`；控制台網址 `/project/<ref>` 的 ref 填 `SUPABASE_PROJECT_REF`。 | `pnpm deploy:supabase:only` |

Supabase 只部署 `supabase/functions/<名稱>/index.ts`，不託管部落格 HTML。部署 token 與 publishable、anon、service-role key 不同；靜態範本不需要資料庫金鑰。先照平台教學的 hello 範例建立函式，保持 JWT 驗證並使用 Supabase 已驗證的測試介面。不要為了解決驗證錯誤，把 service-role key 放進瀏覽器程式。

設定最小權限與期限，將只顯示一次的 token 存入密碼管理器，不截圖。401 通常是缺少／過期 token；403 通常是帳號或權限不符，先確認專案再重試。官方說明：[Cloudflare](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[Vercel](https://vercel.com/docs/rest-api)、[Netlify](https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/)、[Supabase](https://supabase.com/docs/guides/functions/deploy)。

## 4. SSH、VPS 與 Docker

本機安裝 OpenSSH Client，建立專用部署金鑰並設定密語：

```sh
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/blog_deploy
```

`.pub` 是公鑰，沒有 `.pub` 的檔案是私鑰。Windows 用 `Get-Content $HOME/.ssh/blog_deploy.pub` 顯示公鑰；macOS／Linux 用 `cat ~/.ssh/blog_deploy.pub`。透過供應商控制台建立非 root 的 `deploy` 帳號，把公鑰以一整行附加到該帳號的 `~/.ssh/authorized_keys`；伺服器上 `.ssh` 權限設 700、`authorized_keys` 設 600。不要覆寫其他既有公鑰。

從供應商控制台取得伺服器指紋，第一次執行 `ssh deploy@你的主機` 時比對，相符才接受。單用 `ssh-keyscan` 不算驗證主機。`.env.vps` 設 `VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts`、`VPS_SSH_KEY_PATH=~/.ssh/blog_deploy`，再填主機、使用者與連接埠。macOS／Linux 私鑰權限設 600；優先用 ssh-agent 管理密語。

請管理員建立供 deploy 寫入的專用父目錄，例如 `/var/www/blog-sites`，然後設 `VPS_TARGET_DIR=/var/www/blog-sites/example.com`。部署會建立暫存目錄並替換目的地，因此需要**父目錄**寫入權，不只是目的地權限。不可填 `/`、`/etc`、家目錄或含其他資料的目錄。上線前設定 HTTPS、Nginx 與安全標頭。部署工具可在 Windows／macOS／Linux 執行；遠端 VPS 範例以 Linux／OpenSSH 為前提。

Docker 使用 `.env.vps-docker`、專用 `VPS_DOCKER_APP_DIR`、Linux 容器及 Compose。預設只綁 `127.0.0.1:8080`，前面接 HTTPS 反向代理；在**伺服器上**用 `curl -I http://127.0.0.1:8080` 測試。Docker 操作權限很高，只授予你管理的部署帳號。替換既有安裝前先備份。

## 5. 上傳後自動更新網站

在 Git 平台建立空白儲存庫，再於本機專案執行：

```sh
git status --short
git add .
git diff --cached --stat
git commit -m "Configure blog"
git remote add origin 你的儲存庫Clone網址
git push -u origin main
```

分支以 `git branch --show-current` 實際結果為準。已有遠端時先用 `git remote -v` 查看，不要重複新增。提交前檢查暫存的檔名與內容，不要手動上傳 `.env`、私鑰、`dist` 或 `node_modules`。

**GitHub：**儲存庫 Settings → Environments 建立 `production` 並限制部署分支。Secrets and variables → Actions 放平台 token／ID；Variables 放 `PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`、`DEPLOY_MODE=direct:cf`（改為所選平台）。VPS 另外以 secret 放完整多行私鑰 `VPS_SSH_PRIVATE_KEY`、已驗證主機紀錄 `VPS_SSH_KNOWN_HOSTS`，並設定 VPS 欄位。完成設定後推送 main／master，到 Actions → Deploy Website 查看結果。

**GitLab：**Settings → CI/CD → Variables 加入同名變數，保護正式分支與憑證，限定 production 環境。多行 SSH key 不一定能使用 masked，必須限制存取且不可輸出。此流程接收金鑰**內容**，不是 File 類型變數的檔案路徑。Runner 需要 Node、OpenSSH 與網路。推送後至 Build → Pipelines 查看 `.gitlab-ci.yml` 執行結果。

**Codeberg：**先取得可用的 Woodpecker 服務／自架 runner，啟用儲存庫，再把 `.woodpecker.yml` 指定的名稱加入 repository secrets，也加入 `DEPLOY_MODE` 與公開站點設定。單純建立 Codeberg 儲存庫不代表已有 CI 執行資格。推送後到 Woodpecker 查看建置，只允許正式分支部署。

GitLab／Codeberg 的容器在 VPS 部署前需要 OpenSSH Client。同一目的地選擇平台 Git 自動建置或這套直接上傳流程其中一個，避免兩者互相覆蓋。之後修改 → 檢查 → commit → push 即可。API 接受上傳不代表已啟用；到平台部署頁確認 ready 狀態，再開正式網域。

## 6. 驗證與故障排除

```sh
pnpm check
pnpm build
pnpm selfcheck
```

`--quick` 會略過產物、網路漏洞稽核與瀏覽器／部署驗證，不是完整發版檢查。完整檢查需要網路與瀏覽器。ungoogled-chromium 使用實際執行檔路徑：PowerShell 設 `$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='C:/path/chrome.exe'`；macOS／Linux 設 `export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/chromium`，再執行 `pnpm test:e2e`。

測試 `/`、`/zh-tw/`、`/zh-cn/`、文章、搜尋與不存在路徑；从文章及分類切換語言。翻譯文章使用相同相對檔名，對應翻譯的 tags 保持相同順序；缺翻譯時不可產生假的 hreflang。檢查 `/sitemap-index.xml`，並用瀏覽器 Network 面板查看 HTML、資源與 404 的 HTTPS、CSP、nosniff、防嵌入標頭。Astro preview 不模擬平台 HTTP 標頭。封鎖分析服務後導覽與搜尋仍應可用。安全檢查不能保證外部連結絕無釣魚或惡意軟體。

## 7. 後續升級

目前 Astro 7.3.3，完整版本見 `package.json` 與鎖定檔。TypeScript 暫留 6，因 Astro checker 與 ts-jest 尚要求小於 7；不要直接升主版本。先備份或提交，再用 pnpm 更新並完整驗證。安全 overrides 也可能過期，必須定期重新稽核。
