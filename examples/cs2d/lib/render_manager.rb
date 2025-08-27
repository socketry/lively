# frozen_string_literal: true

require "async"
require "json"
require "digest"
require "set"
require "monitor"

# 🎯 PRODUCTION-READY RENDER MANAGER
#
# Advanced rendering system that solves the infinite loop problem with enterprise-grade
# solutions including queue-based rendering, state hashing, batch processing, and
# comprehensive monitoring.
#
# KEY FEATURES:
# 1. Queue-based rendering with priority levels
# 2. State hashing to avoid redundant renders
# 3. Throttling (max 10 renders per second)
# 4. Batch processing of similar updates
# 5. Comprehensive debugging hooks
# 6. Performance monitoring
# 7. Graceful degradation under load
# 8. Memory leak prevention
#
# ARCHITECTURE:
# - RenderManager: Central coordinator for all rendering operations
# - RenderQueue: Priority-based queue with batching capabilities
# - StateTracker: Tracks view states to prevent redundant renders
# - PerformanceMonitor: Tracks render performance and health
# - DebugHooks: Comprehensive debugging and logging system
#
class RenderManager
  include MonitorMixin
  
  # Configuration constants
  MAX_RENDERS_PER_SECOND = 10
  THROTTLE_WINDOW_SIZE = 1.0 # seconds
  MAX_QUEUE_SIZE = 1000
  BATCH_PROCESSING_DELAY = 0.05 # 50ms batching window
  STATE_CACHE_SIZE = 100
  PERFORMANCE_SAMPLE_SIZE = 50
  EMERGENCY_PAUSE_DURATION = 5.0 # seconds
  
  # Priority levels for render requests
  PRIORITIES = {
    critical: 0,    # Emergency updates (errors, alerts)
    high: 1,        # User interactions
    normal: 2,      # Regular updates
    low: 3,         # Background updates
    batch: 4        # Batched background updates
  }.freeze
  
  def initialize(view_instance)
    super() # Initialize Monitor
    
    @view = view_instance
    @view_class = view_instance.class.name
    @view_id = view_instance.object_id
    
    # Core components
    @render_queue = RenderQueue.new(self)
    @state_tracker = StateTracker.new
    @performance_monitor = PerformanceMonitor.new
    @debug_hooks = DebugHooks.new(@view_class, @view_id)
    
    # Rendering state
    @rendering_active = false
    @render_suspended = false
    @emergency_mode = false
    @last_render_time = nil
    @render_count_window = []
    
    # Background processing
    @processor_task = nil
    @shutdown_requested = false
    
    start_background_processor
    
    @debug_hooks.log(:info, "RenderManager initialized", {
      view_class: @view_class,
      view_id: @view_id
    })
  end
  
  # Main entry point for render requests
  def request_render(priority: :normal, metadata: {}, &block)
    return false if render_blocked?
    
    synchronize do
      # Create render request
      request = RenderRequest.new(
        view: @view,
        priority: priority,
        metadata: metadata,
        timestamp: Time.now,
        block: block,
        state_hash: @state_tracker.current_state_hash(@view),
        request_id: generate_request_id
      )
      
      # Check if render is necessary
      unless should_render?(request)
        @debug_hooks.log(:debug, "Render skipped - not necessary", {
          reason: @state_tracker.skip_reason,
          state_hash: request.state_hash[0..8]
        })
        return false
      end
      
      # Add to queue
      success = @render_queue.enqueue(request)
      
      if success
        @debug_hooks.log(:debug, "Render request queued", {
          priority: priority,
          queue_size: @render_queue.size,
          request_id: request.request_id
        })
      else
        @debug_hooks.log(:warn, "Render request dropped - queue full", {
          priority: priority,
          queue_size: @render_queue.size
        })
      end
      
      success
    end
  end
  
  # Force immediate render (use sparingly)
  def force_render(metadata: {})
    return false if @render_suspended
    
    @debug_hooks.log(:warn, "Force render requested", metadata)
    
    synchronize do
      execute_render(
        RenderRequest.new(
          view: @view,
          priority: :critical,
          metadata: metadata.merge(forced: true),
          timestamp: Time.now,
          state_hash: @state_tracker.current_state_hash(@view),
          request_id: generate_request_id
        )
      )
    end
  end
  
  # Get current rendering status
  def status
    synchronize do
      {
        active: @rendering_active,
        suspended: @render_suspended,
        emergency_mode: @emergency_mode,
        queue_size: @render_queue.size,
        last_render: @last_render_time,
        render_rate: calculate_render_rate,
        performance: @performance_monitor.summary,
        state_tracker: @state_tracker.status,
        memory_usage: calculate_memory_usage
      }
    end
  end
  
  # Suspend rendering (emergency stop)
  def suspend_rendering(reason = "manual", duration = nil)
    synchronize do
      @render_suspended = true
      @debug_hooks.log(:warn, "Rendering suspended", {
        reason: reason,
        duration: duration
      })
      
      if duration
        Async do
          sleep duration
          resume_rendering("automatic after #{duration}s")
        end
      end
    end
  end
  
  # Resume rendering
  def resume_rendering(reason = "manual")
    synchronize do
      @render_suspended = false
      @emergency_mode = false
      @debug_hooks.log(:info, "Rendering resumed", {
        reason: reason
      })
    end
  end
  
  # Shutdown the render manager
  def shutdown
    @debug_hooks.log(:info, "Shutting down RenderManager")
    
    synchronize do
      @shutdown_requested = true
      @processor_task&.stop
      @render_queue.clear
    end
  end
  
  # Get comprehensive debugging information
  def debug_info
    synchronize do
      {
        manager: {
          view_class: @view_class,
          view_id: @view_id,
          status: status
        },
        queue: @render_queue.debug_info,
        state_tracker: @state_tracker.debug_info,
        performance: @performance_monitor.debug_info,
        recent_logs: @debug_hooks.recent_logs(20)
      }
    end
  end
  
  private
  
  def render_blocked?
    @render_suspended || @emergency_mode || throttling_active?
  end
  
  def should_render?(request)
    # Always render critical requests
    return true if request.priority == :critical
    
    # Check state tracker
    @state_tracker.should_render?(request.state_hash)
  end
  
  def throttling_active?
    current_time = Time.now
    
    # Clean old entries from window
    @render_count_window.reject! { |time| current_time - time > THROTTLE_WINDOW_SIZE }
    
    # Check if we're over the limit
    @render_count_window.size >= MAX_RENDERS_PER_SECOND
  end
  
  def calculate_render_rate
    current_time = Time.now
    recent_renders = @render_count_window.select { |time| current_time - time <= 1.0 }
    recent_renders.size
  end
  
  def start_background_processor
    @processor_task = Async do
      while !@shutdown_requested
        begin
          process_render_queue
          sleep BATCH_PROCESSING_DELAY
        rescue => e
          @debug_hooks.log(:error, "Background processor error", {
            error: e.message,
            backtrace: e.backtrace[0..2]
          })
          
          # Activate emergency mode on repeated failures
          activate_emergency_mode if @performance_monitor.error_rate > 0.5
          
          sleep 1 # Wait before retrying
        end
      end
    end
  end
  
  def process_render_queue
    return if render_blocked?
    return if @render_queue.empty?
    
    # Get batched requests
    requests = @render_queue.dequeue_batch
    return if requests.empty?
    
    # Process the most recent request for each unique state
    unique_requests = deduplicate_requests(requests)
    
    unique_requests.each do |request|
      execute_render(request) unless render_blocked?
    end
  end
  
  def deduplicate_requests(requests)
    # Keep only the most recent request for each unique state hash
    state_map = {}
    
    requests.each do |request|
      existing = state_map[request.state_hash]
      if !existing || request.timestamp > existing.timestamp
        state_map[request.state_hash] = request
      end
    end
    
    # Return requests sorted by priority and timestamp
    state_map.values.sort_by { |r| [PRIORITIES[r.priority], r.timestamp] }
  end
  
  def execute_render(request)
    return if render_blocked?
    
    synchronize do
      @rendering_active = true
      render_start_time = Time.now
      
      begin
        @debug_hooks.log(:debug, "Executing render", {
          request_id: request.request_id,
          priority: request.priority,
          state_hash: request.state_hash[0..8]
        })
        
        # Execute the render block or call update!
        if request.block
          request.block.call
        else
          # Call the original Lively update! method
          @view.send(:original_update!)
        end
        
        # Record successful render
        render_duration = Time.now - render_start_time
        @performance_monitor.record_render(render_duration, true)
        @state_tracker.record_render(request.state_hash)
        
        # Update throttling tracking
        @render_count_window << render_start_time
        @last_render_time = render_start_time
        
        @debug_hooks.log(:debug, "Render completed", {
          request_id: request.request_id,
          duration: "#{(render_duration * 1000).round(2)}ms"
        })
        
      rescue => e
        # Record failed render
        render_duration = Time.now - render_start_time
        @performance_monitor.record_render(render_duration, false)
        
        @debug_hooks.log(:error, "Render failed", {
          request_id: request.request_id,
          error: e.message,
          duration: "#{(render_duration * 1000).round(2)}ms"
        })
        
        # Check if we should activate emergency mode
        if @performance_monitor.error_rate > 0.3
          activate_emergency_mode
        end
        
        raise e
        
      ensure
        @rendering_active = false
      end
    end
  end
  
  def activate_emergency_mode
    @emergency_mode = true
    @debug_hooks.log(:error, "Emergency mode activated", {
      error_rate: @performance_monitor.error_rate,
      recent_errors: @performance_monitor.recent_errors
    })
    
    # Auto-recovery after emergency pause
    Async do
      sleep EMERGENCY_PAUSE_DURATION
      resume_rendering("emergency mode timeout")
    end
  end
  
  def generate_request_id
    "#{@view_id}_#{Time.now.to_f}_#{rand(1000)}"
  end
  
  def calculate_memory_usage
    # Basic memory usage calculation
    # In production, this could use more sophisticated memory tracking
    {
      queue_size: @render_queue.size,
      state_cache_size: @state_tracker.cache_size,
      performance_samples: @performance_monitor.sample_count
    }
  end
