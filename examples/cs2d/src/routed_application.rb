#!/usr/bin/env lively
# frozen_string_literal: true

require "lively/application"
require "live"

# Load all views
require_relative "async_redis_lobby_i18n"
require_relative "room_waiting"
require_relative "cs16_multiplayer_view"

# Routing middleware for multiple views
class RoutedApplication
	def initialize
		# Create the individual applications
		@lobby_app = Lively::Application[AsyncRedisLobbyI18nView]
		@room_app = Lively::Application[RoomWaitingView]
		@game_app = Lively::Application[CS16MultiplayerView]
	end
	
	def call(env)
		request = Rack::Request.new(env)
		path = request.path_info
		
		Console.info(self, "Routing request: #{path}")
		
		# Route based on path
		case path
		when "/room"
			# Room waiting page
			if request.params["room_id"] && request.params["player_id"]
				Console.info(self, "Routing to RoomWaitingView")
				@room_app.call(env)
			else
				# Redirect to lobby if missing params
				Console.info(self, "Missing room_id or player_id, redirecting to lobby")
				[302, {"Location" => "/"}, []]
			end
		when "/game"
			# Multiplayer game view
			Console.info(self, "Routing to CS16MultiplayerView")
			@game_app.call(env)
		else
			# Default to lobby (handles /, /live, etc.)
			Console.info(self, "Routing to AsyncRedisLobbyI18nView")
			@lobby_app.call(env)
		end
	end
end