# Quick Start Deployment Guide

## 🚀 Deploy in 3 Steps

### Step 1: Ensure Docker is Installed
```bash
docker --version
docker compose version
```

If not installed:
- **macOS**: Download from https://www.docker.com/products/docker-desktop
- **Ubuntu/Debian**: `curl -fsSL https://get.docker.com | sh`

### Step 2: Deploy the Application

**Option A: Using Quick Deploy Script (Recommended)**
```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system

# Deploy production
./deploy.sh production

# Or deploy local development
./deploy.sh local
```

**Option B: Using Docker Compose Directly**
```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system

# Production deployment
docker compose -f docker-compose.prod.yml up -d --build

# Local development deployment
docker compose up -d
```

### Step 3: Access the Application

**Production:**
- 🌐 Frontend: http://localhost (port 80)
- 🔌 Backend API: http://localhost:5000
- 📡 WebSocket: ws://localhost:5001

**Local Development:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:5000
- 📡 WebSocket: ws://localhost:5001

---

## 📋 Quick Commands

```bash
# View logs
./deploy.sh logs
# OR
docker compose -f docker-compose.prod.yml logs -f

# Stop services
./deploy.sh stop
# OR
docker compose -f docker-compose.prod.yml down

# Restart services
./deploy.sh restart
# OR
docker compose -f docker-compose.prod.yml restart

# Check status
docker compose -f docker-compose.prod.yml ps

# View resource usage
docker stats
```

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :80

# Kill the process or change ports in docker-compose.prod.yml
```

### Services Won't Start
```bash
# View detailed logs
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Frontend Can't Connect to Backend
```bash
# Check backend is running
curl http://localhost:5000/api/health

# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

---

## 🌍 Deploy to VPS/Cloud

### 1. SSH to your server
```bash
ssh user@YOUR_SERVER_IP
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 3. Clone and deploy
```bash
git clone YOUR_REPO_URL nse-trading
cd nse-trading

# IMPORTANT: Update IP addresses in docker-compose.prod.yml
nano docker-compose.prod.yml

# Change these lines:
#   - REACT_APP_API_URL=http://YOUR_SERVER_IP:5000
#   - REACT_APP_WS_URL=ws://YOUR_SERVER_IP:5001

# Deploy
docker compose -f docker-compose.prod.yml up -d --build
```

### 4. Configure Firewall
```bash
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 5000/tcp # Backend API
sudo ufw allow 5001/tcp # WebSocket
sudo ufw enable
```

---

## 📚 Full Documentation

For detailed instructions, see:
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[CLAUDE.md](./CLAUDE.md)** - Project architecture and development guide

---

## ⚠️ Important Notes

1. **Market Hours**: System runs during NSE market hours (9:15 AM - 3:30 PM IST)
2. **MongoDB Data**: Stored in Docker volume `mongodb_data`
3. **Backup**: Run `./deploy.sh production` - it automatically creates backups
4. **Resource**: Minimum 4GB RAM, 2 CPUs recommended
5. **Network**: Requires stable internet for NSE data fetching

---

## 📞 Support

- Check logs: `./deploy.sh logs`
- View status: `docker compose -f docker-compose.prod.yml ps`
- Restart: `./deploy.sh restart`

**Ready to trade! 📈**
