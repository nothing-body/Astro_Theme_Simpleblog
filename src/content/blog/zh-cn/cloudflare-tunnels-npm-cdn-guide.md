---
title: 'Cloudflare Tunnels 边缘通道与 NPM 反代整合：隐蔽 VPS 端口与 CDN 防御实战'
pubDate: 2026-05-21
description: '更安全的自托管架构：通过 Cloudflare Tunnels 隐蔽所有 VPS 实体端口，将流量导入 Nginx Proxy Manager 进行二次安全分流与标头处理，并启用 Cloudflare 边缘 CDN 与 WAF 防御。'
category: '网络与安全'
categoryPath: ['网络与安全', 'CDN']
tags: ['CDN', '网络服务']
---

> **前置条件**
>
> - 先在 VPS 上创建外部隔离网桥 `npm_network`（`sudo docker network create npm_network`），此网络将被所有服务共享。
> - NPM 容器的 80 端口在容器内仍然开放，供 Cloudflare Tunnel 直接连接；外部仅映射管理界面的 81 端口至本地 `127.0.0.1`，确保不对公网暴露。

在传统的自托管（Self-Hosting）部署中，如果要将内网服务发布至公网，我们通常需要开启路由器上的端口转发，或者在 VPS 面板中开放 `80` 与 `443` 端口。然而，这等同于向全球的恶意扫描脚本与黑客敞开大门，让你的服务器 IP 暴露在危险之中。

**Cloudflare Tunnels (云端隧道)** 提供了一个完美的现代安全防护方案：它允许你在**不对外开放任何 VPS 实体端口**（包括 80、443 甚至 SSH 端口）、且**不暴露 VPS 公网 IP** 的状态下，安全地将内网流量穿透并发布至公网。同时，它还能无缝继承 Cloudflare 全球顶级的 CDN 加速、免费 SSL 证书以及强大的 WAF 防火墙。

本篇将带你完整构建“Cloudflare Tunnel + Nginx Proxy Manager”的双重防线，实现“零端口暴露”的极致安全架构。

---

## 架构设计：双重防线运作逻辑

在我们的设计中，流量的生命周期如下：

1. **访客浏览**：访客访问 `example.com`。
2. **Cloudflare 边缘防御**：流量首先抵达 Cloudflare 边缘节点，进行 CDN 缓存、防恶意机器人过滤（Bot Fight Mode）。
3. **安全隧道传输**：通过 Cloudflare Tunnel 建立的安全加密通道（Outbound Connection，无需开放任何入站端口），流量直接降落到 VPS 内部的 `cloudflare-tunnel` 容器。
4. **大门服务台分流（Nginx Proxy Manager）**：Tunnel 容器将流量转交给 NPM 容器（监听内网 `80` 端口）。
5. **精准分流**：NPM 根据域名标头（Host Header）将流量分发至对应的容器（如 `dockge:5001` 或 `karakeep:3000`），并应用我们在 NPM 中配置的 WebSocket 优化参数。

---

## 步骤一：部署 Cloudflare Tunnel 容器

