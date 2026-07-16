# 部署教學

本教學以零基礎使用者為對象。先完成共用設定，再只閱讀你要使用的平台。

## 1. 必要工具

- Node.js 22.12 以上
- Git
- 建議 pnpm；沒有 pnpm 時可用 npm
- 部署 VPS 需要 OpenSSH Client
- VPS Docker 需要伺服器已安裝 Docker Engine 與 Docker Compose

```bash
node --version
git --version
pnpm --version
```

沒有 pnpm：

```bash
corepack enable
corepack prepare pnpm@10.33.4 --activate
```

## 2. 安裝與建立本機設定

```powershell
pnpm install
Copy-Item .env.example .env
```

macOS／Linux：

```bash
pnpm install
cp .env.example .env
```

編輯 `.env`：

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的部落格
PUBLIC_SITE_AUTHOR=作者名稱
PUBLIC_SITE_DESCRIPTION=本站的公開說明。
PUBLIC_CONTACT_EMAIL=contact@example.com
PUBLIC_GA4_ID=
```

- `PUBLIC_SITE_URL` 必須是乾淨的 HTTPS 網址，不可有結尾 `/`。
- `PUBLIC_CONTACT_EMAIL` 會公開顯示。
- `PUBLIC_GA4_ID` 選填，格式如 `G-XXXXXXXXXX`。
- 真實 `.env*` 不可提交，只提交 `.example`。
- `example.com`、`203.0.113.10` 都是範例，不要改成私人值後提交公開版。

驗證：

```bash
pnpm check
pnpm build
pnpm selfcheck -- --quick
```

## 3. 網域、SEO、Search Console 與 GA4

正式建置前，先把最終網域寫入 `PUBLIC_SITE_URL`。canonical、hreflang、sitemap、robots.txt、Open Graph 與 JSON-LD 都會使用它。

網站上線後：

1. 在 Google Search Console 新增網域或網址前綴資源。
2. 提交 `https://example.com/sitemap-index.xml`。
3. 使用網址審查檢查首頁及一篇文章。
4. 只有在索引失敗已修復或重要頁面更新時才需要重新要求建立索引，不必逐頁點擊全部網址。

HTML 驗證檔放入 `public/`，建置部署後確認可從網站根目錄開啟。公開範本上傳前要確認驗證檔不屬於私人站點。

GA4：

1. 建立 GA4 Web Data Stream。
2. 複製 `G-` 開頭的 Measurement ID。
3. 寫入本機 `.env` 或託管平台 Build Variables。
4. 訪客同意分析 Cookie 後才會透過 Partytown 載入。

Cloudflare Web Analytics 與 GA4 可以同時啟用，兩者不會互相取代。Pages 已自動啟用 Web Analytics 時，不要再手動加入第二份 Beacon。

## 4. 安全標頭

- Cloudflare Pages：`public/_headers`
- Vercel：`vercel.json`
- Nginx／VPS：`deploy/nginx-security-headers.conf`

三份 CSP 基線必須一致，包含 `X-Content-Type-Options: nosniff`、防 iframe、防 MIME sniffing、Referrer Policy、Permissions Policy 與 HSTS。不可加入 `unsafe-inline`。

HSTS 預設不含 `includeSubDomains`、`preload`，只有確認所有子網域永久支援 HTTPS 後才能開啟。

## 5. Cloudflare Pages

```bash
cp .env.cloudflare.example .env.cloudflare
```

```env
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_PAGES_PROJECT_NAME=my-blog
PUBLIC_SITE_URL=https://example.com
PUBLIC_SITE_NAME=我的部落格
PUBLIC_SITE_AUTHOR=作者名稱
PUBLIC_SITE_DESCRIPTION=本站說明
PUBLIC_CONTACT_EMAIL=contact@example.com
```

取得方式：

1. 開啟 Cloudflare Dashboard。
2. 從帳號總覽／側欄複製 Account ID。
3. My Profile > API Tokens > Create Token。
4. 只授予目標帳號所需的 Cloudflare Pages Edit 權限。
5. 填入既有 Pages 專案名稱；不存在時腳本可建立。

```bash
pnpm deploy:cf:only
```

自訂網域在 Workers & Pages > 專案 > Custom domains 新增，依畫面設定 DNS，然後把相同 HTTPS 網址寫入 `PUBLIC_SITE_URL` 重新建置。

## 6. Vercel

```bash
cp .env.vercel.example .env.vercel
```

```env
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
VERCEL_PROJECT_NAME=astro-theme-simpleblog
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

1. 建立或匯入 Vercel Project。
2. Account Settings > Tokens 建立最小用途 Token。
3. Project Settings > General 複製 Project ID。
4. Team 專案把 Team ID 填入 `VERCEL_ORG_ID`；個人專案可在 Token 能解析專案時留空。

```bash
pnpm deploy:vercel:only
```

部署器使用 Vercel REST API，不依賴 Vercel CLI，只上傳靜態建置檔與精簡後的 `vercel.json`。

## 7. Netlify

```bash
cp .env.netlify.example .env.netlify
```

```env
NETLIFY_AUTH_TOKEN=
NETLIFY_SITE_ID=
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

