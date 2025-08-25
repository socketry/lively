#!/usr/bin/env ruby
# frozen_string_literal: true

require 'optparse'
require 'fileutils'
require_relative '../lib/server_config'
require_relative '../lib/health_check'

# CS2D Server Management Tool
# Provides centralized management of all CS2D server processes
class ServerManager
  def initialize
    @pids = {}
    @pid_file = File.join(Dir.pwd, '.server_pids')
    load_pids if File.exist?(@pid_file)
  end

  def start_all
    puts "🚀 Starting CS2D Server Architecture"
    puts "====================================="
    puts
    
    # Validate configuration
    begin
      ServerConfig.validate!
      puts "✅ Server configuration validated"
    rescue => e
      puts "❌ Configuration error: #{e.message}"
      return false
    end
    
    # Display configuration
    display_config
    
    # Check if Redis is running
    unless check_redis
      puts "❌ Redis is required but not running. Please start Redis first."
      return false
    end
    
    # Start servers in order
    success = true
    success &= start_api_server
    sleep 2
    success &= start_static_server  
    sleep 2
    success &= start_lively_server
    
    if success
      puts
      puts "🎉 All servers started successfully!"
      display_status
      save_pids
      puts
      puts "Use 'ruby scripts/server_manager.rb status' to check server health"
      puts "Use 'ruby scripts/server_manager.rb stop' to stop all servers"
    else
      puts "❌ Some servers failed to start. Check logs for details."
      stop_all
    end
    
    success
  end
  
  def stop_all
    puts "🛑 Stopping all CS2D servers..."
    
    stopped_count = 0
    
    @pids.each do |name, pid|
      if process_running?(pid)
        puts "Stopping #{name} (PID: #{pid})..."
        Process.kill("TERM", pid)
        
        # Wait up to 10 seconds for graceful shutdown
        10.times do
          break unless process_running?(pid)
          sleep 1
        end
        
        # Force kill if still running
        if process_running?(pid)
          puts "Force stopping #{name}..."
          Process.kill("KILL", pid) rescue nil
        end
        
        stopped_count += 1
      end
    end
    
    @pids.clear
    File.delete(@pid_file) if File.exist?(@pid_file)
    
    puts "✅ Stopped #{stopped_count} servers"
  end
  
  def restart_all
    puts "🔄 Restarting all servers..."
    stop_all
    sleep 3
    start_all
  end
  
  def status
    puts "CS2D Server Status"
    puts "=================="
    
    if @pids.empty?
      puts "No servers are currently managed by this tool."
      puts "Run 'start' command to launch servers."
      return
    end
    
    running_count = 0
    
    @pids.each do |name, pid|
      status_icon = process_running?(pid) ? "✅" : "❌"
      status_text = process_running?(pid) ? "Running" : "Stopped"
      puts "#{status_icon} #{name}: #{status_text} (PID: #{pid})"
      running_count += 1 if process_running?(pid)
    end
    
    puts
    puts "Running: #{running_count}/#{@pids.length}"
    
    # Check health if all processes are running
    if running_count == @pids.length
      puts
      puts "Health Check Results:"
      puts "-------------------"
      
      if HealthCheck.wait_for_services(5, 2)
        result = HealthCheck.check_all_services
        result[:services].each do |service|
          icon = service[:status] == 'healthy' ? '✅' : '⚠️'
          puts "#{icon} #{service[:name]}: #{service[:status]} (#{service[:response_time]}ms)"
        end
        
        puts
        puts "Overall Health: #{result[:overall_status].upcase}"
      else
        puts "⚠️  Some services are not responding to health checks"
      end
    end
  end
  
  def health_check
    puts "Running comprehensive health check..."
    puts
    
    HealthCheck.detailed_report
  end
  
  def logs(server_name = nil)
    log_files = {
      'api' => '../api_server.log',
      'static' => '../static_server.log', 
      'lively' => '../lively_server.log'
    }
    
    if server_name && log_files[server_name]
      log_file = File.join(__dir__, log_files[server_name])
      if File.exist?(log_file)
        puts "=== #{server_name.upcase} SERVER LOGS ==="
        puts File.read(log_file)
      else
        puts "Log file not found: #{log_file}"
      end
    else
      puts "Available logs: #{log_files.keys.join(', ')}"
      puts "Usage: ruby scripts/server_manager.rb logs [server_name]"
    end
  end
  
  private
  
  def display_config
    puts "Server Configuration:"
    puts "--------------------"
    puts "Hostname: #{ServerConfig.hostname}"
    puts "Protocol: #{ServerConfig.protocol}"
    puts "WebSocket: #{ServerConfig.ws_protocol}"
    puts
    puts "Services:"
    puts "- Lively Server:  #{ServerConfig.lively_url}"
    puts "- Static Server:  #{ServerConfig.static_url}" 
    puts "- API Bridge:     #{ServerConfig.api_url}"
    puts "- WebSocket:      #{ServerConfig.websocket_url}"
    puts
    puts "Health Endpoints:"
    puts "- Lively Health:  #{ServerConfig.lively_health_url}"
    puts "- Static Health:  #{ServerConfig.static_health_url}"
    puts "- API Health:     #{ServerConfig.api_health_url}"
    puts
  end
  
  def check_redis
    begin
      result = HealthCheck.check_redis
      result[:status] == 'healthy'
    rescue
      false
    end
  end
  
  def start_api_server
    puts "🔌 Starting API Bridge Server (Port #{ServerConfig.api_port})..."
    
    pid = spawn(
      'ruby',
      File.join(__dir__, '../src/servers/api_bridge_server.rb'),
      ServerConfig.api_port.to_s,
      out: File.join(__dir__, '../api_server.log'),
      err: [:child, :out]
    )
    
    @pids['API Bridge'] = pid
    
    # Wait and check if process started
    sleep 2
    if process_running?(pid)
      puts "✅ API Bridge Server started (PID: #{pid})"
      true
    else
      puts "❌ API Bridge Server failed to start"
      false
    end
  end
  
  def start_static_server
    puts "📁 Starting Static File Server (Port #{ServerConfig.static_port})..."
    
    pid = spawn(
      'ruby',
      File.join(__dir__, '../src/servers/static_server.rb'),
      ServerConfig.static_port.to_s,
      out: File.join(__dir__, '../static_server.log'),
      err: [:child, :out]
    )
    
    @pids['Static Server'] = pid
    
    # Wait and check if process started
    sleep 2
    if process_running?(pid)
      puts "✅ Static File Server started (PID: #{pid})"
      true
    else
      puts "❌ Static File Server failed to start"
      false
    end
  end
  
  def start_lively_server
    puts "🎮 Starting Lively Application Server (Port #{ServerConfig.lively_port})..."
    
    # Change to app directory for Lively server
    pid = spawn(
      { 'RUBY_LIB' => "/Users/jimmy/jimmy_side_projects/lively/lib:#{ENV['RUBYLIB']}" },
      'ruby',
      '-I/Users/jimmy/jimmy_side_projects/lively/lib',
      '-I/Users/jimmy/jimmy_side_projects/lively/examples/cs2d',
      '/Users/jimmy/jimmy_side_projects/lively/bin/lively',
      'application.rb',
      chdir: File.join(__dir__, '..'),
      out: File.join(__dir__, '../lively_server.log'),
      err: [:child, :out]
    )
    
    @pids['Lively Server'] = pid
    
    # Wait longer for Lively server to start
    sleep 5
    if process_running?(pid)
      puts "✅ Lively Application Server started (PID: #{pid})"
      true
    else
      puts "❌ Lively Application Server failed to start"
      false
    end
  end
  
  def process_running?(pid)
    Process.getpgid(pid)
    true
  rescue Errno::ESRCH
    false
  end
  
  def display_status
    puts
    puts "🌐 CS2D Application Ready!"
    puts "=========================="
    puts "Lobby (Main):     #{ServerConfig.lobby_url}"
    puts "Room Page:        #{ServerConfig.static_url}/room.html"
    puts "Game Page:        #{ServerConfig.static_url}/game.html"
    puts "Map Editor:       #{ServerConfig.map_editor_url}"
    puts
    puts "API Endpoints:"
    puts "- Rooms:          #{ServerConfig.api_rooms_url}"
    puts "- Maps:           #{ServerConfig.api_maps_url}"
    puts "- Room API:       #{ServerConfig.api_room_url}"
    puts
    puts "Health Checks:"
    puts "- Lively:         #{ServerConfig.lively_health_url}"
    puts "- Static:         #{ServerConfig.static_health_url}"
    puts "- API:            #{ServerConfig.api_health_url}"
  end
  
  def save_pids
    File.write(@pid_file, @pids.to_json)
  end
  
  def load_pids
    begin
      require 'json'
      @pids = JSON.parse(File.read(@pid_file))
      
      # Clean up dead processes
      @pids.reject! { |name, pid| !process_running?(pid) }
    rescue
      @pids = {}
    end
  end
end

# CLI interface
if __FILE__ == $0
  manager = ServerManager.new
  
  options = {}
  OptionParser.new do |opts|
    opts.banner = "Usage: #{$0} [command] [options]"
    
    opts.on('-h', '--help', 'Show this help') do
      puts opts
      puts
      puts "Commands:"
      puts "  start    - Start all servers"
      puts "  stop     - Stop all servers" 
      puts "  restart  - Restart all servers"
      puts "  status   - Show server status"
      puts "  health   - Run health check"
      puts "  logs     - Show server logs"
      puts
      puts "Examples:"
      puts "  #{$0} start"
      puts "  #{$0} status"
      puts "  #{$0} logs api"
      exit
    end
  end.parse!
  
  command = ARGV[0] || 'status'
  
  case command
  when 'start'
    exit(manager.start_all ? 0 : 1)
  when 'stop'
    manager.stop_all
  when 'restart'
    exit(manager.restart_all ? 0 : 1)
  when 'status'
    manager.status
  when 'health'
    manager.health_check
  when 'logs'
    manager.logs(ARGV[1])
  else
    puts "Unknown command: #{command}"
    puts "Use --help to see available commands"
    exit 1
  end
end