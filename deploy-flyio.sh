#!/bin/bash

# NSE Trading System - Fly.io Deployment Script
# This script deploys the application to Fly.io

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_DIR="/Users/dineshkumar/Desktop/stock/nse-realtime-trading-system"
FLYCTL_PATH="/Users/dineshkumar/.fly/bin/flyctl"

print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if flyctl is installed
if [ ! -f "$FLYCTL_PATH" ]; then
    print_error "Flyctl not found. Please install it first."
    exit 1
fi

# Add flyctl to PATH
export PATH="/Users/dineshkumar/.fly/bin:$PATH"

print_header "NSE Trading System - Fly.io Deployment"

# Step 1: Login to Fly.io
print_warning "Step 1: Login to Fly.io"
echo "Opening browser for authentication..."
flyctl auth login || {
    print_error "Failed to login to Fly.io"
    exit 1
}
print_success "Logged in to Fly.io"

# Step 2: Check MongoDB Atlas
print_warning "Step 2: MongoDB Setup"
echo ""
echo "Before deploying, make sure you have:"
echo "1. Created a FREE MongoDB Atlas account at https://www.mongodb.com/cloud/atlas/register"
echo "2. Created a free cluster (M0 Free tier)"
echo "3. Got your connection string"
echo ""
read -p "Do you have MongoDB Atlas connection string? (y/n): " has_mongodb

if [ "$has_mongodb" != "y" ]; then
    print_warning "Please set up MongoDB Atlas first:"
    echo "1. Go to https://www.mongodb.com/cloud/atlas/register"
    echo "2. Sign up (free)"
    echo "3. Create a free cluster (M0)"
    echo "4. Click 'Connect' → 'Connect your application'"
    echo "5. Copy the connection string"
    echo ""
    read -p "Enter your MongoDB Atlas connection string: " mongodb_uri
else
    read -p "Enter your MongoDB Atlas connection string: " mongodb_uri
fi

# Step 3: Deploy Backend
print_header "Step 3: Deploying Backend"
cd "$PROJECT_DIR/backend"

# Check if app exists
if flyctl apps list | grep -q "nse-trading-backend"; then
    print_warning "Backend app exists, updating..."
    flyctl deploy
else
    print_warning "Creating new backend app..."
    flyctl apps create nse-trading-backend --region sin || true

    # Set MongoDB secret
    flyctl secrets set MONGODB_URI="$mongodb_uri" -a nse-trading-backend

    # Deploy
    flyctl deploy
fi

print_success "Backend deployed successfully!"
BACKEND_URL=$(flyctl info -a nse-trading-backend | grep "Hostname" | awk '{print $3}')
print_success "Backend URL: https://$BACKEND_URL"

# Step 4: Deploy Frontend
print_header "Step 4: Deploying Frontend"
cd "$PROJECT_DIR/frontend"

# Update fly.toml with actual backend URL
sed -i '' "s|REACT_APP_API_URL = \".*\"|REACT_APP_API_URL = \"https://$BACKEND_URL\"|g" fly.toml
sed -i '' "s|REACT_APP_WS_URL = \".*\"|REACT_APP_WS_URL = \"wss://$BACKEND_URL\"|g" fly.toml

# Check if app exists
if flyctl apps list | grep -q "nse-trading-frontend"; then
    print_warning "Frontend app exists, updating..."
    flyctl deploy
else
    print_warning "Creating new frontend app..."
    flyctl apps create nse-trading-frontend --region sin || true
    flyctl deploy
fi

print_success "Frontend deployed successfully!"
FRONTEND_URL=$(flyctl info -a nse-trading-frontend | grep "Hostname" | awk '{print $3}')

# Summary
print_header "Deployment Complete! 🎉"
echo ""
print_success "Your NSE Trading System is now live!"
echo ""
echo "📊 Frontend: https://$FRONTEND_URL"
echo "🔌 Backend:  https://$BACKEND_URL"
echo ""
echo "Useful commands:"
echo "  flyctl logs -a nse-trading-backend    # View backend logs"
echo "  flyctl logs -a nse-trading-frontend   # View frontend logs"
echo "  flyctl status -a nse-trading-backend  # Check backend status"
echo "  flyctl status -a nse-trading-frontend # Check frontend status"
echo "  flyctl ssh console -a nse-trading-backend  # SSH into backend"
echo ""
print_warning "Note: First deployment may take 5-10 minutes to start"
print_warning "MongoDB Atlas: Make sure to whitelist 0.0.0.0/0 in Network Access"
