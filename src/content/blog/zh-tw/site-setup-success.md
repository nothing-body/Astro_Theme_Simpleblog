---
title: '恭喜，SimpleBlog 已搭建成功'
description: '你的 Astro 多語系部落格已成功建置，接下來可以安全地完成網站設定、撰寫文章、自檢與部署。'
pubDate: 2026-07-14
category: '網站'
categoryPath: ['網站', 'Astro']
tags: ['Astro', '網站設定']
author: 'SimpleBlog'
pinned: true
pinOrder: 1
---

恭喜你。如果你能在新網站看到這篇文章，代表 Astro 建置、內容集合、多語系路由與文章頁面都已正常運作。

## 建議接著完成

1. 將 `.env.example` 複製為 `.env`，填入真正的公開網址與聯絡信箱。
2. 將範例網站名稱、作者、描述與書籤替換成你願意公開的資料。
3. 有翻譯版本時，在 `src/content/blog/en/`、`zh-tw/`、`zh-cn/` 使用相同檔名建立文章。
4. 每次發布前執行 `pnpm selfcheck`。
5. 準備上線時使用 `pnpm deploy:menu`，或經過審查的 CI 工作流程。

完整 frontmatter、文章置頂、多語系內容、設定檔與自動部署範例請閱讀 `MARKDOWN_GUIDE.zh-TW.md`。公開 GitHub 倉庫中不要放入真實 `.env`、API token、私鑰、私人文章或個人圖片。

模板已經準備完成，下一篇文章就交給你了。
