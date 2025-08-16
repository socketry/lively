#!/usr/bin/env ruby
# frozen_string_literal: true

require "rack"
require "falcon"
require "lively/application"

# Load all views
require_relative "async_redis_lobby_i18n"
require_relative "room_waiting"  
require_relative "cs16_multiplayer_view"

# Create Rack app with URLMap routing
app = Rack::URLMap.new({
	"/room" => Lively::Application[RoomWaitingView],
	"/game" => Lively::Application[CS16MultiplayerView],
	"/" => Lively::Application[AsyncRedisLobbyI18nView]
})

# Start Falcon server
Rack::Handler.get("falcon").run(app, Port: 9292, Host: "localhost")