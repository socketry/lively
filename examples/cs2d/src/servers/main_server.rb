#!/usr/bin/env lively
# frozen_string_literal: true

require "lively/application"
require "live"

# Load lobby view
require_relative "async_redis_lobby_i18n" # i18n-enabled lobby view

# Simple CS2D Server Application that serves the lobby
Application = Lively::Application[AsyncRedisLobbyI18nView]