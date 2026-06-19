---
title: 'Your Own Private Journal: A Guide to DailyTxT and Server Deployment'
pubDate: 2026-05-02
category: 'Software'
tags: ['DailyTxT', 'Self-hosted', 'Journal']
---

In the digital age, our lives are often scattered across countless cloud services. For truly private journal entries and personal thoughts, many people prefer to keep things completely under their own control. [DailyTxT](https://github.com/PhiTux/DailyTxT) was built for exactly this purpose — an encrypted, web-based diary and note-taking application designed with privacy at its core.

DailyTxT-[Github](https://github.com/PhiTux/DailyTxT)
Live Demo(Official)-[Live Demo](https://dailytxt.phitux.de/)

---

## Why Choose DailyTxT?

Compared to bulky note-taking apps or plain-text diaries, DailyTxT has a very clear focus: **maximum privacy with a lightweight writing experience**.

- **Server-side Encryption**: All journal entries and uploaded files are encrypted before being written to disk. Even the server administrator or VPS provider cannot read your content without your login-derived key.
- **No Database Dependency**: There is no reliance on complex databases like MySQL or PostgreSQL. All data is stored as encrypted JSON files, making backups and migrations remarkably simple and ensuring long-term data availability.
- **Multi-language & Cross-platform**: Supports Traditional Chinese (Taiwan) and many other languages natively. The responsive design works great on desktop, and PWA (Progressive Web App) support lets you install it directly to your phone's home screen like a native app.
- **Rich Feature Set**: Supports Markdown with live preview, image gallery view, tags, location pinning (map mode), and HTML export.

---

## Prerequisites

- **Server**: A fresh VPS with no pre-installed software (any OS that can run Docker will work).
- **Domain Name**: A domain already pointing to your VPS IP address (e.g., `diary.yourdomain.com`).
- **Access**: SSH access to the server.

---

## Step 1: Install Docker and Configure Log Limits

One of the most common disasters when running containers long-term is **unbounded log growth** — container logs can silently fill up your disk until the server crashes. Before installing anything else, let's secure the foundation.

### 1. Install Docker Using the Official Script

Log into your VPS and run the official Docker installation script (compatible with most Linux distributions):

```bash
# Download and run the official Docker one-liner install script
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Enable Docker to start on boot and start it now
systemctl enable docker
systemctl start docker
```

For stricter supply-chain control, use your distribution packages or Docker's official APT repository instead. If you use the convenience script, inspect it before execution.

### 2. Limit Docker Log Size

To prevent logs from filling up the disk, set a global log size limit for Docker.

```bash
# Create or edit Docker's daemon configuration file
vim /etc/docker/daemon.json
```

Write the following configuration (limits each container's logs to 20MB max, keeping 3 rotated files):

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "3"
  }
}
```

Save the file, then restart Docker for the settings to take effect:

```bash
systemctl restart docker
```

---

## Step 2: Deploy DailyTxT

With the base environment ready, let's install DailyTxT. We'll follow the official `docker-compose.yml` approach exactly.

### 1. Generate a Secure Secret Token

DailyTxT requires a strong random string as the core of its encryption. Run the following command and **copy the output**:

```bash
openssl rand -base64 32
```

### 2. Create the DailyTxT Directory and Configuration File

```bash
# Create the directory
mkdir -p /opt/dailytxt && cd /opt/dailytxt

# Create docker-compose.yml
vim docker-compose.yml
```

Fill in the official configuration, carefully replacing the placeholder values:

```yaml
services:
  dailytxt:
    image: phitux/dailytxt:latest
    container_name: dailytxt
    restart: unless-stopped
    volumes:
      # Left side is the host path — all encrypted journal data is stored here
      - ./data:/data
    environment:
      # Paste the random string generated earlier after the equals sign
      - SECRET_TOKEN=your-random-string-here

      # Set JSON indentation for readable data files
      - INDENT=4

      # [SECURITY] Enable registration for initial setup only — disable after creating your account
      - ALLOW_REGISTRATION=true

      # Set a strong password for the Admin panel
      - ADMIN_PASSWORD=your-strong-admin-password

      # Number of days before the login cookie expires
      - LOGOUT_AFTER_DAYS=40
    ports:
      # Map container port 80 to host port 8000.
      # Binding to 127.0.0.1 is strongly recommended — keeps DailyTxT off the public internet.
      - 127.0.0.1:8000:80
```

For production, replace `latest` with a fixed version tag that you have tested, and back up `./data` before upgrades.

### 3. Start DailyTxT

```bash
docker compose up -d
```

DailyTxT is now running locally at `127.0.0.1:8000` on your server. It is not directly accessible from the internet — we've achieved a high level of security by design.

---

## Step 3: Set Up Reverse Proxy and Secure Connection

To access DailyTxT from the internet via your domain (e.g., `https://diary.yourdomain.com`), you need a web server to act as a reverse proxy and handle HTTPS.

### Option A: Manual Nginx Configuration

If your server already has Nginx installed, or you prefer direct control over config files, follow the steps below.

First, install Nginx and Certbot (for automatic Let's Encrypt SSL certificates):

```bash
apt install nginx certbot python3-certbot-nginx -y
```

Create a new Nginx site configuration for DailyTxT:

```bash
vim /etc/nginx/sites-available/dailytxt
```

Paste the following reverse proxy configuration (HTTP first — Certbot will add HTTPS automatically):

```nginx
server {
    listen 80;
    # Replace with your actual domain
    server_name diary.yourdomain.com;

    location / {
        # Forward traffic to the local DailyTxT container
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;

        # WebSocket support (required for DailyTxT real-time updates)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Pass real client information to the backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain your SSL certificate:

```bash
# Create a symlink to enable the site
ln -s /etc/nginx/sites-available/dailytxt /etc/nginx/sites-enabled/

# Test the Nginx configuration for errors
nginx -t

# Reload Nginx
systemctl reload nginx

# Use Certbot to obtain an SSL certificate and update Nginx automatically
certbot --nginx -d diary.yourdomain.com
```

Certbot will automatically update your Nginx config to redirect HTTP to HTTPS and set up automatic certificate renewal.

---

### Option B: Nginx Proxy Manager (GUI)

If you'd rather not edit config files manually, **Nginx Proxy Manager (NPM)** provides a graphical web interface to manage reverse proxies and SSL certificates with just a few clicks.

For a complete NPM installation and configuration walkthrough, see this dedicated guide:  
👉 [Docker + Nginx Proxy Manager: Complete Installation Guide](./docker-nginx-proxy-manager-guide.md)

_(Quick tip: When configuring the Proxy Host in NPM, set Forward Hostname / IP to `host.docker.internal` or your server's local IP, and set the Forward Port to `8000` to connect to DailyTxT.)_

---

## Step 4: First Use and Security Checklist

Open your browser and navigate to `https://diary.yourdomain.com` — you should see the DailyTxT login and registration screen.

**🚨 Critical Security Steps:**

1. Register your first account immediately.
2. After confirming you can log in successfully, go back to the terminal and edit `/opt/dailytxt/docker-compose.yml`.
3. Change `ALLOW_REGISTRATION=true` to `ALLOW_REGISTRATION=false`.
4. Run `docker compose up -d` to apply the change. This permanently closes open registration and prevents strangers from creating accounts on your server.

**Backup Recommendation:**
Thanks to DailyTxT's excellent design with no database dependency, backups are dead simple. Periodically download and archive the `/opt/dailytxt/data` folder from your VPS — that single directory contains 100% of your encrypted data. If you ever migrate to a new server, just copy the folder back, start the container, and everything will be exactly as you left it.
