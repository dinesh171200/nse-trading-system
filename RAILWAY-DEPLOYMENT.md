# 🚂 Railway.app Deployment Guide - NSE Trading System

Complete guide to deploy on Railway.app (FREE - No Credit Card Required)

---

## ✨ **Why Railway.app?**

- ✅ **$5 free credit monthly** (enough for this app)
- ✅ **No credit card required** (just GitHub account)
- ✅ Supports Docker, Node.js, MongoDB
- ✅ Automatic SSL certificates
- ✅ Easy deployment from GitHub or CLI
- ✅ Free custom domains

---

## 📋 **Prerequisites**

1. ✅ **GitHub Account** (required for Railway login)
2. ✅ **Railway CLI** (already installed)
3. ⏳ **MongoDB Atlas** (free - we'll set this up)

---

## 🚀 **Deployment Steps**

### **Method 1: Via Railway Dashboard (Easiest - 10 minutes)**

This is the simplest method - everything through the web interface!

#### **Step 1: Create Railway Account**

1. Go to https://railway.app
2. Click **Login with GitHub**
3. Authorize Railway to access your GitHub
4. You'll get **$5 free credit monthly** 🎉

#### **Step 2: Set Up MongoDB Atlas (5 minutes)**

1. **Create Account:**
   - Go to https://www.mongodb.com/cloud/atlas/register
   - Sign up (no credit card needed)

2. **Create Free Cluster:**
   - Choose **AWS**
   - Region: **Singapore (ap-southeast-1)**
   - Tier: **M0 Sandbox (FREE)**
   - Name: `nse-trading`
   - Click **Create Deployment**

3. **Security Setup:**
   - **Username:** `nseadmin`
   - **Password:** (generate and SAVE it!)
   - Click **Create Database User**

4. **Network Access:**
   - Click **Add IP Address**
   - Choose **Allow Access from Anywhere** (0.0.0.0/0)
   - Click **Confirm**

5. **Get Connection String:**
   - Click **Connect** → **Drivers** → **Node.js**
   - Copy connection string:
     ```
     mongodb+srv://nseadmin:<password>@nse-trading.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - **SAVE THIS STRING!**

#### **Step 3: Push Code to GitHub**

1. **Create a new GitHub repository:**
   ```bash
   cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system

   # Initialize git (if not already)
   git init
   git add .
   git commit -m "Initial commit - NSE Trading System"

   # Create repo on GitHub: https://github.com/new
   # Name it: nse-trading-system

   # Add remote and push
   git remote add origin https://github.com/YOUR_USERNAME/nse-trading-system.git
   git branch -M main
   git push -u origin main
   ```

#### **Step 4: Deploy Backend on Railway**

1. **Go to Railway Dashboard:** https://railway.app/dashboard

2. **Create New Project:**
   - Click **New Project**
   - Select **Deploy from GitHub repo**
   - Choose your `nse-trading-system` repository
   - Railway will detect it's a monorepo

3. **Configure Backend Service:**
   - Railway will ask about the root directory
   - Set **Root Directory:** `backend`
   - Or manually add service: **New Service** → **GitHub Repo** → Select repo → Root: `backend`

4. **Add Environment Variables:**
   - Click on the backend service
   - Go to **Variables** tab
   - Add these variables:

   ```env
   PORT=8080
   NODE_ENV=production
   MONGODB_URI=<your-mongodb-atlas-connection-string>
   WS_PORT=5001
   NSE_BASE_URL=https://www.nseindia.com
   MARKET_OPEN_HOUR=9
   MARKET_OPEN_MINUTE=15
   MARKET_CLOSE_HOUR=15
   MARKET_CLOSE_MINUTE=30
   DATA_AGENT_INTERVAL=60000
   MIN_CONFIDENCE=50
   ```

5. **Generate Domain:**
   - Go to **Settings** → **Networking**
   - Click **Generate Domain**
   - Copy the URL (e.g., `nse-backend.railway.app`)

6. **Deploy:**
   - Click **Deploy**
   - Wait for deployment (2-3 minutes)

#### **Step 5: Deploy Frontend on Railway**

1. **Add Another Service:**
   - In the same project, click **New Service**
   - Select **GitHub Repo** → Your repo
   - Set **Root Directory:** `frontend`

2. **Add Build Args (Environment Variables):**
   - Click on frontend service → **Variables**
   - Add:

   ```env
   REACT_APP_API_URL=https://nse-backend.railway.app
   REACT_APP_WS_URL=wss://nse-backend.railway.app
   ```

   ⚠️ **Replace** `nse-backend.railway.app` with your actual backend URL from Step 4!

3. **Generate Domain:**
   - Go to **Settings** → **Networking**
   - Click **Generate Domain**
   - Copy the URL (e.g., `nse-frontend.railway.app`)

4. **Deploy:**
   - Click **Deploy**
   - Wait 3-5 minutes for build

#### **Step 6: Access Your App! 🎉**

Your app is now live!

- **Frontend:** https://nse-frontend.railway.app
- **Backend:** https://nse-backend.railway.app

---

### **Method 2: Via Railway CLI (Alternative)**

If you prefer command line:

```bash
cd /Users/dineshkumar/Desktop/stock/nse-realtime-trading-system

# Login to Railway (opens browser)
railway login

# Deploy Backend
cd backend
railway init
# Choose: "Create new project" → Name it "nse-trading-backend"
railway up
# Add variables in Railway dashboard
railway open

# Deploy Frontend
cd ../frontend
railway init
# Choose: "Create new project" → Name it "nse-trading-frontend"
railway up
# Add variables in Railway dashboard
railway open
```

---

## 📊 **Railway Free Tier Limits**

- **$5 credit monthly** (renews every month)
- Typically covers:
  - ✅ 2 small apps (backend + frontend)
  - ✅ ~500 hours of runtime
  - ✅ Reasonable traffic for small apps
- If you exceed, Railway will notify you (app pauses until next month)

---

## 🔧 **Managing Your App**

### **View Logs:**
```bash
# In backend directory
railway logs

# Or in Railway dashboard → Service → Logs
```

### **Update Environment Variables:**
1. Go to Railway dashboard
2. Click service → **Variables**
3. Add/Edit variables
4. Service auto-redeploys

### **Redeploy After Code Changes:**
```bash
# Just push to GitHub
git add .
git commit -m "Update"
git push

# Railway auto-deploys from GitHub!
```

### **Manual Deploy via CLI:**
```bash
cd backend  # or frontend
railway up
```

---

## ❌ **Troubleshooting**

### **Backend won't start:**
- Check logs in Railway dashboard
- Verify `MONGODB_URI` is set correctly
- Verify MongoDB Atlas network access allows 0.0.0.0/0

### **Frontend can't connect to backend:**
- Check `REACT_APP_API_URL` points to correct backend URL
- Ensure backend is deployed and running
- Try: `curl https://your-backend.railway.app/api/health`

### **"Out of credit" error:**
- Railway pauses services when free credit ($5) runs out
- Upgrade to paid plan ($5/month) or wait for next month's credit

### **Build fails:**
- Check build logs in Railway dashboard
- Verify Dockerfile exists and is correct
- Check Node.js version compatibility

---

## 💰 **Cost Monitoring**

**View your usage:**
1. Railway Dashboard → **Usage**
2. See credits used and remaining
3. Set up alerts for low credit

**Typical usage for this app:**
- Backend: ~$2-3/month
- Frontend: ~$1-2/month
- **Total: ~$3-5/month** (within free tier!)

---

## 🌐 **Custom Domain (Optional)**

Add your own domain:

1. Railway Dashboard → Service → **Settings** → **Networking**
2. Click **Custom Domain**
3. Add your domain (e.g., `trading.yourdomain.com`)
4. Add DNS records (Railway provides instructions)
5. SSL certificate auto-generated!

---

## 🗑️ **Delete Deployment**

To remove everything:

1. Railway Dashboard
2. Click project → **Settings** → **Danger Zone**
3. Click **Delete Project**

---

## ✅ **Deployment Checklist**

- [ ] Railway account created (with GitHub)
- [ ] MongoDB Atlas cluster created (M0 Free)
- [ ] MongoDB connection string copied
- [ ] Code pushed to GitHub repository
- [ ] Backend service created on Railway
- [ ] Backend environment variables set
- [ ] Backend domain generated
- [ ] Frontend service created on Railway
- [ ] Frontend environment variables set (with backend URL)
- [ ] Frontend domain generated
- [ ] App accessible in browser
- [ ] Logs checked for errors

---

## 📞 **Support**

- **Railway Docs:** https://docs.railway.app/
- **Railway Discord:** https://discord.gg/railway
- **MongoDB Atlas:** https://support.mongodb.com/

---

## 🎉 **That's It!**

Your NSE Trading System is now live on Railway.app!

**Free hosting** with:
- ✅ Automatic deployments from GitHub
- ✅ Free SSL certificates
- ✅ Custom domains
- ✅ Easy scaling

**Enjoy your live trading system! 📈🚀**