1. 建立 Netlify Site。
2. User settings > Applications > Personal access tokens 建立 Token。
3. Project configuration > General 複製 Project ID／Site ID。

```bash
pnpm deploy:netlify:only
```

預覽部署：

```bash
pnpm deploy:switch -- --mode=direct:netlify --netlify-preview --yes
```

部署器會以有界串流建立 ZIP，再透過 Netlify API 上傳。

## 8. VPS 靜態部署

建立 SSH key：

```bash
ssh-keygen -t ed25519 -a 64 -f ~/.ssh/id_ed25519
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@example.com
ssh-keyscan -H example.com >> ~/.ssh/known_hosts
```

信任 host key 前，請從 VPS 供應商主控台核對指紋。

`.env.vps`：

```env
VPS_HOST=203.0.113.10
VPS_USER=deploy
VPS_PORT=22
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts
VPS_TARGET_DIR=/var/www/example.com
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

部署帳號必須能寫入 `VPS_TARGET_DIR`，不建議無必要使用 root。Nginx HTTPS `server` 區塊要 include `deploy/nginx-security-headers.conf`。

```bash
pnpm deploy:vps:only
```

有 rsync 時使用 rsync，否則使用 OpenSSH scp；兩者都先上傳暫存目錄，再原子切換並保留失敗回復。

## 9. VPS Docker

`.env.vps-docker`：

```env
VPS_HOST=203.0.113.10
VPS_USER=deploy
VPS_PORT=22
VPS_SSH_KEY_PATH=~/.ssh/id_ed25519
VPS_KNOWN_HOSTS_FILE=~/.ssh/known_hosts
VPS_DOCKER_APP_DIR=/opt/astro-simpleblog
VPS_DOCKER_PROJECT_NAME=astro-simpleblog
VPS_DOCKER_BIND_ADDRESS=127.0.0.1
VPS_DOCKER_HTTP_PORT=8080
VPS_DOCKER_ALLOW_PUBLIC_BIND=0
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

```bash
pnpm deploy:vps-docker:only
```

容器以非 root Nginx、唯讀檔案系統、移除 capabilities、`no-new-privileges` 執行，預設只綁 `127.0.0.1:8080`。請在前方配置 HTTPS Reverse Proxy。只有完成防火牆設定後才能改成 `0.0.0.0` 並設 `VPS_DOCKER_ALLOW_PUBLIC_BIND=1`。

## 10. Supabase Edge Functions

Supabase Edge Functions 不能託管本 Astro 靜態網站；此目標只部署 TypeScript 後端函式。

建立：

```text
supabase/functions/hello/index.ts
```

```ts
Deno.serve(() => Response.json({ status: 'ok' }));
```

`.env.supabase`：

```env
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=contact@example.com
```

Token 在 Supabase Account Settings > Access Tokens 建立；Project Ref 位於 Dashboard URL 的 `/project/<project-ref>`。

```bash
pnpm deploy:supabase:only
pnpm deploy:switch -- --mode=direct:supabase --supabase-function=hello --yes
```

Service Role Key 與函式秘密必須放在 Supabase Secrets／Vault，不可使用 `PUBLIC_` 或提交到 Git。

## 11. GitHub、GitLab、Codeberg

- GitHub Actions：`.github/workflows/deploy.yml`
- GitLab CI：`.gitlab-ci.yml`
- Codeberg／Woodpecker：`.woodpecker.yml`
- 三平台作業系統驗證：`.github/workflows/cross-platform.yml`

所有 Token、ID、SSH 私鑰都放在平台加密 Secrets／Variables，不可直接寫入 YAML。

```bash
pnpm deploy:switch -- --mode=github:cf --git-remote=origin --git-branch=main --dry-run
pnpm deploy:switch -- --mode=gitlab:netlify --dry-run
pnpm deploy:switch -- --mode=codeberg:vps-docker --dry-run
```

確認計畫後才移除 `--dry-run`。

## 12. 選單、快捷指令與多合一部署

專案提供三種部署方式。

### 互動選單

```bash
pnpm deploy:menu
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:menu -- --lang=zh-cn
```

選單會依序要求選擇語言、部署模式、可選參數及最後確認，並在執行前顯示完整指令。第一次設定平臺時，請先加入 **dry run** 查看計畫。

### 單平臺快捷指令

| 指令                          | 部署目標                   |
| ----------------------------- | -------------------------- |
| `pnpm deploy:cf:only`         | Cloudflare Pages           |
| `pnpm deploy:vercel:only`     | Vercel 正式環境            |
| `pnpm deploy:netlify:only`    | Netlify 正式環境           |
| `pnpm deploy:vps:only`        | VPS 靜態目錄               |
| `pnpm deploy:vps-docker:only` | VPS Docker                 |
| `pnpm deploy:supabase:only`   | 僅 Supabase Edge Functions |

