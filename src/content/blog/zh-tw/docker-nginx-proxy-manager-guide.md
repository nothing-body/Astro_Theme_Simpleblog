---
title: 'Docker + Nginx Proxy Manager 完整安裝與設定教學'
pubDate: 2026-05-01
description: '安裝 Nginx Proxy Manager，用圖形介面輕鬆管理反向代理與 SSL 憑證。'
category: '軟體'
tags: ['Docker', 'Nginx', '反向代理']
---

想把 VPS 上跑的各種服務，從 `IP:埠口` 變成好記的網域名稱存取？  
反向代理（Reverse Proxy）就是答案，而 **Nginx Proxy Manager（NPM）** 讓這件事變得異常簡單，不需要手寫複雜的 Nginx 設定，全程有圖形介面操作。

本文將帶你完整走完以下流程：

1. 安裝 Docker 並設定日誌大小限制
2. 安裝 Nginx Proxy Manager
3. 設定反向代理與 SSL 憑證
4. 啟用存取登入限制（Access List）

---

## 前置需求

- 一台 VPS，系統為 **Debian 11/12** 或 Ubuntu 20.04+（**不建議使用 CentOS**）
- 一個已指向該 VPS IP 的網域名稱
- 以 root 或具有 sudo 權限的帳號操作

---

## 第一步：安裝 Docker

### 1-1 安裝 Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
```

這個範例使用 Docker 官方便利腳本。若你對供應鏈安全要求較高，建議改用作業系統套件庫或 Docker 官方 APT Repository，並在執行前先檢查腳本內容。

安裝完成後，確認版本並設定開機自動啟動：

```bash
docker -v
systemctl enable docker
systemctl start docker
```

### 1-2 重要：設定 Docker 日誌大小限制

> **這是防止硬碟被塞滿的關鍵步驟，強烈建議不要跳過。**

Docker 的容器預設會無限累積日誌，長期運行後很容易把硬碟空間吃光。以下設定會限制每個日誌檔最大 20MB，且最多保留 3 個輪替檔案，同時啟用容器的 IPv6 支援：

```bash
cat > /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  },
  "ipv6": true,
  "fixed-cidr-v6": "fd00:dead:beef:c0::/80",
  "experimental": true,
  "ip6tables": true
}
EOF
```

套用設定，重啟 Docker：

```bash
systemctl restart docker
```

**設定說明：**

| 參數                    | 說明                             |
| ----------------------- | -------------------------------- |
| `log-driver: json-file` | 使用 JSON 格式儲存日誌（預設值） |
| `max-size: 20m`         | 單一日誌檔上限 20MB              |
| `max-file: 3`           | 最多保留 3 個輪替日誌檔          |
| `ipv6: true`            | 啟用容器 IPv6 網路支援           |

---

## 第二步：安裝 Nginx Proxy Manager

### 2-1 建立安裝目錄

```bash
mkdir -p /root/data/docker_data/npm
cd /root/data/docker_data/npm
```

### 2-2 建立 docker-compose.yml

```bash
vim docker-compose.yml
```

按 `i` 進入編輯模式，貼入以下內容：

```yaml
version: '3'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80' # HTTP，保持預設，不建議修改
      - '127.0.0.1:81:81' # NPM 管理介面，僅本機可訪問
      - '443:443' # HTTPS，保持預設，不建議修改
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

正式環境建議把 `latest` 改成你實際測試過的固定版本標籤，避免容器重建時自動拉到未驗證的新版本。

按 `Esc`，輸入 `:wq` 儲存離開。

### 2-3 確認埠口 81 未被佔用

```bash
lsof -i:81
```

若無任何輸出，表示埠口空閒，可以繼續。若被佔用，請在 `docker-compose.yml` 中將 `81:81` 改為其他埠口（例如 `8181:81`）。

### 2-4 啟動容器

```bash
docker compose up -d
```

### 2-5 確認容器正在運行

```bash
docker ps
```

正常情況下會看到 `jc21/nginx-proxy-manager` 容器在運行中。

---

## 第三步：首次登入 NPM 管理介面

開啟瀏覽器，前往：

```
http://你的伺服器IP:81
```

使用預設帳號密碼登入：

```
Email:    admin@example.com
Password: changeme
```

> **登入後請立即修改預設 Email 與密碼！**

登入後系統會要求你更新帳號資訊，請設定你的 Email 與一組強密碼。

---

## 第四步：新增反向代理主機

這是 NPM 最核心的功能。以下示範如何把 `app.example.com` 代理到本機的 `8080` 埠。

