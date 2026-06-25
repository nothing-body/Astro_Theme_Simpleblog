---
title: 'Exposing Services Securely: Cloudflare Tunnels & NPM Reverse Proxy Integration'
pubDate: 2026-05-21
description: 'Build the ultimate self-hosting architecture. Expose your applications with Cloudflare Tunnels to keep all inbound ports closed, route traffic through Nginx Proxy Manager, and leverage edge CDN and WAF protection.'
category: 'Network & Security'
categoryPath: ['Network & Security', 'CDN']
tags: ['CDN', 'Network Services']
---

In traditional self-hosting setups, publishing services to the internet requires port forwarding on your router or opening ports `80` and `443` on your VPS. This exposes your public IP address to automated bot scans, DDoS attacks, and Nginx exploits.

**Cloudflare Tunnels** offer a modern, highly secure alternative. They allow you to safely route traffic from the internet to your internal services **without opening any inbound ports on your VPS** (not even 80 or 443) and **without exposing your VPS public IP**. Additionally, you get Cloudflare's global CDN acceleration, managed SSL, and Web Application Firewall (WAF) protections for free.

This guide covers building a dual-layer defense system combining Cloudflare Tunnels and Nginx Proxy Manager (NPM).

---

## Architectural Design: The Dual-Layer Defense

The request lifecycle operates as follows:

1. **User Request**: The user visits `example.com`.
2. **Cloudflare Edge Defense**: The request hits Cloudflare edge servers, performing CDN caching, WAF inspection, and Bot Fight Mode analysis.
3. **Encrypted Tunnel**: Traffic passes through an outbound, encrypted tunnel to the `cloudflare-tunnel` container on your VPS.
4. **Central Routing (Nginx Proxy Manager)**: The tunnel routes traffic internally to the NPM container (listening on container port `80`).
5. **Proxy Dispatched**: NPM checks the HTTP Host header and forwards the request to the correct container (e.g. `dockge:5001` or `karakeep-web:3000`), applying the WebSocket parameters configured in NPM.

---

## Step 1: Deploy the Cloudflare Tunnel Container

First, log into the [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/):

1. Navigate to **Networks** → **Tunnels** → Click **Create a Tunnel**.
2. Select **Cloudflared** and name the tunnel (e.g., `Debian-VPS-Tunnel`).
3. Under environments, choose **Docker**. Copy the unique **Token** string found inside the generated command (after `tunnel --no-autoupdate run`).

Now, on your VPS, set up the project folder:

```bash
sudo mkdir -p /opt/stacks/cloudflare-tunnel
cd /opt/stacks/cloudflare-tunnel
```

Create a `.env` file to store the token securely instead of hardcoding it:

```bash
sudo nano .env
```

Paste your token into the file:

```ini
CLOUDFLARE_TUNNEL_TOKEN=YOUR_CLOUDFLARE_TUNNEL_TOKEN_HERE
```

Create the `docker-compose.yml` file:

```bash
sudo nano docker-compose.yml
```

Paste the following configurations:

```yaml
version: '3.8'
services:
  cloudflare-tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: unless-stopped
    environment:
      # Load the tunnel authorization token from .env
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    # Execute run command and disable container self-updates
    command: tunnel --no-autoupdate run
    networks:
      - npm_network

networks:
  npm_network:
    external: true
```

For production, replace `cloudflare/cloudflared:latest` with a fixed version tag that you have tested, and keep a rollback path for updates.

Start the Tunnel container:

```bash
sudo docker compose up -d
```

Return to your Cloudflare Zero Trust console. The tunnel status should change to a green **HEALTHY** badge, indicating the connection is successful.

---

## Step 2: The Gatekeeper Rule — Public Hostname Configurations

To ensure traffic is handled correctly, all subdomains (e.g. `npm`, `dockge`, `karakeep`) must go through NPM for security filtering and WebSocket header handling. **Every subdomain configured in Cloudflare Zero Trust Tunnels must point to NPM's internal container port 80**:

### Routing Configurations (Cloudflare Zero Trust Dashboard)

