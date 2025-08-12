#!/usr/bin/env lively
# frozen_string_literal: true

require "lively/application"
require "live"

# Load all views
require_relative "async_redis_lobby"      # Lobby view
require_relative "room_waiting"           # Room waiting view
require_relative "cs16_redis_game"        # Redis-based game view

# Main CS2D Server Application
# Routes different URLs to appropriate views
Application = Lively::Application.freeze do
	def self.call(env)
		request = Protocol::Rack::Request[env]
		path = request.path || "/"
		
		Console.info(self, "Routing request: #{path}")
		
		case path
		when "/", "/lobby"
			# Lobby view - room creation and joining
			Console.info(self, "Serving lobby view")
			Live::Application.new(AsyncRedisLobbyView).call(env)
			
		when "/room"
			# Room waiting view - player management and bot control
			Console.info(self, "Serving room waiting view")
			Live::Application.new(RoomWaitingView).call(env)
			
		when "/game"
			# Redis-based multiplayer game view
			Console.info(self, "Serving Redis multiplayer game view")
			Live::Application.new(CS16RedisGameView).call(env)
			
		else
			# Try serving static files
			if path.start_with?("/_static/")
				Console.info(self, "Serving static file: #{path}")
				file_path = File.join(__dir__, "public", path)
				if File.exist?(file_path)
					content = File.read(file_path)
					content_type = case File.extname(file_path)
					when ".js" then "application/javascript"
					when ".css" then "text/css"
					when ".html" then "text/html"
					when ".png" then "image/png"
					when ".jpg", ".jpeg" then "image/jpeg"
					when ".svg" then "image/svg+xml"
					else "text/plain"
					end
					[200, {"content-type" => content_type}, [content]]
				else
					Console.warn(self, "Static file not found: #{file_path}")
					[404, {"content-type" => "text/plain"}, ["File not found: #{path}"]]
				end
			else
				Console.warn(self, "Route not found: #{path}")
				[404, {"content-type" => "text/html"}, [<<~HTML
					<!DOCTYPE html>
					<html>
					<head>
						<title>404 - Page Not Found</title>
						<meta charset="UTF-8">
						<style>
							body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
							h1 { color: #f44336; }
							a { color: #2196F3; text-decoration: none; }
							a:hover { text-decoration: underline; }
						</style>
					</head>
					<body>
						<h1>🎮 CS2D - Page Not Found</h1>
						<p>The requested page <code>#{path}</code> could not be found.</p>
						<p><a href="/">← Back to Lobby</a></p>
					</body>
					</html>
				HTML
				]]
			end
		end
	end
end