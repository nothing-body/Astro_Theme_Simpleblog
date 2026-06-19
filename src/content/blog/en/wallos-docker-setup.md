---
title: 'Setting Up Wallos Personal Subscription Tracker with Docker on Debian'
pubDate: 2026-05-10
description: 'Learn how to quickly and securely deploy the Wallos personal subscription tracker on a fresh Debian VPS using Docker and Docker Compose.'
category: 'Software'
tags: ['Docker', 'Linux']
---

In the current era of subscription-based services, it's easy to lose track of how many services you're subscribed to (like Netflix, Spotify, cloud storage, etc.), and which services are about to expire and need to be renewed. **Wallos** is an open-source personal subscription tracking and management platform that helps you centralize and monitor all your subscription expenses.

## Why Use Docker for Deployment?

Deploying via Docker ensures environmental isolation. Not only does it keep your host system clean, but it also makes future backups and upgrades incredibly simple.

## Step 1: System Update & Basic Protection

On a fresh Debian system, the first thing we must do is ensure our system packages are up to date. This patches known security vulnerabilities. Connect to your VPS via SSH and run:

```bash
# Update package lists and upgrade the system
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Docker & Docker Compose

To ensure we install the latest and most secure version of Docker, we use the official installation script provided by Docker:

```bash
# Install required tools
sudo apt install curl -y

# Download and execute the official Docker installation script
curl -fsSL https://get.docker.com -o get-docker.sh
less get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Optional: Add the current user to the docker group
sudo usermod -aG docker $USER
```

For stricter supply-chain control, use Debian packages or Docker's official APT repository instead. If you use the convenience script, inspect it before execution.

_(Note: If you modify the user group, you'll need to re-login to SSH for the changes to take effect.)_

## Step 3: Create the Wallos Project Directory

To make management and backups easier, we'll create a dedicated directory for Wallos:

```bash
# Create project directory
mkdir -p ~/wallos
cd ~/wallos
```

## Step 4: Write the docker-compose.yml File

Inside the `wallos` directory, we'll create our `docker-compose.yml` file.

```bash
# Create the file using the nano editor
nano docker-compose.yml
```

Paste the following content into the file:

```yaml
version: '3.8'

services:
  wallos:
    container_name: wallos
    image: bellamy/wallos:latest
    ports:
      # For security reasons, we bind to localhost instead of exposing it publicly
      # We map external port 8282 to the container's port 80
      - '127.0.0.1:8282:80/tcp'
    environment:
      # Change the timezone to your local region
      TZ: 'America/Toronto'
    volumes:
      # Data persistence ensures no data is lost upon container restart or update
      - './db:/var/www/html/db'
      - './logos:/var/www/html/images/uploads/logos'
    restart: unless-stopped
```

For production, replace `latest` with a fixed version tag that you have tested, and back up `./db` and `./logos` before upgrades.

**Security Warning:** In the configuration above, we bind the port to `127.0.0.1:8282`. Since Wallos handles your private subscription and financial data, exposing it directly to the public internet makes it a target for brute-force attacks. We highly recommend using a **Reverse Proxy (like Nginx)** with **HTTPS/SSL certificates** (e.g., Let's Encrypt), or accessing it securely via an SSH Tunnel.

## Step 5: Start Wallos

Once you've verified the `docker-compose.yml` configuration, you can start the container:

```bash
# Start the container in detached mode
docker compose up -d
```

Upon startup, Docker will automatically pull the image and create the necessary directories (`db` and `logos`).

## Step 6: Access & Initialization

If you have set up your reverse proxy or SSH tunnel, you can now access Wallos in your browser through your configured secure domain or via local port forwarding.

On your first visit, the system will prompt you to create an administrator account. Please be sure to set a **strong password** to protect your financial privacy.

## Conclusion

By following these steps, we've securely deployed Wallos within a clean Debian environment.
Remember to regularly back up the `~/wallos/db` and `~/wallos/logos` directories.
