---
title: 'VPS Basic Security Configuration Guide'
pubDate: 2026-03-11
description: 'Basic configuration steps required after acquiring a brand new VPS'
category: 'Server'
categoryPath: ['Server', 'Server Security']
tags: ['Server Security', 'Linux']
---

This is a guide aimed at enhancing the basic security configuration for a newly purchased VPS. This guide will use Debian as the demonstration system.

## 1. First Steps for VPS Basic Configuration

When you first get your new server, the most important thing is to confirm the current user status and perform basic security isolation.

### 1-1. Log into the Server and Change the Default Root Password

When you purchase a brand new VPS from a provider, you usually get the default `root` password via Email or the hosting provider's backend. After logging in via SSH with the `root` account, please run the `passwd` command immediately to change the default `root` password:

```bash
# Change the password of the currently logged-in account (root in this case)
passwd
```

> **Security Tip**: Please enter a strong password (longer than 12 characters, including uppercase and lowercase letters, numbers, and special symbols) and avoid common dictionary words to prevent brute-force cracking.

### 1-2. Create a Custom Normal User and Grant Sudo Privileges

Please do not use the `root` account for daily system operations. We recommend creating a dedicated normal user and granting it `sudo` privileges, then disabling direct `root` login.

#### Install the sudo tool (often not installed by default on Debian)

A fresh Debian system usually does not have `sudo` installed by default. Please update the software sources and install the `sudo` package as `root` first:

```bash
# Update the package list and install sudo
apt-get update && apt-get install sudo -y
```

#### Create a new user

We recommend using the higher-level `adduser` command instead of the lower-level `useradd`. `adduser` will interactively guide you to set a password, create a home directory, and set the default Shell to the intuitive `/bin/bash`:

```bash
# Create a new normal user (replace your_username with your desired account name)
adduser your_username
```

#### Add the user to the sudo administrator group

Once created, add the user to the `sudo` group so they can execute administrative commands via `sudo` when needed:

```bash
# Add the specified user to the sudo group
usermod -aG sudo your_username
```

## 2. NTP Synchronization

Ensuring that your server's time is synchronized is very important, especially when you plan to deploy certificates or track log files.

### 2-1. Install NTP

```bash
apt-get update
apt-get install ntp
```

### 2-2. Configure NTP

Open the NTP configuration file `/etc/ntp.conf` using a text editor:

```bash
nano /etc/ntp.conf
```

There are some default NTP servers in the configuration file. You can keep these default servers or change them to specific servers you want to use.

Set it to the NTP server you want to use:

```bash
server "your-ntp-server"
```

\*Note: Replace `your-ntp-server` with the NTP server you want to use.

Save the file after making changes.

### 2-3. Restart NTP

```bash
systemctl restart ntp
```

If you want the NTP server to start automatically after a reboot:

```bash
systemctl enable ntp
```

### 2-4. Verify Time Synchronization

Check if the NTP server is running:

```bash
systemctl status ntp
```

Check and it will display the NTP service synchronization status message:

```bash
date
```

If the displayed message is incorrect or unsynchronized, use the following command to force synchronization:

```bash
ntpdate -q your-ntp-server
```

\*Note: Replace `your-ntp-server` with your server.

View the synchronization status of the NTP daemon:

```bash
ntpq -p
```

## 3. Change SSH Port

Changing the default Port 22 can significantly reduce the frequency of malicious probing and brute-force attacks by network scanning scripts.

### 3-1. Select and Modify the SSH Configuration File

Please first think of a custom Port between `1024` and `65535` (e.g., `38822`) to avoid conflicts with other common services.

Open the SSH configuration file with a text editor:

```bash
sudo nano /etc/ssh/sshd_config
```

Find the line containing `#Port 22` or `Port 22`, uncomment it, and change it to the Port you want to set:

```text
Port 38822
```

> **Note**: Some older tutorials recommend manually adding `Protocol 2`, but insecure Protocol 1 has long been deprecated in modern OpenSSH versions. Manually writing this setting may cause compatibility errors on some new systems, so it is unnecessary to add.

