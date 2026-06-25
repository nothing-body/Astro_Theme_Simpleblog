---
title: 'RTK 介紹與使用注意事項：用 Rust CLI 壓縮 AI Agent 的命令輸出'
pubDate: 2026-06-25
description: '介紹 rtk-ai/rtk 這個 Rust Token Killer CLI 工具、最新穩定版狀態、安裝方式、常用命令、AI coding agent 整合，以及使用前需要注意的限制與安全事項。'
category: '軟體'
categoryPath: ['軟體', 'AI 開發工具']
tags: ['開發工具', 'AI']
---

> 資訊核對日期：2026-06-25。本文依據 rtk 官方網站、GitHub repository、README、release、Cargo.toml、SECURITY.md 與 DISCLAIMER.md 撰寫。RTK 更新很快，安裝前請再確認官方 release 與文件。

[RTK](https://github.com/rtk-ai/rtk) 是 `rtk-ai/rtk` 專案的 CLI 工具，全名常被寫成 **Rust Token Killer**。它的定位不是新的 AI 模型，也不是程式碼生成器，而是放在 AI coding agent 與 shell 命令之間的「命令輸出壓縮代理」。當 agent 執行 `git status`、`git diff`、`rg`、`cargo test`、`npm test`、`docker logs` 這類命令時，RTK 會嘗試把原本很長、重複或噪音很多的輸出整理成更短的摘要，再送回 LLM 上下文。

官方 README 描述它是單一 Rust binary，目標是在常見開發命令上降低 LLM token 消耗。官方網站首頁則以「在命令輸出進入 context window 前壓縮」來說明它的用途。

## 目前版本狀態

截至 2026-06-25 查詢：

- GitHub latest stable release 是 **v0.42.4**，發布於 **2026-06-12**。
- `develop` 分支的 `Cargo.toml` 版本也是 **0.42.4**。
- GitHub release 列表同時出現 `dev-0.43.0-rc.*` 預發版，例如 `dev-0.43.0-rc.287`。這類 RC 版本不是一般使用者應優先選擇的穩定版。

因此，如果你只是想正常使用，建議先以 GitHub latest release、Homebrew 或官方安裝文件中的穩定版方式為主，不要把最上方的 `dev-*` prerelease 當作預設推薦版本。

## RTK 解決什麼問題

AI coding agent 很常需要讀取終端輸出。問題是許多命令的原始輸出對人類有用，對 LLM 卻常常太長：

- `git diff` 可能包含大量上下文。
- 測試失敗時可能輸出整段 stack trace。
- `docker logs` 或 build log 可能重複同樣錯誤。
- `ls`、`find`、`tree` 在大型專案會產生很多檔案列表。

RTK 的做法是針對命令類型套用過濾、分組、截斷與去重，讓 agent 先看到更短的輸出。官方 README 也提醒，節省比例是估算，實際效果會隨專案大小、命令種類與輸出內容不同而變化。

## 安裝方式

官方 README 目前列出幾種安裝方式。

### Homebrew

macOS 或 Linux Homebrew 使用者可以使用：

```bash
brew install rtk
```

### Linux / macOS 快速安裝

官方 README 提供的快速安裝命令是：

```bash
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
```

安裝後預設放到 `~/.local/bin`。如果 shell 找不到 `rtk`，需要把 `~/.local/bin` 加入 `PATH`。

### Cargo

官方 README 提醒 crates.io 上存在另一個也叫 `rtk` 的專案，因此若要用 Cargo，建議照官方寫法從 GitHub 安裝：

```bash
cargo install --git https://github.com/rtk-ai/rtk
```

### 預編譯 binary

GitHub release 提供多個平台的預編譯檔案，包括 macOS、Linux、Windows、Debian package 與 RPM。Windows 使用者可下載 `rtk-x86_64-pc-windows-msvc.zip`，解壓後把 `rtk.exe` 放到 PATH 內。

官方文件也提醒，Windows 不要直接雙擊 `rtk.exe`，因為它是 CLI 工具，應該在 PowerShell、Command Prompt 或 Windows Terminal 執行。

## 驗證安裝

安裝後可先執行：

```bash
rtk --version
rtk gain
```

其中 `rtk --version` 用來確認目前版本；`rtk gain` 用來顯示 token 節省統計。README 內的示例版本文字可能落後於實際 release，因此請以實際輸出和 GitHub latest release 為準。

## 基本使用方式

RTK 可以直接包住命令使用：

```bash
rtk git status
rtk git diff
rtk grep "pattern" .
rtk read src/main.rs
rtk cargo test
rtk npm test
rtk docker logs container-name
```

這種方式最直覺，也比較適合先測試 RTK 是否真的符合你的工作流。

常見功能大致可分為：

- 檔案與搜尋：`rtk ls`、`rtk read`、`rtk find`、`rtk grep`、`rtk diff`
- Git：`rtk git status`、`rtk git log`、`rtk git diff`、`rtk git push`
- 測試：`rtk jest`、`rtk vitest`、`rtk pytest`、`rtk go test`、`rtk cargo test`
- Lint 與 build：`rtk lint`、`rtk tsc`、`rtk next build`、`rtk ruff check`
- 容器與雲端工具：`rtk docker ps`、`rtk docker logs`、`rtk kubectl pods`、`rtk aws ...`
- 統計與分析：`rtk gain`、`rtk discover`、`rtk session`

## 與 AI coding agent 整合

RTK 的核心賣點是讓 AI coding agent 自動把 shell 命令改寫成 `rtk` 命令。官方 README 的 quick start 列出多個初始化選項，例如：

```bash
rtk init -g
rtk init -g --codex
rtk init -g --gemini
rtk init -g --agent cursor
rtk init -g --agent windsurf
rtk init --agent cline
rtk init --agent kilocode
```

但要注意：不同 agent 的整合能力不一樣。README 明確說明，hook-based agents 會在 Bash 命令執行前改寫命令；但像 Claude Code 的內建 Read、Grep、Glob 類工具不會經過 Bash hook，因此不會自動被 RTK 攔截。若要使用 RTK 的壓縮輸出，需要改用 shell 命令，或直接呼叫 `rtk read`、`rtk grep`、`rtk find`。

對 Codex 而言，README 表格列出的方式是 `rtk init -g --codex`，方法是加入 `AGENTS.md` 與 `RTK.md` 類型的指令文件，而不是所有環境都能做到透明 hook 攔截。

## Windows 使用限制

官方 README 對 Windows 的說法很明確：RTK 可以在 native Windows 使用，但 auto-rewrite hook 需要 Unix shell，因此原生 Windows 會退回指令注入文件模式，命令不一定會自動改寫。

如果你想要完整 hook 支援，官方建議在 Windows 上使用 WSL。若在原生 PowerShell 使用，建議一開始先手動執行：

```powershell
rtk git status
rtk cargo test
rtk gain
```

確認輸出與統計正常後，再考慮初始化 agent 整合。

## 隱私與安全注意事項

RTK 會執行你的外部命令、讀取命令輸出，並可能在失敗時保存完整原始輸出供後續查看。這是它能工作的原因，也代表你應該把它當成開發環境中的高權限 CLI 工具看待。

官方 README 的 Privacy & Telemetry 段落說，匿名彙總 telemetry 預設停用，並需要明確 opt-in；但 DISCLAIMER.md 內也有「collects anonymous, aggregate usage metrics by default」的描述。這兩份文件在文字上不完全一致，因此實際使用前建議執行：

```bash
rtk telemetry status
```

若你的專案或公司環境不能接受任何遙測，可使用：

```bash
rtk telemetry disable
export RTK_TELEMETRY_DISABLED=1
```

另外，官方 SECURITY.md 將 shell execution、tracking database、rewrite logic、hook script、package name validation 等列為需要加強審查的高風險區域。這不是說 RTK 不安全，而是說這類工具本質上會接觸 shell、檔案系統與命令輸出，安裝與更新時應該比一般純文字工具更謹慎。

## 使用前建議

1. 先用穩定版，不要直接追 `dev-*` prerelease。
2. 先手動使用 `rtk git status`、`rtk grep`、`rtk test` 測試輸出是否符合需求。
3. 在重要 CI、部署、破壞性命令前，不要只看壓縮摘要；必要時查看原始輸出。
4. Windows 原生環境不要期待和 WSL 一樣完整的 hook 體驗。
5. 使用 telemetry 前先確認組織政策。
6. 若使用預編譯 binary，優先從 GitHub release 下載，並在可行時比對 checksum。
7. 注意 README、網站與 release 頁可能更新速度不同，版本資訊以 release 和本機 `rtk --version` 為準。

## 適合誰使用

RTK 比較適合：

- 長時間使用 AI coding agent 的開發者。
- 專案很大、命令輸出很長的人。
- 經常跑測試、lint、build、git diff 的工作流。
- 想降低上下文污染或 API token 消耗的團隊。

它不一定適合：

- 不常讓 AI agent 執行 shell 命令的人。
- 對命令輸出完整性要求極高，且不想切換查看原始輸出的人。
- 公司政策禁止安裝會攔截或包裝 shell 命令的工具。

## 總結

RTK 是一個很有針對性的開發工具：它不是替你寫程式，而是試圖讓 AI agent 少被終端噪音淹沒。它的價值取決於你的工作流。如果你大量使用 AI coding agent、經常跑測試與搜尋，RTK 可能能節省不少上下文空間；如果你的工作流主要靠 IDE 內建工具或人工操作，它的效果就會比較有限。

最安全的導入方式是先安裝穩定版、手動測試幾個常用命令、檢查 telemetry 狀態，再決定是否啟用 agent 整合。

## 參考來源

- [rtk-ai/rtk GitHub repository](https://github.com/rtk-ai/rtk)
- [RTK 官方網站](https://www.rtk-ai.app/)
- [RTK GitHub releases](https://github.com/rtk-ai/rtk/releases)
- [RTK README](https://github.com/rtk-ai/rtk/blob/develop/README.md)
- [RTK Cargo.toml](https://github.com/rtk-ai/rtk/blob/develop/Cargo.toml)
- [RTK SECURITY.md](https://github.com/rtk-ai/rtk/blob/develop/SECURITY.md)
- [RTK DISCLAIMER.md](https://github.com/rtk-ai/rtk/blob/develop/DISCLAIMER.md)
