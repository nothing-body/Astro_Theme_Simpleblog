---
title: 'VPS 基础安全防护配置指南'
pubDate: 2026-03-11
description: '全新 VPS 获取后需要进行的系统初始化与安全加固动作'
category: '服务器'
tags: ['安全', 'Linux', 'DevOps']
---

这是一篇针对刚购买全新 VPS 进行安全防护强化的指南。本指南将使用 Debian 系统作为示范。

## VPS 第一步基础设置

在刚拿到你的新主机时，最重要的事情是确认当前的用户状态并进行基础安全隔离。

### 1. 登录服务器与更改 Root 默认密码

刚向服务商购买全新 VPS 时，通常会通过 Email 或主机商后台取得默认的 `root` 密码。以 `root` 账号通过 SSH 登录后，请第一时间执行 `passwd` 命令来更改 `root` 的默认密码：

```bash
# 变更当前登录账号（此处为 root）的密码
passwd
```

> **安全提示**：请输入具备高强度（长度大于 12 字符，包含大小写字母、数字及特殊符号）且非字典常见单词的密码，以防止暴力破解。

### 2. 创建自定义普通用户并赋予 Sudo 权限

请不要使用 `root` 账号进行日常系统操作。我们建议你创建一个专属的普通用户，并赋予 `sudo` 权限，随后关闭 `root` 直接登录。

#### 2-1. 安装 sudo 工具（Debian 默认通常未安装）

全新的 Debian 系统默认通常没有安装 `sudo`。请先以 `root` 身份更新软件源并安装 `sudo` 软件包：

```bash
# 更新软件包列表并安装 sudo
apt-get update && apt-get install sudo -y
```

#### 2-2. 创建新用户

我们推荐使用高级的 `adduser` 命令，而非低级的 `useradd`。`adduser` 会以交互方式引导你设置密码、创建家目录，并将默认 Shell 设置为符合直觉的 `/bin/bash`：

```bash
# 创建一个全新的普通用户（请将 your_username 替换为你想要的账号名称）
adduser your_username
```

#### 2-3. 将用户加入 sudo 管理员群组

创建完成后，将该用户加入 `sudo` 群组，使其在需要时能够通过 `sudo` 执行管理员权限的命令：

```bash
# 将指定用户加入 sudo 群组
usermod -aG sudo your_username
```

---

## 二、 NTP 时间同步

确保服务器的时间同步是非常重要的，尤其当你打算部署 SSL 证书或是进行日志文件追踪的时候。

### 2-1. 安装 NTP

```bash
apt-get update
apt-get install ntp -y
```

### 2-2. 配置 NTP

使用文本编辑器打开 NTP 配置文件 `/etc/ntp.conf`：

```bash
nano /etc/ntp.conf
```

在配置文件中内有一些默认的 NTP 服务器，你可以保留这些默认服务器，或更改成你想配置的特定服务器。

设置你想使用的 NTP 服务器：

```bash
server "your-ntp-server"
```

_注：将 `server your-ntp-server` 更改成你想使用的实际 NTP 服务器。_

更改完成后保存文件并退出。

### 2-3. 重启 NTP

```bash
systemctl restart ntp
```

如果你需要 NTP 服务在系统重启后自动启动：

```bash
systemctl enable ntp
```

### 2-4. 验证时间同步

检查 NTP 服务是否运行：

```bash
systemctl status ntp
```

检查并显示当前系统时间与 NTP 服务同步状态信息：

```bash
date
```

如果显示的信息错误或不同步，可使用以下命令强制同步：

```bash
ntpdate -q your-ntp-server
```

_注：将 `your-ntp-server` 更改成你使用的实际服务器。_

查看 NTP 守护进程的同步状态：

```bash
ntpq -p
```

---

## 三、 改变 SSH 端口 (Port)

将默认的端口 22 换掉能大幅度减少网络扫描脚本的恶意探测与暴力破解频率。

### 3-1. 选择与修改 SSH 配置文件

请先想好一个在 `1024` 到 `65535` 之间的自定义端口（例如：`38822`），避免与其他常见服务冲突。

使用文本编辑器打开 SSH 配置文件：

```bash
sudo nano /etc/ssh/sshd_config
```

找到含有 `#Port 22` 或 `Port 22` 的行，取消注释并修改为你想要设置的端口：

```text
Port 38822
```

