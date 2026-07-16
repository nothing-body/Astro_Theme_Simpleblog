# 可選的 OpenPhish 離站網址檢測

此公開範本只內建不呼叫 API 的離站提示，**沒有內建**查詢 API、Cloudflare KV 綁定、同步 Worker 或 OpenPhish 資料。本指南只說明一項可選且必須獨立部署的信譽檢測功能；實作時需自行準備後端、儲存空間、前端整合、安全審查，以及使用清單所需的授權。

實作前請先閱讀 [OpenPhish Feed 說明](https://openphish.com/phishing_feeds.html)與 [OpenPhish 使用條款](https://openphish.com/terms.html)。Community Feed 內容有限，目前每 12 小時更新一次，也可能誤判或漏判；條款對用途、揭露及再散布有所限制。商業用途或公開服務可能需要事先取得許可或改用其他授權。

## 建議架構

```text
瀏覽器
  -> 自有 POST /api/example-reputation-check
  -> 正規化網址
  -> SHA-256 完全相符查詢
  -> 私有儲存空間

受保護排程器
  -> 下載官方 Community Feed
  -> 驗證並正規化每筆資料
  -> 雜湊後發布新快照
  -> 最後才發布 metadata
```

清單與儲存空間都必須維持私有。瀏覽器只查詢自己的 API，不應把目的網址直接傳給 OpenPhish。

所有平台共用同一份 API 契約：

```json
{ "url": "https://example.com/path" }
```

```json
{
  "status": "no-known-threats",
  "checkedAt": "2026-01-01T00:00:00.000Z",
  "threatTypes": []
}
```

完全相符時回傳 `potentially-unsafe` 與 `["PHISHING"]`。無效請求、資料過期、儲存失敗、逾時或非預期回應都應回傳非 2xx 狀態，並讓「繼續前往」維持停用。

## 共用安全規則

同步與查詢核心使用 TypeScript，平臺轉接層只負責取得環境變數與轉交請求。

- 只接受 `https:` 與 `http:`。拒絕帳號密碼、格式錯誤主機名、fragment、localhost、私有 IP、link-local 與其他非公開目的地。
- 同步與查詢必須共用同一個網址正規化函式。
- 以 SHA-256 雜湊正規化後的網址。不可透過 API、靜態資產、儲存庫、建置產物或 log 公開原始清單。
- 以雜湊前兩個十六進位字元建立固定分桶，避免每個網址各占一筆儲存紀錄。
- 先完整寫入新的 A/B 快照，最後才更新 metadata。每個 bucket 都要寫入快照識別碼；若 bucket 外觀合法但識別碼與 metadata 不符，查詢必須拒絕並只使用通過驗證且仍新鮮的 previous snapshot。
- Metadata 至少保存 `lastCheckedAt`、`updatedAt`、筆數、active／previous slot、active／previous 快照識別碼與 schema version。
- 發布前限制清單大小、行數、下載時間、內容類型、最低有效筆數及單一網址長度。
- 公開查詢端點只允許 `POST` 與 `OPTIONS`，並限制 request body，例如最多 4096 bytes。
- CORS 只允許精確 HTTPS origin。不可反射任意 origin，也不可把 credentials 與 `*` 一起使用。
- 前端 debounce／冷卻只能降低誤觸連點；API 還需要平臺原生 rate limit 或 WAF 規則。
- Log 只記錄通用錯誤代碼，不記完整目的網址、清單內容、Bearer token 或上游 response body。

官方 Community Feed 目前位於：

```text
https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt
```

下載時明確限制重新導向：

```ts
const response = await fetch(FEED_URL, {
  headers: { Accept: 'text/plain' },
  redirect: 'manual',
});

if (response.status >= 300 && response.status < 400) {
  throw new Error('不允許 Feed 重新導向。');
}
if (!response.ok) {
  throw new Error(`Feed 請求失敗：${response.status}`);
}
```

Cloudflare Workers 使用 `redirect: "manual"` 相容性較高。不可使用 `redirect: "follow"`，否則下載可能被導向未審查的主機。部分 Cloudflare 實際環境即使型別允許，也會拒絕 `redirect: "error"`；因此應使用 `manual` 並自行拒絕所有 3xx。

## 每 36 小時實際同步

OpenPhish 目前每 12 小時更新 Community Feed，但你的服務不必每次都下載。跨平臺一致的 36 小時排程應這樣設計：

1. 每小時執行一次極輕量排程。
2. 從私有 metadata 讀取 `lastCheckedAt`。
3. 距上次實際檢查滿 36 小時才下載。
4. 保留受驗證的手動同步端點，供首次初始化或故障復原時強制執行。
5. 查詢資料的新鮮度上限應高於排程，例如 48 小時，避免一般排程延遲立刻關閉服務。

標準五欄 cron 無法精確表達持續循環的 36 小時；每小時喚醒再由 TypeScript 判斷是否到期，才能在所有平臺共用相同邏輯：

```cron
0 * * * *
```

## 各平臺的儲存替代方案

Cloudflare KV 不是唯一選擇。真正需要保持不變的是 `get`、`put` 與發布 metadata 的儲存介面，而不是某一家平臺的 SDK。

| 部署位置                       | 建議儲存                   | 如何與函式連接                                                                             |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------ |
| Cloudflare                     | Workers KV                 | 在 Worker 與 Pages 專案分別綁定同一 namespace，程式透過 `env.KV` 或 `context.env.KV` 使用  |
| Netlify                        | Netlify Blobs              | Function 內呼叫 `getStore()`；同站點的 Project ID 與存取權杖由 Netlify runtime 自動提供    |
| Vercel                         | Marketplace Redis／Upstash | 在 Marketplace 將資料庫連接到專案；Vercel 自動加入連線環境變數，重新部署後由 Function 讀取 |
| Supabase                       | Postgres                   | Edge Function 使用專案內建的 server-side secrets 連線，資料表以 RLS 阻止瀏覽器直接讀取     |
| 單機 VPS                       | SQLite                     | API 與同步程式共用一個不在 Web root 的資料庫檔，最容易維護                                 |
| 多副本 VPS／Docker             | Redis 或 Postgres          | 僅開放 Docker private network 或 localhost，透過未提交的環境變數傳入連線資訊               |
| GitHub／GitLab／Codeberg Pages | 沒有私有動態儲存           | 前端必須呼叫部署在上述任一平臺的 HTTPS API                                                 |

跨平臺共用的 TypeScript 核心應只依賴自訂 `OpenPhishStore` 介面。每個平臺各寫一個很薄的 adapter，前端永遠只讀取 `PUBLIC_REPUTATION_ENDPOINT`，因此遷移後通常只需更換 endpoint 與 CSP 精確 origin，不必改查詢頁邏輯。

## 將後端搬離 Cloudflare

Cloudflare binding 應只是一層平臺 adapter，不應成為應用核心。遷移時只替換平臺入口與儲存實作，網址正規化、雜湊、快照驗證、新鮮度判定、API 回應格式及失敗即阻止行為都必須保持一致。

| 原 Cloudflare 元件     | 可攜式替代方案                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| Workers KV             | Netlify Blobs、託管 Redis、Postgres 或私人 SQLite                           |
| Cron Trigger           | 平臺排程器、CI 排程或受保護的 VPS cron                                      |
| Worker／Pages Function | Netlify Function、Vercel Function、Supabase Edge Function 或私人 HTTPS 服務 |
| Worker secret          | 目標平臺的 server-side secret manager                                       |
| Cloudflare rate limit  | 平臺原生限流、反向代理限流或可信任的 API gateway                            |

依照以下順序遷移：

1. 只新增新的 `OpenPhishStore` adapter 與平臺入口，不可另行複製或改寫正規化及查詢規則。
2. 建立不公開的目標儲存空間，並匯入新產生的快照。原始 Feed 不可經由公開儲存庫、瀏覽器儲存空間、部署 log 或公開產物搬運。
3. 直接在目標平臺的 server-side secret manager 新增秘密。文件只能使用 `YOUR_SYNC_SECRET` 等占位符，不可填入真實 token、帳號 ID、namespace ID、專案 ID、資料庫網址或 service-role key。
4. 先以不相關的示例網址部署新 API，例如 `https://reputation-api.example.net/api/example-reputation-check`，並設定精確的前端 origin allowlist 與 CSP `connect-src` origin。
5. 切換前測試正常請求、格式錯誤網址、私人網路目的地、過期 metadata、儲存服務中斷、限流及同步回滾。
6. 前端只更換 `PUBLIC_REPUTATION_ENDPOINT` 與 CSP 精確 origin，然後重新建置及部署靜態網站。
7. 觀察新服務時不可記錄目的網址或憑證。確認新快照與排程持續正常後，撤銷舊秘密、移除舊 binding，再刪除舊端點。

遷移期間不可讓兩個獨立同步器同時寫入同一份 active metadata。新服務應使用獨立儲存空間，或採單一寫入者交接，否則可能混合不同快照的 metadata 與 bucket。舊端點只保留短暫回滾時間，也不可為了方便遷移而放寬 CORS 或 CSP。

## Cloudflare Workers 與 Pages

建立一個同步 Worker，以及一個 Pages Function 或另一個 Worker 作為查詢 API。兩者必須綁定同一個 KV namespace，程式使用的 binding 名稱例如 `KV`。Dashboard 中 namespace 的顯示名稱不必與 binding 名稱相同。

通用 Worker 設定：

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "YOUR_SYNC_WORKER",
  "main": "src/index.ts",
  "compatibility_date": "YYYY-MM-DD",
  "triggers": {
    "crons": ["0 * * * *"]
  },
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID",
      "preview_id": "YOUR_PREVIEW_KV_NAMESPACE_ID"
    }
  ]
}
```

Worker 透過 `env.KV` 使用綁定；Pages Function 則透過 `context.env.KV` 使用。建立 namespace 不代表已綁定，Worker 與 Pages 專案都必須分別連接同一個 namespace。

手動同步 token 應保存為 Worker secret：

```bash
pnpm exec wrangler secret put SYNC_TOKEN --config path/to/wrangler.jsonc
```

Bearer token 應盡量採固定時間比較。手動端點只接受 `POST`、回傳通用錯誤，而且不可透露 token 前綴是否正確。

正式部署時請自行選擇私人路徑，不要直接照抄範例 `/api/example-reputation-check`，再於 Cloudflare 對實際精確路徑建立 Rate Limiting Rule。可先使用每個來源 IP 每分鐘 30 次，超過後 Managed Challenge 或暫時封鎖，再依 Security Analytics 調整。方案支援 Method 條件時只計算 `POST`；若不支援，使用精確路徑並替跨來源 `OPTIONS` 預檢保留足夠額度。不可把規則套到全站，也不可把路徑保密、前端 debounce 或 CORS 當成機器人防護。

## Netlify

需要三個部分：

- Scheduled Function：每小時執行到期檢查。
- 獨立 HTTP Function：處理自訂私人查詢路徑，例如 `/api/example-reputation-check`。
- Netlify Blobs 或外部資料庫：保存私有雜湊分桶與 metadata。

Netlify 的 Scheduled Function 在 production 不能直接透過網址呼叫，因此首次初始化與故障復原要另外建立受驗證的 HTTP Function。若使用 Netlify Blobs，metadata 發布順序需要較強一致性時可這樣建立 store：

```ts
import { getStore } from '@netlify/blobs';

