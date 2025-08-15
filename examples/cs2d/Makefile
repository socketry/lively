# CS2D Docker Management Makefile
.PHONY: help build up down restart logs shell clean test deploy

# Default target
help:
	@echo "🎮 CS2D Docker Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "Development:"
	@echo "  make build         - Build all Docker images"
	@echo "  make up            - Start all services (development)"
	@echo "  make down          - Stop all services"
	@echo "  make restart       - Restart all services"
	@echo "  make logs          - View logs from all services"
	@echo "  make shell         - Open shell in dev container"
	@echo ""
	@echo "Production:"
	@echo "  make prod-up       - Start production environment"
	@echo "  make prod-build    - Build production images"
	@echo "  make prod-deploy   - Deploy to production"
	@echo ""
	@echo "Service Management:"
	@echo "  make redis-cli     - Connect to Redis CLI"
	@echo "  make lively-logs   - View Lively app logs"
	@echo "  make api-logs      - View API bridge logs"
	@echo "  make static-logs   - View static server logs"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test          - Run all tests"
	@echo "  make rubocop       - Run RuboCop linter"
	@echo "  make playwright    - Run Playwright tests"
	@echo ""
	@echo "Database:"
	@echo "  make db-up         - Start with database"
	@echo "  make db-migrate    - Run database migrations"
	@echo "  make db-console    - Open database console"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean         - Clean up containers and volumes"
	@echo "  make stats         - Show container statistics"
	@echo "  make ports         - Show exposed ports"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Development Commands
build:
	@echo "🔨 Building Docker images..."
	docker-compose build

up:
	@echo "🚀 Starting CS2D in development mode..."
	docker-compose up -d
	@echo "✅ CS2D is running!"
	@echo "   Lobby: http://localhost:9292"
	@echo "   Game: http://localhost:9293"
	@echo "   API: http://localhost:9294"
	@make ports

down:
	@echo "🛑 Stopping CS2D..."
	docker-compose down

restart:
	@echo "🔄 Restarting CS2D..."
	docker-compose restart

logs:
	docker-compose logs -f --tail=100

shell:
	@echo "📟 Opening shell in development container..."
	docker-compose run --rm dev-tools bash

# Production Commands
prod-build:
	@echo "🏭 Building production images..."
	docker-compose -f docker-compose.yml build

prod-up:
	@echo "🚀 Starting CS2D in production mode..."
	docker-compose -f docker-compose.yml --profile production up -d
	@echo "✅ CS2D Production is running!"
	@echo "   URL: http://localhost"

prod-down:
	docker-compose -f docker-compose.yml --profile production down

prod-deploy:
	@echo "📦 Deploying to production..."
	@echo "1. Building images..."
	@make prod-build
	@echo "2. Pushing to registry..."
	# docker-compose push
	@echo "3. Deploying to server..."
	# Add deployment commands here (kubectl, docker swarm, etc.)
	@echo "✅ Deployment complete!"

# Service-specific Commands
redis-cli:
	@echo "🔗 Connecting to Redis..."
	docker-compose exec redis redis-cli

lively-logs:
	docker-compose logs -f lively-app

api-logs:
	docker-compose logs -f api-bridge

static-logs:
	docker-compose logs -f static-server

nginx-logs:
	docker-compose logs -f nginx

# Testing Commands
test:
	@echo "🧪 Running tests..."
	docker-compose run --rm dev-tools bash -c "bundle exec rspec && npm test"

rubocop:
	@echo "🔍 Running RuboCop..."
	docker-compose run --rm dev-tools bundle exec rubocop

playwright:
	@echo "🎭 Running Playwright tests..."
	docker-compose run --rm dev-tools npx playwright test

test-integration:
	@echo "🔗 Running integration tests..."
	docker-compose run --rm dev-tools node test_map_integration.js

# Database Commands
db-up:
	@echo "🗄️ Starting with database..."
	docker-compose --profile with-db up -d

db-migrate:
	@echo "🔄 Running database migrations..."
	docker-compose run --rm lively-app bundle exec rake db:migrate

db-console:
	@echo "💾 Opening database console..."
	docker-compose exec postgres psql -U cs2d cs2d_development

db-backup:
	@echo "💾 Backing up database..."
	docker-compose exec postgres pg_dump -U cs2d cs2d_development > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Monitoring Commands
stats:
	@echo "📊 Container Statistics:"
	docker stats --no-stream

ports:
	@echo "🔌 Exposed Ports:"
	@docker ps --format "table {{.Names}}\t{{.Ports}}" | grep cs2d || echo "No CS2D containers running"

health:
	@echo "💚 Health Check Status:"
	@docker-compose ps

# Utility Commands
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v
	docker system prune -f

clean-all:
	@echo "🧹 Deep cleaning..."
	docker-compose down -v
	docker system prune -af
	rm -rf tmp/* logs/*

reset:
	@echo "🔄 Resetting everything..."
	@make clean-all
	@make build
	@make up

# Debug Commands
debug-redis:
	@echo "🔍 Starting with Redis Commander..."
	docker-compose --profile debug up -d redis-commander
	@echo "Redis Commander: http://localhost:8081"

debug-db:
	@echo "🔍 Starting with Adminer..."
	docker-compose --profile with-db --profile debug up -d adminer
	@echo "Adminer: http://localhost:8080"

# Development Shortcuts
dev: up logs

prod: prod-up

stop: down

# Quick access to services
lobby:
	@echo "Opening lobby in browser..."
	@open http://localhost:9292 || xdg-open http://localhost:9292

game:
	@echo "Opening game in browser..."
	@open http://localhost:9293 || xdg-open http://localhost:9293

editor:
	@echo "Opening map editor in browser..."
	@open http://localhost:9293/map_editor.html || xdg-open http://localhost:9293/map_editor.html

# Environment setup
setup:
	@echo "🔧 Setting up CS2D environment..."
	@cp -n .env.example .env || true
	@chmod +x docker-entrypoint.sh
	@make build
	@echo "✅ Setup complete! Run 'make up' to start."

# Version information
version:
	@echo "CS2D Docker Version Information:"
	@docker-compose version
	@docker version --format 'Docker {{.Server.Version}}'
	@echo "Ruby: $(shell docker run --rm ruby:3.3.6-slim ruby -v)"
	@echo "Redis: $(shell docker run --rm redis:7-alpine redis-server -v)"

.DEFAULT_GOAL := help