---
title: 'VPS 基礎安全防護設定指南'
pubDate: 2026-03-11
description: '全新的VPS獲取後，需做的基本動作'
category: '伺服器'
categoryPath: ['伺服器', '伺服器安全']
tags: ['伺服器安全', 'Linux']
---

這是一篇針對剛購買全新 VPS 進行安全防護強化的指南。本指南將使用 Debian 系統作為示範

## VPS 第一步基礎設定

在剛拿到您的新主機時，最重要的事情是確認目前的使用者狀態並進行基礎安全隔離。

### 1. 登入伺服器與更改 Root 預設密碼

剛向服務商購買全新 VPS 時，通常會透過 Email 或主機商後台取得預設的 `root` 密碼。以 `root` 帳號透過 SSH 登入後，請第一時間執行 `passwd` 指令來更改 `root` 的預設密碼：

```bash
# 變更當前登入帳號（此處為 root）的密碼
passwd
```

> **安全提示**：請輸入具備高強度（長度大於 12 字元，包含大小寫字母、數字及特殊符號）且非字典常見單字的密碼，以防止暴力破解。

### 2. 建立自訂一般使用者並賦予 Sudo 權限

請不要使用 `root` 帳號進行日常系統操作。我們建議您建立一個專屬的一般使用者，並賦予 `sudo` 權限，隨後關閉 `root` 直接登入。

#### 2-1. 安裝 sudo 工具（Debian 預設通常未安裝）

全新的 Debian 系統預設通常沒有安裝 `sudo`。請先以 `root` 身份更新軟體源並安裝 `sudo` 套件：

```bash
# 更新套件清單並安裝 sudo
apt-get update && apt-get install sudo -y
```

#### 2-2. 建立新使用者

我們推薦使用高階的 `adduser` 指令，而非低階的 `useradd`。`adduser` 會以互動方式引導您設定密碼、建立家目錄，並將預設 Shell 設定為符合直覺的 `/bin/bash`：

```bash
# 建立一個新的一般使用者（請將 your_username 替換為您想要的帳號名稱）
adduser your_username
```

#### 2-3. 將使用者加入 sudo 管理員群組

建立完成後，將該使用者加入 `sudo` 群組，使其在需要時能夠透過 `sudo` 執行管理員權限之指令：

```bash
# 將指定使用者加入 sudo 群組
usermod -aG sudo your_username
```

## 2. NTP同步

確保伺服器的時間同步是非常重要的，尤其當您打算部屬憑證或是進行日誌檔追蹤的時候。

### 2-1. 安装 NTP

```bash
apt-get update
apt-get install ntp
```

### 2-2. 配置 NTP

使用文本編輯器開啟NTP配置文件`/etc/ntp.conf`

```bash
nano /etc/ntp.conf
```

在配置文件中內有一些默認的NTP伺服器，您可以保留這些默認伺服器或跟改成您想設定的特定伺服器

設定成您想使用的NTP伺服器

```bash
server "your-ntp-server"
```

\*註將server your-ntp-server更改成您想使用的NTP伺服器

更改完成後儲存文件

### 2-3 重啟NTP

```bash
systemctl restart ntp
```

如您需要NTP伺服器在重啟後，自動啟動NTP服務

```
systemctl enable ntp
```

### 2-4驗證同步時間

檢查NTP伺服器是否運行

```bash
systemctl status ntp
```

檢查並會顯示NTP服務同步狀態訊息

```bash
date
```

如顯示的訊息是錯誤或不同步，使用以下指令強制同步

```bash
ntpdate -q your-ntp-server
```

\*註 將your-ntp-server更改成您使用的伺服器

檢視NTP守護進程的同步狀態

```bash
ntpq -p
```

## 3. 改變 SSH Port

將預設的 Port 22 換掉能大幅度減少網路掃描腳本的惡意探測與暴力破解頻率。

### 3-1 選擇與修改 SSH 設定檔

請先想好一個在 `1024` 到 `65535` 之間的自訂 Port（例如：`38822`），避免與其他常見服務衝突。

使用文本編輯器開啟 SSH 設定檔：

```bash
sudo nano /etc/ssh/sshd_config
```

找到含有 `#Port 22` 或 `Port 22` 的行，取消註釋並修改為您想設定的 Port：

```text
Port 38822
```

> **注意**：部分老舊教材會建議手動加入 `Protocol 2`，但在現代 OpenSSH 版本中早已淘汰不安全的 Protocol 1，手動寫入此設定可能在部分新系統中引發相容性錯誤，故無須加入。

