---
title: 'Securing KaraKeep (Hoarder): 3-in-1 AI Bookmarks & Notes Deployment Guide'
pubDate: 2026-05-21
description: 'A step-by-step guide to deploying KaraKeep (formerly Hoarder) on a Debian VPS. Secure Meilisearch full-text search, fix headless Chrome memory crashes, and restrict public access.'
category: 'Software'
categoryPath: ['Software', 'Self-hosted']
tags: ['Docker', 'Self-hosted', 'AI']
---

In the digital era, we consume vast amounts of web content daily. **KaraKeep** (formerly **Hoarder**, rebranded in April 2025) is an AI-powered bookmark and data collection tool. It supports saving web links, images, and text, using integrated AI models to automatically categorize, tag, and summarize your bookmarks.

KaraKeep has a microservices architecture comprising three core components:

1. **Web App & Core Brain** (Main frontend and backend services)
2. **Meilisearch Full-Text Search Engine** (Provides instant keyword search)
3. **Headless Chrome Browser Container** (Extracts screenshots and page content metadata)

Since bookmarks contain private data, this tutorial focuses on **security-first deployment** to ensure your system is shielded from public access.

---

## Step 1: Pre-generate Secure Secret Keys

Before deploying, run the following command twice in your terminal to generate two unique, cryptographically secure strings. These are used to encrypt sessions and authenticate Meilisearch communication:

```bash
openssl rand -base64 36
```

Keep the outputs safe:

- Secret 1 (for `NEXTAUTH_SECRET`): `d2FjZ2...`
- Secret 2 (for `MEILI_MASTER_KEY`): `c2FmZS...`

---

## Step 2: Set Up Directories and Environment Variables

We store our projects under `/opt/stacks`. Create the directories for KaraKeep persistent volumes:

```bash
cd /opt/stacks
sudo mkdir -p karakeep/karakeep-data
sudo mkdir -p karakeep/meili-data
sudo mkdir -p karakeep/chrome-data
cd karakeep
```

Now, create and edit the `.env` configuration file:

```bash
sudo nano .env
```

Paste the following configurations. Make sure to replace `YOUR_OPENSSL_RANDOM_STRING_1` and `YOUR_OPENSSL_RANDOM_STRING_2` with the secret keys you generated:

```ini
# =========================================================================
# KaraKeep (Hoarder) Security and Core Configurations
# =========================================================================

# 1. Base Settings
KARAKEEP_VERSION=release
PORT=3000
DB_PATH=/data/karakeep.db
# Replace with your actual proxy domain
NEXTAUTH_URL=https://example.com

# 2. Microservices Network Routing (Resolving via Docker Internal DNS)
MEILI_ADDR=http://karakeep-meili:7700
BROWSER_WEB_URL=http://karakeep-chrome:9222
DATA_DIR=/data

# 3. Security Tokens (Protects against session hijacking)
NEXTAUTH_SECRET="YOUR_OPENSSL_RANDOM_STRING_1"
MEILI_MASTER_KEY="YOUR_OPENSSL_RANDOM_STRING_2"

# 4. User Registrations Control (Hardens privacy by disabling registrations, invites, and demos)
DISABLE_SIGNUPS=true
DISABLE_INVITES=true
DISABLE_DEMO=true

# 5. Transmission Security (Enforces secure session cookie flags to prevent XSS session theft)
NEXTAUTH_SECURE_COOKIES=true

# 6. Scraping Isolation (Downloads crawled images to the VPS local storage to avoid tracking)
CRAWLER_DOWNLOAD_IMAGES=true

# 7. Privacy Hardening (Disables Meilisearch anonymous usage reporting)
MEILI_NO_ANALYTICS=true
```

Save and exit.

---

## Step 3: Write the docker-compose.yml File

Create `docker-compose.yml` in the `/opt/stacks/karakeep` directory:

```bash
sudo nano docker-compose.yml
```

Paste the following stack configuration:

```yaml
version: '3.8'

services:
  # 1. Frontend Web App and Core Logic
  web:
    image: ghcr.io/karakeep-app/karakeep:${KARAKEEP_VERSION:-release}
    container_name: karakeep-web
    restart: unless-stopped
    ports:
      # [Security Hardening] Bind to localhost only to prevent public port scanning
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

  # 2. Search Database
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

  # 3. Headless Chrome Container for Scraped Content Screenshots
  chrome:
    image: gcr.io/zenika-hub/alpine-chrome:124
    container_name: karakeep-chrome
    restart: unless-stopped
    command:
      - --no-sandbox
      - --disable-gpu
      #  Prevents Chrome from crashing due to Docker's default 64MB /dev/shm memory limit
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
The Chrome flags `--no-sandbox` and `--remote-debugging-address=0.0.0.0` are acceptable only inside this isolated Chrome container, reachable through a private Docker network. Do not publish port `9222` to the internet, and do not reuse these flags on your host browser, or the browser can become remotely controllable.
:::

:::tip
**Debugging Explainer**:
Many default or outdated Hoarder compose files lack the `--disable-dev-shm-usage` flag for the headless Chrome container.
Docker allocates only 64MB of `/dev/shm` (shared memory) to containers by default. When Chrome crawls content-heavy or media-heavy pages, it will crash due to shared memory exhaustion. Adding this flag tells Chrome to use `/tmp` for rendering, preventing crashes.
:::

---

## Step 4: Run the Services

Start the stack:

```bash
sudo docker compose up -d
```

Verify that all three services (`karakeep-web`, `karakeep-meili`, and `karakeep-chrome`) are running properly via `sudo docker ps`.

---

## Step 5: Configure Nginx Proxy Manager Reverse Proxy

Set up NPM to proxy incoming HTTPS requests to KaraKeep securely:

1. Log into your NPM admin dashboard, click **Add Proxy Host**.
2. **Details tab**:
   - **Domain Names**: `example.com` (Replace with your actual domain)
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `karakeep-web` (Points to the web container name)
   - **Forward Port**: `3000` (Container internal port)
   - Check **Block Common Exploits** and **Websockets Support**
3. **Advanced tab**:
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. Click **Save**.

---

## Step 6: Complete System Security Audit

Verify that your deployment matches the expected security standards:

1. **UFW Firewall Status**:
   Run `sudo ufw status` and ensure port `3000` is blocked from external connections.
2. **Disable Public Registration**:
   Open an **incognito browser window** and visit your domain (e.g., `https://example.com`). Verify that there is **no** "Sign Up" or "Create Account" option beneath the login form.
3. **Secure Cookies Flags**:
   Open the browser Developer Tools (`F12`), refresh the page, check the Response Headers for the initial document request, and confirm that the session cookies have `Secure` and `HttpOnly` flags active.
4. **Data Persistence and Backups**:
   Ensure all `.db` records, snapshots, and search indexes are saved under `/opt/stacks/karakeep/` on the host machine. This keeps data outside the container lifecycle, but you should still back up the directory before image upgrades and on a regular schedule.