### 3-2. Crucial Security Firewall Settings (Prevent Lockout)

Before restarting the SSH service, **if you have already installed and enabled the firewall, you must allow the new SSH Port first**! If you restart SSH without allowing it, you will be blocked out and unable to connect.

If using the UFW firewall, please be sure to allow the new Port first (if you enable UFW in later chapters, remember to handle this when enabling it):

```bash
# Allow the custom SSH Port you set
sudo ufw allow 38822/tcp
```

Once confirmed, restart the SSH service to apply the new settings:

```bash
# Restart the SSH service
sudo systemctl restart ssh
```

### 3-3. Secure Connection Verification Steps

:::warning
**Do NOT interrupt the currently logged-in SSH connection before testing succeeds!**
Please keep the current window as an emergency backup. Next, please open a new Command Prompt or PowerShell window on your local computer (Windows) and try to connect using the new Port:

```bash
# Test the connection with the new Port (replace 38822 with your Port and your_username with your username)
ssh -p 38822 your_username@your_vps_ip
```

Only close the old connection window after confirming you can successfully log in and gain control.
:::

## 4. Disable Root SSH Access and Restrict Login Accounts

:::warning
**Important Security Prerequisite**: Before proceeding with this step, it is recommended to read and complete **"5. Configure Passwordless SSH Login (SSH Key)"** first to ensure you can log in to the normal user account using a key. If you directly disable root login now while the normal account key is not yet set up, you may lock yourself out of the server.
:::

To prevent attackers from brute-forcing the `root` account, we need to disable `root` from logging in directly via SSH and restrict login access only to the custom normal user you created.

### 4-1. Modify SSH Configuration File

Open the SSH configuration file:

```bash
sudo nano /etc/ssh/sshd_config
```

### 4-2. Disable Root Login and Restrict Login Accounts

Find and modify the following settings (if they were originally commented out, uncomment and modify them, or simply add them to the end of the file):

```text
# Disable SSH login permission for root
PermitRootLogin no

# Only allow the specified user account to log in (replace your_username with your custom account name)
AllowUsers your_username
```

After saving and exiting the editor, restart the SSH service to apply the changes:

```bash
# Restart the SSH service to apply settings
sudo systemctl restart ssh
```

## 5. Configure Passwordless SSH Login (SSH Key)

Compared to typical string passwords, using a key pair (Public/Private Key Pair) is currently the most secure connection method that effectively defends against brute-force attacks. We will use the `Ed25519` algorithm, which is highly secure, has a short key length, and computes quickly.

### 5-1. Generate Key Pair on Local Machine (Windows)

Please open **PowerShell** or **Command Prompt (CMD)** on your local Windows computer and execute the following command to generate the key pair:

```powershell
# Generate an Ed25519 key pair locally, you can add your Email or a memo tag after -C
ssh-keygen -t ed25519 -C "your_email@example.com"
```

1. The system will ask: `Enter file in which to save the key`. Just press the **Enter** key, and the key will be saved by default in `C:\Users\YourUsername\.ssh\id_ed25519`.
2. The system will ask: `Enter passphrase`. This is the password to protect your private key, recommended to enter to improve security; if you don't want to enter the password every time you connect, you can also just press **Enter** to leave it blank.
3. Once generated, check the content of your **public key** (the file with the `.pub` extension) locally:

```powershell
# View public key file content
cat ~\.ssh\id_ed25519.pub
```

You will see a string starting with `ssh-ed25519`, followed by a long string of random characters and the memo tag. Please copy this entire line completely.

### 5-2. Deploy Public Key on the VPS (Debian)

To avoid ownership permission errors, **you must perform the following operations as the "normal user" you just created**.

If you are still logged in as `root`, please switch to that user account first (replace `your_username` with the actual username):

```bash
# Switch to the normal user account
su - your_username
```

After switching, execute the following commands to create the `.ssh` directory and write the public key:

