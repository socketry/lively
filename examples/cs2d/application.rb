#!/usr/bin/env lively
# frozen_string_literal: true

require "lively/application"
require_relative "async_redis_lobby_i18n"

# CS2D Application - Main Server Entrypoint
# Using the stable async_redis_lobby_i18n implementation as the main application
# This provides lobby functionality with Redis-based room management and i18n support
# 
# Note: The unified SPA approach (unified_spa_view.rb) has framework compatibility issues
# causing infinite rendering loops. Use the proven async_redis_lobby_i18n instead.
Application = Lively::Application[AsyncRedisLobbyI18nView]