### 3-2 關鍵安全性防火牆設定（防鎖死）

在重啟 SSH 服務之前，**如果您已經安裝並啟用了防火牆，請務必先開放新的 SSH Port**！若未放行便重啟 SSH，您將會被阻擋在外而無法連線。

若使用 UFW 防火牆，請務必先放行新 Port（若您在後面章節才啟用 UFW，則記得在啟用時一併處理）：

```bash
# 開放您設定的自訂 SSH Port
sudo ufw allow 38822/tcp
```

確認無誤後，重啟 SSH 服務以套用新設定：

```bash
# 重啟 SSH 服務
sudo systemctl restart ssh
```

### 3-3 安全連線驗證步驟

:::warning
**在測試成功前，請絕對不要中斷當前已登入的 SSH 連線！**
請保留當前視窗作為緊急備用。接著，請在您的本地電腦（Windows）打開一個新的命令提示字元或 PowerShell 視窗，嘗試以新 Port 進行連線：

```bash
# 以新 Port 測試連線（將 38822 替換為您的 Port，your_username 替換為您的使用者名稱）
ssh -p 38822 your_username@your_vps_ip
```

確認能成功登入並取得控制權後，才能關閉舊的連線視窗。
:::

## 4. 關閉 root 的 SSH 權限與限制登入帳號

:::warning
**重要安全性前提**：在進行本步驟之前，建議先閱讀並完成 **「5. 設定 SSH 免密碼登入」**，確保您能使用金鑰登入一般使用者帳號。如果此時直接停用 root 登入，而一般帳號金鑰又尚未設定好，將可能導致被鎖定在伺服器外。
:::

為了阻絕攻擊者針對 `root` 帳號進行暴力破解，我們需要禁用 `root` 直接透過 SSH 登入，並限制僅允許您建立的自訂一般使用者登入。

### 4-1 修改 SSH 設定檔

開啟 SSH 設定檔：

```bash
sudo nano /etc/ssh/sshd_config
```

### 4-2 停用 Root 登入並限制登入帳號

尋找並修改以下設定值（如果原本被註釋掉，請取消註釋並修改，或直接加在檔案末尾）：

```text
# 停用 root 的 SSH 登入權限
PermitRootLogin no

# 僅允許指定的使用者帳號登入（請將 your_username 替換為您建立的自訂帳號名稱）
AllowUsers your_username
```

儲存並退出編輯器後，重啟 SSH 服務以套用變更：

```bash
# 重啟 SSH 服務以套用設定
sudo systemctl restart ssh
```

## 5. 設定 SSH 免密碼登入 (SSH Key)

相較於一般的字串密碼，使用金鑰對（Public/Private Key Pair）是目前常見且推薦的安全連線方式，能有效降低暴力破解風險。我們將使用安全性高、金鑰長度短且計算速度快的 `Ed25519` 演算法。

### 5-1 本地端（Windows）產生金鑰對

請在您的 Windows 本地電腦上開啟 **PowerShell** 或 **命令提示字元 (CMD)**，執行以下指令生成金鑰對：

```powershell
# 在本地產生 Ed25519 金鑰對，-C 後面可加上您的 Email 或備忘標記
ssh-keygen -t ed25519 -C "your_email@example.com"
```

1. 系統會詢問：`Enter file in which to save the key`。直接按 **Enter** 鍵即可，金鑰預設會儲存在 `C:\Users\您的使用者名稱\.ssh\id_ed25519`。
2. 系統會詢問：`Enter passphrase`。這是保護您私鑰的密碼，建議輸入以提高安全性；若不想每次連線都輸入密碼，也可以直接按 **Enter** 留空。
3. 產生完成後，在本地端查看您的**公鑰**（副檔名為 `.pub` 的檔案）內容：

```powershell
# 查看公鑰檔案內容
cat ~\.ssh\id_ed25519.pub
```

您會看到一串以 `ssh-ed25519` 開頭、後接一長串隨機字元與備忘標記的文字。請完整複製這一整行內容。

### 5-2 VPS 端（Debian）部署公鑰

為了避免權限歸屬錯誤，**請務必以剛才建立的「一般使用者」身份進行以下操作**。

如果您目前還是以 `root` 身份登入，請先切換至該使用者帳號（請將 `your_username` 替換為實際使用者名稱）：

```bash
# 切換至一般使用者帳號
su - your_username
```

切換後，執行以下指令建立 `.ssh` 目錄並寫入公鑰：

