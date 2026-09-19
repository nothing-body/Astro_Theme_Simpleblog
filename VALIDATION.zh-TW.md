# 共用模組與發版驗證

`src/i18n/locales.ts` 定義支援語言，`ui.ts` 存放翻譯文字，`utils.ts` 對應實際存在的翻譯內容。`src/scripts/language-links.ts` 統一保留切換語言時的搜尋字詞與離站目的地。`src/lib/routes.ts` 驗證並組合路徑。`scripts/check-output.ts` 在 Astro、Pagefind 與搜尋清理完成後檢查產物；一般建置也會自動執行。

產物檢查會拒絕敏感檔名、符號連結、過深目錄、超限上傳與可執行的行內標記。回歸測試刻意加入不安全產物，確認檢查能報錯。介面測試比較三語系鍵名與插值參數，只有明確允許省略的編輯文字可留空。GitHub 工作流程檢查會拒絕將 secret 直接插入 shell 命令，以及在條件式直接使用 secrets。

例如更換正式站點：複製 `.env.production.example` 為 `.env.production`，設定 `PUBLIC_SITE_URL=https://your-blog.example` 與公開聯絡資料，再執行下列命令。憑證放在相應的私有平台環境檔。建置使用 `dist`；VPS 自訂 `--prebuilt` 套件屬進階上傳功能，該命令不會替它重新建置。

```sh
pnpm check
pnpm build
pnpm selfcheck
```

目前本機實際驗證環境為 Windows。CI 矩陣也會在 Linux、macOS 建置並執行瀏覽器測試，必須看到遠端成功結果才能視為完成那些平台的驗證。瀏覽器測試模擬分析服務被封鎖與低效能裝置設定，不代表測過每一種外掛、瀏覽器版本或實體老舊裝置。Tailwind 4 仍需要相容的現代瀏覽器引擎。部署 dry-run 只驗證命令計畫，不驗證憑證、DNS、遠端權限、TLS 或正式啟用。發版後仍須查看各平台的實際 HTTP 標頭。零漏洞掃描結果有時間性，不能保證未來沒有新漏洞。

[Setup](SETUP.zh-TW.md) · [Deployment](DEPLOYMENT.zh-TW.md)
