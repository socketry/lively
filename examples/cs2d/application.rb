#!/usr/bin/env lively
# frozen_string_literal: true

require_relative "async_redis_lobby_i18n"

# Use the i18n-enabled Redis lobby view
Application = Lively::Application[AsyncRedisLobbyI18nView]