---
title: "Cloudflare Tunnels 邊緣通道與 NPM 反代整合：隱蔽 VPS 埠口與 CDN 防禦實戰"
pubDate: 2026-05-21
description: "更安全的自託管架構：透過 Cloudflare Tunnels 隱蔽所有 VPS 實體連接埠，將流量導入 Nginx Proxy Manager 進行二次安全分流與標頭處理，並啟用 Cloudflare 邊緣 CDN 與 WAF 防禦。

> **前置條件**
> - 先在 VPS 上建立外部隔離網橋 `npm_network`（`sudo docker network create npm_network`），此網路將被所有服務共用。
> - NPM 容器的 80 埠在容器內仍然開放，供 Cloudflare Tunnel 直接連接；外部僅映射管理介面的 81 埠至本機 `127.0.0.1`，確保不對公網暴露。"
category: '網路與安全'
categoryPath: ['網路與安全', 'CDN']
tags: ['CDN', '網路服務']
---

在傳統的自託管（Self-Hosting）部署中，若要將內網服務發布至公網，我們通常需要開啟路由器上的連接埠轉送，或者在 VPS 面板中開放 `80` 與 `443` 埠口。然而，這等同於向全球的惡意掃描腳本與駭客洞開大門，讓你的伺服器 IP 暴露在危險之中。

**Cloudflare Tunnels (雲端隧道)** 提供了一個現代化的安全防護方案：它允許你在**不對外開放任何 VPS 實體連接埠**（包括 80、443 甚至 SSH 埠）、且**降低 VPS 公網 IP 暴露機率**的狀態下，安全地將內網流量穿透並發布至公網。同時，它還能銜接 Cloudflare 的 CDN 加速、免費 SSL 憑證以及 WAF 防火牆。

本篇將帶你完整建置「Cloudflare Tunnel + Nginx Proxy Manager」的雙重防線，實現「零埠口暴露」的極致安全架構。

---

## 架構設計：雙重防線運作邏輯

在我們的設計中，流量的生命週期如下：

1. **訪客瀏覽**：訪客存取 `example.com`。
2. **Cloudflare 邊緣防禦**：流量首先抵達 Cloudflare 邊緣節點，進行 CDN 快取、防惡意機器人過濾（Bot Fight Mode）。
3. **安全隧道傳輸**：通過 Cloudflare Tunnel 建立的安全加密通道（Outbound Connection，無需開放任何入站連接埠），流量直接降落到 VPS 內部的 `cloudflare-tunnel` 容器。
4. **大門服務台分流（Nginx Proxy Manager）**：Tunnel 容器將流量轉交給 NPM 容器（監聽內網 `80` 埠）。
5. **精準派發**：NPM 根據網域標頭（Host Header）將流量派發至對應的容器（如 `dockge:5001` 或 `karakeep:3000`），並套用我們在 NPM 中設定的 WebSocket 優化參數。

---

## 步驟一：部署 Cloudflare Tunnel 容器

首先，請登入 [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/)：

1. 導航至 **Networks** → **Tunnels** → 點選 **Create a Tunnel**。
2. 選擇 **Cloudflared**，為隧道命名（例如 `Debian-VPS-Tunnel`）。
3. 在部署環境選擇 **Docker**，複製命令中 `tunnel --no-autoupdate run` 後面那一長串權限 **Token**。

回到 VPS 中建立 Tunnel 專案資料夾：

```bash
sudo mkdir -p /opt/stacks/cloudflare-tunnel
cd /opt/stacks/cloudflare-tunnel
```

建立 `.env` 檔案存放 Token，避免將敏感密鑰硬編碼在 Compose 中：

```bash
sudo nano .env
```

貼上以下內容並替換你的 Token：

```ini
CLOUDFLARE_TUNNEL_TOKEN=YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE
```

接著建立 `docker-compose.yml` 檔案：

```bash
sudo nano docker-compose.yml
```

完整貼上以下配置代碼：

