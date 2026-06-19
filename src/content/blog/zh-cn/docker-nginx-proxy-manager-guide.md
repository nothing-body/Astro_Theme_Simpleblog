---
title: 'Docker + Nginx Proxy Manager 完整安装与配置教程'
pubDate: 2026-05-01
description: '安装 Nginx Proxy Manager，使用图形界面轻松管理反向代理与 SSL 证书。'
category: '软件'
tags: ['Docker', 'Nginx', '反向代理']
---

想把你 VPS 上运行的各种服务，从 `IP:端口` 变成好记的域名访问？  
反向代理（Reverse Proxy）就是答案，而 **Nginx Proxy Manager（NPM）** 让这件事变得异常简单，不需要手写复杂的 Nginx 配置，全程有图形界面进行操作。

本文将带你完整走完以下流程：

1. 安装 Docker 并配置日志大小限制
2. 安装 Nginx Proxy Manager
3. 配置反向代理与 SSL 证书
4. 启用访问权限限制（Access List）

---

## 前置需求

- 一台 VPS，系统为 **Debian 11/12** 或 Ubuntu 20.04+（**不建议使用 CentOS**）
- 一个已解析指向该 VPS IP 的域名
- 以 root 或具有 sudo 权限的账号进行操作

---

## 第一步：安装 Docker

### 1-1 安装 Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
```

这个示例使用 Docker 官方便利脚本。若你对供应链安全要求较高，建议改用系统软件源或 Docker 官方 APT Repository，并在执行前先检查脚本内容。

安装完成后，确认版本并设置开机自动启动：

```bash
docker -v
systemctl enable docker
systemctl start docker
```

### 1-2 重要：配置 Docker 日志大小限制

> **这是防止硬盘被塞满的关键步骤，强烈建议不要跳过。**

Docker 的容器默认会无限累积日志，长期运行后很容易把硬盘空间吃光。以下配置会限制每个日志文件最大 20MB，且最多保留 3 个轮转文件，同时启用容器的 IPv6 支持：

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

应用配置并重启 Docker：

```bash
systemctl restart docker
```

**配置说明：**

| 参数                    | 说明                             |
| ----------------------- | -------------------------------- |
| `log-driver: json-file` | 使用 JSON 格式存储日志（默认值） |
| `max-size: 20m`         | 单个日志文件上限 20MB            |
| `max-file: 3`           | 最多保留 3 个轮转日志文件        |
| `ipv6: true`            | 启用容器 IPv6 网络支持           |

---

## 第二步：安装 Nginx Proxy Manager

### 2-1 创建安装目录

```bash
mkdir -p /root/data/docker_data/npm
cd /root/data/docker_data/npm
```

### 2-2 创建 docker-compose.yml

```bash
vim docker-compose.yml
```

按 `i` 进入编辑模式，贴入以下内容：

```yaml
version: '3'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80' # HTTP，保持默认，不建议修改
      - '127.0.0.1:81:81' # NPM 管理界面，仅本地可访问
      - '443:443' # HTTPS，保持默认，不建议修改
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

正式环境建议把 `latest` 改成你实际测试过的固定版本标签，避免容器重建时自动拉到未验证的新版本。

按 `Esc`，输入 `:wq` 保存并退出。

### 2-3 确认端口 81 未被占用

```bash
lsof -i:81
```

若无任何输出，表示端口空闲，可以继续。若被占用，请在 `docker-compose.yml` 中将 `81:81` 改为其他端口（例如 `8181:81`）。

### 2-4 启动容器

```bash
docker compose up -d
```

### 2-5 确认容器正在运行

```bash
docker ps
```

正常情况下会看到 `jc21/nginx-proxy-manager` 容器在运行中。

---

## 第三步：首次登录 NPM 管理界面

打开浏览器，前往：

```
http://你的服务器IP:81
```

使用默认账号密码登录：

```
Email:    admin@example.com
Password: changeme
```

> **登录后请立即修改默认 Email 与密码！**

登录后系统会要求你更新账号信息，请设置你的 Email 与一组强密码。

---

## 第四步：新建反向代理主机

这是 NPM 最核心的功能。以下示范如何把 `app.example.com` 代理到本地的 `8080` 端口。

### 4-1 DNS 配置