```bash
# Create a directory to store keys (-p prevents errors if the directory already exists)
mkdir -p ~/.ssh

# Set directory permissions to read, write, and execute for the owner only (rwx------)
chmod 700 ~/.ssh

# Open or create the authorized_keys file
nano ~/.ssh/authorized_keys
```

In the nano editor, paste the public key content you just copied from the local Windows machine, confirm that there is only one long line and no line break errors, then save and exit.

Next, set the security permissions of the `authorized_keys` file (the SSH service has extremely strict requirements for key file permissions, and incorrect settings will invalidate the key):

```bash
# Set key file permissions to read and write for the owner only (rw-------)
chmod 600 ~/.ssh/authorized_keys
```

> **Important Security Tip**:
> If you previously forced the creation of the `.ssh` directory for the normal user under the `root` identity, the ownership of the directory and file will belong to `root`, which will cause the user to fail key login due to lack of read permissions. Please execute the following command under the `root` identity (or using `sudo`) to fix the ownership:
>
> ```bash
> # Fix ownership (replace your_username with the actual username)
> sudo chown -R your_username:your_username /home/your_username/.ssh
> ```

## 6. Disable SSH Password Login Feature

Once the key connection is tested without errors, immediately turn off `PasswordAuthentication`. From then on, password exhaustive attacks will be ineffective against you.

### 6-1. Open SSH Configuration File

```bash
sudo nano /etc/ssh/sshd_config
```

Change the parameter value of PasswordAuthentication to no

```bash
PasswordAuthentication no
```

Save and exit, and restart the SSH service

```bash
sudo systemctl restart ssh
```

## 7. UFW Firewall

UFW (Uncomplicated Firewall) is a very intuitive and easy-to-use firewall frontend management tool on Debian/Ubuntu, used to control incoming and outgoing network traffic.

### 7-1. Installation and Basic Configuration

:::warning
**Note**: If you changed the SSH Port (e.g., `38822`) in the "3. Change SSH Port" chapter, **before enabling the firewall, you must first allow this custom Port**, otherwise the connection will be disconnected on the spot and you will be locked out!
:::

```bash
# Install UFW firewall
sudo apt install ufw -y

# Deny all incoming connections by default, allow all outgoing connections
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow common Ports for web browsing (HTTP 80 / HTTPS 443)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Be sure to allow your custom SSH Port (replace 38822 with the SSH Port you actually set)
sudo ufw allow 38822/tcp

# Enable the UFW firewall (the system will prompt whether to continue when enabling, please enter y)
sudo ufw enable
```

To view the current firewall status:

```bash
sudo ufw status verbose
```

## 8. Intrusion Prevention (Fail2Ban / CrowdSec)

Build your malicious traffic alert and automatic blocking system to proactively defend against brute-force attacks from the network.

### 8-1. Install Fail2Ban

Fail2Ban monitors system logs (such as SSH login records) and automatically blocks malicious IPs that have failed multiple login attempts temporarily or permanently through the firewall (like UFW).

In Debian systems, you can install it directly:

```bash
# Update package list and install fail2ban
sudo apt update
sudo apt install fail2ban -y
```

After installation, Fail2Ban will create a basic defense rule by default. You can check its status with the following commands:

```bash
# Check fail2ban service status
sudo systemctl status fail2ban

# View SSH protection status (default sshd jail)
sudo fail2ban-client status sshd
```

### 8-2. Combine or Replace with CrowdSec (Recommended)

In addition to traditional Fail2Ban, you can also combine it with or switch to the modernized intrusion prevention engine **[CrowdSec](https://app.crowdsec.net/security-engines/setup?distribution=linux)**.

CrowdSec adopts a network-wide community joint defense mechanism, which can actively collect threat intelligence and block known high-risk IPs. Its installation and configuration are very simple, and it is recommended to use it with its UFW blocking component (Bouncer). For detailed installation and configuration methods, please refer to the [CrowdSec Official Documentation](https://doc.crowdsec.net/).
