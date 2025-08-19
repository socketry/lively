# frozen_string_literal: true

require "lively"
require "json"
require_relative "server_config"

# Health check view for the main Lively application
class LivelyHealthView < Lively::View
  def render(builder)
    uptime_seconds = Time.now.to_i - start_time
    
    health_data = {
      status: 'healthy',
      service: 'CS2D Lively Server',
      version: '1.0.0',
      port: ServerConfig.lively_port,
      hostname: ServerConfig.hostname,
      uptime_seconds: uptime_seconds,
      uptime_human: format_uptime(uptime_seconds),
      emergency_monitoring: ENV['EMERGENCY_MONITORING'] != 'false',
      managed_views: {
        total: ManagedViewHelpers.performance_report[:total_managed_views] rescue 0,
        active: ManagedViewHelpers.performance_report[:active_views] rescue 0,
        total_renders: ManagedViewHelpers.performance_report[:total_renders] rescue 0,
        error_rate: ManagedViewHelpers.performance_report[:global_error_rate] rescue 0
      },
      server_config: {
        lively_url: ServerConfig.lively_url,
        static_url: ServerConfig.static_url,
        api_url: ServerConfig.api_url,
        websocket_url: ServerConfig.websocket_url
      },
      timestamp: Time.now.iso8601
    }

    response.headers['Content-Type'] = 'application/json'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.status = 200
    
    builder.text!(health_data.to_json)
  end

  private

  def start_time
    @start_time ||= Time.now.to_i
  end

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
end