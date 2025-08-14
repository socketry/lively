#!/usr/bin/env lively
# frozen_string_literal: true

# Disable debug mode BEFORE any Lively framework loading
ENV['LIVELY_DEBUG'] = 'false'
ENV['DEBUG'] = 'false'
ENV['RACK_ENV'] = 'production'
ENV['LIVELY_ENVIRONMENT'] = 'production'

require "lively/application"
require_relative "async_redis_lobby_i18n"

# CS2D Application - Main Server Entrypoint
# Using the stable async_redis_lobby_i18n implementation as the main application
# This provides lobby functionality with Redis-based room management and i18n support
# 
# Note: Unified SPA approaches have been attempted but suffer from Lively framework
# limitations causing infinite rendering loops. The progressive single-page architecture
# using JavaScript DOM manipulation also fails due to framework constraints.

Application = Lively::Application[AsyncRedisLobbyI18nView]