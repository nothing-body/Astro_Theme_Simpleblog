---
title: '打造专属的安全私密日记本：DailyTxT 介绍与服务器部署指南'
pubDate: 2026-05-02
category: '软件'
categoryPath: ['软件', '自托管']
tags: ['自托管', '个人数据']
---

在数字时代，我们的生活轨迹往往散落在各大云服务中，然而对于真正私密的日记与灵感，许多人更倾向于“完全掌握在自己手中”。[DailyTxT](https://github.com/PhiTux/DailyTxT) 应运而生，它是一款专为隐私设计的加密网页版日记/笔记应用程序。

DailyTxT - [Github](https://github.com/PhiTux/DailyTxT)  
官方 Live Demo - [Live Demo](https://dailytxt.phitux.de/)

---

## 为什么选择 DailyTxT？

相较于市面上庞大的笔记软件或普通的明文日记本，DailyTxT 的定位非常明确：**极致的隐私与轻量化的记录体验**。

- **服务器端加密机制**：所有的日记内容与上传的文件，都会经过加密后才存储于服务器硬盘中。即便是服务器的管理员（或是 VPS 供应商），在没有你的登录密码衍生的密钥情况下，也无法读取你的日记内容。
- **纯粹的数据存储**：不依赖复杂的数据库（如 MySQL 或 PostgreSQL），所有数据皆以 JSON 文件格式加密存储，这使得数据的备份与迁移变得异常简单，保障了数据的长期可用性。
- **多语言与跨平台**：原生支持多国语言，包括简体中文。响应式设计不仅在电脑端排版舒适，更支持 PWA（渐进式网页应用），可以直接安装在手机桌面，体验宛如原生 APP。
- **丰富的功能**：支持 Markdown 语法实时预览、图片库检索、标签分类、地理位置打卡（地图模式），甚至支持导出为 HTML。

---

## 环境准备

- **操作系统**：一台全新未安装任何软件的 VPS（不限特定操作系统，只要能运行 Docker 即可）。
- **域名**：一个已解析至该 VPS IP 地址的域名（例如：`diary.yourdomain.com`）。
- **连接工具**：具备 SSH 连接能力。

---

## 第一步：安装 Docker 并配置日志大小限制

在服务器上长期运行容器时，最常遇到的灾难之一就是“容器日志 (Logs) 无限制增长”，最终导致 VPS 磁盘空间耗尽而死机。因此，在安装任何应用前，我们先将基础设施的安全性和稳定性做好。

### 1. 使用官方脚本安装 Docker

登录你的 VPS，执行以下官方提供的安装命令（适用于绝大多数 Linux 发行版）：

```bash
# 下载并执行 Docker 官方一键安装脚本
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# 将 Docker 设置为开机自动启动并立即启动
systemctl enable docker
systemctl start docker
```

若你对供应链安全要求较高，建议改用系统软件源或 Docker 官方 APT Repository；使用便利脚本时，至少先检查脚本内容再执行。

### 2. 限制 Docker 日志大小

为了防止日志塞满硬盘，我们需要全局限制 Docker 的日志大小。

```bash
# 创建或编辑 Docker 的 daemon.json 配置文件
vim /etc/docker/daemon.json
```

写入以下配置（将每个容器的日志限制为最大 20MB，并保留 3 份历史文件）：

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  }
}
```

存档后，重启 Docker 服务让设置生效：

```bash
systemctl restart docker
```

---

## 第二步：部署 DailyTxT

基础环境就绪后，开始安装 DailyTxT。我们将完全遵照官方建议的 `docker-compose.yml` 方式进行部署。

### 1. 生成安全密钥 (SECRET_TOKEN)

DailyTxT 需要一组高强度的随机字符串作为核心的加密基础。在终端输入以下命令并**复制输出的随机字符串**：

```bash
openssl rand -base64 32
```

### 2. 创建 DailyTxT 目录与配置文件

```bash
# 创建目录
mkdir -p /opt/dailytxt && cd /opt/dailytxt

# 创建 docker-compose.yml
vim docker-compose.yml
```

填入官方配置，并仔细修改相应的环境变量：

```yaml
services:
  dailytxt:
    image: phitux/dailytxt:latest
    container_name: dailytxt
    restart: unless-stopped
    volumes:
      # 左侧为宿主机的路径，所有加密后的日记数据都会存放在这里
      - ./data:/data
    environment:
      # 将刚刚生成的 32 位随机字符串贴在等号后方
      - SECRET_TOKEN=你的随机字符串

      # 为了数据格式整齐，设置 JSON 缩进为 4
      - INDENT=4

      # 【安全防护】初期先开启注册，注册完你的第一个账号后，务必改回 false 并重启
      - ALLOW_REGISTRATION=true

      # 设置 Admin 后台面板的密码 (请务必设置高强度管理员密码)
      - ADMIN_PASSWORD=你的高强度管理员密码

      # 登录状态保持的天数
      - LOGOUT_AFTER_DAYS=40
    ports:
      # 将容器的 80 端口映射到本机的 8000 端口。
      # 官方强烈建议绑定在 127.0.0.1，避免直接暴露于公网遭到扫描攻击。
      - 127.0.0.1:8000:80
```

正式环境建议把 `latest` 改成你测试过的固定版本标签，并在升级前先备份 `./data` 目录。

### 3. 启动 DailyTxT

```bash
docker compose up -d
```

至此，DailyTxT 已成功在服务器的本地 `127.0.0.1:8000` 独立运行。此时外部网络是无法直接访问它的，我们达到了极高的隐蔽性与安全性。

---

## 第三步：设置反向代理与安全连接

为了让你能在外网通过你的域名（例如 `https://diary.yourdomain.com`）安全地访问 DailyTxT，我们必须通过 Nginx 等 Web 服务器进行反向代理，并强制挂载 HTTPS SSL 证书。

### 方法一：手动配置 Nginx

如果你的服务器已安装 Nginx（或偏好直接掌控配置文件），可通过以下方式完成配置。

首先安装 Nginx 与 Certbot（用于自动申请 Let's Encrypt SSL 证书）：

```bash
apt install nginx certbot python3-certbot-nginx -y
```

创建 DailyTxT 的 Nginx 站点配置文件：

```bash
vim /etc/nginx/sites-available/dailytxt
```

填入以下反向代理设置（先以 HTTP 创建，之后由 Certbot 自动补上 HTTPS）：

```nginx
server {
    listen 80;
    # 将此处替换为你的实际域名
    server_name diary.yourdomain.com;

    location / {
        # 将流量转发到本地的 DailyTxT 容器
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # WebSocket 支持 (DailyTxT 实时更新所需)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 传递真实的客户端信息给后端
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用站点并申请 SSL 证书：

```bash
# 创建软链接启用站点配置
ln -s /etc/nginx/sites-available/dailytxt /etc/nginx/sites-enabled/

# 测试 Nginx 配置是否有误
nginx -t

# 重新加载 Nginx
systemctl reload nginx

# 使用 Certbot 自动申请 SSL 证书并修改 Nginx 配置
certbot --nginx -d diary.yourdomain.com
```

Certbot 会自动修改 Nginx 配置，将 HTTP 请求重新定向至 HTTPS，并设置证书自动续期。

---

### 方法二：使用 Nginx Proxy Manager (图形界面)

如果你不想手写 Nginx 配置文件，可以改用提供图形化管理界面的 **Nginx Proxy Manager (NPM)**，只需点击几下就能完成反向代理与 SSL 申请。

关于 NPM 的完整安装与反向代理配置教程，请前往阅读这篇专文：  
👉 [Docker + Nginx Proxy Manager 完整安装与设置教程](./docker-nginx-proxy-manager-guide.md)

_(小提示：在进行 NPM 的 Proxy Host 设置时，请记得将 Forward Hostname / IP 指向 `host.docker.internal` 或服务器本机 IP，Port 填写为 `8000`，即可成功与 DailyTxT 连接。)_

---

## 第四步：开始使用与后续安全建议

现在，你可以打开浏览器，输入 `https://diary.yourdomain.com`，映入眼帘的将是 DailyTxT 的登录与注册画面。

**🚨 关键安全收尾操作：**

1. 立即在网页上注册你的第一个账号。
2. 注册完成并确认能成功登录后，回到终端修改 `/opt/dailytxt/docker-compose.yml`。
3. 将 `ALLOW_REGISTRATION=true` 修改为 `ALLOW_REGISTRATION=false`。
4. 执行 `docker compose up -d` 重新应用设置。这将彻底关闭开放注册功能，杜绝陌生人滥用你的服务器资源创建账号。

**备份建议：**
得益于 DailyTxT 优秀的设计，它没有脆弱的数据库依赖。你只需要定期将 VPS 上的 `/opt/dailytxt/data` 文件夹打包下载，就能完成 100% 的完整备份。即便未来更换服务器，只要将该文件夹放回原处并重新启动 Docker 容器，所有的日记与设置都会完美还原。
