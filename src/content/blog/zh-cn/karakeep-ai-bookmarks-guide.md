---
title: 'KaraKeep (Hoarder) 三合一 AI 智能书签与笔记系统'
pubDate: 2026-05-21
description: 'KaraKeep (原名 Hoarder) AI 书签笔记生态系统。结合 Meilisearch 全文搜索引擎与 Headless Chrome 网页快照引擎。'
category: '软件'
tags: ['Docker', 'KaraKeep']
---

在信息爆炸的时代，我们每天都会阅读大量的网页、文章与贴图。**KaraKeep**（原名 **Hoarder**，于 2025 年 4 月 正式更名）是一款功能极为强大的全功能 AI 数据与书签收集工具。它不仅支持网页链接、纯文本与图片的收集，还能通过自定义的 AI 模型对内容进行自动分类、标签与摘要。

KaraKeep 的架构较为庞大，是一个典型的“三合一”微服务生态系统，包含：

1. **Web 前端与核心大脑** (Main Web App)
2. **Meilisearch 全文搜索引擎** (提供实时、精准的搜索功能)
3. **Headless Chrome 隔离浏览器** (负责抓取网页快照与书签截图)

由于涉及个人阅读隐私与敏感数据，本篇教程将以**安全优先**为核心，教你如何降低公开暴露面并安全地部署这套系统。

