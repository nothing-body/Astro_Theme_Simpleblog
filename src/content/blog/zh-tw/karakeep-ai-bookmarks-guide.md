---
title: 'KaraKeep (Hoarder) 三合一 AI 智慧書籤與筆記系統'
pubDate: 2026-05-21
description: ' KaraKeep (原名 Hoarder) AI 書籤筆記生態系。結合 Meilisearch 全文搜尋與 Headless Chrome 網頁快照引擎。'
category: '軟體'
categoryPath: ['軟體', '自架服務']
tags: ['Docker', '自架服務', 'AI']
---

在資訊爆炸的時代，我們每天都會閱讀大量的網頁、文章與貼圖。**KaraKeep**（原名 **Hoarder**，於 2025 年 4 月正式更名）是一款功能極為強大的全功能 AI 數據與書籤收集工具。它不僅支援網頁鏈接、純文字與圖片的收集，還能透過自定義的 AI 模型對內容進行自動分類、標籤與摘要。

KaraKeep 的架構較為龐大，是一個典型的「三合一」微服務生態系，包含：

1. **Web 前端與核心大腦** (Main Web App)
2. **Meilisearch 全文搜尋引擎** (提供即時、精準的搜尋功能)
3. **Headless Chrome 隔離瀏覽器** (負責抓取網頁快照與書籤截圖)

由於涉及個人閱讀隱私與敏感數據，本篇教學將以**安全優先**為核心，教你如何降低公開暴露面並安全地部署這套系統。