end

# Render request data structure
class RenderRequest
  attr_reader :view, :priority, :metadata, :timestamp, :block, :state_hash, :request_id
  
  def initialize(view:, priority:, metadata:, timestamp:, state_hash:, request_id:, block: nil)
    @view = view
    @priority = priority
    @metadata = metadata
    @timestamp = timestamp
    @block = block
    @state_hash = state_hash
    @request_id = request_id
  end
  
  def age
    Time.now - @timestamp
  end
  
  def priority_value
    RenderManager::PRIORITIES[@priority] || 99
  end
end

# Priority-based render queue with batching
class RenderQueue
  def initialize(manager)
    @manager = manager
    @queue = []
    @max_size = RenderManager::MAX_QUEUE_SIZE
  end
  
  def enqueue(request)
    return false if @queue.size >= @max_size
    
    @queue << request
    @queue.sort_by! { |r| [r.priority_value, r.timestamp] }
    
    # Remove oldest low-priority items if queue is getting full
    cleanup_queue if @queue.size > @max_size * 0.8
    
    true
  end
  
  def dequeue_batch(max_items = 10)
    batch = @queue.shift(max_items)
    batch || []
  end
  
  def clear
    @queue.clear
  end
  
  def empty?
    @queue.empty?
  end
  
  def size
    @queue.size
  end
  
  def debug_info
    {
      size: @queue.size,
      max_size: @max_size,
      priority_distribution: @queue.group_by(&:priority).transform_values(&:size),
      oldest_request_age: @queue.first&.age,
      newest_request_age: @queue.last&.age
    }
  end
  
  private
  
  def cleanup_queue
    # Remove low-priority old requests
    cutoff_time = Time.now - 5.0 # Remove requests older than 5 seconds
    
    @queue.reject! do |request|
      request.priority == :low && request.timestamp < cutoff_time
    end
  end
