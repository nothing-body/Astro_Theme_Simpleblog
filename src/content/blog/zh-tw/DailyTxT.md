---
title: '打造專屬的安全私密日記本：DailyTxT 介紹與伺服器部署指南'
pubDate: 2026-05-02
category: '軟體'
categoryPath: ['軟體', '自架服務']
tags: ['自架服務', '個人資料']
---

在數位時代，我們的生活軌跡往往散落在各大雲端服務中，然而對於真正私密的日記與靈感，許多人更傾向於「完全掌握在自己手中」。[DailyTxT](https://github.com/PhiTux/DailyTxT) 應運而生，它是一款專為隱私設計的加密網頁版日記/筆記應用程式。

DailyTxT-[Github](https://github.com/PhiTux/DailyTxT)
Live Demo(Official)-[Live Demo](https://dailytxt.phitux.de/)

---

## 為什麼選擇 DailyTxT？

相較於市面上龐大的筆記軟體或普通的明文日記本，DailyTxT 的定位非常明確：**極致的隱私與輕量化的記錄體驗**。

- **伺服器端加密機制**：所有的日記內容與上傳的檔案，都會經過加密後才儲存於伺服器硬碟中。即便是伺服器的管理員（或是 VPS 供應商），在沒有你的登入密碼衍生的金鑰情況下，也無法讀取你的日記內容。
- **純粹的資料儲存**：不依賴複雜的資料庫（如 MySQL 或 PostgreSQL），所有資料皆以 JSON 檔案格式加密儲存，這使得資料的備份與遷移變得異常簡單，保障了資料的長期可用性。
- **多語言與跨平台**：原生支援繁體中文（台灣）等多國語言。響應式設計不僅在電腦端排版舒適，更支援 PWA（漸進式網頁應用程式），可直接安裝在手機桌面，體驗宛如原生 APP。
- **豐富的功能**：支援 Markdown 語法即時預覽、圖片庫檢視、標籤分類、地理位置打卡（地圖模式），甚至支援匯出為 HTML。

---

## 環境準備

- **作業系統**：一台全新未安裝任何軟體的 VPS（不限特定作業系統，只要能運行 Docker 即可）。
- **網域名稱**：一個已解析至該 VPS IP 位址的網域（例如：`diary.yourdomain.com`）。
- **連線工具**：具備 SSH 連線能力。

---

## 第一步：安裝 Docker 並配置日誌大小限制

在伺服器上長期運行容器時，最常遇到的災難之一就是「容器日誌 (Logs) 無限制增長」，最終導致 VPS 磁碟空間耗盡而死機。因此，在安裝任何應用前，我們先將基礎建設的安全性與穩定性做好。

### 1. 使用官方腳本安裝 Docker

登入你的 VPS，執行以下官方提供的安裝指令（適用於絕大多數 Linux 發行版）：

```bash
# 下載並執行 Docker 官方一鍵安裝腳本
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# 將 Docker 設定為開機自動啟動並立即啟動
systemctl enable docker
systemctl start docker
```

若你對供應鏈安全要求較高，建議改用作業系統套件庫或 Docker 官方 APT Repository；使用便利腳本時，至少先檢查腳本內容再執行。

### 2. 限制 Docker 日誌大小

為了防止日誌塞滿硬碟，我們需要全域限制 Docker 的日誌大小。

```bash
# 建立或編輯 Docker 的 daemon.json 設定檔
vim /etc/docker/daemon.json
```

寫入以下配置（將每個容器的日誌限制為最大 20MB，並保留 3 份歷史檔案）：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  }
}
```

存檔後，重啟 Docker 服務讓設定生效：

```bash
systemctl restart docker
```

---

## 第二步：部署 DailyTxT

基礎環境就緒後，安裝 DailyTxT。我們將完全遵照官方建議的 `docker-compose.yml` 方式進行部署。

### 1. 產生安全密鑰 (SECRET_TOKEN)

DailyTxT 需要一組高強度的隨機字串作為核心的加密基礎。在終端機輸入以下指令並**複製輸出的隨機字串**：

```bash
openssl rand -base64 32
```

### 2. 建立 DailyTxT 目錄與設定檔

```bash
# 建立目錄
mkdir -p /opt/dailytxt && cd /opt/dailytxt

# 建立 docker-compose.yml
vim docker-compose.yml
```

填入官方配置，並仔細修改相應的環境變數：

```yaml
services:
  dailytxt:
    image: phitux/dailytxt:latest
    container_name: dailytxt
    restart: unless-stopped
    volumes:
      # 左側為宿主機的路徑，所有加密後的日記資料都會存放在這裡
      - ./data:/data
    environment:
      # 將剛剛生成的 32 位元隨機字串貼在等號後方
      - SECRET_TOKEN=你的隨機字串

      # 為了資料格式整齊，設定 JSON 縮排為 4
      - INDENT=4

      # 【安全防護】初期先開啟註冊，註冊完你的第一個帳號後，務必改回 false 並重啟
      - ALLOW_REGISTRATION=true

      # 設定 Admin 後台面板的密碼 (請務必設定高強度管理員密碼)
      - ADMIN_PASSWORD=你的高強度管理員密碼

      # 登入狀態保持的天數
      - LOGOUT_AFTER_DAYS=40
    ports:
      # 將容器的 80 埠對應到本機的 8000 埠。
      # 官方強烈建議綁定在 127.0.0.1，避免直接暴露於公網遭到掃描攻擊。
      - 127.0.0.1:8000:80
```

正式環境建議把 `latest` 改成你測試過的固定版本標籤，並在升級前先備份 `./data` 目錄。

### 3. 啟動 DailyTxT

```bash
docker compose up -d
```

至此，DailyTxT 已成功在伺服器的本地 `127.0.0.1:8000` 獨立運行。此時外部網路是無法直接存取它的，我們達到了極高的隱蔽性與安全性。

---

## 第三步：設定反向代理與安全連線

為了讓你能在外網透過你的網域（例如 `https://diary.yourdomain.com`）安全地存取 DailyTxT，我們必須透過 Nginx 等網頁伺服器進行反向代理，並強制掛載 HTTPS SSL 憑證。

### 方法一：手動配置 Nginx

若你的伺服器已安裝 Nginx（或偏好直接掌控設定檔），可透過以下方式完成配置。

首先安裝 Nginx 與 Certbot（用於自動申請 Let's Encrypt SSL 憑證）：

```bash
apt install nginx certbot python3-certbot-nginx -y
```

建立 DailyTxT 的 Nginx 站點設定檔：

```bash
vim /etc/nginx/sites-available/dailytxt
```

填入以下反向代理設定（先以 HTTP 建立，之後由 Certbot 自動補上 HTTPS）：

```nginx
server {
    listen 80;
    # 將此處替換為你的實際網域
    server_name diary.yourdomain.com;

    location / {
        # 將流量轉發到本地的 DailyTxT 容器
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # WebSocket 支援 (DailyTxT 即時更新所需)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 傳遞真實的客戶端資訊給後端
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

啟用站點並申請 SSL 憑證：

```bash
# 建立軟連結啟用站點設定
ln -s /etc/nginx/sites-available/dailytxt /etc/nginx/sites-enabled/

# 測試 Nginx 設定是否有誤
nginx -t

# 重新載入 Nginx
systemctl reload nginx

# 使用 Certbot 自動申請 SSL 憑證並修改 Nginx 設定
certbot --nginx -d diary.yourdomain.com
```

Certbot 會自動修改 Nginx 設定，將 HTTP 請求重新導向至 HTTPS，並設定憑證自動續期。

---

### 方法二：使用 Nginx Proxy Manager (圖形介面)

如果你不想手寫 Nginx 設定檔，可以改用提供圖形化管理介面的 **Nginx Proxy Manager (NPM)**，透過幾個點擊就能完成反向代理與 SSL 申請。

關於 NPM 的完整安裝與反向代理配置教學，請前往閱讀這篇專文：  
👉 [Docker + Nginx Proxy Manager 完整安裝與設定教學](./docker-nginx-proxy-manager-guide.md)

_(小提示：在進行 NPM 的 Proxy Host 設定時，請記得將 Forward Hostname / IP 指向 `host.docker.internal` 或伺服器本機 IP，Port 填寫為 `8000`，即可成功與 DailyTxT 連線。)_

---

## 第四步：開始使用與後續安全建議

現在，你可以打開瀏覽器，輸入 `https://diary.yourdomain.com`，映入眼簾的將是 DailyTxT 的登入與註冊畫面。

**🚨 關鍵安全收尾操作：**

1. 立即在網頁上註冊你的第一個帳號。
2. 註冊完成並確認能成功登入後，回到終端機修改 `/opt/dailytxt/docker-compose.yml`。
3. 將 `ALLOW_REGISTRATION=true` 修改為 `ALLOW_REGISTRATION=false`。
4. 執行 `docker compose up -d` 重新套用設定。這將徹底關閉開放註冊功能，杜絕陌生人濫用你的伺服器資源建立帳號。

**備份建議：**
得益於 DailyTxT 優秀的設計，它沒有脆弱的資料庫依賴。你只需要定期將 VPS 上的 `/opt/dailytxt/data` 資料夾打包下載，就能完成 100% 的完整備份。即便未來更換伺服器，只要將該資料夾放回原處並重新啟動 Docker 容器，所有的日記與設定都會完美還原。
