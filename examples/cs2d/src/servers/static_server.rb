#!/usr/bin/env ruby
# frozen_string_literal: true

require 'webrick'
require 'json'

# Simple static file server for CS2D HTML pages
# This serves the room.html and game.html files that the lobby redirects to
class CS2DStaticServer
  def initialize(port = 9293)
    @port = port
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
      
      health_data = {
        status: 'ok',
        server: 'CS2D Static Server',
        port: @port,
        document_root: @document_root,
        document_root_exists: Dir.exist?(@document_root),
        uptime: Time.now.to_i - @start_time,
        available_files: list_available_files
      }
      
      res.body = health_data.to_json
      puts "Health check requested - Status: OK"
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
  port = ARGV[0] ? ARGV[0].to_i : 9293
  CS2DStaticServer.new(port)
end