end

# State tracking to prevent redundant renders
class StateTracker
  def initialize
    @state_cache = {}
    @last_state_hash = nil
    @max_cache_size = RenderManager::STATE_CACHE_SIZE
    @skip_reason = nil
  end
  
  attr_reader :skip_reason
  
  def current_state_hash(view)
    # Generate hash from view's relevant state
    state_vars = view.instance_variables.reject do |var|
      var.to_s.start_with?('@__') || 
      var == :@page ||
      var == :@render_manager
    end
    
    state_data = state_vars.map do |var|
      value = view.instance_variable_get(var)
      [var, serialize_for_hash(value)]
    end.to_h
    
    Digest::SHA256.hexdigest(JSON.dump(state_data))
  rescue => e
    # Fallback hash
    Digest::SHA256.hexdigest("#{view.class.name}_#{Time.now.to_f}")
  end
  
  def should_render?(state_hash)
    if @last_state_hash == state_hash
      @skip_reason = :identical_state
      return false
    end
    
    if recently_rendered?(state_hash)
      @skip_reason = :recently_rendered
      return false
    end
    
    true
  end
  
  def record_render(state_hash)
    @last_state_hash = state_hash
    @state_cache[state_hash] = Time.now
    
    # Cleanup old cache entries
    cleanup_cache if @state_cache.size > @max_cache_size
  end
  
  def cache_size
    @state_cache.size
  end
  
  def status
    {
      last_state_hash: @last_state_hash&.[](0..8),
      cache_size: @state_cache.size,
      skip_reason: @skip_reason
    }
  end
  
  def debug_info
    {
      cache_size: @state_cache.size,
      max_cache_size: @max_cache_size,
      last_state_hash: @last_state_hash&.[](0..16),
      recent_states: @state_cache.keys.last(5).map { |h| h[0..8] }
    }
  end
  
  private
  
  def recently_rendered?(state_hash)
    last_render_time = @state_cache[state_hash]
    return false unless last_render_time
    
    Time.now - last_render_time < 1.0 # Don't re-render same state within 1 second
  end
  
  def serialize_for_hash(value)
    case value
    when String, Integer, Float, TrueClass, FalseClass, NilClass
      value
    when Symbol
      value.to_s
    when Array
      value.map { |item| serialize_for_hash(item) }
    when Hash
      value.transform_values { |v| serialize_for_hash(v) }
    else
      "#{value.class.name}:#{value.object_id}"
    end
  end
  
  def cleanup_cache
    # Remove oldest entries
    sorted_entries = @state_cache.sort_by { |_, time| time }
    entries_to_remove = sorted_entries.first(@state_cache.size - @max_cache_size * 0.8)
    
    entries_to_remove.each { |hash, _| @state_cache.delete(hash) }
  end