const store = getStore({
  name: 'openphish',
  consistency: 'strong',
});
```

在 `netlify.toml` 設定每小時排程；是否滿 36 小時的判斷仍放在共用 TypeScript，不要分散到平臺設定。

連接步驟：

1. 在專案安裝 `@netlify/blobs`，把同步與查詢 Function 放進 `netlify/functions/`。
2. 兩個 Function 都使用相同 store 名稱，例如 `openphish`。
3. Function 在 Netlify 上執行時，`getStore()` 會自動取得目前專案的 Project ID 與存取權杖，不需把它們寫進公開環境變數。
4. 對 metadata 與剛發布的 bucket 使用 `consistency: "strong"`；Netlify Blobs 沒有內建交易或並行鎖，仍需使用 snapshot 識別碼與 metadata 最後發布。
5. Scheduled Function 只能由排程或 Dashboard 的 **Run now** 執行；另建受 `SYNC_TOKEN` 保護的 HTTP Function 作為首次初始化入口。

## Vercel

建議配置：

- `/api/openphish-sync`：由 Vercel Cron 呼叫並受保護的 Function。
- 自訂私人查詢路徑：公開但有 rate limit 的查詢 Function。
- Marketplace Redis、Upstash 或其他耐久資料庫。

舊的 Vercel KV 已不再是可攜式預設選擇。用小型 storage interface 隔離資料庫操作，日後更換 Redis 或資料庫時，不必重寫正規化、雜湊與 API 回應邏輯。

每小時 cron 範例：

```json
{
  "crons": [
    {
      "path": "/api/openphish-sync",
      "schedule": "0 * * * *"
    }
  ]
}
```

使用 `CRON_SECRET` 保護路由，並注意 Vercel Cron 只會在 production deployment 執行。

連接步驟：

1. 到 Vercel 專案的 **Storage／Marketplace** 安裝 Redis 或 Upstash，選擇要連接的專案。
2. 平臺會把供應商的連線資訊加入該專案的環境變數；不要自行把連線字串提交到 Git。
3. 新增或變更連線後必須重新部署。需要本機測試時，用 `vercel env pull` 下載到被 `.gitignore` 排除的本機環境檔。
4. 建立 Redis adapter，將每個 bucket 與 metadata 存為獨立 key；使用 pipeline／批次寫入新快照，最後單獨寫 metadata。
5. 若 Marketplace 資源支援 Allowed Environments，正式資料庫只允許 Production，Preview 使用另一個空白測試資料庫。

## Supabase Edge Functions

分別部署同步與查詢兩個 Edge Function。分桶與 metadata 存在 Postgres，並用 RLS 禁止匿名使用者直接讀取。

使用 `pg_cron` 與 `pg_net` 排程呼叫同步 Function。Service-role key 與同步 secret 應放在 Supabase Vault 或平臺 secrets，不可寫進提交到儲存庫的 SQL。查詢 Function 只執行最小權限的資料庫操作，不應把資料表直接暴露在公開 REST API。

連接步驟：

1. 在同一個 Supabase project 建立私有 bucket 表與 metadata 表，主鍵分別使用 snapshot／bucket key 與固定 metadata key。
2. 啟用 RLS 並且不替 `anon`、`authenticated` 建立可直接讀取 Feed 資料的 policy。
3. 建立同步與查詢兩個 TypeScript Edge Function。只有伺服器端函式可以使用 service-role；絕不可放進 `PUBLIC_*` 變數或瀏覽器。
4. 從 Dashboard 的 **Integrations > Cron** 建立每小時工作，或用 `pg_cron` 加 `pg_net` 呼叫同步 Function；驗證資料放在 Vault。
5. 同步應在交易內寫完新 snapshot，最後更新 metadata。查詢只允許執行固定的 exact-match SQL 或受限 RPC。

## VPS 與 VPS Docker

單機部署最簡單的替代方案是 SQLite：把資料庫放在例如 `/var/lib/simpleblog/openphish.db`，檔案擁有者設為執行 API 的專用帳號，權限設為 `600`，並確認 Nginx、靜態網站目錄與備份下載網址都無法讀取。同步程式與查詢 API 必須在同一台主機，更新使用交易，且不要在多個容器同時寫入同一 SQLite 檔。

需要多副本、容器滾動更新或高併發時，改用 Redis 或 Postgres：

1. 在 Docker Compose 建立 private network，不要把資料庫 port 發布到 `0.0.0.0`。
2. API、同步服務與資料庫使用 service name 互連，例如 `redis://redis:6379` 或內部 Postgres hostname。
3. 密碼與連線字串只放在 VPS 上未提交的 `.env.vps-docker`、Docker secret 或 systemd credential。
4. 用 systemd timer、cron 或排程容器每小時呼叫共用同步入口；正式更新前先取得單一執行鎖。
5. 對外只公開反向代理後的自訂查詢路徑，同步端點限制為 localhost、內網或強驗證。

