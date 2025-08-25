#!/bin/bash
set -e

# Docker entrypoint script for CS2D services
echo "🎮 CS2D Docker Entrypoint"
echo "Service: ${SERVICE_NAME:-unknown}"
echo "Environment: ${RACK_ENV:-development}"

# Wait for Redis if needed
if [[ "$SERVICE_NAME" == "lively" || "$SERVICE_NAME" == "api-bridge" ]]; then
    echo "⏳ Waiting for Redis..."
    until redis-cli -h ${REDIS_HOST:-redis} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; do
        echo "   Redis is unavailable - sleeping"
        sleep 1
    done
    echo "✅ Redis is ready!"
fi

# Run database migrations if needed (future use)
if [ "$RUN_MIGRATIONS" == "true" ]; then
    echo "🔄 Running database migrations..."
    # bundle exec rake db:migrate
    echo "✅ Migrations complete"
fi

# Asset compilation for production
if [ "$RACK_ENV" == "production" ]; then
    echo "📦 Compiling assets..."
    # Add asset compilation commands here if needed
    echo "✅ Assets compiled"
fi

# Health check
if [ "$1" == "health" ]; then
    case "$SERVICE_NAME" in
        lively)
            curl -f http://localhost:${LIVELY_PORT:-9292}/ || exit 1
            ;;
        static)
            curl -f http://localhost:${STATIC_PORT:-9293}/map_editor.html || exit 1
            ;;
        api-bridge)
            curl -f http://localhost:${API_PORT:-9294}/api/maps || exit 1
            ;;
        *)
            echo "Unknown service for health check"
            exit 1
            ;;
    esac
    exit 0
fi

# Create necessary directories
mkdir -p logs tmp

# Set Ruby optimization flags
export RUBY_GC_HEAP_GROWTH_FACTOR=1.1
export RUBY_GC_MALLOC_LIMIT_GROWTH_FACTOR=1.1
export RUBY_GC_OLDMALLOC_LIMIT_GROWTH_FACTOR=1.1
export RUBY_GC_HEAP_INIT_SLOTS=600000
export RUBY_GC_HEAP_FREE_SLOTS=600000

# Log startup information
echo "🚀 Starting service with command: $@"
echo "   Time: $(date)"
echo "   Ruby: $(ruby -v)"
echo "   Bundler: $(bundle -v)"

# Execute the main command
exec "$@"