首先，请登录 [Cloudflare Zero Trust 控制台](https://one.dash.cloudflare.com/)：

1. 导航至 **Networks** → **Tunnels** → 点击 **Create a Tunnel**。
2. 选择 **Cloudflared**，为隧道命名（例如 `Debian-VPS-Tunnel`）。
3. 在部署环境选择 **Docker**，复制命令中 `tunnel --no-autoupdate run` 后面那一长串权限 **Token**。

回到 VPS 中创建 Tunnel 项目文件夹：

```bash
sudo mkdir -p /opt/stacks/cloudflare-tunnel
cd /opt/stacks/cloudflare-tunnel
```

创建 `.env` 文件存放 Token，避免将敏感密钥硬编码在 Compose 中：

```bash
sudo nano .env
```

粘贴以下内容并替换为你的 Token：

```ini
CLOUDFLARE_TUNNEL_TOKEN=YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE
```

接着创建 `docker-compose.yml` 文件：

```bash
sudo nano docker-compose.yml
```

完整粘贴以下配置代码：

```yaml
version: '3.8'
services:
  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    environment:
      # 从 .env 中安全加载 Tunnel 授权密钥
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    # 执行启动命令，并关闭内部自动更新（由 Docker 管理更新）
    command: tunnel --no-autoupdate run
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

正式环境建议把 `cloudflare/cloudflared:latest` 改成你测试过的固定版本标签，并安排可回滚的更新流程。

启动 Tunnel 容器：

```bash
sudo docker compose up -d
```

此时回到 Cloudflare Zero Trust 控制台，你会看见该 Tunnel 的状态变更为绿色的 **HEALTHY**，代表通道建立成功。

---

## 步骤二：Cloudflare Tunnels 路由配置

这是最容易出错的环节。不论你后面有多少个子域名（如 `npm`、`dockge`、`karakeep`），因为所有的域名都需要经过 NPM 进行二次安全分流与 WebSocket 标头处理，**所有域名在 Cloudflare Tunnel 中指向的内网 URL 必须正确**：

### 路由配置对照表（Cloudflare Zero Trust Dashboard）

| Public Hostname (域名) | Type | URL (内网入口)           | 说明与逻辑                                           |
| :--------------------- | :--- | :----------------------- | :--------------------------------------------------- |
| `example.com`          | HTTP | `nginx-proxy-manager:80` | 先进 NPM 大门 80 端口，由其自我反代至后台 81         |
| `example.com`          | HTTP | `nginx-proxy-manager:80` | 先进 NPM 大门 80 端口，再由 NPM 导向 `dockge:5001`   |
| `example.com`          | HTTP | `nginx-proxy-manager:80` | 先进 NPM 大门 80 端口，再由 NPM 导向 `karakeep:3000` |

:::warning
**大门对齐核心逻辑**：
很多人会误将 `example.com` 指向 `dockge:5001`，或者将 `example.com` 指向 `nginx-proxy-manager:81`。
**千万不要这样做！** 如果您绕过 NPM 的 80 端口，所有流量将会跳过 NPM 的处理程序（例如我们在 NPM 中自定义的 WebSocket 升级标头与防护过滤器），这会导致 `502 Bad Gateway` 错误，或者造成 Dockge 终端频繁断开连接。
:::

---

## 步骤三：Nginx Proxy Manager 核心网关调整

在之前的教程中，NPM 容器的端口对照设置为官方默认对照。现在，由于流量全部改由 `cloudflare-tunnel` 容器在内网通道（`npm_network`）直接调用 `nginx-proxy-manager:80`，**你的 VPS 主机完全不需要对外开放 80 和 443 端口了！**

您可以修改 NPM 的 `docker-compose.yml`，将其 ports 调整为：

```yaml
ports:
  # 仅将管理面板绑定在 localhost，外网完全无法访问
  - '127.0.0.1:81:81' # 只把管理界面 81 映射到本地，容器内部的 80 仍可被 Tunnel 使用
```

这能将暴露在公网上的所有反代入口彻底封闭。

### NPM 自我反代配置

为了能安全地通过 `https://example.com` 进入 NPM 管理后台，我们必须在 NPM 内部创建“自我反代规则”：

1. 在 NPM 后台点击 **Add Proxy Host**：
2. **Details 页面**：
   - **Domain Names**: `example.com`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `127.0.0.1` (由于是在容器内部对照，填写本地 IP 即可)
   - **Forward Port**: `81` (NPM 原生后台管理端口)
   - 勾选 **Block Common Exploits** 与 **Websockets Support**
3. **Advanced 页面**（贴入核心 WebSocket 与安全防御标头）：
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. 保存后，你就能安全地关闭本地 SSH 通道，直接通过域名以加密连接安全访问后台。

---

## 步骤四：开启 Cloudflare 边缘 CDN 与 WAF 防护

既然流量已经走在 Cloudflare 的铁轨上，我们可以在 Cloudflare 控制台（非 Zero Trust 控制台，是主控制台）开启边缘防御：

1. **启用自动机器人对抗模式 (Bot Fight Mode)**：
   - 进入 Cloudflare 控制台 → **安全性 (Security)** → **WAF** → **工具 (Tools)** → 开启“**自动机器人对抗模式**”。这能直接在 Cloudflare 边缘服务器阻断 99% 的恶意漏洞扫描器，减轻 VPS 负担。
2. **确保 WebSocket 保持开启**：
   - 进入 **网络 (Network)** → 确保 **WebSockets** 功能保持开启状态（否则 Dockge 终端与 KaraKeep 实时同步将无法运作）。
3. **SSL/TLS 模式设置**：
   - 由于 Cloudflare Tunnel 本身在传输过程中就已完成全程强加密，你的 VPS 不需要向 Let's Encrypt 申请 SSL 证书，这能完全免除证书续期失败的烦恼。在 Cloudflare 控制台的 **SSL/TLS** 页面中，将加密模式设置为 **Flexible**（弹性）或 **Full**（完整）即可。

---

## 🛡️ 确定部署完成

部署完成后，请逐一检查你的 VPS，确保符合最严格的实作安全标准：

- **UFW 防火墙状态检验**：
  执行 `sudo ufw status`，确认除了你的 SSH 端口（默认 22 或自定义高端口）外，`5001`（Dockge）、`3000`（KaraKeep）、`81`（NPM 管理）以及 `80/443` 等端口在公网上皆为未开放或 `DENY` 状态。您可以尝试用外网浏览器输入 `http://你的VPS_IP:5001`，若连接失败，说明防御有效。
- **Cloudflare 穿透验证**：
  尝试使用域名（例如 `https://example.com`）访问，确认能够正常显示页面，且浏览器地址栏锁头图标显示为安全连接。
- **WebSocket 稳定度验证**：
  开启 Dockge，随意编辑一个 Docker Compose 并查看实时 Terminal 输出，确保不会发生中断或断开连接。