## GitHub Pages、GitLab Pages、Codeberg Pages

這些服務只發布靜態檔案，不能安全執行查詢 API，也不能保存可變動的私有清單資料。

它們的 CI 排程只能用來呼叫部署在 Cloudflare、Netlify、Vercel、Supabase 或其他後端的受驗證同步端點。GitHub Actions、GitLab pipeline schedules 與 Woodpecker 都能觸發，但 Bearer token 必須保存在加密的 CI secrets。

不要把原始 Feed、雜湊分桶、secret 或部署專用 ID 提交到 Pages 儲存庫。這不只增加攻擊面，也可能違反 OpenPhish 的使用條款。

## 前端整合

公開範本刻意不提供私有實作。後端確認正常後，再自行新增支援多語系的離站頁與 TypeScript client。

若查詢 API 位於另一個 origin，只能把該精確 HTTPS origin 加入 `public/_headers`、`vercel.json` 與 `deploy/nginx-security-headers.conf` 的 `connect-src`。不可使用過寬的 `connect-src https:`。

### 啟用 API 模式自檢

預設自檢驗證的是不呼叫 API 的靜態提示，但不會永久禁止 `fetch`、KV、Functions 或 Workers。只要偵測到實作跡象，自檢就會要求一份不含秘密的稽核清單，再切換成 API 模式：

