# frozen_string_literal: true

begin
  require 'dotenv/load'
rescue LoadError
  # dotenv is optional - environment variables can be set externally
end

# Centralized server configuration for CS2D application
# Manages URLs and ports across all servers with environment variable support
module ServerConfig
  class << self
    # Server ports with environment variable fallbacks
    def lively_port
      @lively_port ||= ENV.fetch('LIVELY_PORT', '9292').to_i
    end

    def static_port
      @static_port ||= ENV.fetch('STATIC_PORT', '9293').to_i
    end

    def api_port
      @api_port ||= ENV.fetch('API_PORT', '9294').to_i
    end

    # Server hostnames with environment variable fallbacks
    def hostname
      @hostname ||= ENV.fetch('SERVER_HOSTNAME', 'localhost')
    end

    def protocol
      @protocol ||= ENV.fetch('SERVER_PROTOCOL', 'http')
    end

    def ws_protocol
      @ws_protocol ||= ENV.fetch('WS_PROTOCOL', 'ws')
    end

    # Full server URLs
    def lively_url
      "#{protocol}://#{hostname}:#{lively_port}"
    end

    def static_url
      "#{protocol}://#{hostname}:#{static_port}"
    end

    def api_url
      "#{protocol}://#{hostname}:#{api_port}"
    end

    def websocket_url
      "#{ws_protocol}://#{hostname}:#{lively_port}"
    end

    # Specific page URLs
    def lobby_url
      lively_url
    end

    def room_url(room_id = nil, player_id = nil, nickname = nil)
      url = "#{static_url}/room.html"
      params = []
      params << "room_id=#{room_id}" if room_id
      params << "player_id=#{player_id}" if player_id
      params << "nickname=#{nickname}" if nickname
      url += "?#{params.join('&')}" unless params.empty?
      url
    end

    def game_url(room_id = nil, player_id = nil)
      url = "#{static_url}/game.html"
      params = []
      params << "room_id=#{room_id}" if room_id
      params << "player_id=#{player_id}" if player_id
      url += "?#{params.join('&')}" unless params.empty?
      url
    end

    def map_editor_url
      "#{static_url}/map_editor.html"
    end

    # API endpoints
    def api_room_url
      "#{api_url}/api/room"
    end

    def api_rooms_url
      "#{api_url}/api/rooms"
    end

    def api_maps_url
      "#{api_url}/api/maps"
    end

    # Health check endpoints
    def lively_health_url
      "#{lively_url}/health"
    end

    def static_health_url
      "#{static_url}/health"
    end

    def api_health_url
      "#{api_url}/api/health"
    end

    # CORS allowed origins
    def allowed_origins
      @allowed_origins ||= ENV.fetch('ALLOWED_ORIGINS', "#{lively_url},#{static_url},#{api_url}").split(',')
    end

    # Configuration validation
    def validate!
      errors = []
      
      # Check if ports are different
      ports = [lively_port, static_port, api_port]
      if ports.uniq.length != ports.length
        errors << "Server ports must be unique. Current: Lively=#{lively_port}, Static=#{static_port}, API=#{api_port}"
      end
      
      # Check port ranges
      ports.each do |port|
        unless (1024..65535).include?(port)
          errors << "Port #{port} is outside valid range (1024-65535)"
        end
      end
      
      # Check hostname format
      unless hostname.match?(/\A[a-zA-Z0-9\-\.]+\z/)
        errors << "Invalid hostname format: #{hostname}"
      end
      
      # Check protocol values
      unless %w[http https].include?(protocol)
        errors << "Invalid protocol: #{protocol}. Must be 'http' or 'https'"
      end
      
      unless %w[ws wss].include?(ws_protocol)
        errors << "Invalid WebSocket protocol: #{ws_protocol}. Must be 'ws' or 'wss'"
      end
      
      raise "Server configuration errors:\n#{errors.join("\n")}" unless errors.empty?
      
      true
    end

    # Development/testing helpers
    def development?
      ENV['RACK_ENV'] == 'development' || ENV['NODE_ENV'] == 'development'
    end

    def production?
      ENV['RACK_ENV'] == 'production' || ENV['NODE_ENV'] == 'production'
    end

    def test?
      ENV['RACK_ENV'] == 'test' || ENV['NODE_ENV'] == 'test'
    end

    # Display current configuration
    def to_h
      {
        hostname: hostname,
        protocol: protocol,
        ws_protocol: ws_protocol,
        ports: {
          lively: lively_port,
          static: static_port,
          api: api_port
        },
        urls: {
          lively: lively_url,
          static: static_url,
          api: api_url,
          websocket: websocket_url
        },
        allowed_origins: allowed_origins
      }
    end

    def inspect
      "#<ServerConfig #{to_h}>"
    end

    # Reset cached values (useful for testing)
    def reset!
      instance_variables.each { |var| remove_instance_variable(var) }
    end
  end
end