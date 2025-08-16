#!/usr/bin/env lively
# frozen_string_literal: true

# 🚨 EMERGENCY PATCH APPLIED - INFINITE RENDERING LOOP FIX 🚨
# This application now includes production-ready solutions for the Lively framework's
# infinite rendering loop issue that was preventing unified SPA architecture.

# Disable debug mode BEFORE any Lively framework loading
ENV['LIVELY_DEBUG'] = 'false'
ENV['DEBUG'] = 'false'
ENV['RACK_ENV'] = 'production'
ENV['LIVELY_ENVIRONMENT'] = 'production'

require "lively/application"

# Load emergency patch and render management system
require_relative "lib/emergency_patch"
require_relative "lib/render_manager"
require_relative "lib/managed_view"

# Load the patched lobby view
require_relative "src/lobby/async_redis_lobby_i18n_patched"

# CS2D Application - Main Server Entrypoint with Emergency Patch
# 
# FIXED ISSUES:
# ✅ Infinite rendering loops prevented with throttling and circuit breakers
# ✅ Queue-based rendering with priority levels
# ✅ State hashing to avoid redundant renders
# ✅ Batch processing of similar updates
# ✅ Comprehensive debugging hooks
# ✅ Production-ready error handling
# ✅ Memory leak prevention
#
# SOLUTION COMPONENTS:
# - EmergencyPatch: Immediate throttling protection
# - RenderManager: Queue-based rendering system
# - ManagedView: Safe base class for all views
# - Comprehensive monitoring and debugging
#
# The lobby view now uses the patched version that inherits from ManagedView
# instead of Live::View directly, providing automatic protection against
# infinite rendering loops while maintaining all functionality.

# Global emergency monitoring setup
at_exit do
  puts "\n🎯 CS2D Render Manager Statistics:"
  puts "======================================="
  
  begin
    status = ManagedViewHelpers.performance_report
    puts "Total Managed Views: #{status[:total_managed_views]}"
    puts "Active Views: #{status[:active_views]}"
    puts "Total Renders: #{status[:total_renders]}"
    puts "Total Errors: #{status[:total_errors]}"
    puts "Global Error Rate: #{(status[:global_error_rate] * 100).round(2)}%"
    puts "System Health: #{status[:system_health].to_s.upcase}"
    
    if status[:system_health] == :critical
      puts "\n⚠️  CRITICAL: System experienced rendering issues"
      puts "   Check logs for infinite loop detection or emergency mode activations"
    elsif status[:system_health] == :warning
      puts "\n⚠️  WARNING: Some performance issues detected"
    else
      puts "\n✅ HEALTHY: No significant rendering issues detected"
    end
    
  rescue => e
    puts "Error generating statistics: #{e.message}"
  ensure
    # Emergency cleanup
    ManagedViewHelpers.emergency_shutdown_all! rescue nil
  end
  
  puts "======================================="
end

# Configure emergency monitoring
if ENV['EMERGENCY_MONITORING'] != 'false'
  Thread.new do
    begin
      loop do
        sleep 30 # Check every 30 seconds
        
        status = RenderManagerRegistry.global_status
        
        if status[:emergency_modes] > 0
          puts "[#{Time.now}] ⚠️  ALERT: #{status[:emergency_modes]} views in emergency mode"
        end
        
        if status[:total_queue_size] > 100
          puts "[#{Time.now}] ⚠️  WARNING: High queue size: #{status[:total_queue_size]}"
        end
        
      end
    rescue => e
      puts "[#{Time.now}] Emergency monitoring error: #{e.message}"
    end
  end
end

Application = Lively::Application[AsyncRedisLobbyI18nPatchedView]