先前往你的 DNS 服务商（如 Cloudflare），新建一笔 A 记录：

```
app.example.com  →  你的 VPS IP
```

### 4-2 在 NPM 新建 Proxy Host

1. 登录 NPM 管理界面
2. 点击 **Proxy Hosts** → **Add Proxy Host**
3. 填入以下信息：
   - **Domain Names**：`app.example.com`
   - **Scheme**：`http`（若目标服务支持 HTTPS 则选 `https`）
   - **Forward Hostname / IP**：`127.0.0.1`（若目标是同一台 VPS 上的服务）
   - **Forward Port**：`8080`（目标服务的实际端口）
   - 勾选 **Block Common Exploits**

4. 切换到 **SSL** 分页：
   - 选择 **Request a new SSL Certificate**
   - 勾选 **Force SSL**
   - 勾选 **HTTP/2 Support**
   - 填入你的 Email（用于 Let's Encrypt 证书通知）
   - 勾选同意服务条款

5. 点击 **Save**

NPM 会自动通过 Let's Encrypt 申请免费 SSL 证书，完成后即可用 HTTPS 访问你的服务。

---

## 第五步：启用访问权限限制（Access List）

若你的某些服务不希望开放给所有人，可以通过 NPM 的 **Access Lists** 功能，要求访客先通过 HTTP Basic Auth 验证才能进入。

### 5-1 创建 Access List

1. 在 NPM 界面点击 **Access Lists** → **Add Access List**
2. 填入名称（如 `Private Access`）
3. 切换到 **Authorization** 分页：
   - 点击 **Add** 新增账号
   - 填入用户名与密码
4. 切换到 **Access** 分页：
   - 可以设置允许或拒绝特定 IP 范围
   - 若要允许所有 IP 都需要验证，保持默认即可
5. 点击 **Save**

### 5-2 将 Access List 应用至代理主机

1. 回到 **Proxy Hosts** 找到你要保护的代理主机
2. 点击编辑（铅笔图标）
3. 在 **Details** 分页的 **Access List** 栏，选择刚才创建的 `Private Access`
4. 点击 **Save**

此后，访客在打开该域名时，浏览器会弹出账号密码输入框。

> **注意**：部分版本的 NPM 在启用 Access List 时可能需要重启容器才能生效。若配置后没有弹出登录框，可执行 `docker restart <容器名称>` 或在 NPM 界面重新保存该设置。

---

## 更新 Nginx Proxy Manager

```bash
cd /root/data/docker_data/npm

# 备份现有数据
cp -r /root/data/docker_data/npm /root/data/docker_data/npm.backup

# 拉取最新镜像并重启
docker compose pull
docker compose up -d

# 清除多余的旧镜像
docker image prune
```

执行 `docker image prune` 时，输入 `y` 确认。

---

## 卸载 Nginx Proxy Manager

```bash
cd /root/data/docker_data/npm
docker compose down

# 先移动到备份目录，确认无误后再手动删除
mv /root/data/docker_data/npm /root/data/docker_data/npm.removed.$(date +%F-%H%M%S)
```

---

## 常见问题

**Q：配置完反向代理后，使用域名打开网页出现 502 Bad Gateway？**  
A：请确认 Forward Hostname / IP 和 Forward Port 填写正确，且目标服务确实正在运行（可通过 `docker ps` 或 `curl http://127.0.0.1:8080` 测试）。

**Q：SSL 证书申请失败？**  
A：确认 DNS A 记录已正确解析到 VPS IP（可用 `ping app.example.com` 测试），且 VPS 的 80 和 443 端口已在云服务商的防火墙中开放。

**Q：忘记 NPM 登录密码怎么办？**  
A：可在 NPM 登录页点击 **Forgot Password** 使用 Email 重置，或者直接进入容器数据库手动修改。

**Q：如何查看并确认服务器的公网 IP？**

```bash
curl ip.sb
```

---

## 总结

通过 Docker + Nginx Proxy Manager 的组合，你可以：

- ✅ 用域名（而非 IP:端口）访问任意服务
- ✅ 自动申请与续期 Let's Encrypt 免费 SSL 证书
- ✅ 图形化界面管理所有代理规则
- ✅ 为敏感服务加上 HTTP Basic Auth 保护
- ✅ 通过日志限制配置，防止硬盘被日志塞满