單平臺快捷指令會在環境與專案檢查後直接開始，不會顯示 `deploy:switch` 的再次確認提示。

### 多合一快捷指令

| 指令                                  | 實際部署目標                                     |
| ------------------------------------- | ------------------------------------------------ |
| `pnpm deploy:all`                     | Cloudflare + VPS + Vercel                        |
| `pnpm deploy:all:static`              | Cloudflare + VPS + VPS Docker + Vercel + Netlify |
| `pnpm deploy:all:including-functions` | 上述全部靜態目標 + Supabase Edge Functions       |

`deploy:all:including-functions` 需要至少一個有效的 `supabase/functions/<名稱>/index.ts`。

## 13. `deploy:switch` 指令與參數

基本格式：

```bash
pnpm deploy:switch -- --mode=<平臺>:<目標+目標> [參數]
```

使用 `direct` 從目前電腦直接部署：

```bash
pnpm deploy:switch -- --mode=direct:cf+netlify --dry-run
pnpm deploy:switch -- --mode=direct:cf+netlify --yes
```

使用 `github`、`gitlab` 或 `codeberg` 時只會推送原始碼到既有 Git remote，再由對應 CI 設定執行部署，不會直接上傳網站：

```bash
pnpm deploy:switch -- --mode=github:cf+vercel --git-remote=origin --git-branch=main
```

支援參數：

| 參數                         | 功能                                                      |
| ---------------------------- | --------------------------------------------------------- |
| `--dry-run`                  | 只顯示計畫，不建置、不驗證憑證、不 push、不上傳。         |
| `--yes`／`-y`                | 只略過 `deploy:switch` 的人工確認；正常專案檢查仍會執行。 |
| `--skip-clean`               | 重新建置前不刪除既有輸出目錄；不代表略過 build。          |
| `--dist=<dir>`               | Cloudflare、Netlify 或靜態 VPS 使用安全的專案內輸出目錄。 |
| `--cf-project=<name>`        | 覆寫 Cloudflare Pages 專案名稱。                          |
| `--cf-branch=<branch>`       | 覆寫 Cloudflare Pages 部署分支。                          |
| `--cf-env=<file>`            | 使用另一個根目錄 Cloudflare `.env*`。                     |
| `--vps-env=<file>`           | 使用另一個根目錄靜態 VPS `.env*`。                        |
| `--vps-docker-env=<file>`    | 使用另一個根目錄 VPS Docker `.env*`。                     |
| `--vercel-env=<file>`        | 使用另一個根目錄 Vercel `.env*`。                         |
| `--vercel-preview`           | 建立 Vercel Preview，而非正式部署。                       |
| `--netlify-env=<file>`       | 使用另一個根目錄 Netlify `.env*`。                        |
| `--netlify-preview`          | 建立 Netlify Draft／Preview 部署。                        |
| `--supabase-env=<file>`      | 使用另一個根目錄 Supabase `.env*`。                       |
| `--supabase-function=<name>` | 只部署一個已存在的 TypeScript Edge Function。             |
| `--git-remote=<name>`        | 選擇已設定的 Git remote 名稱。                            |
| `--git-branch=<name>`        | 選擇通過安全驗證的推送分支。                              |
| `--git-set-upstream`         | 加入 `git push --set-upstream`。                          |
| `--git-follow-tags`          | 加入 `git push --follow-tags`。                           |
| `--lang=<language>`          | 指定主控台語言：`en`、`zh-tw` 或 `zh-cn`。                |

環境檔覆寫只接受專案根目錄的一般 `.env` 或 `.env.*` 檔案；路徑穿越與 symbolic link 會被拒絕。

npm 傳遞參數時必須保留 `--`：

```bash
npm run deploy:switch -- --mode=direct:cf --dry-run
```

正常直接部署會先檢查 `.gitignore`，由 switch 執行一次 `pnpm check`，再由每個選定部署器各自建置並上傳受審查的輸出。正式發布前請執行 `pnpm analyze`，才能同時完成 OSV、正式產出、所有模式 dry-run 與 E2E 驗證。

## 14. 選用 OpenPhish 離站檢測

公開版刻意不包含私人 OpenPhish Runtime。請依 [OPENPHISH_GUIDE.zh-TW.md](./OPENPHISH_GUIDE.zh-TW.md) 獨立建置。

- 先確認授權及允許用途。
- Feed、雜湊 bucket、儲存 ID、同步 Token、後端秘密不可公開。
- 前端 debounce 不是安全邊界，仍要設定 WAF／平台限流。
- URL 必須在伺服器端正規化，請求與回應要有大小限制，錯誤時 fail closed。
- Cloudflare KV 是最終一致性，必須使用正確 binding 名稱與 metadata-last A/B 快照。

## 15. 發布前驗證

```bash
pnpm check
pnpm audit:security
pnpm build
pnpm test:e2e
pnpm analyze
git status --short
git ls-files
```

確認沒有追蹤真實 `.env`、Token、私鑰、私人文章／圖片、`dist`、`.wrangler`、`.vercel`、`.netlify` 或 `.supabase` 狀態。