Windows PowerShell：

```powershell
Copy-Item link-reputation.audit.example.json link-reputation.audit.json
```

macOS 或 Linux：

```bash
cp link-reputation.audit.example.json link-reputation.audit.json
```

只修改檔案路徑與 `backendLocation`，不可在此檔案填入 endpoint、Token、儲存空間 ID、帳號 ID、專案 ID 或資料庫憑證。此清單應提交到 Git，CI 才知道哪些檔案屬於這項功能。

- OpenPhish、URLhaus 或其他下載到私人儲存空間的清單使用 `local-feed`，必須列出 `sync` 與 `storage`，`upstream` 保持空陣列。
- Google Safe Browsing、Google Web Risk、VirusTotal 或其他 server-to-server 信譽服務使用 `remote-api`，必須列出 `upstream`；沒有私人快取時，`sync` 與 `storage` 可保持空陣列。
- `provider` 填公開服務名稱，所有向使用者說明資料流的頁面列在 `disclosure`。自檢會確認文件有提到該供應商，但實際資料揭露是否準確仍需人工確認。
- client、API、同步器、共用核心與儲存 adapter 都在同一個儲存庫時，使用 `same-repository`，每個群組都必須列出實際 TypeScript／Astro 檔案。
- 此儲存庫只有瀏覽器 client、後端位於另一個儲存庫時，使用 `external-service`，並將 `api`、`core`、`sync`、`storage`、`upstream` 保持空陣列。自檢會驗證 client／揭露內容，同時警告遠端後端仍須在自己的儲存庫執行安全檢查。