> **注意**：部分老旧教程会建议手动加入 `Protocol 2`，但在现代 OpenSSH 版本中早已淘汰不安全的 Protocol 1，手动写入此配置可能在部分新系统中引发兼容性错误，故无需加入。

### 3-2. 关键安全性防火墙设置（防锁死）

在重启 SSH 服务之前，**如果你已经安装并启用了防火墙，请务必先开放新的 SSH 端口**！若未放行便重启 SSH，你将会被阻挡在外而无法再次连接。

如果使用 UFW 防火墙，请务必先放行新端口（若你在后面章节才启用 UFW，则记得在启用时一并处理）：

```bash
# 开放你设置的自定义 SSH 端口
sudo ufw allow 38822/tcp
```

确认无误后，重启 SSH 服务以应用新配置：

```bash
# 重启 SSH 服务
sudo systemctl restart ssh
```

### 3-3. 安全连接验证步骤

:::warning
**在测试成功前，请绝对不要中断当前已登录的 SSH 连接！**
请保留当前窗口作为紧急备用。接着，请在你的本地电脑（Windows）打开一个新的命令提示符或 PowerShell 窗口，尝试以新端口进行连接：

```bash
# 以新端口测试连接（将 38822 替换为你的端口，your_username 替换为你的用户名）
ssh -p 38822 your_username@your_vps_ip
```

确认能成功登录并取得控制权后，才能关闭旧的连接窗口。
:::

---

## 四、 关闭 root 的 SSH 权限与限制登录账号

:::warning
**重要安全性前提**：在进行本步骤之前，建议先阅读并完成 **「五、 设置 SSH 免密码登录」**，确保你能使用密钥登录普通用户账号。如果此时直接停用 root 登录，而普通账号的密钥又尚未配置好，将可能导致你被锁在服务器外部。
:::

为了阻绝攻击者针对 `root` 账号进行暴力破解，我们需要禁用 `root` 直接通过 SSH 登录，并限制仅允许你创建的自定义普通用户登录。

### 4-1. 修改 SSH 配置文件

打开 SSH 配置文件：

```bash
sudo nano /etc/ssh/sshd_config
```

### 4-2. 停用 Root 登录并限制登录账号

寻找并修改以下配置值（如果原本被注释掉，请取消注释并修改，或直接加在文件末尾）：

```text
# 停用 root 的 SSH 登录权限
PermitRootLogin no

# 仅允许指定的用户账号登录（请将 your_username 替换为你创建的普通账号名称）
AllowUsers your_username
```

保存并退出编辑器后，重启 SSH 服务以应用变更：

```bash
# 重启 SSH 服务以应用配置
sudo systemctl restart ssh
```

---

## 五、 设置 SSH 免密码登录 (SSH Key)

相较于一般的字符串密码，使用密钥对（Public/Private Key Pair）是目前常见且推荐的安全连接方式，能有效降低暴力破解风险。我们将使用安全性高、密钥长度短且计算速度快的 `Ed25519` 算法。

### 5-1. 本地端（Windows）产生密钥对

请在你的 Windows 本地电脑上打开 **PowerShell** 或 **命令提示符 (CMD)**，执行以下命令生成密钥对：

```powershell
# 在本地产生 Ed25519 密钥对，-C 后面可加上你的 Email 或备注标记
ssh-keygen -t ed25519 -C "your_email@example.com"
```

1. 系统会询问：`Enter file in which to save the key`。直接按 **Enter** 键即可，密钥默认会存储在 `C:\Users\你的用户名\.ssh\id_ed25519`。
2. 系统会询问：`Enter passphrase`。这是保护你私钥的密码，建议输入以提高安全性；若不想每次连接都输入密码，也可以直接按 **Enter** 留空。
3. 产生完成后，在本地查看你的**公钥**（后缀为 `.pub` 的文件）内容：

```powershell
# 查看公钥文件内容
cat ~\.ssh\id_ed25519.pub
```

你会看到一串以 `ssh-ed25519` 开头、后接一长串随机字符与备注标记的文本。请完整复制这一整行内容。

### 5-2. VPS 端（Debian）部署公钥

为了避免权限归属错误，**请务必以刚才创建的「普通用户」身份进行以下操作**。

如果你当前还是以 `root` 身份登录，请先切换至该用户账号（请将 `your_username` 替换为实际用户名）：

```bash
# 切换至普通用户账号
su - your_username
```