end

# Performance monitoring and metrics
class PerformanceMonitor
  def initialize
    @render_times = []
    @render_successes = []
    @max_samples = RenderManager::PERFORMANCE_SAMPLE_SIZE
    @error_count = 0
    @total_renders = 0
    @start_time = Time.now
  end
  
  def record_render(duration, success)
    @render_times << duration
    @render_successes << success
    @total_renders += 1
    @error_count += 1 unless success
    
    # Keep only recent samples
    if @render_times.size > @max_samples
      @render_times.shift
      @render_successes.shift
    end
  end
  
  def error_rate
    return 0.0 if @render_successes.empty?
    
    failed_count = @render_successes.count(false)
    failed_count.to_f / @render_successes.size
  end
  
  def average_render_time
    return 0.0 if @render_times.empty?
    
    @render_times.sum / @render_times.size
  end
  
  def sample_count
    @render_times.size
  end
  
  def summary
    {
      total_renders: @total_renders,
      error_count: @error_count,
      error_rate: error_rate,
      average_render_time: "#{(average_render_time * 1000).round(2)}ms",
      sample_count: sample_count,
      uptime: "#{(Time.now - @start_time).round(1)}s"
    }
  end
  
  def recent_errors
    @render_successes.last(10).map.with_index { |success, i| success ? nil : i }.compact
  end
  
  def debug_info
    {
      render_times: @render_times.last(5).map { |t| "#{(t * 1000).round(2)}ms" },
      recent_successes: @render_successes.last(10),
      percentile_95: percentile(95),
      percentile_99: percentile(99)
    }
  end
  
  private
  
  def percentile(p)
    return 0.0 if @render_times.empty?
    
    sorted_times = @render_times.sort
    index = (p / 100.0 * sorted_times.size).ceil - 1
    index = [0, [index, sorted_times.size - 1].min].max
    
    "#{(sorted_times[index] * 1000).round(2)}ms"
  end
end

# Comprehensive debugging and logging system
class DebugHooks
  MAX_LOG_ENTRIES = 100
  
  def initialize(view_class, view_id)
    @view_class = view_class
    @view_id = view_id
    @logs = []
    @log_levels = %i[debug info warn error]
  end
  
  def log(level, message, details = {})
    return unless @log_levels.include?(level)
    
    entry = {
      timestamp: Time.now,
      level: level,
      message: message,
      details: details,
      view_class: @view_class,
      view_id: @view_id
    }
    
    @logs << entry
    @logs.shift if @logs.size > MAX_LOG_ENTRIES
    
    # Also output to console in development
    if ENV['RACK_ENV'] != 'production'
      timestamp = entry[:timestamp].strftime("%H:%M:%S.%3N")
      puts "[#{timestamp}] RENDER_MANAGER #{level.upcase}: #{message}"
      if details.any?
        puts "  Details: #{details.inspect}"
      end
    end
  end
  
  def recent_logs(count = 10)
    @logs.last(count)
  end
  
  def logs_by_level(level)
    @logs.select { |entry| entry[:level] == level }
  end
  
  def clear_logs
    @logs.clear
  end
end

# Global render manager registry for debugging
module RenderManagerRegistry
  @managers = {}
  @mutex = Mutex.new
  
  def self.register(view_id, manager)
    @mutex.synchronize do
      @managers[view_id] = manager
    end
  end
  
  def self.unregister(view_id)
    @mutex.synchronize do
      @managers.delete(view_id)
    end
  end
  
  def self.all_managers
    @mutex.synchronize do
      @managers.values
    end
  end
  
  def self.global_status
    @mutex.synchronize do
      managers = @managers.values
      
      {
        total_managers: managers.size,
        active_renders: managers.count { |m| m.status[:active] },
        suspended_renders: managers.count { |m| m.status[:suspended] },
        emergency_modes: managers.count { |m| m.status[:emergency_mode] },
        total_queue_size: managers.sum { |m| m.status[:queue_size] },
        average_render_rate: managers.map { |m| m.status[:render_rate] }.sum / [managers.size, 1].max
      }
    end
  end
  
  def self.emergency_shutdown_all
    @mutex.synchronize do
      @managers.values.each(&:shutdown)
      @managers.clear
    end
  end
end