[KaraKeep](https://github.com/karakeep-app/karakeep)

---

## 步驟一：密鑰預先準備

在開始部署前，請在終端機執行兩次以下指令，產生兩組高強度的隨機安全字串並記錄下來。這些密鑰將用於 Session 加密以及 Meilisearch 的存取鑑權：

```bash
openssl rand -base64 36
```

執行後會得到類似下面的輸出，請先複製儲存起來：

- 密鑰 1（用於 `NEXTAUTH_SECRET`）：`d2FjZ2...`
- 密鑰 2（用於 `MEILI_MASTER_KEY`）：`c2FmZS...`

---

## 步驟二：建立專案目錄與環境變數

統一將 Stacks 存放在 `/opt/stacks` 底下。我們建立 KaraKeep 專屬目錄及持久化資料夾：

```bash
cd /opt/stacks
sudo mkdir -p karakeep/karakeep-data
sudo mkdir -p karakeep/meili-data
sudo mkdir -p karakeep/chrome-data
cd karakeep
```

接著建立並編輯環境變數設定檔 `.env`：

```bash
sudo nano .env
```

請將以下內容完整貼上，並將 `YOUR_OPENSSL_RANDOM_STRING_1` 和 `YOUR_OPENSSL_RANDOM_STRING_2` 替換為剛才產生的隨機密鑰：

```ini
# =========================================================================
# KaraKeep (Hoarder) 安全與核心配置環境變數
# =========================================================================

# 1. 基礎與版本配置
KARAKEEP_VERSION=release
PORT=3000
DB_PATH=/data/karakeep.db
# 請將此網址替換為你實際要使用的反代網域
NEXTAUTH_URL=https://example.com

# 2. 內部微服務組件通訊路由（直接走 npm_network 內網域名）
MEILI_ADDR=http://karakeep-meili:7700
BROWSER_WEB_URL=http://karakeep-chrome:9222
DATA_DIR=/data

# 3. 系統密鑰（防範 Session 劫持，請填入 openssl 產生的隨機字串）
NEXTAUTH_SECRET="YOUR_OPENSSL_RANDOM_STRING_1"
MEILI_MASTER_KEY="YOUR_OPENSSL_RANDOM_STRING_2"

# 4. 用戶管理安全防禦（核心防線：關閉公開註冊、關閉邀請、關閉 Demo，實現完全私有）
DISABLE_SIGNUPS=true
DISABLE_INVITES=true
DISABLE_DEMO=true

# 5. 傳輸安全：強制開啟瀏覽器安全標記，防範 XSS 攻擊竊取 Cookie
NEXTAUTH_SECURE_COOKIES=true

# 6. 爬蟲本機封存：強制將抓取到的網頁圖片下載到 VPS 本地，防範外部防盜鏈與追蹤行為
CRAWLER_DOWNLOAD_IMAGES=true

# 7. 隱私保護：關閉 Meilisearch 的匿名遙測與分析數據上傳
MEILI_NO_ANALYTICS=true
```

儲存並退出。

---

## 步驟三：撰寫 docker-compose.yml 檔案

在 `/opt/stacks/karakeep` 目錄下建立 `docker-compose.yml`：

```bash
sudo nano docker-compose.yml
```

貼入以下三合一架構配置代碼：

```yaml
version: '3.8'

services:
  # 1. 網頁前端與核心服務
  web:
    image: ghcr.io/karakeep-app/karakeep:${KARAKEEP_VERSION:-release}
    container_name: karakeep-web
    restart: unless-stopped
    ports:
      # 【核心安全】僅綁定在本地 127.0.0.1，防止外部直接繞過 UFW 存取 3000 連接埠
      - '127.0.0.1:3000:3000'
    volumes:
      - ./karakeep-data:/data
    env_file:
      - .env
    networks:
      - npm_network
    depends_on:
      - meilisearch
      - chrome

  # 2. 全文搜尋引擎
  meilisearch:
    image: getmeili/meilisearch:v1.11.1
    container_name: karakeep-meili
    restart: unless-stopped
    volumes:
      - ./meili-data:/meili_data
    env_file:
      - .env
    networks:
      - npm_network

  # 3. 負責網頁快照與書籤截圖的 Chrome 隔離容器
  chrome:
    image: gcr.io/zenika-hub/alpine-chrome:124
    container_name: karakeep-chrome
    restart: unless-stopped
    command:
      - --no-sandbox
      - --disable-gpu
      # 防範 Chrome 因 Docker 預設的 64MB /dev/shm 記憶體限制而崩潰
      - --disable-dev-shm-usage
      - --remote-debugging-address=0.0.0.0
      - --remote-debugging-port=9222
      - --hide-scrollbars
    volumes:
      - ./chrome-data:/data
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

:::warning
Chrome 的 `--no-sandbox` 與 `--remote-debugging-address=0.0.0.0` 只適合放在隔離的 Chrome 容器內，並且只能透過私有 Docker 網路被 KaraKeep 存取。不要把 `9222` 映射到公網，也不要在主機上的日常瀏覽器套用這組參數，否則會大幅提高遠端控制瀏覽器的風險。
:::

:::tip
**說明**：部分舊教程的 Chrome 啟動參數中缺少了 `--disable-dev-shm-usage`。在 Docker 容器中，預設的 `/dev/shm`（共享記憶體）只有 64MB。當 Chrome 抓取複雜或圖片較多的網頁時，極易因記憶體耗盡而崩潰。加入此參數可以改用 `/tmp` 進行渲染，保障系統的穩定性。
:::

---

## 步驟四：啟動服務

在 `/opt/stacks/karakeep` 底下執行啟動命令：

```bash
sudo docker compose up -d
```

執行後可以使用 `sudo docker ps` 確認 `karakeep-web`、`karakeep-meili`、`karakeep-chrome` 三個容器皆處於 `Up` 狀態。

---

## 步驟五：設定 Nginx Proxy Manager 反向代理

我們需要設定反向代理，讓外網可以透過安全的 HTTPS 網域存取 KaraKeep。

1. 登入 Nginx Proxy Manager 面板，點選 **Add Proxy Host**。
2. **Details 分頁**：
   - **Domain Names**: `example.com` (請替換為你的實際網域)
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `karakeep-web` (直連同網路下的 web 服務名稱)
   - **Forward Port**: `3000` (容器內部預設通訊埠)
   - 勾選 **Block Common Exploits** 與 **Websockets Support**
3. **Advanced 分頁**（寫入安全防禦與 WebSocket 同步標頭）：
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. 點選 **Save** 儲存。

---

## 步驟六：系統級安全性複核

為確保 KaraKeep 維持低暴露面，請務必逐一進行以下驗證：

1. **UFW 防火牆檢查**：
   執行 `sudo ufw status`，確認 VPS 公網未對外開放 `3000` 連接埠。
2. **公開註冊功能驗證**：
   使用瀏覽器的**無痕視窗**開啟你的 KaraKeep 網址（例如 `https://example.com`），確認登入按鈕下方**沒有**出現「Sign Up（註冊）」或「Create Account」的連結，確保不會被外人惡意註冊使用。
3. **安全標頭檢驗**：
   在登入頁面按 `F12` 開啟開發者工具，切換至「網路 (Network)」分頁，重新整理網頁。點選首頁請求，檢視回應標頭（Response Headers），確認傳輸 Cookie 時帶有 `Secure` 與 `HttpOnly` 屬性。
4. **持久化與備份驗證**：
   所有的資料庫、快照和 Meilisearch 資料都應儲存在本機的 `/opt/stacks/karakeep/` 底下。這能避免容器重建時資料被一併刪除，但仍建議定期備份整個目錄，尤其是在升級映像前。
