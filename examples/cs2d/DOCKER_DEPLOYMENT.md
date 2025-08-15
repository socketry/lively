# 🐳 CS2D Docker Deployment Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Development Setup](#development-setup)
5. [Production Deployment](#production-deployment)
6. [Service Configuration](#service-configuration)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [Performance Tuning](#performance-tuning)

## 🎯 Overview

CS2D has been fully containerized using Docker Compose, providing a scalable, reproducible deployment solution with separate containers for each service component.

### **Container Architecture**
```
┌─────────────────────────────────────────────────────┐
│                   Nginx (Port 80/443)                │
│                   [Reverse Proxy]                    │
└────────────┬───────────────┬───────────────┬────────┘
             │               │               │
     ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
     │ Lively App   │ │Static Server│ │ API Bridge │
     │  Port 9292   │ │ Port 9293  │ │ Port 9294  │
     └───────┬──────┘ └────────────┘ └─────┬──────┘
             │                              │
             └──────────┬───────────────────┘
                        │
                 ┌──────▼──────┐
                 │    Redis     │
                 │  Port 6379   │
                 └──────────────┘
```

### **Services**
- **redis**: Data persistence and pub/sub messaging
- **lively-app**: Main lobby application (Ruby/Lively)
- **static-server**: Game HTML/JS hosting (WebRick)
- **api-bridge**: REST API for static-Redis communication
- **nginx**: Reverse proxy and load balancer (production)
- **dev-tools**: Development utilities container

## 🚀 Quick Start

### **Prerequisites**
```bash
# Required software
- Docker Engine 20.10+
- Docker Compose 2.0+
- Make (optional but recommended)
- 4GB+ RAM available
- 10GB+ disk space
```

### **One-Command Start**
```bash
# Using Make
make setup && make up

# Or using Docker Compose directly
cp .env.example .env
docker-compose up -d
```

### **Access Points**
- **Lobby**: http://localhost:9292
- **Game**: http://localhost:9293
- **API**: http://localhost:9294
- **Redis Commander**: http://localhost:8081 (debug profile)

## 💻 Development Setup

### **1. Initial Setup**
```bash
# Clone repository
git clone <repository-url>
cd cs2d

# Setup environment
make setup

# Or manually:
cp .env.example .env
chmod +x docker-entrypoint.sh
docker-compose build
```

### **2. Start Development Environment**
```bash
# Start all services with hot reload
make up

# View logs
make logs

# Or for specific service
make lively-logs
make api-logs
```

### **3. Development Workflow**

#### **Hot Reload**
All Ruby files are mounted as volumes, changes reflect immediately:
```yaml
volumes:
  - .:/app  # Full project mounted
  - bundle-cache:/usr/local/bundle  # Gem cache
```

#### **Debugging**
```bash
# Open shell in development container
make shell

# Or directly:
docker-compose run --rm dev-tools bash

# Inside container:
bundle exec rubocop  # Run linter
bundle exec rspec    # Run tests
```

#### **Database Access** (if using with-db profile)
```bash
# Start with database
make db-up

# Run migrations
make db-migrate

# Access database console
make db-console
```

### **4. Testing**
```bash
# Run all tests
make test

# Run Playwright tests
make playwright

# Run integration tests
make test-integration

# Linting
make rubocop
```

## 🏭 Production Deployment

### **1. Environment Configuration**
```bash
# Create production .env file
cp .env.example .env.production

# Edit configuration
vim .env.production
```

**Key Production Settings:**
```env
RACK_ENV=production
LIVELY_ENV=production
NODE_ENV=production
SECRET_KEY_BASE=<generate-secure-key>
REDIS_URL=redis://redis:6379/0
```

### **2. Build Production Images**
```bash
# Build optimized images
make prod-build

# Or manually:
docker-compose -f docker-compose.yml build
```

### **3. Deploy with Nginx**
```bash
# Start production stack
docker-compose --profile production up -d

# Verify health
docker-compose ps
make health
```

### **4. SSL Configuration**
Edit `nginx.conf` to enable SSL:
```nginx
server {
    listen 443 ssl http2;
    server_name cs2d.example.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

Mount certificates:
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
```

### **5. Container Registry**
```bash
# Tag images
docker tag cs2d-lively:latest registry.example.com/cs2d/lively:v1.0.0
docker tag cs2d-static:latest registry.example.com/cs2d/static:v1.0.0
docker tag cs2d-api:latest registry.example.com/cs2d/api:v1.0.0

# Push to registry
docker push registry.example.com/cs2d/lively:v1.0.0
docker push registry.example.com/cs2d/static:v1.0.0
docker push registry.example.com/cs2d/api:v1.0.0
```

## ⚙️ Service Configuration

### **Redis Configuration**
```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb
  volumes:
    - redis-data:/data  # Persistent storage
```

### **Lively Application**
```yaml
lively-app:
  environment:
    - REDIS_URL=redis://redis:6379/0
    - WORKER_PROCESSES=4  # Adjust based on CPU cores
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9292/"]
```

### **Static Server**
```yaml
static-server:
  volumes:
    - ./public:/app/public:ro  # Read-only for security
    - ./cstrike:/app/cstrike:ro  # Game assets
```

### **API Bridge**
```yaml
api-bridge:
  depends_on:
    redis:
      condition: service_healthy  # Wait for Redis
```

## 📊 Monitoring & Maintenance

### **Health Checks**
```bash
# Check all services
make health

# Manual health checks
curl http://localhost:9292/         # Lively
curl http://localhost:9293/map_editor.html  # Static
curl http://localhost:9294/api/maps # API
```

### **Logs Management**
```bash
# View all logs
docker-compose logs -f

# Export logs
docker-compose logs > cs2d_logs_$(date +%Y%m%d).txt

# Log rotation (add to docker-compose.yml)
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### **Resource Monitoring**
```bash
# Real-time stats
docker stats

# Or using Make
make stats
```

### **Backup & Restore**

#### **Redis Backup**
```bash
# Backup Redis data
docker-compose exec redis redis-cli BGSAVE
docker cp cs2d-redis:/data/dump.rdb ./backups/redis_$(date +%Y%m%d).rdb

# Restore Redis data
docker cp ./backups/redis_backup.rdb cs2d-redis:/data/dump.rdb
docker-compose restart redis
```

#### **Full Backup**
```bash
# Backup volumes
docker run --rm -v cs2d_redis-data:/data -v $(pwd):/backup alpine tar czf /backup/redis-backup.tar.gz /data

# Backup configuration
tar czf config-backup.tar.gz .env docker-compose.yml nginx.conf
```

## 🔧 Troubleshooting

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Find process using port
lsof -i :9292

# Change port in docker-compose.yml
ports:
  - "9293:9292"  # Map to different host port
```

#### **2. Redis Connection Failed**
```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis

# Check Redis logs
docker-compose logs redis
```

#### **3. Container Won't Start**
```bash
# Check logs
docker-compose logs <service-name>

# Rebuild image
docker-compose build --no-cache <service-name>

# Remove and recreate
docker-compose rm -f <service-name>
docker-compose up -d <service-name>
```

#### **4. Performance Issues**
```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
```

### **Debug Commands**
```bash
# Enter container shell
docker-compose exec lively-app bash

# Check Ruby version
docker-compose exec lively-app ruby -v

# Test Redis connection
docker-compose exec lively-app redis-cli -h redis ping

# Network debugging
docker network inspect cs2d_cs2d-network
```

## 🔒 Security Considerations

### **1. Environment Variables**
- Never commit `.env` files
- Use Docker secrets for sensitive data
- Rotate SECRET_KEY_BASE regularly

### **2. Network Security**
```yaml
networks:
  cs2d-network:
    internal: true  # Isolate from external access
```

### **3. Read-Only Volumes**
```yaml
volumes:
  - ./public:/app/public:ro  # Prevent container writes
```

### **4. User Permissions**
```dockerfile
# Run as non-root user
RUN useradd -m -u 1000 cs2d
USER cs2d
```

### **5. Image Scanning**
```bash
# Scan for vulnerabilities
docker scan cs2d-lively:latest
```

## ⚡ Performance Tuning

### **1. Docker Performance**
```bash
# Prune unused resources
docker system prune -a

# Optimize build cache
DOCKER_BUILDKIT=1 docker-compose build
```

### **2. Ruby Optimization**
```bash
# Set in docker-entrypoint.sh
export RUBY_GC_HEAP_GROWTH_FACTOR=1.1
export RUBY_GC_HEAP_INIT_SLOTS=600000
```

### **3. Redis Optimization**
```redis
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
```

### **4. Nginx Caching**
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

## 📦 Deployment Scenarios

### **Docker Swarm**
```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml cs2d
```

### **Kubernetes**
```bash
# Convert to Kubernetes manifests
kompose convert -f docker-compose.yml

# Deploy to cluster
kubectl apply -f cs2d-deployment.yaml
```

### **AWS ECS**
```bash
# Convert to ECS task definition
ecs-cli compose --file docker-compose.yml up
```

## 🔄 Continuous Deployment

### **GitHub Actions Example**
```yaml
name: Deploy CS2D
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and push
        run: |
          docker-compose build
          docker-compose push
      - name: Deploy to server
        run: |
          ssh server@host "cd /app && docker-compose pull && docker-compose up -d"
```

## 📝 Maintenance Commands

```bash
# Update all images
docker-compose pull

# Restart with new images
docker-compose up -d --force-recreate

# Clean everything
make clean-all

# Full reset
make reset
```

## 🎮 Quick Access URLs

After deployment, access your CS2D instance at:

- **Development**:
  - Lobby: http://localhost:9292
  - Game: http://localhost:9293
  - Map Editor: http://localhost:9293/map_editor.html
  - API: http://localhost:9294/api/maps

- **Production** (with Nginx):
  - Main URL: http://your-domain.com
  - Game: http://your-domain.com/game
  - API: http://your-domain.com/api

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Ruby Docker Best Practices](https://docs.docker.com/language/ruby/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

---

*Last Updated: August 15, 2025*  
*CS2D Docker Deployment - Production Ready* 🚀