[KaraKeep](https://github.com/karakeep-app/karakeep)

---

## 步骤一：密钥预先准备

在开始部署前，请在终端执行两次以下命令，产生两组高强度的随机安全字符串并记录下来。这些密钥将用于 Session 加密以及 Meilisearch 的访问鉴权：

```bash
openssl rand -base64 36
```

执行后会得到类似下面的输出，请先复制存储起来：

- 密钥 1（用于 `NEXTAUTH_SECRET`）：`d2FjZ2...`
- 密钥 2（用于 `MEILI_MASTER_KEY`）：`c2FmZS...`

---

## 步骤二：创建项目目录与环境变量

统一将 Stacks 存放在 `/opt/stacks` 底下。我们创建 KaraKeep 专属目录及持久化文件夹：

```bash
cd /opt/stacks
sudo mkdir -p karakeep/karakeep-data
sudo mkdir -p karakeep/meili-data
sudo mkdir -p karakeep/chrome-data
cd karakeep
```

接着创建并编辑环境变量配置文件 `.env`：

```bash
sudo nano .env
```

请将以下内容完整贴上，并将 `YOUR_OPENSSL_RANDOM_STRING_1` 和 `YOUR_OPENSSL_RANDOM_STRING_2` 替换为刚才产生的随机密钥：

```ini
# =========================================================================
# KaraKeep (Hoarder) 安全与核心配置环境变量
# =========================================================================

# 1. 基础与版本配置
KARAKEEP_VERSION=release
PORT=3000
DB_PATH=/data/karakeep.db
# 请将此网址替换为你实际要使用的反代域名
NEXTAUTH_URL=https://example.com

# 2. 内部微服务组件通讯路由（直接走 npm_network 内网域名）
MEILI_ADDR=http://karakeep-meili:7700
BROWSER_WEB_URL=http://karakeep-chrome:9222
DATA_DIR=/data

# 3. 系统密钥（防范 Session 劫持，请填入 openssl 产生的随机字符串）
NEXTAUTH_SECRET="YOUR_OPENSSL_RANDOM_STRING_1"
MEILI_MASTER_KEY="YOUR_OPENSSL_RANDOM_STRING_2"

# 4. 用户管理安全防御（核心防线：关闭公开注册、关闭邀请、关闭 Demo，实现完全私有）
DISABLE_SIGNUPS=true
DISABLE_INVITES=true
DISABLE_DEMO=true

# 5. 传输安全：强制开启浏览器安全标记，防范 XSS 攻击窃取 Cookie
NEXTAUTH_SECURE_COOKIES=true

# 6. 爬虫本地封存：强制将抓取到的网页图片下载到 VPS 本地，防范外部防盗链与追踪行为
CRAWLER_DOWNLOAD_IMAGES=true

# 7. 隐私保护：关闭 Meilisearch 的匿名遥测与分析数据上传
MEILI_NO_ANALYTICS=true
```

保存并退出。

---

## 步骤三：编写 docker-compose.yml 文件

在 `/opt/stacks/karakeep` 目录下创建 `docker-compose.yml`：

```bash
sudo nano docker-compose.yml
```

贴入以下三合一架构配置代码：

```yaml
version: '3.8'

services:
  # 1. 网页前端与核心服务
  web:
    image: ghcr.io/karakeep-app/karakeep:${KARAKEEP_VERSION:-release}
    container_name: karakeep-web
    restart: unless-stopped
    ports:
      # 【核心安全】仅绑定在本地 127.0.0.1，防止外部直接绕过 UFW 访问 3000 端口
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

  # 2. 全文搜索引擎
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

  # 3. 负责网页快照与书签截图的 Chrome 隔离容器
  chrome:
    image: gcr.io/zenika-hub/alpine-chrome:124
    container_name: karakeep-chrome
    restart: unless-stopped
    command:
      - --no-sandbox
      - --disable-gpu
      # 防范 Chrome 因 Docker 默认的 64MB /dev/shm 内存限制而崩溃
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
Chrome 的 `--no-sandbox` 与 `--remote-debugging-address=0.0.0.0` 只适合放在隔离的 Chrome 容器内，并且只能通过私有 Docker 网络被 KaraKeep 访问。不要把 `9222` 映射到公网，也不要在主机上的日常浏览器套用这组参数，否则会大幅提高远程控制浏览器的风险。
:::

:::tip
**说明**：部分旧教程的 Chrome 启动参数中缺少了 `--disable-dev-shm-usage`。在 Docker 容器中，默认的 `/dev/shm`（共享内存）只有 64MB。当 Chrome 抓取复杂或图片较多的网页时，极易因内存耗尽而崩溃。加入此参数可以改用 `/tmp` 进行渲染，保障系统的稳定性。
:::

---

## 步骤四：启动服务

在 `/opt/stacks/karakeep` 底下执行启动命令：

```bash
sudo docker compose up -d
```

执行后可以使用 `sudo docker ps` 确认 `karakeep-web`、`karakeep-meili`、`karakeep-chrome` 三个容器皆处于 `Up` 状态。

---

## 步骤五：配置 Nginx Proxy Manager 反向代理

我们需要配置反向代理，让外网可以通过安全的 HTTPS 域名访问 KaraKeep。

1. 登录 Nginx Proxy Manager 面板，点击 **Add Proxy Host**。
2. **Details 分页**：
   - **Domain Names**: `example.com` (请替换为你的实际域名)
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `karakeep-web` (直连同网络下的 web 服务名称)
   - **Forward Port**: `3000` (容器内部默认端口)
   - 勾选 **Block Common Exploits** 与 **Websockets Support**
3. **Advanced 分页**（写入安全防御与 WebSocket 同步标头）：
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. 点击 **Save** 保存。

---

## 步骤六：系统级安全性复核

为确保 KaraKeep 维持低暴露面，请务必逐一进行以下验证：

1. **UFW 防火墙检查**：
   执行 `sudo ufw status`，确认 VPS 公网未对外开放 `3000` 端口。
2. **公开注册功能验证**：
   使用浏览器的**无痕窗口**开启你的 KaraKeep 网址（例如 `https://example.com`），确认登录按钮下方**没有**出现“Sign Up（注册）”或“Create Account”的链接，确保不会被外人恶意注册使用。
3. **安全标头检验**：
   在登录页面按 `F12` 开启开发者工具，切换至“网络 (Network)”分页，重新整理网页。点击首页请求，检索响应标头（Response Headers），确认传输 Cookie 时带有 `Secure` 与 `HttpOnly` 属性。
4. **持久化与备份验证**：
   所有的数据库、快照和 Meilisearch 数据都应存储在本地的 `/opt/stacks/karakeep/` 底下。这能避免容器重建时数据被一并删除，但仍建议定期备份整个目录，尤其是在升级镜像前。
