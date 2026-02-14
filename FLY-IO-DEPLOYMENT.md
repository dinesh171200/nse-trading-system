# 🚀 Fly.io Deployment Guide - NSE Trading System

Complete guide to deploy your NSE Real-time Trading System on Fly.io (FREE tier).

---

## 📋 Prerequisites

1. **Fly.io Account** (Free)
   - Sign up at https://fly.io/
   - Credit card required for verification (won't be charged on free tier)

2. **MongoDB Atlas Account** (Free)
   - Sign up at https://www.mongodb.com/cloud/atlas/register
   - No credit card required for free tier

3. **Flyctl CLI** (Already installed ✓)

---

## 🎯 Quick Deployment (Automated)

### **One-Command Deployment:**
```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system
./deploy-flyio.sh
```

The script will:
1. Login to Fly.io
2. Prompt for MongoDB Atlas connection string
3. Deploy backend to Fly.io
4. Deploy frontend to Fly.io
5. Provide URLs for your live application

---

## 📝 Manual Step-by-Step Deployment

### **Step 1: Set Up MongoDB Atlas (5 minutes)**

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up with email or Google

2. **Create Free Cluster:**
   - Choose **AWS** provider
   - Select **Singapore (ap-southeast-1)** region (closest to India)
   - Choose **M0 Sandbox** (FREE forever)
   - Cluster name: `nse-trading`
   - Click **Create Cluster**

3. **Create Database User:**
   - Go to **Database Access** → **Add New Database User**
   - Username: `nseadmin`
   - Password: Generate secure password (save it!)
   - Database User Privileges: **Read and write to any database**
   - Click **Add User**

4. **Configure Network Access:**
   - Go to **Network Access** → **Add IP Address**
   - Click **Allow Access from Anywhere** (0.0.0.0/0)
   - Click **Confirm**

5. **Get Connection String:**
   - Go to **Database** → Click **Connect** on your cluster
   - Choose **Connect your application**
   - Copy connection string:
     ```
     mongodb+srv://nseadmin:<password>@nse-trading.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Save this string for later!

---

### **Step 2: Login to Fly.io**

```bash
export PATH="/Users/dineshkumar/.fly/bin:$PATH"
flyctl auth login
```

This will open a browser for authentication.

---

### **Step 3: Deploy Backend**

```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system/backend

# Create app (first time only)
flyctl apps create nse-trading-backend --region sin

# Set MongoDB connection string (replace with your actual string)
flyctl secrets set MONGODB_URI="mongodb+srv://nseadmin:YOUR_PASSWORD@nse-trading.xxxxx.mongodb.net/nse_trading?retryWrites=true&w=majority" -a nse-trading-backend

# Deploy
flyctl deploy
```

**Note:** Singapore region (sin) is closest to India for better NSE data fetching.

---

### **Step 4: Get Backend URL**

```bash
flyctl info -a nse-trading-backend
```

Copy the **Hostname** (e.g., `nse-trading-backend.fly.dev`)

---

### **Step 5: Update Frontend Configuration**

```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system/frontend

# Edit fly.toml and replace with your actual backend URL
nano fly.toml

# Change these lines:
#   REACT_APP_API_URL = "https://YOUR-BACKEND-URL.fly.dev"
#   REACT_APP_WS_URL = "wss://YOUR-BACKEND-URL.fly.dev"
```

---

### **Step 6: Deploy Frontend**

```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system/frontend

# Create app (first time only)
flyctl apps create nse-trading-frontend --region sin

# Deploy
flyctl deploy
```

---

### **Step 7: Access Your Application**

```bash
# Get frontend URL
flyctl info -a nse-trading-frontend

# Open in browser
flyctl open -a nse-trading-frontend
```

Your app will be available at: `https://nse-trading-frontend.fly.dev`

---

## 🔍 Monitoring & Management

### **View Logs:**
```bash
# Backend logs (real-time)
flyctl logs -a nse-trading-backend

# Frontend logs (real-time)
flyctl logs -a nse-trading-frontend
```

### **Check Status:**
```bash
flyctl status -a nse-trading-backend
flyctl status -a nse-trading-frontend
```

### **SSH into Container:**
```bash
flyctl ssh console -a nse-trading-backend
```

### **Scale Resources:**
```bash
# Scale backend memory
flyctl scale memory 1024 -a nse-trading-backend

# Scale to multiple instances
flyctl scale count 2 -a nse-trading-backend
```

### **View Dashboard:**
- Backend: https://fly.io/apps/nse-trading-backend
- Frontend: https://fly.io/apps/nse-trading-frontend

---

## 💰 Fly.io Free Tier Limits

**Free Tier Includes:**
- ✅ 3 shared-cpu VMs (256MB RAM each)
- ✅ 3GB persistent storage
- ✅ 160GB outbound data transfer per month
- ✅ Free SSL certificates
- ✅ Free subdomains (*.fly.dev)

**Your Setup Uses:**
- Backend: 1 VM (512MB RAM)
- Frontend: 1 VM (256MB RAM)
- **Total: 2 VMs** ✓ Within free tier

**Note:** Free tier requires credit card for verification but won't be charged unless you exceed limits.

---

## 🔧 Troubleshooting

### **Backend Not Starting:**
```bash
# Check logs
flyctl logs -a nse-trading-backend

# Common issues:
# 1. MongoDB connection string incorrect
#    → Verify connection string in secrets
#    → Check MongoDB Atlas network access (allow 0.0.0.0/0)

# 2. Port issues
#    → Backend should listen on PORT env variable (8080)
```

### **Frontend Can't Connect to Backend:**
```bash
# Verify backend URL in frontend fly.toml
cat frontend/fly.toml | grep REACT_APP

# Should show:
#   REACT_APP_API_URL = "https://nse-trading-backend.fly.dev"
#   REACT_APP_WS_URL = "wss://nse-trading-backend.fly.dev"

# If wrong, update and redeploy:
flyctl deploy -a nse-trading-frontend
```

### **MongoDB Connection Failed:**
```bash
# Test MongoDB connection from backend
flyctl ssh console -a nse-trading-backend
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(e => console.error(e))"

# If fails:
# 1. Check MongoDB Atlas → Network Access → Allow 0.0.0.0/0
# 2. Check Database Access → User has correct password
# 3. Verify connection string in Fly.io secrets
```

### **App Sleeping (Free Tier):**
Fly.io may stop apps after inactivity. They auto-start on next request.
```bash
# Wake up app
curl https://nse-trading-backend.fly.dev/api/health
```

### **Update Secrets:**
```bash
# Update MongoDB URI
flyctl secrets set MONGODB_URI="new-connection-string" -a nse-trading-backend

# View secrets (values hidden)
flyctl secrets list -a nse-trading-backend
```

---

## 🔄 Updating Your Application

### **After Code Changes:**
```bash
# Backend
cd backend
flyctl deploy -a nse-trading-backend

# Frontend
cd frontend
flyctl deploy -a nse-trading-frontend
```

### **Rollback to Previous Version:**
```bash
# List releases
flyctl releases -a nse-trading-backend

# Rollback
flyctl releases rollback -a nse-trading-backend
```

---

## 🌐 Custom Domain (Optional)

### **Add Your Own Domain:**
```bash
# Add certificate
flyctl certs add yourdomain.com -a nse-trading-frontend

# Add DNS records (from your domain registrar):
# A record: @ → [Fly.io IP from cert command]
# AAAA record: @ → [Fly.io IPv6 from cert command]

# Verify
flyctl certs check yourdomain.com -a nse-trading-frontend
```

---

## 📊 Performance Tips

1. **Use Singapore region** (closest to India for NSE data)
2. **Enable MongoDB Atlas connection pooling**
3. **Monitor with Fly.io dashboard**
4. **Scale up if needed** (may exceed free tier)

---

## 🗑️ Cleanup / Uninstall

### **Delete Apps:**
```bash
# Stop and delete apps
flyctl apps destroy nse-trading-backend
flyctl apps destroy nse-trading-frontend

# Delete MongoDB Atlas cluster
# → Go to Atlas dashboard → Clusters → Delete
```

---

## 📞 Support

- **Fly.io Docs**: https://fly.io/docs/
- **Fly.io Community**: https://community.fly.io/
- **MongoDB Atlas Support**: https://support.mongodb.com/

---

## ✅ Deployment Checklist

- [ ] MongoDB Atlas cluster created (M0 Free tier)
- [ ] Database user created with password
- [ ] Network access configured (0.0.0.0/0)
- [ ] Connection string copied
- [ ] Flyctl installed and authenticated
- [ ] Backend deployed to Fly.io
- [ ] MongoDB URI secret set in backend
- [ ] Frontend fly.toml updated with backend URL
- [ ] Frontend deployed to Fly.io
- [ ] Application accessible via browser
- [ ] Logs checked for errors

---

**🎉 Your NSE Trading System is now live on Fly.io! 🚀**

Access at: `https://nse-trading-frontend.fly.dev`
