---
title: '使用 Dockge 可视化管理 Docker Compose 堆栈与 WebSocket 深度调校'
pubDate: 2026-05-21
description: "在 Debian VPS 上安装 Dockge 可视化 Docker Compose 管理面板，并深入解析如何正确配置反向代理以支持 WebSocket 协议，避免终端与日志断开连接。\n\n> **前置条件**\n> - 先在 VPS 上创建外部隔离网桥 `npm_network`（`sudo docker network create npm_network`），此网络将被所有服务共享。\n> - 确保 NPM 容器的 80 端口在容器内仍然开放，供 Cloudflare Tunnel 使用；外部仅映射管理界面的 81 端口至本地 `127.0.0.1`，避免公网暴露。"
category: '软件'
tags: ['Docker', 'Dockge']
---

在管理多个自托管服务时，纯命令行 的 `docker compose` 操作虽然强大，但缺乏直观的管理面板。**Dockge** 是一个极致精美、反应迅速且专为 Docker Compose 设计的可视化管理面板。它能让你直接在浏览器中编辑 `docker-compose.yml`、查看实时日志并开启交互式终端。

由于 Dockge 的终端与日志更新高度依赖 **WebSocket** 协议，如果反向代理（如 Nginx Proxy Manager）未妥善调校，会经常遇到连接超时（Timeout）或断线的问题。本篇将完整引导你进行 Dockge 的安全部署与 WebSocket 深度优化。

[Dockge Github](https://github.com/louislam/dockge)

---

## 为什么选择 Dockge？

1. **原汁原味的 Compose**：Dockge 不会接管或修改你的 Docker 配置，它直接读取并写入标准的 `docker-compose.yml` 文件。
2. **极致轻量**：相较于功能庞杂的 Portainer，Dockge 专注于 Compose 堆栈（Stacks）管理，响应速度极快。
3. **交互式终端**：内置网页版终端，可以直接进入容器内部执行命令。

---

## 步骤一：准备全局自托管目录结构

为了让 Dockge 能够统一管理所有的 Docker 项目，我们将所有的 Docker 堆栈（Stacks）存放在 `/opt/stacks` 目录下：

```bash
# 创建堆栈根目录与 Dockge 专属目录
sudo mkdir -p /opt/stacks/dockge
```

---

## 步骤二：创建外部隔离网桥 npm_network

这条网络是整个反向代理生态系统的通道，所有需要对外发布的容器都必须加入此网络。这样做可以避免将容器的端口直接暴露给公网，确保网络层的隔离性。

```bash
sudo docker network create npm_network
```

---

## 步骤三：部署 Dockge

:::warning
**安全警示：Docker 会绕过 UFW 防火墙！**
默认情况下，Docker 的端口映射（例如 `- "5001:5001"`）会直接修改 `iptables`，这使得 UFW 防火墙规则（如 `ufw deny`）失效，外部依然可以直接扫描并访问该端口。
为了确保安全，我们必须将端口绑定在 `127.0.0.1`（本地回环），仅允许本地端访问，再通过 Cloudflare Tunnel 或反向代理安全发布。
:::

进入 Dockge 目录并创建 `docker-compose.yml`：

```bash
cd /opt/stacks/dockge
sudo nano docker-compose.yml
```

完整粘贴以下配置代码：

```yaml
version: '3.8'
services:
  dockge:
    image: louislam/dockge:1
    container_name: dockge
    restart: unless-stopped
    ports:
      # 【核心安全】仅绑定在本地 127.0.0.1，防止外部直接通过 IP 扫描与访问管理面板
      - '127.0.0.1:5001:5001'
    volumes:
      # 挂载 Docker 套接字，让 Dockge 可以操作 Docker
      - /var/run/docker.sock:/var/run/docker.sock
      # 持久化 Dockge 自身的数据
      - ./data:/app/data
      # 挂载 Stacks 目录，让 Dockge 可以管理 /opt/stacks 底下的所有其他服务
      - /opt/stacks:/opt/stacks
    environment:
      # 声明 Stacks 的根目录路径
      - DOCKGE_STACKS_DIR=/opt/stacks
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

保存并退出编辑器（在 nano 中按 `Ctrl + O` 存档，`Ctrl + X` 离开）。

---

## 步骤四：启动 Dockge

在 `/opt/stacks/dockge` 目录下执行以下命令启动服务：

```bash
sudo docker compose up -d
```

此时，Dockge 已经在后台启动。由于我们将端口限制在 `127.0.0.1:5001`，此时外网是无法直接通过 `http://VPS_IP:5001` 连接的，这达到了第一层网络安全防护。

_(如果需要在配置反代前临时访问，可以使用 SSH Tunnel：`ssh -L 5001:127.0.0.1:5001 user@vps_ip`，即可在本地浏览器输入 `http://localhost:5001` 进行访问。)_

---

## 步骤五：配置 Nginx Proxy Manager 反向代理与 WebSocket 优化

为了通过安全域名访问 Dockge，我们需要在 Nginx Proxy Manager (NPM) 中创建代理规则，并进行 WebSocket 深度调校。

### 1. Details 页面配置

在 NPM 管理后台点击 **Add Proxy Host**，填入以下信息：

- **Domain Names**: `example.com` (请替换为您的实际域名)
- **Scheme**: `http`
- **Forward Hostname / IP**: `dockge` (因为两者在同一个 `npm_network` 网络下，直接填写 Dockge 的容器名称即可)
- **Forward Port**: `5001` (Dockge 容器内部的默认端口)
- 勾选 **Block Common Exploits** (阻挡常见漏洞攻击)
- 勾選 **Websockets Support** (【关键】启用 WebSocket 支持)

### 2. Advanced 页面调校（防止终端中断连接）

切换到 **Advanced** 分页，在 Custom Nginx Configuration 区域贴上以下优化代码：

```nginx
# 完美支持 WebSocket 协议升级，防止 Dockge 终端与实时日志断开连接
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# 传递真实 IP 与主机标头，强化安全性
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# 【关键配置】延长 Nginx 读取与发送超时时间至 24 小时 (86400秒)
# 默认的 60 秒超时会导致 Dockge 终端在空闲时被强制断开连接
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;
```

配置完成后点击 **Save** 保存。

---

## 步骤六：安全检查

1. **UFW 防火墙确认**：执行 `sudo ufw status`，确保没有放行 `5001` 端口。
2. **WebSocket 测试**：登录 Dockge 面板，进入任何一个 Stack，点击 **Terminal** 或者查看日志。如果终端光标能够正常闪烁且可以输入命令，且空闲超过一分钟没有断线，即代表 WebSocket 优化配置成功！

下一篇我们将部署强大的 AI 智能书签笔记系统 —— KaraKeep (Hoarder)，并同样通过 Dockge 进行便捷的可视化管理。
