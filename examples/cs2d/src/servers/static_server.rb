#!/usr/bin/env ruby
# frozen_string_literal: true

require 'webrick'
require 'json'
require_relative '../../lib/server_config'

# Simple static file server for CS2D HTML pages
# This serves the room.html and game.html files that the lobby redirects to
class CS2DStaticServer
  def initialize(port = nil)
    @port = port || ServerConfig.static_port
    # Fix: Use absolute path relative to app root, not current script directory
    @document_root = File.expand_path('../../public', __dir__)
    
    puts "CS2D Static Server starting on port #{@port}"
    puts "Document root: #{@document_root}"
    puts "Document root exists: #{Dir.exist?(@document_root)}"
    
    # Verify document root exists
    unless Dir.exist?(@document_root)
      puts "ERROR: Document root does not exist: #{@document_root}"
      exit 1
    end
    
    start_server
  end
  
  private
  
  def format_uptime(seconds)
    days = seconds / (24 * 3600)
    hours = (seconds % (24 * 3600)) / 3600
    minutes = (seconds % 3600) / 60
    secs = seconds % 60
    
    if days > 0
      "#{days}d #{hours}h #{minutes}m #{secs}s"
    elsif hours > 0
      "#{hours}h #{minutes}m #{secs}s"
    elsif minutes > 0
      "#{minutes}m #{secs}s"
    else
      "#{secs}s"
    end
  end
  
  def list_available_files
    return [] unless Dir.exist?(@document_root)
    
    files = []
    Dir.glob(File.join(@document_root, '**', '*.html')).each do |file|
      relative_path = file.sub(@document_root, '')
      files << relative_path
    end
    files.sort
  rescue => e
    puts "Error listing files: #{e.message}"
    []
  end
  
  def start_server
    @start_time = Time.now.to_i
    
    server = WEBrick::HTTPServer.new(
      Port: @port,
      DocumentRoot: @document_root,
      Logger: WEBrick::Log.new($stderr, WEBrick::Log::INFO),
      AccessLog: [[
        $stderr,
        WEBrick::AccessLog::COMBINED_LOG_FORMAT
      ]]
    )

    # Health check endpoint
    server.mount_proc '/health' do |req, res|
      res['Content-Type'] = 'application/json'
      res['Access-Control-Allow-Origin'] = '*'
      
      uptime_seconds = Time.now.to_i - @start_time
      available_files = list_available_files
      
      health_data = {
        status: 'healthy',
        service: 'CS2D Static Server',
        version: '1.0.0',
        port: @port,
        hostname: ServerConfig.hostname,
        document_root: @document_root,
        document_root_exists: Dir.exist?(@document_root),
        uptime_seconds: uptime_seconds,
        uptime_human: format_uptime(uptime_seconds),
        available_files_count: available_files.length,
        available_files: available_files,
        server_config: {
          static_url: ServerConfig.static_url,
          lively_url: ServerConfig.lively_url,
          api_url: ServerConfig.api_url
        },
        timestamp: Time.now.iso8601
      }
      
      res.body = health_data.to_json
      puts "[#{Time.now}] Health check requested - Status: OK"
    end

    # Add CORS headers for cross-origin requests
    server.mount_proc '/' do |req, res|
      res['Access-Control-Allow-Origin'] = '*'
      res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
      res['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
      
      # Handle OPTIONS preflight requests
      if req.request_method == 'OPTIONS'
        res.status = 200
        res.body = ''
        next
      end
      
      # Log requests for debugging
      puts "Serving request: #{req.request_method} #{req.path}"
      
      begin
        # Default file serving
        WEBrick::HTTPServlet::FileHandler.new(server, @document_root).service(req, res)
      rescue => e
        puts "Error serving file: #{e.message}"
        res.status = 404
        res.body = "File not found: #{req.path}"
      end
    end

    # API endpoint for room data (future implementation)
    server.mount_proc '/api/room' do |req, res|
      room_id = req.query['room_id']
      
      res['Content-Type'] = 'application/json'
      res['Access-Control-Allow-Origin'] = '*'
      
      # Mock room data - in real implementation, this would query Redis
      room_data = {
        room_id: room_id,
        name: "Room #{room_id}",
        map: 'de_dust2',
        game_mode: 'competitive',
        max_players: 10,
        creator_id: 'player_123',
        state: 'waiting',
        players: [
          { id: 'player_123', name: 'Player 123', is_host: true },
          { id: 'player_456', name: 'Player 456', is_host: false }
        ]
      }
      
      res.body = room_data.to_json
    end

    # Graceful shutdown
    trap('INT') do
      puts "\nShutting down CS2D Static Server..."
      server.shutdown
    end

    server.start
  end
end

if __FILE__ == $0
  port = ARGV[0]&.to_i || ServerConfig.static_port
  
  puts "CS2D Static Server Configuration:"
  puts "================================="
  puts "Port: #{port}"
  puts "Static URL: #{ServerConfig.static_url}"
  puts "Lively URL: #{ServerConfig.lively_url}"
  puts "API URL: #{ServerConfig.api_url}"
  puts "Health endpoint: #{ServerConfig.static_health_url}"
  puts
  
  CS2DStaticServer.new(port)
end