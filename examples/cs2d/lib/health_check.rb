# frozen_string_literal: true

require 'json'
require 'net/http'
require 'timeout'
require 'time'
require_relative 'server_config'

# Health check system for CS2D servers
# Provides comprehensive health monitoring across all application components
module HealthCheck
  class << self
    # Check health of a single service
    def check_service(name, url, timeout_seconds = 5)
      start_time = Time.now
      
      begin
        Timeout::timeout(timeout_seconds) do
          uri = URI(url)
          response = Net::HTTP.get_response(uri)
          
          case response.code.to_i
          when 200..299
            {
              name: name,
              status: 'healthy',
              url: url,
              response_time: ((Time.now - start_time) * 1000).round(2),
              http_status: response.code.to_i,
              message: 'Service responding normally'
            }
          else
            {
              name: name,
              status: 'unhealthy',
              url: url,
              response_time: ((Time.now - start_time) * 1000).round(2),
              http_status: response.code.to_i,
              message: "HTTP #{response.code}: #{response.message}"
            }
          end
        end
      rescue Timeout::Error
        {
          name: name,
          status: 'timeout',
          url: url,
          response_time: timeout_seconds * 1000,
          http_status: nil,
          message: "Timeout after #{timeout_seconds} seconds"
        }
      rescue => e
        {
          name: name,
          status: 'error',
          url: url,
          response_time: ((Time.now - start_time) * 1000).round(2),
          http_status: nil,
          message: e.message
        }
      end
    end

    # Comprehensive health check of all services
    def check_all_services
      services = [
        ['Lively Server', ServerConfig.lively_health_url],
        ['Static Server', ServerConfig.static_health_url],
        ['API Bridge', ServerConfig.api_health_url]
      ]
      
      results = services.map do |name, url|
        check_service(name, url)
      end
      
      # Check Redis connectivity
      redis_result = check_redis
      results << redis_result if redis_result
      
      # Determine overall system health
      overall_status = determine_overall_status(results)
      
      {
        overall_status: overall_status,
        timestamp: Time.now.iso8601,
        services: results,
        summary: generate_summary(results)
      }
    end

    # Check Redis connectivity
    def check_redis
      begin
        require 'redis'
        redis_url = ENV.fetch('REDIS_URL', 'redis://localhost:6379/0')
        redis = Redis.new(url: redis_url, timeout: 3)
        
        start_time = Time.now
        response = redis.ping
        response_time = ((Time.now - start_time) * 1000).round(2)
        
        redis.close
        
        {
          name: 'Redis',
          status: response == 'PONG' ? 'healthy' : 'unhealthy',
          url: redis_url,
          response_time: response_time,
          http_status: nil,
          message: response == 'PONG' ? 'Redis responding to PING' : 'Redis ping failed'
        }
      rescue LoadError
        {
          name: 'Redis',
          status: 'unavailable',
          url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
          response_time: 0,
          http_status: nil,
          message: 'Redis gem not available'
        }
      rescue => e
        {
          name: 'Redis',
          status: 'error',
          url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'),
          response_time: 0,
          http_status: nil,
          message: e.message
        }
      end
    end

    # Generate health check summary
    def generate_summary(results)
      total = results.length
      healthy = results.count { |r| r[:status] == 'healthy' }
      unhealthy = results.count { |r| r[:status] == 'unhealthy' }
      errors = results.count { |r| ['error', 'timeout'].include?(r[:status]) }
      
      {
        total_services: total,
        healthy_services: healthy,
        unhealthy_services: unhealthy,
        error_services: errors,
        health_percentage: total > 0 ? ((healthy.to_f / total) * 100).round(1) : 0
      }
    end

    # Determine overall system health
    def determine_overall_status(results)
      return 'unknown' if results.empty?
      
      healthy = results.count { |r| r[:status] == 'healthy' }
      total = results.length
      health_percentage = (healthy.to_f / total) * 100
      
      case health_percentage
      when 100
        'healthy'
      when 75..99
        'degraded'
      when 25..74
        'partial'
      else
        'critical'
      end
    end

    # Generate detailed health report
    def detailed_report
      result = check_all_services
      
      puts "CS2D Application Health Report"
      puts "=" * 50
      puts "Overall Status: #{result[:overall_status].upcase}"
      puts "Timestamp: #{result[:timestamp]}"
      puts
      
      puts "Service Details:"
      puts "-" * 30
      result[:services].each do |service|
        status_icon = case service[:status]
                     when 'healthy' then '✅'
                     when 'unhealthy' then '⚠️'
                     else '❌'
                     end
        
        puts "#{status_icon} #{service[:name]}"
        puts "   Status: #{service[:status]}"
        puts "   URL: #{service[:url]}"
        puts "   Response Time: #{service[:response_time]}ms"
        puts "   Message: #{service[:message]}"
        puts
      end
      
      summary = result[:summary]
      puts "Summary:"
      puts "-" * 20
      puts "Total Services: #{summary[:total_services]}"
      puts "Healthy: #{summary[:healthy_services]}"
      puts "Unhealthy: #{summary[:unhealthy_services]}"
      puts "Errors: #{summary[:error_services]}"
      puts "Health Percentage: #{summary[:health_percentage]}%"
      
      result
    end

    # Quick health check (returns boolean)
    def healthy?
      result = check_all_services
      result[:overall_status] == 'healthy'
    end

    # Wait for services to become healthy
    def wait_for_services(max_attempts = 30, wait_seconds = 2)
      attempts = 0
      
      while attempts < max_attempts
        result = check_all_services
        
        if result[:overall_status] == 'healthy'
          puts "All services are healthy! (attempt #{attempts + 1}/#{max_attempts})"
          return true
        end
        
        unhealthy = result[:services].select { |s| s[:status] != 'healthy' }
        puts "Waiting for services... (attempt #{attempts + 1}/#{max_attempts})"
        puts "Unhealthy: #{unhealthy.map { |s| s[:name] }.join(', ')}"
        
        sleep wait_seconds
        attempts += 1
      end
      
      puts "Services did not become healthy within #{max_attempts * wait_seconds} seconds"
      false
    end
  end
end

# CLI interface when run directly
if __FILE__ == $0
  require 'optparse'
  
  options = { format: 'detailed' }
  OptionParser.new do |opts|
    opts.banner = "Usage: #{$0} [options]"
    
    opts.on('-f', '--format FORMAT', 'Output format: detailed, json, summary') do |format|
      options[:format] = format
    end
    
    opts.on('-w', '--wait', 'Wait for all services to become healthy') do
      options[:wait] = true
    end
    
    opts.on('-q', '--quiet', 'Only output status (healthy/unhealthy)') do
      options[:quiet] = true
    end
    
    opts.on('-h', '--help', 'Show this help') do
      puts opts
      exit
    end
  end.parse!
  
  if options[:wait]
    exit(HealthCheck.wait_for_services ? 0 : 1)
  elsif options[:quiet]
    puts HealthCheck.healthy? ? 'healthy' : 'unhealthy'
    exit(HealthCheck.healthy? ? 0 : 1)
  elsif options[:format] == 'json'
    puts HealthCheck.check_all_services.to_json
  elsif options[:format] == 'summary'
    result = HealthCheck.check_all_services
    summary = result[:summary]
    puts "Overall: #{result[:overall_status]} (#{summary[:healthy_services]}/#{summary[:total_services]} services healthy)"
    exit(result[:overall_status] == 'healthy' ? 0 : 1)
  else
    result = HealthCheck.detailed_report
    exit(result[:overall_status] == 'healthy' ? 0 : 1)
  end
end