```yaml
version: '3.8'
services:
  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    environment:
      # 從 .env 中安全載入 Tunnel 授權金鑰
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    # 執行啟動命令，並關閉內部自動更新（由 Docker 管理更新）
    command: tunnel --no-autoupdate run
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

正式環境建議把 `cloudflare/cloudflared:latest` 改成你測試過的固定版本標籤，並安排可回滾的更新流程。

啟動 Tunnel 容器：

```bash
sudo docker compose up -d
```

此時回到 Cloudflare Zero Trust 控制台，你會看見該 Tunnel 的狀態變更為綠色的 **HEALTHY**，代表通道建立成功。

---

## 步驟二：Cloudflare Tunnels 路由配置

這也是最容易出錯的環節。不論你後面有多少個子網域（如 `npm`、`dockge`、`karakeep`），因為所有的網域都需要經過 NPM 進行二次安全分流與 WebSocket 標頭處理，**所有網域在 Cloudflare Tunnel 中指向的內網 URL 必須正確**：

### 路由設定對照表（Cloudflare Zero Trust Dashboard）

| Public Hostname (網域) | Type | URL (內網入口)           | 說明與邏輯                                         |
| :--------------------- | :--- | :----------------------- | :------------------------------------------------- |
| `example.com`          | HTTP | `nginx-proxy-manager:80` | 先進 NPM 大門 80 埠，由其自我反代至後台 81         |
| `example.com`          | HTTP | `nginx-proxy-manager:80` | 先進 NPM 大門 80 埠，再由 NPM 導向 `dockge:5001`   |
| `example.com`          | HTTP | `nginx-proxy-manager:80` | 先進 NPM 大門 80 埠，再由 NPM 導向 `karakeep:3000` |

:::warning
**大門對齊核心邏輯**：
很多人會誤將 `example.com` 指向 `dockge:5001`，或者將 `example.com` 指向 `nginx-proxy-manager:81`。
**千萬不要這樣做！** 如果您繞過 NPM 的 80 埠，所有流量將會跳過 NPM 的處理程序（例如我們在 NPM 中定義的自訂 WebSocket 升級標頭與防護過濾器），這會導致 `502 Bad Gateway` 錯誤，或是造成 Dockge 終端機頻繁斷線。
:::

---

## 步驟三：Nginx Proxy Manager 核心網關調整

在之前的教學中，NPM 容器的連接埠對照設定為官方預設對照。現在，由於流量全部改由 `cloudflare-tunnel` 容器在內網走廊（`npm_network`）直接呼叫 `nginx-proxy-manager:80`，**你的 VPS 主機完全不需要對外開放 80 和 443 連接埠了！**

您可以修改 NPM 的 `docker-compose.yml`，將其 ports 調整為：

```yaml
ports:
  # 僅將管理面板綁定在 localhost，外網完全無法存取
  - '127.0.0.1:81:81' # 只把管理介面 81 映射到本機，容器內部的 80 仍可被 Tunnel 使用
```

這能將暴露在公網上的所有反代入口徹底封閉

### NPM 自我反代配置

為了能安全地透過 `https://example.com` 進入 NPM 管理後台，我們必須在 NPM 內部建立「自我反代規則」：

1. 在 NPM 後台點選 **Add Proxy Host**：
2. **Details 頁面**：
   - **Domain Names**: `example.com`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `127.0.0.1` (由於是在容器本體內對照，填寫本機 IP 即可)
   - **Forward Port**: `81` (NPM 原生後台管理連接埠)
   - 勾選 **Block Common Exploits** 與 **Websockets Support**
3. **Advanced 頁面**（貼入核心 WebSocket 與安全防禦標頭）：
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. 儲存後，你就能安全地關閉本地 SSH 通道，直接透過網域名稱以加密連接安全存取後台。

---

## 步驟四：開啟 Cloudflare 邊緣 CDN 與 WAF 防護

既然流量已經走在 Cloudflare 的鐵軌上，我們可以在 Cloudflare 控制台（非 Zero Trust 控制台，是主控制台）開啟邊緣防禦：

1. **啟用自動機器人對抗模式 (Bot Fight Mode)**：
   - 進入 Cloudflare 控制台 → **安全性 (Security)** → **WAF** → **工具 (Tools)** → 開啟「**自動自動化機器人對抗模式**」。這能直接在 Cloudflare 邊緣伺服器阻斷 99% 的惡意弱點掃描器，減輕 VPS 負擔。
2. **確保 WebSocket 保持開啟**：
   - 進入 **網路 (Network)** → 確保 **WebSockets** 功能保持開啟狀態（否則 Dockge 終端機與 KaraKeep 即時同步將無法運作）。
3. **SSL/TLS 模式設定**：
   - 由於 Cloudflare Tunnel 本身在傳輸過程中就已完成全程強加密，你的 VPS 不需要向 Let's Encrypt 申請 SSL 憑證，這能完全免除憑證續期失敗的煩惱。在 Cloudflare 控制台的 **SSL/TLS** 頁面中，將加密模式設為 **Flexible**（彈性）或 **Full**（完整）即可。

---

## 🛡️ 確定部屬完成

部署完成後，請逐一檢查你的 VPS，確保符合最嚴格的實作安全標準：

- **UFW 防火牆狀態檢驗**：
  執行 `sudo ufw status`，確認除了你的 SSH 連接埠（預設 22 或自訂高連接埠）外，`5001`（Dockge）、`3000`（KaraKeep）、`81`（NPM 管理）以及 `80/443` 等連接埠在公網上皆為未開放或 `DENY` 狀態。您可以嘗試用外網瀏覽器輸入 `http://你的VPS_IP:5001`，若連線失敗，說明防禦有效。
- **Cloudflare 穿透驗證**：
  嘗試使用網域（例如 `https://example.com`）存取，確認能夠正常顯示頁面，且瀏覽器鎖頭顯示為安全連線。
- **WebSocket 穩定度驗證**：
  開啟 Dockge，隨意編輯一個 Docker Compose 並查看即時 Terminal 輸出，確保不會發生中斷或閃退連線。