### 4-1 DNS 設定

先至你的 DNS 服務商（如 Cloudflare），新增一筆 A 記錄：

```
app.example.com  →  你的VPS IP
```

### 4-2 在 NPM 新增 Proxy Host

1. 登入 NPM 管理介面
2. 點選 **Proxy Hosts** → **Add Proxy Host**
3. 填入以下資訊：
   - **Domain Names**：`app.example.com`
   - **Scheme**：`http`（若目標服務有 HTTPS 則選 `https`）
   - **Forward Hostname / IP**：`127.0.0.1`（若目標是同一台 VPS 上的服務）
   - **Forward Port**：`8080`（目標服務的實際埠口）
   - 勾選 **Block Common Exploits**

4. 切換到 **SSL** 分頁：
   - 選擇 **Request a new SSL Certificate**
   - 勾選 **Force SSL**
   - 勾選 **HTTP/2 Support**
   - 填入你的 Email（用於 Let's Encrypt 憑證通知）
   - 勾選同意服務條款

5. 點選 **Save**

NPM 會自動透過 Let's Encrypt 申請免費 SSL 憑證，完成後即可用 HTTPS 存取你的服務。

---

## 第五步：啟用存取登入限制（Access List）

若你的某些服務不希望開放給所有人，可以透過 NPM 的 **Access Lists** 功能，要求訪客先通過 HTTP Basic Auth 驗證才能進入。

### 5-1 建立 Access List

1. 在 NPM 介面點選 **Access Lists** → **Add Access List**
2. 填入名稱（如 `Private Access`）
3. 切換到 **Authorization** 分頁：
   - 點選 **Add** 新增帳號
   - 填入使用者名稱與密碼
4. 切換到 **Access** 分頁：
   - 可以設定允許或拒絕特定 IP 範圍
   - 若要允許所有 IP 都需要驗證，保持預設即可
5. 點選 **Save**

### 5-2 將 Access List 套用至代理主機

1. 到 **Proxy Hosts** 找到你要保護的代理主機
2. 點選編輯（鉛筆圖示）
3. 在 **Details** 分頁的 **Access List** 欄位，選擇剛才建立的 `Private Access`
4. 點選 **Save**

此後，訪客在開啟該網域時，瀏覽器會彈出帳號密碼輸入框。

> **注意**：部分版本的 NPM 在啟用 Access List 時可能需要重啟容器才能生效。若設定後沒有彈出登入框，可執行 `docker restart <容器名稱>` 或在 NPM 介面重新儲存該設定。

---

## 更新 Nginx Proxy Manager

```bash
cd /root/data/docker_data/npm

# 備份現有資料
cp -r /root/data/docker_data/npm /root/data/docker_data/npm.backup

# 拉取最新映像並重啟
docker compose pull
docker compose up -d

# 清除多餘的舊映像
docker image prune
```

執行 `docker image prune` 時，輸入 `y` 確認。

---

## 解除安裝 Nginx Proxy Manager

```bash
cd /root/data/docker_data/npm
docker compose down

# 先移到備份目錄，確認無誤後再手動刪除
mv /root/data/docker_data/npm /root/data/docker_data/npm.removed.$(date +%F-%H%M%S)
```

---

## 常見問題

**Q：設定完反向代理後，用域名打開網頁出現 502 Bad Gateway？**  
A：請確認 Forward Hostname / IP 和 Forward Port 填寫正確，且目標服務確實正在運行（`docker ps` 或 `curl http://127.0.0.1:8080` 測試）。

**Q：SSL 憑證申請失敗？**  
A：確認 DNS A 記錄已正確解析到 VPS IP（可用 `ping app.example.com` 測試），且 VPS 的 80 和 443 埠口已在雲端服務商的防火牆中開放。

**Q：忘記 NPM 登入密碼怎麼辦？**  
A：可到 NPM 登入頁點選 **Forgot Password** 使用 Email 重設，或直接進入容器資料庫手動修改。

**Q：curl 不到伺服器 IP 怎麼確認？**

```bash
curl ip.sb
```

---

## 小結

透過 Docker + Nginx Proxy Manager 的組合，你可以：

- ✅ 用網域名稱（而非 IP:埠口）存取任意服務
- ✅ 自動申請與續約 Let's Encrypt 免費 SSL 憑證
- ✅ 圖形化介面管理所有代理規則
- ✅ 為敏感服務加上 HTTP Basic Auth 保護
- ✅ 透過日誌限制設定，防止硬碟被日誌塞滿
