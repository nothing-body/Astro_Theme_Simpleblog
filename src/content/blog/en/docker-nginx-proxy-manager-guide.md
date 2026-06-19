---
title: 'Complete Guide: Docker & Nginx Proxy Manager Setup on a VPS'
pubDate: 2026-05-01
description: 'Step-by-step guide to installing Docker with log size limits and deploying Nginx Proxy Manager for easy reverse proxy and SSL certificate management.'
category: 'Software'
tags: ['Docker', 'Nginx', 'Reverse Proxy']
---

Running services on a VPS and tired of typing `IP:port` to access them? **Reverse proxying** maps those ports to clean domain names — and **Nginx Proxy Manager (NPM)** makes it ridiculously easy, with a graphical interface and automatic SSL certificate handling.

This guide covers the full setup from scratch:

1. Installing Docker with log size limits
2. Deploying Nginx Proxy Manager
3. Configuring reverse proxy hosts and SSL
4. Enabling access login restrictions (Access List)

---

## Prerequisites

- A VPS running **Debian 11/12** or Ubuntu 20.04+ (**CentOS is not recommended**)
- A domain name with an A record pointing to your VPS IP
- Root or sudo access

---

## Step 1: Install Docker

### 1-1 Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh
```

This example uses Docker's official convenience script. For stricter supply-chain control, use your distribution packages or Docker's official APT repository, and inspect the script before running it.

Verify the installation and enable auto-start on boot:

```bash
docker -v
systemctl enable docker
systemctl start docker
```

### 1-2 Critical: Configure Docker Log Size Limits

> **Do not skip this step. Docker logs can silently fill up your entire disk over time.**

By default, Docker container logs grow indefinitely. The configuration below limits each log file to 20MB with a maximum of 3 rotated files. It also enables IPv6 support for containers:

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

Apply the configuration by restarting Docker:

```bash
systemctl restart docker
```

**Configuration Explained:**

| Setting                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `log-driver: json-file` | Stores logs in JSON format (Docker default) |
| `max-size: 20m`         | Max size per log file: 20MB                 |
| `max-file: 3`           | Keep at most 3 rotated log files            |
| `ipv6: true`            | Enable IPv6 networking for containers       |

---

## Step 2: Install Nginx Proxy Manager

### 2-1 Create the Installation Directory

```bash
mkdir -p /root/data/docker_data/npm
cd /root/data/docker_data/npm
```

### 2-2 Create the docker-compose.yml File

```bash
vim docker-compose.yml
```

Press `i` to enter insert mode and paste the following:

```yaml
version: '3'
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80' # HTTP - keep this as-is
      - '127.0.0.1:81:81' # NPM Admin UI - only accessible locally
      - '443:443' # HTTPS - keep this as-is
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

For production, replace `latest` with a fixed version tag that you have tested, so rebuilding the container does not silently pull an unverified release.

Press `Esc`, then type `:wq` and hit Enter to save and exit.

### 2-3 Check That Port 81 Is Available

```bash
lsof -i:81
```

If there is no output, port 81 is free. If it's in use, change the left-side port in `docker-compose.yml` (e.g., `8181:81`) and open the new port in your firewall.

### 2-4 Start the Container

```bash
docker compose up -d
```

### 2-5 Verify the Container is Running

```bash
docker ps
```

You should see the `jc21/nginx-proxy-manager` container with a status of `Up`.

---

## Step 3: First Login to NPM

Open your browser and navigate to:

```
http://your-server-ip:81
```

Log in with the default credentials:

```
Email:    admin@example.com
Password: changeme
```

> **Change your email and password immediately after logging in.**

NPM will prompt you to update your account information on first login. Set a strong password.

---

## Step 4: Add a Reverse Proxy Host

This is the core feature of NPM. The following example shows how to proxy `app.example.com` to a service running on local port `8080`.

### 4-1 Configure DNS

In your DNS provider (e.g., Cloudflare), add an A record:

```
app.example.com  →  Your VPS IP
```

### 4-2 Add a Proxy Host in NPM

1. In the NPM dashboard, click **Proxy Hosts** → **Add Proxy Host**
2. Fill in the **Details** tab:
   - **Domain Names**: `app.example.com`
   - **Scheme**: `http` (use `https` if the backend service requires it)
   - **Forward Hostname / IP**: `127.0.0.1` (for services on the same VPS)
   - **Forward Port**: `8080` (the actual port your service listens on)
   - Check **Block Common Exploits**

3. Switch to the **SSL** tab:
   - Select **Request a new SSL Certificate**
   - Check **Force SSL**
   - Check **HTTP/2 Support**
   - Enter your email address (for Let's Encrypt renewal notifications)
   - Accept the Terms of Service

4. Click **Save**

NPM will automatically request a free SSL certificate from Let's Encrypt. Once complete, your service is accessible via HTTPS.

---

## Step 5: Enable Access Login Restrictions (Access List)

If you want certain services to be password-protected before visitors can access them, NPM's **Access Lists** feature provides HTTP Basic Authentication.

### 5-1 Create an Access List

1. In the NPM dashboard, click **Access Lists** → **Add Access List**
2. Enter a name (e.g., `Private Access`)
3. Switch to the **Authorization** tab:
   - Click **Add** to create a username/password pair
   - Fill in the credentials
4. Switch to the **Access** tab:
   - Optionally restrict or allow specific IP ranges
   - Leave default settings to require authentication from all IPs
5. Click **Save**

### 5-2 Apply the Access List to a Proxy Host

1. Go to **Proxy Hosts** and find the host you want to protect
2. Click the edit icon (pencil)
3. In the **Details** tab, select your newly created `Private Access` from the **Access List** dropdown
4. Click **Save**

Visitors will now see a browser login prompt before accessing that domain.

> **Note**: Some NPM versions may require a container restart for Access List changes to take effect. If the prompt doesn't appear after saving, try running `docker restart <container_name>` or re-saving the proxy host in the NPM interface.

---

## Updating Nginx Proxy Manager

```bash
cd /root/data/docker_data/npm

# Backup existing data first
cp -r /root/data/docker_data/npm /root/data/docker_data/npm.backup

# Pull the latest image and restart
docker compose pull
docker compose up -d

# Remove unused old images
docker image prune
```

Type `y` when prompted to confirm image pruning.

---

## Uninstalling Nginx Proxy Manager

```bash
cd /root/data/docker_data/npm
docker compose down

# Move it aside first; delete manually only after verifying the backup
mv /root/data/docker_data/npm /root/data/docker_data/npm.removed.$(date +%F-%H%M%S)
```

---

## Troubleshooting

**502 Bad Gateway after setting up a proxy host?**  
Verify the Forward Hostname/IP and port are correct, and that the target service is actually running (`docker ps` or `curl http://127.0.0.1:8080`).

**SSL certificate request failed?**  
Make sure the DNS A record has propagated to your VPS IP (`ping app.example.com`), and that ports 80 and 443 are open in both your VPS provider's firewall and any local firewall (e.g., `ufw`).

**Forgot the NPM admin password?**  
Use the **Forgot Password** link on the NPM login page to reset via email.

**Not sure what your VPS IP is?**

```bash
curl ip.sb
```

---

## Summary

The Docker + Nginx Proxy Manager stack gives you:

- ✅ Clean domain-based access to any service (instead of `IP:port`)
- ✅ Automatic Let's Encrypt SSL certificate issuance and renewal
- ✅ A graphical interface to manage all reverse proxy rules
- ✅ HTTP Basic Auth protection for sensitive services
- ✅ Docker log rotation to prevent disk from filling up
