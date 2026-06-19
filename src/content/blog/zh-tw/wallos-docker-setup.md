---
title: '在 Debian 上使用 Docker 搭建 Wallos 個人訂閱管理系統'
pubDate: 2026-05-10
description: '這篇文章將教你如何在一台全新的 Debian VPS 上，使用 Docker 與 Docker Compose 快速且安全地部署 Wallos 個人訂閱管理系統。'
category: '軟體'
tags: ['Docker', 'Linux']
---

在現今訂閱制服務盛行的時代，我們很容易忘記自己到底訂閱了多少服務（例如 Netflix、Spotify、雲端硬碟等），哪些服務快要到期需要續約。**Wallos** 是一個開源的個人訂閱追蹤與管理平台，它可以幫助你集中管理所有的訂閱支出。

## 為什麼選擇 Docker 部署？

使用 Docker 部署能確保環境的隔離性，不僅不會弄髒主機系統，還能在未來輕鬆備份與升級。

## 步驟一：系統更新與基礎防護

在全新的 Debian 系統上，我們首先要確保系統套件是最新的。這能修補已知的安全漏洞。請透過 SSH 連線至您的 VPS 並執行：

```bash
# 更新套件清單並升級系統
sudo apt update && sudo apt upgrade -y
```

## 步驟二：安裝 Docker 與 Docker Compose

為了確保安裝的是最新且安全的 Docker 版本，我們使用 Docker 官方提供的安裝腳本：

```bash
# 安裝必要的工具
sudo apt install curl -y

# 下載並執行 Docker 官方安裝腳本
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# 安裝完成後，將當前使用者加入 docker 群組（可選，方便不加 sudo 執行 docker）
sudo usermod -aG docker $USER
```

若你對供應鏈安全要求較高，建議改用 Debian 套件庫或 Docker 官方 APT Repository；使用便利腳本時，至少先檢查腳本內容再執行。

_(注意：修改使用者群組後，需要重新登入 SSH 才會生效。)_

## 步驟三：建立 Wallos 專案資料夾

為了方便管理與備份，我們為 Wallos 建立一個獨立的資料夾：

```bash
# 建立專案資料夾
mkdir -p ~/wallos
cd ~/wallos
```

## 步驟四：撰寫 docker-compose.yml

在 `wallos` 資料夾下，我們建立 `docker-compose.yml` 檔案。

```bash
# 使用 nano 編輯器建立檔案
nano docker-compose.yml
```

填入以下內容：

```yaml
version: '3.8'

services:
  wallos:
    container_name: wallos
    image: bellamy/wallos:latest
    ports:
      # 基於安全考量，建議不要直接對外開放預設的 80 埠
      # 這裡我們將外部的 8282 埠映射到容器內的 80 埠
      - '127.0.0.1:8282:80/tcp'
    environment:
      # 請根據您的所在地區修改時區，例如 Asia/Taipei
      TZ: 'Asia/Taipei'
    volumes:
      # 持久化資料，確保容器重啟或更新後資料不遺失
      - './db:/var/www/html/db'
      - './logos:/var/www/html/images/uploads/logos'
    restart: unless-stopped
```

正式環境建議把 `latest` 改成你測試過的固定版本標籤，並在升級前先備份 `./db` 與 `./logos` 目錄。

**安全提醒：** 上面的設定中，我們將連接埠綁定為 `127.0.0.1:8282`。這是因為 Wallos 處理的是您私人的訂閱與財務資訊，直接暴露在公開網路上容易遭受暴力破解。我們強烈建議後續搭配 **Nginx 反向代理** 並加上 **HTTPS / SSL 憑證**（例如使用 Let's Encrypt），或是透過 SSH 通道 (SSH Tunnel) 來安全存取。

## 步驟五：啟動 Wallos

確認 `docker-compose.yml` 設定無誤後，即可啟動容器：

```bash
# 在背景啟動容器
docker compose up -d
```

啟動後，Docker 會自動拉取映像檔並建立資料夾（`db` 與 `logos`）。

## 步驟六：存取與初始化

如果您已經設定好反向代理或 SSH 通道，現在可以在瀏覽器中輸入您的專屬網域或透過本地映射存取。

首次進入時，系統會引導您建立管理員帳號。請務必設定**高強度的密碼**，以保護您的財務隱私。

## 結語

透過上述步驟，我們在乾淨的 Debian 環境中安全地部署了 Wallos。
記得定期備份 `~/wallos/db` 與 `~/wallos/logos` 目錄
