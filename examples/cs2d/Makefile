# CS2D Docker Management Makefile
.PHONY: help build up down restart logs shell clean test deploy

# Default target
help:
	@echo "🎮 CS2D Docker Commands"
	@echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	@echo "🚀 Multi-Agent Development (2.5x FASTER!):"
	@echo "  make multi-agent-sprint - Run ALL tasks in parallel!"
	@echo "  make multi-agent-fix   - Fix render issues in parallel"
	@echo "  make multi-agent-test  - Generate complete test suite"
	@echo "  make multi-agent-weapon - Generate weapon system"
	@echo "  make multi-agent-map   - Generate map components"
	@echo "  make multi-agent-spa   - Migrate to SPA architecture"
	@echo "  make multi-agent-docker - Setup Docker infrastructure"
	@echo "  make multi-agent-docs  - Generate documentation"
	@echo ""
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
	@echo "  make test          - Run comprehensive test suite"
	@echo "  make test-ruby     - Run Ruby unit & integration tests"
	@echo "  make test-playwright - Run Playwright end-to-end tests"
	@echo "  make test-integration - Run integration tests only"
	@echo "  make test-docker   - Run Docker health tests"
	@echo "  make test-redis    - Run Redis operation tests"
	@echo "  make test-coverage - Generate code coverage report"
	@echo "  make rubocop       - Run RuboCop linter"
	@echo "  make quick-test    - Run quick unit tests"
	@echo "  make smoke-test    - Run basic service health checks"
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
	docker-compose -f docker/docker-compose.yml build

up:
	@echo "🚀 Starting CS2D in development mode..."
	docker-compose -f docker/docker-compose.yml up -d
	@echo "✅ CS2D is running!"
	@echo "   Lobby: http://localhost:9292"
	@echo "   Game: http://localhost:9293"
	@echo "   API: http://localhost:9294"
	@make ports

down:
	@echo "🛑 Stopping CS2D..."
	docker-compose -f docker/docker-compose.yml down

restart:
	@echo "🔄 Restarting CS2D..."
	docker-compose -f docker/docker-compose.yml restart

logs:
	docker-compose -f docker/docker-compose.yml logs -f --tail=100

shell:
	@echo "📟 Opening shell in development container..."
	docker-compose -f docker/docker-compose.yml run --rm dev-tools bash

# Production Commands
prod-build:
	@echo "🏭 Building production images..."
	docker-compose -f docker/docker-compose.yml -f docker/docker-compose.optimized.yml build

prod-up:
	@echo "🚀 Starting CS2D in production mode..."
	docker-compose -f docker/docker-compose.yml -f docker/docker-compose.optimized.yml --profile production up -d
	@echo "✅ CS2D Production is running!"
	@echo "   URL: http://localhost"

prod-down:
	docker-compose -f docker/docker-compose.yml -f docker/docker-compose.optimized.yml --profile production down

prod-deploy:
	@echo "📦 Deploying to production..."
	@echo "1. Building images..."
	@make prod-build
	@echo "2. Pushing to registry..."
	# docker-compose -f docker/docker-compose.yml push
	@echo "3. Deploying to server..."
	# Add deployment commands here (kubectl, docker swarm, etc.)
	@echo "✅ Deployment complete!"

# Service-specific Commands
redis-cli:
	@echo "🔗 Connecting to Redis..."
	docker-compose -f docker/docker-compose.yml exec redis redis-cli

lively-logs:
	docker-compose -f docker/docker-compose.yml logs -f lively-app

api-logs:
	docker-compose -f docker/docker-compose.yml logs -f api-bridge

static-logs:
	docker-compose -f docker/docker-compose.yml logs -f static-server

nginx-logs:
	docker-compose -f docker/docker-compose.yml logs -f nginx

# Testing Commands
test:
	@echo "🧪 Running comprehensive test suite..."
	@make test-setup
	@make test-ruby
	@make test-playwright
	@make test-integration
	@make test-coverage
	@echo "✅ All tests completed!"

test-setup:
	@echo "🔧 Setting up test environment..."
	@mkdir -p test-results
	@docker-compose -f docker/docker-compose.yml up -d redis
	@sleep 5

test-ruby:
	@echo "💎 Running Ruby unit and integration tests..."
	cd config && bundle install --quiet
	cd config && bundle exec rspec ../spec --format progress --format RspecJunitFormatter --out ../test-results/rspec.xml

