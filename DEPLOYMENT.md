# NSE Real-time Trading System - Deployment Guide

This guide provides comprehensive instructions for deploying the NSE Real-time Trading System.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Production Deployment with Docker](#production-deployment-with-docker)
4. [VPS Deployment (AWS, DigitalOcean, etc.)](#vps-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Node.js** (v18+) - for local development
- **MongoDB** (v6.0+) - included in Docker setup
- **Git** - for version control

### System Requirements
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB minimum (SSD recommended)
- **Network**: Stable internet connection for NSE data fetching

---

## Local Development

### 1. Clone the Repository
```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

**Frontend (.env):**
```bash
cd ../frontend
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Local MongoDB
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# OR install MongoDB locally
brew install mongodb-community@6.0  # macOS
# sudo apt install mongodb           # Ubuntu/Debian
```

### 5. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 - Agents:**
```bash
cd backend
npm run agents
# Agents running (Data, Chart, Signal)
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start
# Frontend running on http://localhost:3000
```

### 6. Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **WebSocket:** ws://localhost:5001

---

## Production Deployment with Docker

### Option 1: Using Docker Compose (Recommended)

#### 1. Build and Start All Services
```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system

# Build and start all services
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 2. Check Service Status
```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f agents
docker-compose -f docker-compose.prod.yml logs -f frontend
```

#### 3. Stop Services
```bash
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (WARNING: Deletes all data)
docker-compose -f docker-compose.prod.yml down -v
```

### Option 2: Manual Docker Build

#### Build Images
```bash
# Backend
cd backend
docker build -t nse-backend:latest .

# Frontend
cd ../frontend
docker build -f Dockerfile.prod -t nse-frontend:latest \
  --build-arg REACT_APP_API_URL=http://YOUR_SERVER_IP:5000 \
  --build-arg REACT_APP_WS_URL=ws://YOUR_SERVER_IP:5001 \
  .
```

#### Run Containers
```bash
# Create network
docker network create nse-network

# MongoDB
docker run -d \
  --name nse-mongodb \
  --network nse-network \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:6.0

# Backend
docker run -d \
  --name nse-backend \
  --network nse-network \
  -p 5000:5000 \
  -p 5001:5001 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://nse-mongodb:27017/nse_trading \
  nse-backend:latest

# Agents
docker run -d \
  --name nse-agents \
  --network nse-network \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://nse-mongodb:27017/nse_trading \
  nse-backend:latest \
  node agents/agent-manager.js

# Frontend
docker run -d \
  --name nse-frontend \
  --network nse-network \
  -p 80:80 \
  nse-frontend:latest
```

---

## VPS Deployment (AWS, DigitalOcean, Linode, etc.)

### 1. Provision a VPS
- **Minimum Specs:** 2 vCPUs, 4GB RAM, 20GB SSD
- **OS:** Ubuntu 22.04 LTS (recommended)

### 2. Initial Server Setup

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Create deployment user
sudo useradd -m -s /bin/bash nsetrading
sudo usermod -aG docker nsetrading
sudo su - nsetrading
```

### 3. Deploy Application

```bash
# Clone repository
cd ~
git clone YOUR_REPO_URL nse-trading-system
cd nse-trading-system

# Configure environment for production
# Edit docker-compose.prod.yml to use your server IP
nano docker-compose.prod.yml

# Update REACT_APP_API_URL and REACT_APP_WS_URL
# Change from localhost to your server's public IP or domain

# Start services
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS, and application ports
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (Frontend)
sudo ufw allow 443/tcp     # HTTPS (if using SSL)
sudo ufw allow 5000/tcp    # Backend API
sudo ufw allow 5001/tcp    # WebSocket
sudo ufw enable
sudo ufw status
```

### 5. Setup Domain (Optional)

```bash
# Point your domain's A record to your server IP
# Example: trading.yourdomain.com → YOUR_SERVER_IP

# Install nginx for reverse proxy
sudo apt install nginx -y

# Create nginx configuration
sudo nano /etc/nginx/sites-available/nse-trading
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name trading.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nse-trading /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL with Let's Encrypt (Optional)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d trading.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

---

## Environment Configuration

### Production Environment Variables

**For VPS/Cloud Deployment**, update these in `docker-compose.prod.yml`:

```yaml
# Replace localhost with your server IP or domain
args:
  - REACT_APP_API_URL=http://YOUR_SERVER_IP:5000
  - REACT_APP_WS_URL=ws://YOUR_SERVER_IP:5001

# Or if using domain with nginx:
args:
  - REACT_APP_API_URL=https://trading.yourdomain.com/api
  - REACT_APP_WS_URL=wss://trading.yourdomain.com
```

### Market Timing Configuration

```env
# IST Market Hours (9:15 AM - 3:30 PM)
MARKET_OPEN_HOUR=9
MARKET_OPEN_MINUTE=15
MARKET_CLOSE_HOUR=15
MARKET_CLOSE_MINUTE=30

# Adjust for your timezone if needed
```

---

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f agents

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail=100
```

### Check Resource Usage
```bash
# Container stats
docker stats

# Disk usage
docker system df

# Detailed container info
docker inspect nse-backend
```

### Database Backup
```bash
# Backup MongoDB
docker exec nse-mongodb mongodump --out=/tmp/backup
docker cp nse-mongodb:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore MongoDB
docker cp ./mongodb-backup-20240115 nse-mongodb:/tmp/backup
docker exec nse-mongodb mongorestore /tmp/backup
```

### Update Application
```bash
# Pull latest code
cd ~/nse-trading-system
git pull

# Rebuild and restart services
docker compose -f docker-compose.prod.yml up -d --build

# Or rebuild specific service
docker compose -f docker-compose.prod.yml up -d --build frontend
```

### Cleanup
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Full cleanup (WARNING: Removes all unused resources)
docker system prune -a --volumes
```

---

## Troubleshooting

### Services Won't Start

**1. Check if ports are already in use:**
```bash
sudo lsof -i :5000
sudo lsof -i :5001
sudo lsof -i :80
sudo lsof -i :27017

# Kill process if needed
sudo kill -9 PID
```

**2. Check Docker logs:**
```bash
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Check MongoDB logs
docker logs nse-mongodb

# Restart MongoDB
docker restart nse-mongodb
```

### Frontend Can't Connect to Backend

**1. Check backend is running:**
```bash
curl http://localhost:5000/api/health
```

**2. Verify environment variables:**
```bash
# Check frontend build args
docker inspect nse-frontend | grep REACT_APP
```

**3. Check CORS configuration in backend**

### NSE Data Not Fetching

**1. Check agents are running:**
```bash
docker logs nse-agents
```

**2. Test manual data fetch:**
```bash
docker exec nse-backend node scripts/test-data-agent.js
```

**3. Verify NSE website is accessible:**
```bash
curl -I https://www.nseindia.com
```

### High CPU/Memory Usage

**1. Check resource limits:**
```bash
docker stats
```

**2. Reduce indicator calculation frequency:**
Edit `backend/.env`:
```env
DATA_AGENT_INTERVAL=120000  # Increase from 60s to 120s
```

**3. Limit historical data:**
```env
HISTORICAL_DAYS=3  # Reduce from 5 to 3 days
```

---

## Quick Reference Commands

```bash
# Start production deployment
docker compose -f docker-compose.prod.yml up -d --build

# Stop all services
docker compose -f docker-compose.prod.yml down

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend

# View logs (follow mode)
docker compose -f docker-compose.prod.yml logs -f

# Check service status
docker compose -f docker-compose.prod.yml ps

# Access container shell
docker exec -it nse-backend sh

# Rebuild single service
docker compose -f docker-compose.prod.yml up -d --build frontend

# Remove everything (including data)
docker compose -f docker-compose.prod.yml down -v
```

---

## Support

For issues and questions:
- Check logs: `docker compose -f docker-compose.prod.yml logs`
- Review NSE data availability during market hours (9:15 AM - 3:30 PM IST)
- Ensure all environment variables are properly configured
- Verify network connectivity and firewall settings

---

## Security Recommendations

1. **Change default MongoDB credentials** if deploying to production
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** with Let's Encrypt certificates
4. **Configure firewall** to restrict unnecessary ports
5. **Regular backups** of MongoDB data
6. **Keep Docker images updated** regularly
7. **Monitor logs** for suspicious activity
8. **Rate limit** API endpoints if exposing publicly

---

**Last Updated:** 2024-02-15
**Version:** 1.0.0
