#!/usr/bin/env rackup
# frozen_string_literal: true

require "lively/application"
require_relative "async_redis_lobby_i18n"
require_relative "room_waiting"
require_relative "cs16_multiplayer_view"

# Use Rack::URLMap for routing between different Lively applications
run Rack::URLMap.new({
	"/room" => Lively::Application[RoomWaitingView],
	"/game" => Lively::Application[CS16MultiplayerView],
	"/" => Lively::Application[AsyncRedisLobbyI18nView]
})