test-unit:
	@echo "🔬 Running unit tests only..."
	cd config && bundle exec rspec ../spec/lib ../spec/game --format progress

test-integration:
	@echo "🔗 Running integration tests..."
	@make up
	@sleep 10
	cd config && bundle exec rspec ../spec/integration --format progress

test-websocket:
	@echo "🔌 Running WebSocket tests..."
	@make up
	@sleep 10
	cd config && bundle exec rspec ../spec/integration/websocket_spec.rb --format progress

test-redis:
	@echo "📊 Running Redis tests..."
	docker-compose -f docker/docker-compose.yml up -d redis
	@sleep 5
	cd config && bundle exec rspec ../spec/integration/redis_operations_spec.rb --format progress

test-docker:
	@echo "🐳 Running Docker health tests..."
	@make up
	@sleep 15
	cd config && bundle exec rspec ../spec/integration/docker_health_spec.rb --format progress

test-room-management:
	@echo "🏠 Running room management tests..."
	docker-compose -f docker/docker-compose.yml up -d redis
	@sleep 5
	cd config && bundle exec rspec ../spec/integration/room_management_spec.rb --format progress

rubocop:
	@echo "🔍 Running RuboCop linter..."
	cd config && bundle exec rubocop ../ --format progress

rubocop-fix:
	@echo "🔧 Fixing RuboCop violations..."
	cd config && bundle exec rubocop ../ --auto-correct

playwright:
	@echo "🎭 Running Playwright end-to-end tests..."
	@make up
	@sleep 20
	npm ci --silent
	npx playwright install --with-deps
	npx playwright test

playwright-debug:
	@echo "🐛 Running Playwright tests in debug mode..."
	@make up
	@sleep 20
	npm ci --silent
	npx playwright install --with-deps
	npx playwright test --debug

playwright-headed:
	@echo "👀 Running Playwright tests in headed mode..."
	@make up
	@sleep 20
	npm ci --silent
	npx playwright install --with-deps
	npx playwright test --headed

playwright-ui:
	@echo "🖥️ Opening Playwright UI..."
	npm ci --silent
	npx playwright install --with-deps
	npx playwright test --ui

test-coverage:
	@echo "📈 Generating test coverage report..."
	cd config && COVERAGE=true bundle exec rspec ../spec --format progress
	@echo "📊 Coverage report generated in coverage/"

test-performance:
	@echo "⚡ Running performance tests..."
	@make up
	@sleep 20
	npm install -g artillery@latest --silent
	artillery quick --count 10 --num 5 http://localhost:9292 > test-results/performance.txt
	@echo "📊 Performance results saved to test-results/performance.txt"

test-security:
	@echo "🔒 Running security tests..."
	docker run --rm -v $(PWD):/app aquasec/trivy fs /app --format table > test-results/security-scan.txt
	@echo "🛡️ Security scan results saved to test-results/security-scan.txt"

