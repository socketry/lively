# frozen_string_literal: true

require "async"
require "json"
require "digest"

# 🚨 EMERGENCY PATCH FOR INFINITE RENDERING LOOPS 🚨
#
# This module provides critical fixes for the Lively framework's infinite rendering issue
# that occurs when self.update! triggers render which can trigger JavaScript events
# that call handle() which calls self.update! again, creating an infinite loop.
#
# PROBLEM ANALYSIS:
# The core issue is: self.update! -> render -> JavaScript -> handle() -> self.update! (LOOP)
#
# SOLUTION APPROACH:
# 1. Throttling: Maximum 10 renders per second per view
# 2. State tracking: Prevent redundant renders for identical states
# 3. Update queue: Batch rapid updates together
# 4. Circuit breaker: Stop rendering if loop detected
#
# Usage:
#   class MyView < Live::View
#     include EmergencyPatch
#     # Your view code here
#   end
#
module EmergencyPatch
  # Module-level constants for emergency configuration
  MAX_RENDERS_PER_SECOND = 10
  RENDER_THROTTLE_WINDOW = 1.0 # seconds
  CIRCUIT_BREAKER_THRESHOLD = 50 # renders within window to trigger circuit breaker
  EMERGENCY_COOLDOWN_PERIOD = 5.0 # seconds to wait when circuit breaker activates
  
  def self.included(base)
    base.extend(ClassMethods)
    base.prepend(InstanceMethods)
  end
  
  module ClassMethods
    # Class-level tracking for emergency statistics
    def render_statistics
      @render_statistics ||= {
        total_renders: 0,
        throttled_renders: 0,
        circuit_breaker_activations: 0,
        last_reset: Time.now
      }
    end
    
    def reset_render_statistics!
      @render_statistics = {
        total_renders: 0,
        throttled_renders: 0,
        circuit_breaker_activations: 0,
        last_reset: Time.now
      }
    end
    
    # Emergency debug logging
    def emergency_log(level, message, details = {})
      timestamp = Time.now.strftime("%H:%M:%S.%3N")
      puts "[#{timestamp}] EMERGENCY_PATCH #{level.upcase}: #{message}"
      if details.any?
        puts "  Details: #{details.inspect}"
      end
    end
  end
  
  module InstanceMethods
    def initialize(...)
      super
      
      # Emergency patch state tracking
      @emergency_render_state = {
        # Throttling state
        render_count: 0,
        render_window_start: Time.now,
        last_render_time: nil,
        
        # State hashing for redundancy detection
        last_state_hash: nil,
        pending_state_hash: nil,
        
        # Update queue for batching
        update_queue: [],
        update_task: nil,
        processing_updates: false,
        
        # Circuit breaker state
        circuit_breaker_active: false,
        circuit_breaker_until: nil,
        rapid_render_count: 0,
        rapid_render_window_start: Time.now,
        
        # Emergency flags
        emergency_mode: false,
        render_suspended: false,
        
        # Performance tracking
        render_times: [],
        average_render_time: 0
      }
      
      # Start the update processor
      start_update_processor
    end
    
    # Override the problematic update! method with emergency protection
    def update!
      return if emergency_render_blocked?
      
      current_time = Time.now
      
      # Update class-level statistics
      self.class.render_statistics[:total_renders] += 1
      
      # Check circuit breaker
      if circuit_breaker_check(current_time)
        self.class.render_statistics[:circuit_breaker_activations] += 1
        emergency_log(:error, "Circuit breaker activated - too many rapid renders", {
          view_class: self.class.name,
          rapid_render_count: @emergency_render_state[:rapid_render_count],
          time_window: current_time - @emergency_render_state[:rapid_render_window_start]
        })
        return
      end
      
      # Throttle check
      if throttle_check(current_time)
        self.class.render_statistics[:throttled_renders] += 1
        emergency_log(:warn, "Render throttled - too frequent updates", {
          view_class: self.class.name,
          renders_in_window: @emergency_render_state[:render_count]
        })
        queue_deferred_update
        return
      end
      
      # State redundancy check
      current_state_hash = calculate_state_hash
      if @emergency_render_state[:last_state_hash] == current_state_hash
        emergency_log(:debug, "Skipping redundant render - identical state", {
          view_class: self.class.name,
          state_hash: current_state_hash[0..8]
        })
        return
      end
      
      # Record render metrics
      render_start_time = Time.now
      
      begin
        # SAFE RENDER: Call original update! with protection
        emergency_log(:debug, "Executing safe render", {
          view_class: self.class.name,
          state_hash: current_state_hash[0..8]
        })
        
        super # Call the original Live::View#update!
        
        # Update state tracking on successful render
        @emergency_render_state[:last_state_hash] = current_state_hash
        @emergency_render_state[:last_render_time] = current_time
        
        # Update render timing metrics
        render_time = Time.now - render_start_time
        update_render_metrics(render_time)
        
        emergency_log(:debug, "Render completed successfully", {
          view_class: self.class.name,
          render_time: "#{(render_time * 1000).round(2)}ms"
        })
        
      rescue => e
        emergency_log(:error, "Render failed with exception", {
          view_class: self.class.name,
          error: e.message,
          backtrace: e.backtrace[0..2]
        })
        
        # Activate emergency mode on render failures
        activate_emergency_mode
        raise e
      end
      
      # Update throttling counters
      update_throttling_counters(current_time)
    end
    
    # Safe method to request an update without immediate execution
    def safe_update!
      current_state_hash = calculate_state_hash
      
      # Don't queue if identical to pending update
      if @emergency_render_state[:pending_state_hash] == current_state_hash
        emergency_log(:debug, "Skipping duplicate update request", {
          view_class: self.class.name
        })
        return
      end
      
      @emergency_render_state[:pending_state_hash] = current_state_hash
      
      # Add to update queue for batch processing
      @emergency_render_state[:update_queue] << {
        timestamp: Time.now,
        state_hash: current_state_hash,
        priority: calculate_update_priority
      }
      
      emergency_log(:debug, "Update queued for batch processing", {
        view_class: self.class.name,
        queue_size: @emergency_render_state[:update_queue].size
      })
    end
    
    # Emergency status check
    def emergency_status
      {
        render_blocked: emergency_render_blocked?,
        circuit_breaker_active: @emergency_render_state[:circuit_breaker_active],
        emergency_mode: @emergency_render_state[:emergency_mode],
        render_count: @emergency_render_state[:render_count],
        queue_size: @emergency_render_state[:update_queue].size,
        average_render_time: @emergency_render_state[:average_render_time],
        last_render: @emergency_render_state[:last_render_time]
      }
    end
    
    # Force emergency reset (use only in extreme cases)
    def emergency_reset!
      emergency_log(:warn, "Emergency reset triggered", {
        view_class: self.class.name
      })
      
      @emergency_render_state.merge!({
        render_count: 0,
        render_window_start: Time.now,
        circuit_breaker_active: false,
        circuit_breaker_until: nil,
        rapid_render_count: 0,
        rapid_render_window_start: Time.now,
        emergency_mode: false,
        render_suspended: false,
        update_queue: [],
        pending_state_hash: nil
      })
    end
    
    private
    
    # Check if rendering should be blocked
    def emergency_render_blocked?
      return true if @emergency_render_state[:render_suspended]
      return true if @emergency_render_state[:circuit_breaker_active] && 
                     Time.now < @emergency_render_state[:circuit_breaker_until]
      false
    end
    
    # Circuit breaker logic - prevents catastrophic infinite loops
    def circuit_breaker_check(current_time)
      window_start = @emergency_render_state[:rapid_render_window_start]
      
      # Reset rapid render count if window expired
      if current_time - window_start > RENDER_THROTTLE_WINDOW
        @emergency_render_state[:rapid_render_count] = 0
        @emergency_render_state[:rapid_render_window_start] = current_time
        return false
      end
      
      # Increment rapid render count
      @emergency_render_state[:rapid_render_count] += 1
      
      # Check if threshold exceeded
      if @emergency_render_state[:rapid_render_count] > CIRCUIT_BREAKER_THRESHOLD
        @emergency_render_state[:circuit_breaker_active] = true
        @emergency_render_state[:circuit_breaker_until] = current_time + EMERGENCY_COOLDOWN_PERIOD
        return true
      end
      
      false
    end
    
    # Throttling logic - limits renders per second
    def throttle_check(current_time)
      window_start = @emergency_render_state[:render_window_start]
      
      # Reset window if expired
      if current_time - window_start > RENDER_THROTTLE_WINDOW
        @emergency_render_state[:render_count] = 0
        @emergency_render_state[:render_window_start] = current_time
        return false
      end
      
      # Check if we've exceeded the limit
      @emergency_render_state[:render_count] >= MAX_RENDERS_PER_SECOND
    end
    
    # Generate hash of current view state to detect redundant renders
    def calculate_state_hash
      # Collect relevant instance variables for state hashing
      state_vars = instance_variables.select { |var| 
        var != :@emergency_render_state && 
        var != :@page &&
        !var.to_s.start_with?('@__')
      }
      
      state_data = state_vars.map { |var| 
        value = instance_variable_get(var)
        [var, serialize_for_hash(value)]
      }.to_h
      
      Digest::SHA256.hexdigest(JSON.dump(state_data))
    rescue => e
      # Fallback hash if serialization fails
      Digest::SHA256.hexdigest("#{self.class.name}_#{Time.now.to_f}")
    end
    
    # Serialize value for hashing (handle complex objects)
    def serialize_for_hash(value)
      case value
      when String, Integer, Float, Boolean, NilClass
        value
      when Array
        value.map { |item| serialize_for_hash(item) }
      when Hash
        value.transform_values { |v| serialize_for_hash(v) }
      when Symbol
        value.to_s
      else
        # For complex objects, use class name and basic info
        "#{value.class.name}:#{value.object_id}"
      end
    end
    
    # Update throttling counters after successful render
    def update_throttling_counters(current_time)
      window_start = @emergency_render_state[:render_window_start]
      
      # Reset window if expired
      if current_time - window_start > RENDER_THROTTLE_WINDOW
        @emergency_render_state[:render_count] = 1
        @emergency_render_state[:render_window_start] = current_time
      else
        @emergency_render_state[:render_count] += 1
      end
    end
    
    # Queue deferred update for later processing
    def queue_deferred_update
      @emergency_render_state[:update_queue] << {
        timestamp: Time.now,
        state_hash: calculate_state_hash,
        priority: :throttled
      }
    end
    
    # Calculate update priority for queue processing
    def calculate_update_priority
      # Higher priority for user interactions
      if defined?(@handling_user_event) && @handling_user_event
        :high
      else
        :normal
      end
    end
    
    # Update render timing metrics
    def update_render_metrics(render_time)
      times = @emergency_render_state[:render_times]
      times << render_time
      
      # Keep only last 10 measurements
      times.shift if times.size > 10
      
      @emergency_render_state[:average_render_time] = times.sum / times.size
    end
    
    # Activate emergency mode when problems detected
    def activate_emergency_mode
      @emergency_render_state[:emergency_mode] = true
      @emergency_render_state[:render_suspended] = true
      
      emergency_log(:error, "Emergency mode activated - rendering suspended", {
        view_class: self.class.name
      })
      
      # Schedule automatic recovery
      Async do
        sleep EMERGENCY_COOLDOWN_PERIOD
        @emergency_render_state[:emergency_mode] = false
        @emergency_render_state[:render_suspended] = false
        emergency_log(:info, "Emergency mode deactivated - rendering resumed", {
          view_class: self.class.name
        })
      end
    end
    
    # Start the background update processor for batching
    def start_update_processor
      return if @emergency_render_state[:update_task]
      
      @emergency_render_state[:update_task] = Async do
        loop do
          begin
            sleep 0.1 # Process updates every 100ms
            
            process_queued_updates unless @emergency_render_state[:processing_updates]
            
          rescue => e
            emergency_log(:error, "Update processor error", {
              view_class: self.class.name,
              error: e.message
            })
            
            # Reset processor state on error
            @emergency_render_state[:processing_updates] = false
            sleep 1 # Wait before retrying
          end
        end
      end
    end
    
    # Process queued updates in batches
    def process_queued_updates
      return if @emergency_render_state[:update_queue].empty?
      return if emergency_render_blocked?
      
      @emergency_render_state[:processing_updates] = true
      
      begin
        # Sort queue by priority and timestamp
        queue = @emergency_render_state[:update_queue].sort_by do |update|
          priority_value = case update[:priority]
          when :high then 0
          when :normal then 1
          when :throttled then 2
          else 3
          end
          [priority_value, update[:timestamp]]
        end
        
        # Process most recent unique state
        latest_update = queue.last
        if latest_update && latest_update[:state_hash] != @emergency_render_state[:last_state_hash]
          emergency_log(:debug, "Processing queued update", {
            view_class: self.class.name,
            queue_size: queue.size,
            priority: latest_update[:priority]
          })
          
          # Clear queue and process
          @emergency_render_state[:update_queue].clear
          @emergency_render_state[:pending_state_hash] = nil
          
          # Execute the actual update
          update!
        else
          # Clear queue if no meaningful updates
          @emergency_render_state[:update_queue].clear
          @emergency_render_state[:pending_state_hash] = nil
        end
        
      ensure
        @emergency_render_state[:processing_updates] = false
      end
    end
    
    # Emergency logging helper
    def emergency_log(level, message, details = {})
      self.class.emergency_log(level, message, details.merge(
        view_id: object_id,
        emergency_status: emergency_status.slice(:render_blocked, :circuit_breaker_active, :emergency_mode)
      ))
    end
  end
end

# Global emergency patch utilities
module EmergencyPatchUtils
  # Global emergency statistics across all views
  def self.global_emergency_status
    # This would typically be stored in a shared location like Redis
    # For now, we'll provide a basic implementation
    {
      timestamp: Time.now,
      total_views_with_patch: 0, # This would be tracked globally
      active_circuit_breakers: 0,
      total_throttled_renders: 0,
      system_health: :green # :green, :yellow, :red
    }
  end
  
  # Emergency reset for all views (nuclear option)
  def self.global_emergency_reset!
    puts "[EMERGENCY] Global emergency reset initiated at #{Time.now}"
    # In a real implementation, this would reset all active views
    # For now, we log the action
  end
  
  # Check if system is under emergency conditions
  def self.system_emergency_active?
    # This would check global emergency indicators
    false
  end
end