# 自檢指南

自檢是發布前的安全閘門，但不能取代人工 Code Review。它會整合原始碼掃描、框架診斷、測試、依賴漏洞資料、正式建置輸出檢查、部署計畫驗證及瀏覽器測試。

## 指令

```bash
pnpm selfcheck -- --explain
pnpm selfcheck -- --quick
pnpm analyze
```

- `--explain`：列出每組規則的目的與攔截內容；不修改檔案，也不執行建置。
- `--quick`：檢查原始碼、文章、圖片、Astro／TypeScript、ESLint、Stylelint、Knip 與單元測試。
- `pnpm analyze`：除快速檢查外，再執行 OSV、乾淨正式建置、產出檢查、三語系所有部署模式 dry-run 及 Playwright。

`ERROR` 會讓指令以失敗狀態結束並阻止可信發布；`WARNING` 會顯示供人工確認，但不會讓指令失敗。

## 規則分類

| 代碼                             | 保護範圍              | 會攔截的例子                                                                |
| -------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| `CHECK`                          | 自檢流程              | 階段崩潰、子指令失敗、建置失敗後無法執行產出／E2E                           |
| `JS`、`TS`、`CONFIG`             | TypeScript 與共用設定 | 未核准 JavaScript、隱藏型別錯誤、寬鬆設定、寫死網站識別                     |
| `CSS`                            | CSP 與渲染效能        | 行內樣式、套用到全部屬性的 transition、負字距、模糊及亮度濾鏡               |
| `SEC`、`SECRET`                  | XSS 與秘密外洩        | 動態執行、直接寫入 HTML、危險協定、私鑰、疑似 Token                         |
| `LINKCHECK`                      | 靜態／API 離站模式    | 未宣告的信譽檢測程式、不安全 client／後端控制、公開憑證、外部連結繞過提示   |
| `PACKAGE`、`PARTYTOWN`、`SEARCH` | 依賴與整合            | 缺少套件、override 不一致、Partytown／Pagefind 產物缺失                     |
| `GIT`、`HEADER`                  | 倉庫隱私與 HTTP 標頭  | `.env`／金鑰被追蹤、ignore 不完整、CSP 不安全、缺少 `nosniff`、平臺設定漂移 |
| `DOC`                            | 操作文件              | 缺少部署模式／參數、嚴重程度說明，或三語指南不完整                          |
| `CONTENT`、`I18N`                | Markdown 與三語內容   | frontmatter 錯誤、MDX／raw HTML、危險指令、路由碰撞、缺少翻譯               |
| `IMAGE`                          | 圖片解碼與響應式輸出  | symbolic link、不支援格式、過大檔案／像素、缺少尺寸、繞過 Astro 優化        |
| `BUILD`、`ROUTE`                 | 正式產物與路由        | 缺少 `dist`、source map、壞掉的站內連結、生成 `/page/1`、資產缺失           |
| `SEO`                            | 搜尋 metadata         | canonical 錯誤／重複、hreflang 缺失、sitemap 壞連結、robots／社群圖片缺失   |
| `CSP`                            | 嚴格 CSP 相容性       | 可執行行內 script、行內 style、Partytown hash 缺失、危險協定                |
| `PERF`                           | 產出大小              | HTML、JavaScript、CSS 異常過大；此類通常是 warning                          |

## 完整自檢不會做的事

- 部署驗證只執行 `--dry-run`，不會上傳或修改任何平臺。
- OSV 只接收 npm 套件名稱與已安裝版本，不會收到原始碼、環境檔、文章或秘密。
- 零錯誤不代表所有業務邏輯錯誤或未來的零日漏洞都不存在。
- 瀏覽器測試會使用已設定的 Chromium 相容執行檔，包含 ungoogled-chromium。

## 如何閱讀錯誤

```text
[ERROR] HEADER002 public/_headers: CSP must not allow unsafe-inline.
```

1. `ERROR` 表示阻止可信發布。
2. `HEADER002` 是穩定規則代碼。
3. `public/_headers` 是發現問題的檔案。
4. 後方訊息說明違反的安全邊界。

請修正被報告的來源，不要直接關閉規則。開發中使用 `pnpm selfcheck -- --quick`，發布前再執行 `pnpm analyze`。

實作選用的信譽檢測 API 時，請將 `link-reputation.audit.example.json` 複製為 `link-reputation.audit.json`，選擇 `local-feed` 或 `remote-api`、填入供應商名稱，並列出實際 TypeScript／Astro／揭露文件。這會讓 `LINKCHECK` 從靜態提示保護切換成對應策略的 API 檢查。若後端在另一個儲存庫，本專案無法讀取它；此時出現警告是刻意設計，必須另外在後端儲存庫完成安全檢查。