| Public Hostname | Type | URL (Internal Target)    | Description                                                                      |
| :-------------- | :--- | :----------------------- | :------------------------------------------------------------------------------- |
| `example.com`   | HTTP | `nginx-proxy-manager:80` | Lands on NPM port 80, then NPM proxies it internally to its dashboard on port 81 |
| `example.com`   | HTTP | `nginx-proxy-manager:80` | Lands on NPM port 80, then NPM proxies it to `dockge:5001`                       |
| `example.com`   | HTTP | `nginx-proxy-manager:80` | Lands on NPM port 80, then NPM proxies it to `karakeep-web:3000`                 |

:::warning
**Core Routing Logic**:
Do not point `dockge.example.com` directly to `dockge:5001` or `npm.example.com` to `nginx-proxy-manager:81` in Cloudflare's settings.
If you bypass NPM's port 80, traffic will bypass NPM's processing (such as the custom WebSocket upgrade headers and protection filters we defined in NPM), causing a `502 Bad Gateway` error or persistent terminal disconnects in Dockge.
:::

---

## Step 3: Hardening Nginx Proxy Manager Configurations

Since all incoming traffic is now routed through the encrypted tunnel directly inside the Docker bridge network (`npm_network`) to `nginx-proxy-manager:80`, **your VPS does not need to expose ports 80 and 443 to the public internet anymore!**

Modify the NPM `docker-compose.yml` to reflect this change. You can update its `ports` mapping to:

```yaml
ports:
  # Expose only the admin panel to localhost for secure configuration
  - '127.0.0.1:81:81'
```

This closes public access to all HTTP/HTTPS reverse proxy entrypoints on the host, enhancing VPS security.

### NPM Self-Proxying Config (Admin UI Access)

To access the NPM admin dashboard securely at `https://example.com` without exposing port 81/35481 publicly:

1. Log into your NPM admin dashboard. Click **Add Proxy Host**.
2. **Details tab**:
   - **Domain Names**: `example.com`
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `127.0.0.1` (Points to NPM container localhost)
   - **Forward Port**: `81` (NPM native admin port)
   - Check **Block Common Exploits** and **Websockets Support**
3. **Advanced tab** (Paste the WebSocket and headers block):
   ```nginx
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   proxy_set_header Host $host;
   proxy_set_header X-Real-IP $remote_addr;
   proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
   proxy_set_header X-Forwarded-Proto $scheme;
   ```
4. Click **Save**. Now, you can securely access the dashboard over HTTPS via your subdomain and close any SSH tunnels.

---

## Step 4: Configure Cloudflare CDN & WAF Protections

Now that traffic is proxied through Cloudflare, enable edge-level security on the Cloudflare Dashboard:

1. **Enable Bot Fight Mode**:
   - Go to **Security** → **WAF** → **Tools** → Toggle **Super Bot Fight Mode** (or **Bot Fight Mode**). This blocks automated scanning engines, preventing scanner traffic from reaching your VPS.
2. **Ensure WebSockets are ON**:
   - Go to **Network** → Ensure **WebSockets** is toggled ON (Otherwise, Dockge's terminal and KaraKeep syncing will fail).
3. **SSL/TLS Encryption Mode**:
   - Since Cloudflare Tunnel encrypts traffic end-to-end between your server and Cloudflare Edge, you don't need Let's Encrypt certificates on the VPS. Set your Cloudflare SSL/TLS encryption mode to **Flexible** or **Full**.

---

## 🛡️ Host Security Checklist

After deployment, check your VPS security posture:

- **UFW Firewall Check**:
  Run `sudo ufw status`. Verify that besides your SSH port, ports `5001` (Dockge), `3000` (KaraKeep), `81` (NPM Admin), and `80/443` are NOT allowed. Try visiting `http://VPS_IP:5001` from an external network; it must timeout.
- **Cloudflare Tunnel Routing**:
  Visit your subdomains (e.g. `https://example.com`) and verify that they load correctly with secure HTTPS locks.
- **WebSocket Stability**:
  Check if the Dockge terminal runs smoothly and remains active without disconnection timeouts.
