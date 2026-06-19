---
title: 'Visualizing Docker Compose Stacks with Dockge & Tuning WebSockets'
pubDate: 2026-05-21
description: 'Learn how to deploy Dockge, a visual Docker Compose manager, on a Debian VPS. This guide walks you through secure installation, troubleshooting the Docker-UFW bypass, and configuring Nginx reverse proxy for WebSockets.'
category: 'Software'
tags: ['Docker', 'Dockge', 'Nginx', 'Linux']
---

When managing self-hosted services, raw command-line `docker compose` is incredibly powerful but lacks a visual dashboard. **Dockge** is a sleek, responsive, and specialized visual manager for Docker Compose. It lets you write, edit, and manage `docker-compose.yml` stacks, check real-time logs, and access an interactive terminal directly from your web browser.

Because Dockge's terminal and log outputs depend heavily on the **WebSocket** protocol, improper reverse proxy tuning (like in Nginx Proxy Manager) can cause frequent connection timeouts or disconnects. This guide covers deploying Dockge securely and optimizing WebSockets.

---

## Why Choose Dockge?

1. **Native Compose**: Dockge doesn't abstract away your configurations. It reads and writes standard `docker-compose.yml` files directly on your disk.
2. **Ultra Lightweight**: Unlike resource-heavy options like Portainer, Dockge is tailored strictly for Compose stacks and reacts instantly.
3. **Interactive Terminal**: An integrated terminal allows you to execute commands inside containers directly from your browser.

---

## Step 1: Prepare the Stacks Directory Structure

To allow Dockge to manage all your Docker projects systematically, we store all Docker Compose Stacks under a unified `/opt/stacks` directory:

```bash
# Create the stack root and Dockge directory
sudo mkdir -p /opt/stacks/dockge
```

---

## Step 2: Create the Isolated External Bridge Network npm_network

This network serves as the corridor for your reverse proxy ecosystem. All containers that need to be published to the web must join this network. This prevents exposing container ports directly to the public host interface, ensuring network isolation.

```bash
sudo docker network create npm_network
```

---

## Step 3: Deploy Dockge (Resolving the UFW Bypass Vulnerability)

:::warning
**Security Notice: Docker Bypasses UFW!**
By default, Docker port mappings (such as `- "5001:5001"`) manipulate `iptables` directly. This makes UFW rules (like `ufw deny`) ineffective; external scans can still discover and access the port.
To secure the system, we must bind the ports to `127.0.0.1` (localhost), allowing local access only, and then publish them to the internet using Cloudflare Tunnel or a reverse proxy.
:::

Navigate to the Dockge folder and create `docker-compose.yml`:

```bash
cd /opt/stacks/dockge
sudo nano docker-compose.yml
```

Paste the following configuration:

```yaml
version: '3.8'
services:
  dockge:
    image: louislam/dockge:1
    container_name: dockge
    restart: unless-stopped
    ports:
      # [Security Hardening] Bind to localhost only to prevent external port scanning
      - '127.0.0.1:5001:5001'
    volumes:
      # Mount the Docker socket so Dockge can interact with Docker daemon
      - /var/run/docker.sock:/var/run/docker.sock
      # Persist Dockge's internal data
      - ./data:/app/data
      # Mount the stacks directory so Dockge can manage all projects under /opt/stacks
      - /opt/stacks:/opt/stacks
    environment:
      # Tell Dockge where the stacks are located
      - DOCKGE_STACKS_DIR=/opt/stacks
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

Save and exit (`Ctrl + O`, then `Ctrl + X` in nano).

---

## Step 4: Run Dockge

Start Dockge in the background:

```bash
sudo docker compose up -d
```

Dockge is now running. Since its port is bound to `127.0.0.1:5001`, the public internet cannot access it via `http://VPS_IP:5001`. This acts as your first layer of defense.

_(If you need temporary access before setting up the domain reverse proxy, create an SSH Tunnel: `ssh -L 5001:127.0.0.1:5001 user@vps_ip` and open `http://localhost:5001` in your local browser.)_

---

## Step 5: Configure Nginx Proxy Manager & Optimize WebSockets

To access Dockge via a secure domain name, we add a proxy host in Nginx Proxy Manager (NPM) and fine-tune WebSocket settings.

### 1. Details Settings

In the NPM Admin Panel, click **Add Proxy Host** and fill in the following:

- **Domain Names**: `example.com` (Replace with your actual domain)
- **Scheme**: `http`
- **Forward Hostname / IP**: `dockge` (Since both NPM and Dockge are on the same `npm_network`, resolve via container name)
- **Forward Port**: `5001` (Dockge's default container port)
- Check **Block Common Exploits**
- Check **Websockets Support** (Crucial)

### 2. Advanced Settings (Preventing Terminal Timeout Disconnects)

Switch to the **Advanced** tab and paste the following custom Nginx configuration:

```nginx
# Handle WebSocket upgrades to keep terminal and real-time logs active
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Pass host and client IP headers for security auditing
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

# [Timeout Fix] Extend read and send timeouts to 24 hours (86400s)
# The default 60s timeout will drop idle terminal sessions automatically
proxy_read_timeout 86400s;
proxy_send_timeout 86400s;
```

Click **Save** to apply the configuration.

---

## Step 6: Security Verification

1. **UFW Firewalls**: Run `sudo ufw status` and verify that port `5001` is not allowed.
2. **WebSocket Terminal**: Log into your Dockge dashboard, open any Stack, and click **Terminal** or view the logs. Verify that the cursor blinks and accepts input, and does not disconnect even after sitting idle for over a minute.

In the next guide, we will deploy a comprehensive AI bookmarking system, KaraKeep (Hoarder), and manage it visually using Dockge.
