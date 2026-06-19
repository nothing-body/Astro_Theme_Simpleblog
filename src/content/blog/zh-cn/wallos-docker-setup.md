---
title: '在 Debian 上使用 Docker 搭建 Wallos 个人订阅管理系统'
pubDate: 2026-05-10
description: '这篇文章将教你如何在一台全新的 Debian VPS 上，使用 Docker 与 Docker Compose 快速且安全地部署 Wallos 个人订阅管理系统。'
category: '软件'
tags: ['Docker', 'Linux']
---

在如今订阅制服务盛行的时代，我们很容易忘记自己到底订阅了多少服务（例如 Netflix、Spotify、云盘等），哪些服务快要到期需要续约。**Wallos** 是一个开源的个人订阅追踪与管理平台，它可以帮助你集中管理所有的订阅支出。

## 为什么选择 Docker 部署？

使用 Docker 部署能确保环境的隔离性，不仅不会污染宿主机系统，还能在未来轻松备份与升级。

## 步骤一：系统更新与基础防护

在全新的 Debian 系统上，我们首先要确保系统软件包是最新的。这能修补已知的安全漏洞。请通过 SSH 连接至您的 VPS 并执行：

```bash
# 更新软件包列表并升级系统
sudo apt update && sudo apt upgrade -y
```

## 步骤二：安装 Docker 与 Docker Compose

为了确保安装的是最新且安全的 Docker 版本，我们使用 Docker 官方提供的安装脚本：

```bash
# 安装必要的工具
sudo apt install curl -y

# 下载并执行 Docker 官方安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# 安装完成后，将当前用户加入 docker 用户组（可选，方便不加 sudo 执行 docker）
sudo usermod -aG docker $USER
```

若你对供应链安全要求较高，建议改用 Debian 软件源或 Docker 官方 APT Repository；使用便利脚本时，至少先检查脚本内容再执行。

_(注意：修改用户组后，需要重新登录 SSH 才会生效。)_

## 步骤三：创建 Wallos 项目文件夹

为了方便管理与备份，我们为 Wallos 创建一个独立的文件夹：

```bash
# 创建项目文件夹
mkdir -p ~/wallos
cd ~/wallos
```

## 步骤四：编写 docker-compose.yml

在 `wallos` 文件夹下，我们创建 `docker-compose.yml` 文件。

```bash
# 使用 nano 编辑器创建文件
nano docker-compose.yml
```

填入以下内容：

```yaml
version: '3.8'

services:
  wallos:
    container_name: wallos
    image: bellamy/wallos:latest
    ports:
      # 基于安全考虑，建议不要直接对外开放默认的 80 端口
      # 这里我们将外部的 8282 端口映射到容器内的 80 端口
      - '127.0.0.1:8282:80/tcp'
    environment:
      # 请根据您所在的地区修改时区，例如 Asia/Shanghai
      TZ: 'Asia/Shanghai'
    volumes:
      # 持久化数据，确保容器重启或更新后数据不丢失
      - './db:/var/www/html/db'
      - './logos:/var/www/html/images/uploads/logos'
    restart: unless-stopped
```

正式环境建议把 `latest` 改成你测试过的固定版本标签，并在升级前先备份 `./db` 与 `./logos` 目录。

**安全提醒：** 上面的设置中，我们将端口绑定为 `127.0.0.1:8282`。这是因为 Wallos 处理的是您私人的订阅与财务信息，直接暴露在公开网络上容易遭受暴力破解。我们强烈建议后续配合 **Nginx 反向代理** 并加上 **HTTPS / SSL 证书**（例如使用 Let's Encrypt），或是通过 SSH 隧道 (SSH Tunnel) 来安全访问。

## 步骤五：启动 Wallos

确认 `docker-compose.yml` 配置无误后，即可启动容器：

```bash
# 在后台启动容器
docker compose up -d
```

启动后，Docker 会自动拉取镜像并创建文件夹（`db` 与 `logos`）。

## 步骤六：访问与初始化

如果您已经配置好反向代理或 SSH 隧道，现在可以在浏览器中输入您的专属域名或通过本地映射访问。

首次进入时，系统会引导您创建管理员账号。请务必设置**高强度的密码**，以保护您的财务隐私。

## 结语

通过上述步骤，我们在干净的 Debian 环境中安全地部署了 Wallos。
记得定期备份 `~/wallos/db` 与 `~/wallos/logos` 目录
