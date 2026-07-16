# 腳本說明

所有操作腳本都使用 TypeScript，支援 Windows、macOS、Linux。優先使用 pnpm，找不到 pnpm 時自動改用 npm；外部命令以參數陣列執行，不拼接危險 shell 字串。

## 部署入口

- `deploy_menu.ts`：英文、繁中、簡中互動選單。
- `deploy_switch.ts`：非互動式部署目標與 Git 平台切換。
- `deploy_lib.ts`：驗證模式、參數、remote 與 branch。
- `deploy_i18n.ts`：三語主控台文字。
- `deploy_runtime.ts`：Node 與 pnpm/npm 偵測，支援 Windows `.cmd`。
- `deploy_env.ts`：所有目標共用的嚴格 `.env*` 解析器。
- `deploy_safety.ts`：`.gitignore`、輸出路徑與敏感檔案檢查。

## 直接部署器

- `uploaddist_cf.ts`：透過 Wrangler 部署 Cloudflare Pages。
- `uploaddist_vercel.ts`：Vercel REST 串流上傳，不依賴 Vercel CLI。
- `uploaddist_netlify.ts`：以有界串流建立 ZIP 並呼叫 Netlify REST API。
- `uploaddist_vps.ts`：rsync／OpenSSH scp 暫存上傳與原子切換。
- `uploaddist_vps_docker.ts`：部署非 root Nginx Compose Bundle。
- `uploaddist_supabase.ts`：部署 `supabase/functions/<名稱>/index.ts`。

Supabase Edge Functions 是後端函式，不是靜態網站主機。

## 環境檔

```text
.env
.env.cloudflare
.env.vercel
.env.netlify
.env.supabase
.env.vps
.env.vps-docker
```

請從相同名稱的 `.example` 複製。`--env` 只接受專案根目錄 `.env`／`.env.*`，拒絕路徑穿越及 symbolic link。

## 指令

```bash
pnpm deploy:menu
pnpm deploy:switch -- --mode=direct:cf --dry-run --yes
pnpm deploy:cf:only
pnpm deploy:vercel:only
pnpm deploy:netlify:only
pnpm deploy:vps:only
pnpm deploy:vps-docker:only
pnpm deploy:supabase:only
pnpm deploy:all
pnpm deploy:all:static
pnpm deploy:all:including-functions
```

- `deploy:all`：Cloudflare + VPS + Vercel。
- `deploy:all:static`：Cloudflare + VPS + VPS Docker + Vercel + Netlify。
- `deploy:all:including-functions`：全部靜態目標 + Supabase Edge Functions。

`--dry-run` 只顯示計畫，不建置或上傳；`--yes` 只略過 switch 確認；`--skip-clean` 只保留輸出目錄再重新建置，不會略過 build。所有模式與參數請參閱 [DEPLOYMENT.zh-TW.md](../DEPLOYMENT.zh-TW.md)。

```bash
pnpm deploy:menu -- --lang=en
pnpm deploy:menu -- --lang=zh-tw
pnpm deploy:menu -- --lang=zh-cn
```

npm 傳參數要保留 `--`：

```bash
npm run deploy:switch -- --mode=direct:cf --dry-run --yes
```

## 自檢

- `analysis.ts`：原始碼、文章、圖片、依賴、建置輸出、部署 dry-run、E2E。
- `audit-security.ts`：把已安裝套件與版本送到 OSV 查詢已知漏洞。
- `checks/source.ts`：危險語法、TypeScript 政策、安全標頭、秘密與公開／私人邊界。
- `checks/content.ts`：frontmatter、多語文章、分類、路由、連結及 raw HTML。
- `checks/images.ts`：格式、尺寸、像素及檔案大小。
- `checks/output.ts`：canonical、hreflang、sitemap、CSP、行內碼、圖片及壞連結。
- `run-e2e.ts`：可使用本機 ungoogled-chromium。

```bash
pnpm selfcheck -- --explain
pnpm selfcheck -- --quick
pnpm analyze
```

各規則分類、嚴重程度與錯誤示例請參閱 [SELF_CHECK_GUIDE.zh-TW.md](../SELF_CHECK_GUIDE.zh-TW.md)。

## 安全重點

- Vercel、Netlify API 回應有大小限制。
- Netlify ZIP 與 Vercel 檔案採串流，降低記憶體尖峰。
- SSH key 必須是一般檔案；Unix 權限不可讓 group／others 讀取。
- 建議配置 `VPS_KNOWN_HOSTS_FILE`。
- VPS Docker 預設只綁 loopback；公開綁定必須明確允許。
- 真實 env、平台狀態、私鑰、報告與建置輸出均由 `.gitignore` 排除。