API 模式下，`LINKCHECK020` 至 `LINKCHECK029` 會掃描所列檔案，確認 endpoint 來自環境設定、POST JSON、有限逾時、回應狀態與類型驗證、精確 CORS、body 上限、SSRF 防禦、憑證未公開及供應商揭露。`local-feed` 另外檢查雜湊、快照新鮮度、拒絕重新導向、下載上限與儲存 adapter；`remote-api` 則檢查固定上游 allowlist 及供應商回應處理。這些靜態規則可攔截缺少防線的實作，但無法證明遠端平臺設定正確，因此仍須完成下方的實際驗證清單。

### 改用 Google Safe Browsing

Google Safe Browsing v5 支援直接 URL 查詢與雜湊清單流程。API key 必須只放在伺服器端，瀏覽器只能呼叫自己的信譽檢測 API。直接 URL 查詢會把待查網址送到 Google，因此離站頁不可再聲稱網址只留在本站。Safe Browsing API 原則上供非商業用途；營利網站應評估 Google Web Risk 及適用條款。

Manifest 差異示例：

```json
{
  "version": 2,
  "mode": "api",
  "strategy": "remote-api",
  "provider": "Google Safe Browsing",
  "backendLocation": "same-repository",
  "files": {
    "client": ["src/components/LeavingNotice.astro", "src/scripts/reputation-client.ts"],
    "api": ["functions/api/example-reputation-check.ts"],
    "core": ["src/server/reputation-core.ts"],
    "sync": [],
    "storage": [],
    "upstream": ["src/server/google-safe-browsing.ts"],
    "disclosure": ["src/components/LeavingNotice.astro", "PRIVACY.md"]
  }
}
```

伺服器端 allowlist 必須使用精確 origin `https://safebrowsing.googleapis.com`。API key 不可放進 `PUBLIC_*`、瀏覽器程式、由瀏覽器產生的 query string 或已提交的 `.env`。實作前請閱讀 [Safe Browsing 說明](https://developers.google.com/safe-browsing)、[v5 URL Search 文件](https://developers.google.com/safe-browsing/reference/rest/v5/urls/search)及[使用條款](https://developers.google.com/safe-browsing/terms)。

前端應做到：

- 將目的網址放在 `#to=...` fragment，避免出現在一般伺服器 request log。
- 切換語言時保留 fragment。
- 只在 `sessionStorage` 短暫保存同一目的地的結果，讓語言切換後能直接顯示翻譯，不必再次查詢。
- 無法使用、格式錯誤或逾時時都不可產生可前往連結。
- 使用 `textContent` 顯示目的網址，不可透過 `innerHTML` 插入。
- 明確說明「清單中沒有相符項目」不代表網站絕對安全。

## 驗證清單

1. 執行 TypeScript 診斷、lint、單元測試、安全檢查與 production build。
2. 測試錯誤 JSON、過大 body、不支援 method、錯誤 origin、本機 IP、帳號密碼、Unicode hostname 與不存在路徑。
3. 確認 metadata 遺失、格式錯誤或過期時會維持阻止狀態。
4. 確認 Feed 重新導向、體積過大、有效資料比例過低或儲存失敗時，不會發布新 metadata。
5. 確認瀏覽器資產與 log 都沒有原始 Feed 或完整目的網址。
6. 確認 API 已設定 rate limit 與精確 CORS origin。
7. 確認三語路由都能保留目的網址，並在不重查 API 的情況下翻譯既有結果。
8. 公開或商業使用前，再次確認 OpenPhish 條款及所需授權。
