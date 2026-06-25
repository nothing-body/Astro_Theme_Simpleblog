---
title: '使用 Dockge 可視化管理 Docker Compose 堆疊與 WebSocket 深度調校'
pubDate: 2026-05-21
description: "在 Debian VPS 上安裝 Dockge 可視化 Docker Compose 管理面板，並深入解析如何正確配置反向代理以支援 WebSocket 協定，避免終端機與日誌中斷連線。\n\n> **前置條件**\n> - 先在 VPS 上建立外部隔離網橋 `npm_network`（`sudo docker network create npm_network`），此網路將被所有服務共用。\n> - 確保 NPM 容器的 80 埠在容器內仍然開放，供 Cloudflare Tunnel 使用；外部僅映射管理介面的 81 埠至本機 `127.0.0.1`，避免公網暴露。"
category: '軟體'
categoryPath: ['軟體', '自架服務']
tags: ['Docker', '自架服務']
---

在管理多個自託管服務時，純命令列的 `docker compose` 操作雖然強大，但缺乏直觀的管理面板。**Dockge** 是一個極致精美、反應迅速且專為 Docker Compose 設計的可視化管理面板。它能讓你直接在瀏覽器中編輯 `docker-compose.yml`、檢視即時日誌並開啟互動式終端機。

由於 Dockge 的終端機與日誌更新高度依賴 **WebSocket** 協定，若反向代理（如 Nginx Proxy Manager）未妥善調校，會經常遇到連線逾時（Timeout）或斷線的問題。本篇將完整引導你進行 Dockge 的安全部署與 WebSocket 深度優化。

## [Dockge Github](https://github.com/louislam/dockge)

## 為什麼選擇 Dockge？

1. **原汁原味的 Compose**：Dockge 不會接管或修改你的 Docker 設定，它直接讀取並寫入標準的 `docker-compose.yml` 檔案。
2. **極致輕量**：相較於功能龐雜的 Portainer，Dockge 專注於 Compose 堆疊（Stacks）管理，反應速度極快。
3. **互動式終端機**：內建網頁版終端機，可直接進入容器內部執行命令。

---

## 步驟一：準備全域自託管目錄結構

為了讓 Dockge 能夠統一管理所有的 Docker 專案，我們將所有的 Docker 堆疊（Stacks）存放在 `/opt/stacks` 目錄下：

```bash
# 建立堆疊根目錄與 Dockge 專屬目錄
sudo mkdir -p /opt/stacks/dockge
```

---

## 步驟二：建立外部隔離網橋 npm_network

這條網路是整個反向代理生態系的走廊，所有需要對外發布的容器都必須加入此網路。這樣做可以避免將容器的連接埠直接暴露給公網，確保網路層的隔離性。

```bash
sudo docker network create npm_network
```

---

## 步驟三：部署 Dockge

:::warning
**安全警示：Docker 會繞過 UFW 防火牆！**
預設情況下，Docker 的連接埠對照（例如 `- "5001:5001"`）會直接修改 `iptables`，這使得 UFW 防火牆規則（如 `ufw deny`）失效，外部依然能直接掃描並存取該連接埠。
為了確保安全，我們必須將連接埠綁定在 `127.0.0.1`（本地迴環），僅允許本地端存取，再透過 Cloudflare Tunnel 或反向代理安全發布。
:::

進入 Dockge 目錄並建立 `docker-compose.yml`：

```bash
cd /opt/stacks/dockge
sudo nano docker-compose.yml
```

完整貼上以下配置代碼：

```yaml
version: '3.8'
services:
  dockge:
    image: louislam/dockge:1
    container_name: dockge
    restart: unless-stopped
    ports:
      # 【核心安全】僅綁定在本地 127.0.0.1，防止外部直接透過 IP 掃描與存取管理面板
      - '127.0.0.1:5001:5001'
    volumes:
      # 掛載 Docker 套接字，讓 Dockge 可以操作 Docker
      - /var/run/docker.sock:/var/run/docker.sock
      # 持久化 Dockge 自身的數據
      - ./data:/app/data
      # 掛載 Stacks 目錄，讓 Dockge 可以管理 /opt/stacks 底下的所有其他服務
      - /opt/stacks:/opt/stacks
    environment:
      # 宣告 Stacks 的根目錄路徑
      - DOCKGE_STACKS_DIR=/opt/stacks
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

儲存並退出編輯器（在 nano 中按 `Ctrl + O` 存檔，`Ctrl + X` 離開）。

---

## 步驟四：啟動 Dockge

在 `/opt/stacks/dockge` 目錄下執行以下指令啟動服務：

```bash
sudo docker compose up -d
```

此時，Dockge 已經在背景啟動。由於我們將連接埠限制在 `127.0.0.1:5001`，此時外網是無法直接透過 `http://VPS_IP:5001` 連線的，這達成了第一層網路安全防護。

_(若需在設定反代前臨時存取，可以使用 SSH Tunnel：`ssh -L 5001:127.0.0.1:5001 user@vps_ip`，即可在本地瀏覽器輸入 `http://localhost:5001` 進行存取。)_

---

## 步驟五：配置 Nginx Proxy Manager 反向代理與 WebSocket 優化

為了透過安全網域存取 Dockge，我們需要在 Nginx Proxy Manager (NPM) 中建立代理規則，並進行 WebSocket 深度調校。

### 1. Details 頁面設定

在 NPM 管理後台點選 **Add Proxy Host**，填入以下資訊：

- **Domain Names**: `example.com` (請替換為您的實際網域)
- **Scheme**: `http`
- **Forward Hostname / IP**: `dockge` (因為兩者在同一 `npm_network` 網路下，直接填寫 Dockge 的容器名稱即可)
- **Forward Port**: `5001` (Dockge 容器內部的預設連接埠)
- 勾選 **Block Common Exploits** (阻擋常見漏洞攻擊)
- 勾選 **Websockets Support** (【關鍵】啟用 WebSocket 支援)

### 2. Advanced 頁面調校（防止終端機中斷連線）

切換到 **Advanced** 分頁，在 Custom Nginx Configuration 區塊貼上以下優化代碼：

```nginx
# 完美支援 WebSocket 協定升級，防止 Dockge 終端機與即時日誌斷線
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# 傳遞真實 IP 與主機標頭，強化安全性
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# 【關鍵配置】延長 Nginx 讀取與傳送逾時時間至 24 小時 (86400秒)
# 預設的 60 秒逾時會導致 Dockge 終端機在閒置時被強制斷開連線
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;
```

設定完成後點選 **Save** 儲存。

---

## 步驟六：安全檢查

1. **UFW 防火牆確認**：執行 `sudo ufw status`，確保沒有放行 `5001` 連接埠。
2. **WebSocket 測試**：登入 Dockge 面板，進入任何一個 Stack，點選 **Terminal** 或是查看日誌。如果終端機游標能正常閃爍且可輸入指令，且閒置超過一分鐘沒有斷線，即代表 WebSocket 優化配置成功！

下一篇我們將部署強大的 AI 智慧書籤筆記系統 —— KaraKeep (Hoarder)，並同樣透過 Dockge 進行便捷的可視化管理。