切换后，执行以下命令创建 `.ssh` 目录并写入公钥：

```bash
# 创建存放密钥的目录（-p 可防止目录已存在时报错）
mkdir -p ~/.ssh

# 设置目录权限为仅所有者可读写与执行 (rwx------)
chmod 700 ~/.ssh

# 打开或新建 authorized_keys 文件
nano ~/.ssh/authorized_keys
```

在 nano 编辑器中，将你刚才从 Windows 本地端复制的公钥内容粘贴进去，确认只有一长行且没有换行错误后，保存并离开。

接着，设置 `authorized_keys` 文件的安全权限（SSH 服务对密钥文件权限要求极为严格，若配置错误会导致密钥失效）：

```bash
# 设置密钥文件权限为仅所有者可读写 (rw-------)
chmod 600 ~/.ssh/authorized_keys
```

> **重要安全提示**：
> 如果你之前是在 `root` 身份下强行为该普通用户创建 `.ssh` 目录的，该目录与文件的所有权将会归属于 `root`，这会使该用户因无权限读取而导致密钥登录失败。请在 `root` 身份下（或使用 `sudo`）执行以下命令将所有权修正：
>
> ```bash
> # 修正所有权（请将 your_username 替换为实际的用户名）
> sudo chown -R your_username:your_username /home/your_username/.ssh
> ```

---

## 六、 关闭 SSH 密码登录功能

一旦密钥连接测试无误，立刻关闭 `PasswordAuthentication`，自此密码暴力破解攻击对你彻底失效。

### 6-1. 打开 SSH 配置文件

```bash
sudo nano /etc/ssh/sshd_config
```

将 PasswordAuthentication 的参数值改为 no：

```bash
PasswordAuthentication no
```

保存并离开，然后重启 SSH 服务：

```bash
sudo systemctl restart ssh
```

---

## 七、 UFW 防火墙

UFW (Uncomplicated Firewall) 是 Debian/Ubuntu 上非常直观且好用的防火墙前端管理工具，用于控制传入与传出的网络流量。

### 7-1. 安装与基本配置

:::warning
**注意**：如果你在「三、 改变 SSH 端口」章节中修改了 SSH 端口（例如：`38822`），**在启用 (enable) 防火墙之前，请务必先放行该自定义端口**，否则会当场中断连接且被拒之门外！
:::

```bash
# 安装 UFW 防火墙
sudo apt install ufw -y

# 默认拒绝所有传入连接，允许所有传出连接
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允许网页浏览常用的端口（HTTP 80 / HTTPS 443）
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 务必允许你的自定义 SSH 端口（将 38822 替换为你实际设置的 SSH 端口）
sudo ufw allow 38822/tcp

# 启用 UFW 防火墙（启用时系统会提示是否继续，请输入 y）
sudo ufw enable
```

若要查看当前防火墙状态：

```bash
sudo ufw status verbose
```

---

## 八、 入侵防御 (Fail2Ban / CrowdSec)

构建你的恶意流量警报与自动封锁系统，用于主动防御来自网络的暴力破解攻击。

### 8-1. 安装 Fail2Ban

Fail2Ban 会监视系统日志（例如 SSH 登录记录），并在发现多次尝试登录失败的恶意 IP 时，自动通过防火墙（如 UFW）对该 IP 进行暂时或永久拉黑封锁。

在 Debian 系统中，直接安装即可：

```bash
# 更新软件包列表并安装 fail2ban
sudo apt update
sudo apt install fail2ban -y
```

安装完成后，Fail2Ban 默认会建立一个基本防御规则，你可以通过以下命令检查其状态：

```bash
# 检查 fail2ban 服务状态
sudo systemctl status fail2ban

# 查看 SSH 防护状态 (默认的 sshd jail)
sudo fail2ban-client status sshd
```

### 8-2. 搭配或替换为 CrowdSec (推荐)

除了传统的 Fail2Ban 之外，你也可以搭配或改用现代化的入侵防御引擎 **[CrowdSec](https://app.crowdsec.net/security-engines/setup?distribution=linux)**。

CrowdSec 采用全网社区联防机制，能主动收集威胁情报并阻断已知的恶意高危 IP。其安装与设置非常简便，推荐搭配其 UFW 拦截组件（Bouncer）使用。详细安装与配置方法请参照 [CrowdSec 官方文档](https://doc.crowdsec.net/)。