```bash
# 建立存放金鑰的目錄（-p 可防止目錄已存在時報錯）
mkdir -p ~/.ssh

# 設定目錄權限為僅擁有者可讀寫與執行 (rwx------)
chmod 700 ~/.ssh

# 開啟或新建 authorized_keys 檔案
nano ~/.ssh/authorized_keys
```

在 nano 編輯器中，將您剛才從 Windows 本地端複製的公鑰內容貼上，確認只有一長行且沒有換行錯誤後，儲存並離開。

接著，設定 `authorized_keys` 檔案的安全權限（SSH 服務對金鑰檔案權限要求極為嚴格，若設定錯誤會導致金鑰失效）：

```bash
# 設定金鑰檔案權限為僅擁有者可讀寫 (rw-------)
chmod 600 ~/.ssh/authorized_keys
```

> **重要安全提示**：
> 如果您之前是在 `root` 身份下強行幫該一般使用者建立 `.ssh` 目錄的，該目錄與檔案的擁有權將會歸屬於 `root`，這會使該使用者因無權限讀取而導致金鑰登入失敗。請在 `root` 身份下（或使用 `sudo`）執行以下指令將擁有權修正：
>
> ```bash
> # 修正擁有權（請將 your_username 替換為實際的使用者名稱）
> sudo chown -R your_username:your_username /home/your_username/.ssh
> ```

## 6. 關閉 SSH 密碼登入功能

一旦金鑰連線測試無誤，立刻關閉 \`PasswordAuthentication\`，自此密碼窮舉攻擊對你無效。

### 6-1 開啟 SSH 設定檔

```bash
sudo nano /etc/ssh/sshd_config
```

將 PasswordAuthentication 的參數值改為 no

```bash
PasswordAuthentication no
```

儲存並離開，且重啟SSH服務

```bash
sudo systemctl restart ssh
```

## 7. UFW 防火牆

UFW (Uncomplicated Firewall) 是 Debian/Ubuntu 上非常直覺且好用的防火牆前端管理工具，可用於控制傳入與傳出的網路流量。

### 7-1 安裝與基本配置

:::warning
**注意**：如果您在「3. 改變 SSH Port」章節中修改了 SSH Port（例如：`38822`），**在啟用 (enable) 防火牆之前，請務必先放行該自訂 Port**，否則會當場中斷連線且被拒之門外！
:::

```bash
# 安裝 UFW 防火牆
sudo apt install ufw -y

# 預設拒絕所有傳入連線，允許所有傳出連線
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 允許網頁瀏覽常用的 Port（HTTP 80 / HTTPS 443）
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 務必允許您的自訂 SSH Port（將 38822 替換為您實際設定的 SSH Port）
sudo ufw allow 38822/tcp

# 啟用 UFW 防火牆（啟用時系統會提示是否繼續，請輸入 y）
sudo ufw enable
```

若要查看當前防火牆狀態：

```bash
sudo ufw status verbose
```

## 8. 入侵防禦 (Fail2Ban / CrowdSec)

建構您的惡意流量警報與自動封鎖系統，用以主動防禦來自網路的暴力破解攻擊。

### 8-1 安裝 Fail2Ban

Fail2Ban 會監視系統日誌（例如 SSH 登入記錄），並在發現多次嘗試登入失敗的惡意 IP 時，自動透過防火牆（如 UFW）對該 IP 進行暫時或永久封鎖。

在 Debian 系統中，直接安裝即可：

```bash
# 更新套件清單並安裝 fail2ban
sudo apt update
sudo apt install fail2ban -y
```

安裝完成後，Fail2Ban 預設會建立一個基本防禦規則，您可以透過以下指令檢查其狀態：

```bash
# 檢查 fail2ban 服務狀態
sudo systemctl status fail2ban

# 查看 SSH 防護狀態 (預設的 sshd jail)
sudo fail2ban-client status sshd
```

### 8-2 搭配或替換為 CrowdSec (推薦)

除了傳統的 Fail2Ban 之外，您也可以搭配或改用現代化的入侵防禦引擎 **[CrowdSec](https://app.crowdsec.net/security-engines/setup?distribution=linux)**。

CrowdSec 採用全網社群聯防機制，能主動收集威脅情報並阻斷已知的高危 IP。其安裝與設定非常簡便，推薦搭配其 UFW 阻斷元件（Bouncer）使用。詳細安裝與配置方法請參照 [CrowdSec 官方文件](https://doc.crowdsec.net/)。
