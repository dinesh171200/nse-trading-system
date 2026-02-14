#!/bin/bash

# NSE Real-time Trading System - Quick Deploy Script
# Usage: ./deploy.sh [local|production|stop|logs|restart]

set -e

PROJECT_DIR="/Users/dineshkumar/Desktop/stock/nse-realtime-trading-system"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Deploy local development
deploy_local() {
    print_header "Starting Local Development Environment"

    cd "$PROJECT_DIR"

    # Check if .env files exist
    if [ ! -f "backend/.env" ]; then
        print_warning "backend/.env not found, copying from .env.example"
        cp backend/.env.example backend/.env
    fi

    if [ ! -f "frontend/.env" ]; then
        print_warning "frontend/.env not found, copying from .env.example"
        cp frontend/.env.example frontend/.env
    fi

    # Start development with docker-compose.yml
    docker compose up -d

    print_success "Local development environment started"
    print_success "Frontend: http://localhost:3000"
    print_success "Backend API: http://localhost:5000"
    print_success "WebSocket: ws://localhost:5001"

    echo ""
    print_warning "To view logs, run: docker compose logs -f"
}

# Deploy production
deploy_production() {
    print_header "Starting Production Deployment"

    cd "$PROJECT_DIR"

    # Backup existing data
    if docker ps -a | grep -q nse-mongodb; then
        print_warning "Creating MongoDB backup..."
        BACKUP_DIR="./backups/mongodb-backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        docker exec nse-mongodb mongodump --out=/tmp/backup 2>/dev/null || true
        docker cp nse-mongodb:/tmp/backup "$BACKUP_DIR" 2>/dev/null || true
        print_success "Backup created at $BACKUP_DIR"
    fi

    # Build and start services
    print_warning "Building and starting services (this may take a few minutes)..."
    docker compose -f "$COMPOSE_FILE" up -d --build

    # Wait for services to be ready
    print_warning "Waiting for services to be ready..."
    sleep 10

    # Check service health
    print_warning "Checking service health..."

    if docker ps | grep -q nse-backend; then
        print_success "Backend is running"
    else
        print_error "Backend failed to start"
    fi

    if docker ps | grep -q nse-agents; then
        print_success "Agents are running"
    else
        print_error "Agents failed to start"
    fi

    if docker ps | grep -q nse-frontend; then
        print_success "Frontend is running"
    else
        print_error "Frontend failed to start"
    fi

    if docker ps | grep -q nse-mongodb; then
        print_success "MongoDB is running"
    else
        print_error "MongoDB failed to start"
    fi

    echo ""
    print_success "Production deployment completed!"
    print_success "Frontend: http://localhost"
    print_success "Backend API: http://localhost:5000"
    print_success "WebSocket: ws://localhost:5001"

    echo ""
    print_warning "To view logs, run: docker compose -f $COMPOSE_FILE logs -f"
}

# Stop services
stop_services() {
    print_header "Stopping Services"

    cd "$PROJECT_DIR"

    if [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" down
        print_success "Production services stopped"
    fi

    docker compose down 2>/dev/null || true
    print_success "All services stopped"
}

# View logs
view_logs() {
    print_header "Viewing Logs (Press Ctrl+C to exit)"

    cd "$PROJECT_DIR"

    if [ -f "$COMPOSE_FILE" ] && [ "$(docker compose -f "$COMPOSE_FILE" ps -q)" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f
    elif [ "$(docker compose ps -q)" ]; then
        docker compose logs -f
    else
        print_error "No services are running"
        exit 1
    fi
}

# Restart services
restart_services() {
    print_header "Restarting Services"

    cd "$PROJECT_DIR"

    if [ -f "$COMPOSE_FILE" ] && [ "$(docker compose -f "$COMPOSE_FILE" ps -q)" ]; then
        docker compose -f "$COMPOSE_FILE" restart
        print_success "Production services restarted"
    elif [ "$(docker compose ps -q)" ]; then
        docker compose restart
        print_success "Development services restarted"
    else
        print_error "No services are running"
        exit 1
    fi
}

# Main script
main() {
    check_docker

    case "${1:-production}" in
        local|dev)
            deploy_local
            ;;
        production|prod)
            deploy_production
            ;;
        stop)
            stop_services
            ;;
        logs)
            view_logs
            ;;
        restart)
            restart_services
            ;;
        *)
            echo "Usage: $0 {local|production|stop|logs|restart}"
            echo ""
            echo "Commands:"
            echo "  local       - Start local development environment"
            echo "  production  - Deploy production with optimization (default)"
            echo "  stop        - Stop all services"
            echo "  logs        - View service logs"
            echo "  restart     - Restart all services"
            exit 1
            ;;
    esac
}

main "$@"
