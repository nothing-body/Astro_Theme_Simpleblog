---
title: 'Luanti 介紹：開源體素遊戲創作平台'
pubDate: 2026-06-18
description: '整理 Luanti 官方網站與文件中可確認的資訊，介紹這個 formerly Minetest 的開源體素遊戲引擎、特色、下載方式與使用前注意事項。'
category: '軟體'
tags: ['Luanti', 'Minetest', 'Open Source', 'Game Engine', 'Voxel']
---

> 查詢日期：2026-06-18。本文只整理 Luanti 官方網站、官方文件、官方 GitHub 與官方部落格可確認的資訊；版本與下載方式可能會變動，請以下載頁為準。

[Luanti](https://www.luanti.org/en/) 是一個開源的體素遊戲創作平台，原名 Minetest。官方首頁把它描述為可以遊玩多種遊戲、單人或多人同樂、修改遊戲，甚至自行製作遊戲的平台。它不是單一遊戲，而是可承載不同遊戲、mods 與材質包的引擎與內容生態。

## 目前版本與支援平台

Luanti 官方首頁在查詢時顯示的最新消息是 **5.16.1 released**，日期為 **2026-05-10**。下載頁也列出 Windows 與 macOS 的 5.16.1 下載項目。

官方首頁列出支援平台：

- Windows
- macOS
- GNU/Linux
- BSDs
- Android

下載頁補充，Windows 官方支援 Windows 8、8.1、10、11；Android 建議使用 Android 6 或更新版本；macOS 建議使用 12.3 或更新版本。

## Luanti 和 Minetest 的關係

Luanti 的前身是 Minetest。官方部落格在 2024-10-13 發布改名文章，說明 Minetest 已從早期的 Minecraft 類型實驗，逐步演變成一個遊戲平台。新名稱 Luanti 來自 Lua 與芬蘭語 `luonti`，後者意思是 creation / 創作。

官方也提醒，舊名稱仍可能出現在某些地方，例如 Minetest Game 這個保留歷史脈絡的內容；對開發者而言，Lua API 的 `minetest` 命名空間仍會作為相容 alias 保留，官方建議使用 `core` 命名空間。

## 主要特色

### 多種遊戲與內容

Luanti 啟動後可以安裝不同遊戲。官方 Getting Started 文件說明，第一次開啟 Luanti 時會要求安裝一個 game，按鈕會導向內容瀏覽器；你也可以在瀏覽器中查看 [ContentDB](https://content.luanti.org/) 上的遊戲。

Luanti 不是「只有一個玩法」的遊戲。官方文件說明，多數遊戲偏向建造、挖掘與創造力導向的 sandbox 玩法，但不是所有遊戲都一定如此。

### Mods 與材質包

Luanti 的 mods 是內容生態的核心。官方文件說明，mods 可以改變遊戲玩法，甚至 game 本身也是由 mods 組成。若加入多人伺服器，伺服器端 mods 會自動提供給 client，不需要玩家另外手動安裝。

官方首頁也寫到 ContentDB 上有超過 3000 個開源 mods，可供使用、改作或學習。

### 超大地圖

官方首頁列出 Luanti 地圖大小為 **62,000 x 62,000 x 62,000 blocks**，玩家可以向下挖 31,000 blocks 或向上建造 31,000 blocks。

### 多人遊戲

Luanti 支援單人、本機與線上多人。官方 Getting Started 文件說明，可以在 Join game 分頁加入多人伺服器；若伺服器不在列表中，也可以手動輸入地址與 port。

### 開發與開源

Luanti 的官方 GitHub README 說明它是 free open-source voxel game engine，使用 C++ 處理核心與效能相關部分，並以 Lua 進行可擴充的遊戲與 mod 開發。官方 GitHub 頁面也列出專案主要語言包含 C++ 與 Lua。

## 如何下載

官方下載頁提供：

- Windows installer 與 portable 版本
- Android 版本，可透過 Google Play、F-Droid 或 APK
- Linux Flatpak、Snap、PPA、各發行版套件或原始碼編譯
- macOS signed app、Homebrew 與 MacPorts
- FreeBSD、OpenBSD、NetBSD 套件或 ports/pkgsrc
- GitHub 上的 stable / development source code

下載頁特別提醒，Android 使用者不建議使用 Play Store 上常見的非官方 builds，因為它們可能包含過多廣告、spyware，或以 proprietary terms 發布。

## 使用前注意事項

1. Luanti 是平台 / 引擎，不是只有一個官方遊戲；第一次啟動時需要選擇或安裝 game。
2. 如果你是從 Minetest 時代回來的老使用者，部分路徑、設定檔與舊文件仍可能看到 `minetest` 名稱，這不一定代表資訊錯誤。
3. 多人伺服器通常會自動傳送需要的伺服器端 mods，但每個伺服器規則、帳號、內容與管理方式都不同。
4. Android 版應優先使用官方下載頁列出的 Google Play、F-Droid 或官方 APK 來源。
5. Linux 發行版倉庫中的套件可能落後；官方下載頁建議太舊時可考慮 Flatpak 或自行編譯。
6. 自己架伺服器時要注意備份、port、伺服器規則、mods 相容性與資源使用量。

## 適合誰

Luanti 適合想玩開源體素遊戲、喜歡 mods、想自己架伺服器，或想用 Lua 做遊戲內容的人。玩家可以把它當成多遊戲平台；創作者則可以把它當成一個不用自己處理體素渲染與網路底層的開源引擎。

如果你期待的是「安裝後立刻進入單一官方大型遊戲」，Luanti 的使用方式可能和你想像不同。它更像是一個入口：先安裝引擎，再選 game、mods、材質包或伺服器。

## 官方來源

- [Luanti 官方首頁](https://www.luanti.org/en/)
- [Luanti Downloads](https://www.luanti.org/en/downloads/)
- [Luanti Getting Started](https://docs.luanti.org/for-players/getting-started/)
- [Luanti GitHub](https://github.com/luanti-org/luanti)
- [Introducing Our New Name](https://blog.luanti.org/2024/10/13/Introducing-Our-New-Name/)
- [ContentDB](https://content.luanti.org/)