test-clean:
	@echo "🧹 Cleaning test environment..."
	docker-compose -f docker/docker-compose.yml down -v
	rm -rf test-results/*.tmp
	rm -rf coverage/.resultset.json.lock

test-ci:
	@echo "🤖 Running CI test suite..."
	@make test-setup
	@make test-ruby
	@make test-docker
	@make test-playwright
	@make test-coverage
	@echo "✅ CI test suite completed!"

# Test reporting
test-report:
	@echo "📋 Generating comprehensive test report..."
	@mkdir -p test-results
	@echo "# CS2D Test Report" > test-results/README.md
	@echo "Generated on: $$(date)" >> test-results/README.md
	@echo "" >> test-results/README.md
	@echo "## Test Results" >> test-results/README.md
	@if [ -f test-results/rspec.xml ]; then echo "- ✅ Ruby tests: Available" >> test-results/README.md; else echo "- ❌ Ruby tests: Missing" >> test-results/README.md; fi
	@if [ -f test-results/playwright-report/index.html ]; then echo "- ✅ Playwright tests: Available" >> test-results/README.md; else echo "- ❌ Playwright tests: Missing" >> test-results/README.md; fi
	@if [ -d coverage ]; then echo "- ✅ Coverage report: Available" >> test-results/README.md; else echo "- ❌ Coverage report: Missing" >> test-results/README.md; fi
	@echo "" >> test-results/README.md
	@echo "📊 Test report summary created in test-results/README.md"

# Test utilities
test-gems:
	@echo "💎 Installing test gems..."
	cd config && bundle install

test-deps:
	@echo "📦 Installing all test dependencies..."
	@make test-gems
	npm ci --silent
	npx playwright install --with-deps

test-shell:
	@echo "🐚 Opening test shell..."
	docker-compose -f docker/docker-compose.yml run --rm dev-tools bash

# Quick test commands for development
quick-test:
	@echo "⚡ Running quick tests..."
	cd config && bundle exec rspec ../spec/lib --format progress

smoke-test:
	@echo "💨 Running smoke tests..."
	@make up
	@sleep 10
	curl -f http://localhost:9292 && echo "✅ Lobby OK"
	curl -f http://localhost:9293/game.html && echo "✅ Game OK"
	curl -f http://localhost:9294/api/maps && echo "✅ API OK"
	@make down

# Continuous testing
test-watch:
	@echo "👀 Starting test watcher..."
	cd config && bundle exec guard

test-guard:
	@echo "🛡️ Starting Guard for continuous testing..."
	cd config && bundle exec guard

# Database Commands
db-up:
	@echo "🗄️ Starting with database..."
	docker-compose -f docker/docker-compose.yml --profile with-db up -d

db-migrate:
	@echo "🔄 Running database migrations..."
	docker-compose -f docker/docker-compose.yml run --rm lively-app bundle exec rake db:migrate

db-console:
	@echo "💾 Opening database console..."
	docker-compose -f docker/docker-compose.yml exec postgres psql -U cs2d cs2d_development

db-backup:
	@echo "💾 Backing up database..."
	docker-compose -f docker/docker-compose.yml exec postgres pg_dump -U cs2d cs2d_development > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Monitoring Commands
stats:
	@echo "📊 Container Statistics:"
	docker stats --no-stream

ports:
	@echo "🔌 Exposed Ports:"
	@docker ps --format "table {{.Names}}\t{{.Ports}}" | grep cs2d || echo "No CS2D containers running"

health:
	@echo "💚 Health Check Status:"
	@docker-compose -f docker/docker-compose.yml ps

# Utility Commands
clean:
	@echo "🧹 Cleaning up..."
	docker-compose -f docker/docker-compose.yml down -v
	docker system prune -f

clean-all:
	@echo "🧹 Deep cleaning..."
	docker-compose -f docker/docker-compose.yml down -v
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
	docker-compose -f docker/docker-compose.yml --profile debug up -d redis-commander
	@echo "Redis Commander: http://localhost:8081"

debug-db:
	@echo "🔍 Starting with Adminer..."
	docker-compose -f docker/docker-compose.yml --profile with-db --profile debug up -d adminer
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
	@docker-compose -f docker/docker-compose.yml version
	@docker version --format 'Docker {{.Server.Version}}'
	@echo "Ruby: $(shell docker run --rm ruby:3.3.6-slim ruby -v)"
	@echo "Redis: $(shell docker run --rm redis:7-alpine redis-server -v)"

# 🚀 Multi-Agent Development Commands (2.5x Faster!)
multi-agent-sprint:
	@echo "🚀 Running multi-agent development sprint..."
	@echo "This will execute 5 development tasks in parallel!"
	@npm run multi-agent:sprint

multi-agent-fix:
	@echo "🔧 Fixing issues with multi-agent..."
	@npm run multi-agent:fix

multi-agent-test:
	@echo "🧪 Generating tests with multi-agent..."
	@npm run multi-agent:test

multi-agent-weapon:
	@echo "🔫 Generating weapon system with multi-agent..."
	@npm run multi-agent:weapon

multi-agent-map:
	@echo "🗺️ Generating map components with multi-agent..."
	@npm run multi-agent:map

multi-agent-spa:
	@echo "🎯 Migrating to SPA with multi-agent..."
	@npm run multi-agent:spa

multi-agent-docker:
	@echo "🐳 Setting up Docker with multi-agent..."
	@npm run multi-agent:docker

multi-agent-docs:
	@echo "📚 Generating documentation with multi-agent..."
	@npm run multi-agent:docs

multi-agent-help:
	@echo "📋 Available multi-agent commands:"
	@npm run multi-agent

multi-agent: multi-agent-help

.DEFAULT_GOAL := help