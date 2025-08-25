# frozen_string_literal: true

require "live"
require_relative "emergency_patch"
require_relative "render_manager"

# 🎯 MANAGED VIEW - PRODUCTION-READY BASE CLASS
#
# This base class provides a complete solution for the Lively framework's infinite 
# rendering loop problem. All views should inherit from this class instead of 
# Live::View directly.
#
# FEATURES:
# - Automatic infinite loop prevention
# - Queue-based rendering with priorities
# - State change detection
# - Performance monitoring
# - Graceful error handling
# - Comprehensive debugging
# - Memory leak prevention
# - Production-ready logging
#
# USAGE:
#   class MyView < ManagedView
#     def render(builder)
#       # Your render code here
#     end
#     
#     def handle(event)
#       # Your event handling here
#       # No need to call update! - it's handled automatically
#     end
#   end
#
# MIGRATION FROM Live::View:
# 1. Change inheritance: Live::View -> ManagedView
# 2. Replace direct update! calls with safe_update!
# 3. Use request_priority_update for urgent updates
# 4. Remove manual throttling code (handled automatically)
#
class ManagedView < Live::View
  include EmergencyPatch
  
  # Class-level configuration
  class << self
    attr_accessor :default_render_priority, :auto_update_enabled, :debug_mode
    
    def configure
      yield self
    end
  end
  
  # Default configuration
  self.default_render_priority = :normal
  self.auto_update_enabled = true
  self.debug_mode = ENV['RACK_ENV'] != 'production'
  
  def initialize(...)
    super
    
    # Initialize render management
    @render_manager = RenderManager.new(self)
    @view_initialized = false
    @bind_count = 0
    @close_requested = false
    
    # Performance tracking
    @handle_event_count = 0
    @last_handle_time = nil
    @event_processing_times = []
    
    # Register with global registry for debugging
    RenderManagerRegistry.register(object_id, @render_manager)
    
    managed_log(:info, "ManagedView initialized", {
      view_class: self.class.name,
      object_id: object_id
    })
  end
  
  # Override bind to prevent multiple bindings and infinite loops
  def bind(page)
    @bind_count += 1
    
    if @bind_count > 1
      managed_log(:warn, "Multiple bind calls detected", {
        bind_count: @bind_count,
        view_initialized: @view_initialized
      })
      
      # Only allow re-binding if view was properly closed
      return if @view_initialized && !@close_requested
    end
    
    begin
      managed_log(:debug, "Binding view to page", {
        bind_count: @bind_count
      })
      
      super(page)
      
      @view_initialized = true
      @close_requested = false
      
      # Request initial render through render manager
      request_safe_update(:normal, {
        reason: :initial_bind,
        bind_count: @bind_count
      })
      
      # Call custom initialization hook
      after_bind if respond_to?(:after_bind, true)
      
      managed_log(:info, "View bound successfully", {
        bind_count: @bind_count
      })
      
    rescue => e
      managed_log(:error, "Bind failed", {
        error: e.message,
        backtrace: e.backtrace[0..2]
      })
      
      # Clean up on failed bind
      emergency_cleanup
      raise e
    end
  end
  
  # Override close to clean up resources
  def close
    @close_requested = true
    
    managed_log(:info, "Closing view", {
      handle_event_count: @handle_event_count
    })
    
    begin
      # Call custom cleanup hook
      before_close if respond_to?(:before_close, true)
      
      # Shutdown render manager
      @render_manager&.shutdown
      
      # Unregister from global registry
      RenderManagerRegistry.unregister(object_id)
      
      super
      
    rescue => e
      managed_log(:error, "Close failed", {
        error: e.message
      })
      
      # Force cleanup even if super fails
      emergency_cleanup
      raise e
    ensure
      @view_initialized = false
    end
  end
  
  # Enhanced event handling with automatic update management
  def handle(event)
    return if @close_requested
    
    event_start_time = Time.now
    @handle_event_count += 1
    @last_handle_time = event_start_time
    
    managed_log(:debug, "Handling event", {
      event_type: event[:type],
      handle_count: @handle_event_count
    })
    
    begin
      # Mark that we're handling a user event (for priority calculation)
      @handling_user_event = true
      
      # Call the custom event handler
      result = handle_managed_event(event)
      
      # Calculate event processing time
      processing_time = Time.now - event_start_time
      @event_processing_times << processing_time
      @event_processing_times.shift if @event_processing_times.size > 20
      
      # Auto-update if enabled (most events should trigger a render)
      if self.class.auto_update_enabled && should_auto_update?(event)
        request_safe_update(calculate_event_priority(event), {
          reason: :event_handled,
          event_type: event[:type],
          processing_time: processing_time
        })
      end
      
      managed_log(:debug, "Event handled successfully", {
        event_type: event[:type],
        processing_time: "#{(processing_time * 1000).round(2)}ms",
        auto_updated: self.class.auto_update_enabled && should_auto_update?(event)
      })
      
      result
      
    rescue => e
      processing_time = Time.now - event_start_time
      
      managed_log(:error, "Event handling failed", {
        event_type: event[:type],
        error: e.message,
        processing_time: "#{(processing_time * 1000).round(2)}ms",
        backtrace: e.backtrace[0..3]
      })
      
      # Request error render to show error state
      request_safe_update(:critical, {
        reason: :error_recovery,
        event_type: event[:type],
        error: e.message
      })
      
      raise e
      
    ensure
      @handling_user_event = false
    end
  end
  
  # Safe update method that uses the render manager
  def safe_update!(priority: nil, metadata: {})
    priority ||= self.class.default_render_priority
    request_safe_update(priority, metadata)
  end
  
  # Request high-priority update (for urgent UI changes)
  def request_priority_update(metadata: {})
    request_safe_update(:high, metadata.merge(
      reason: :priority_request,
      requested_at: Time.now
    ))
  end
  
  # Request low-priority update (for background changes)
  def request_background_update(metadata: {})
    request_safe_update(:low, metadata.merge(
      reason: :background_update,
      requested_at: Time.now
    ))
  end
  
  # Force immediate render (emergency use only)
  def force_immediate_render!(metadata: {})
    managed_log(:warn, "Force immediate render requested", metadata)
    
    return false unless @render_manager
    
    @render_manager.force_render(
      metadata: metadata.merge(
        reason: :force_immediate,
        requested_at: Time.now,
        caller_info: caller(1..3)
      )
    )
  end
  
  # Get comprehensive view status
  def managed_status
    base_status = {
      view_class: self.class.name,
      object_id: object_id,
      initialized: @view_initialized,
      bind_count: @bind_count,
      close_requested: @close_requested,
      handle_event_count: @handle_event_count,
      last_handle_time: @last_handle_time,
      average_event_time: calculate_average_event_time
    }
    
    if @render_manager
      base_status.merge(@render_manager.status)
    else
      base_status.merge({ render_manager: :not_initialized })
    end
  end
  
  # Get debug information for troubleshooting
  def debug_info
    if @render_manager
      @render_manager.debug_info.merge({
        view_info: {
          class: self.class.name,
          object_id: object_id,
          instance_variables: relevant_instance_variables,
          event_stats: {
            total_events: @handle_event_count,
            average_event_time: calculate_average_event_time,
            recent_event_times: @event_processing_times.last(5).map { |t| "#{(t * 1000).round(2)}ms" }
          }
        }
      })
    else
      { error: "RenderManager not initialized" }
    end
  end
  
  # Suspend rendering (emergency use)
  def suspend_rendering!(reason = "manual", duration = nil)
    @render_manager&.suspend_rendering(reason, duration)
  end
  
  # Resume rendering
  def resume_rendering!(reason = "manual")
    @render_manager&.resume_rendering(reason)
  end
  
  # Check if rendering is currently suspended
  def rendering_suspended?
    return true unless @render_manager
    @render_manager.status[:suspended]
  end
  
  protected
  
  # Override this method in subclasses to handle events
  # This replaces the original handle method
  def handle_managed_event(event)
    managed_log(:warn, "handle_managed_event not implemented", {
      event_type: event[:type],
      view_class: self.class.name
    })
    
    # Call original handle if it exists and isn't the ManagedView version
    if method(:handle).super_method&.owner != ManagedView
      method(:handle).super_method.call(event)
    end
  end
  
  # Override this to control when auto-updates should happen
  def should_auto_update?(event)
    # Most events should trigger updates, but some might not need to
    case event[:type]
    when 'heartbeat', 'ping', 'keepalive'
      false
    else
      true
    end
  end
  
  # Override this to customize event priority calculation
  def calculate_event_priority(event)
    case event[:type]
    when 'error', 'exception', 'alert'
      :critical
    when 'click', 'submit', 'change', 'input'
      :high
    when 'scroll', 'mouseover', 'focus', 'blur'
      :low
    else
      :normal
    end
  end
  
  # Hook called after successful bind
  def after_bind
    # Override in subclasses
  end
  
  # Hook called before close
  def before_close
    # Override in subclasses
  end
  
  private
  
  # Make original update! method available but discourage its use
  alias :original_update! :update!
  private :original_update!
  
  # Override update! to route through render manager
  def update!
    managed_log(:warn, "Direct update! call detected - use safe_update! instead", {
      caller_info: caller(1..2)
    })
    
    # Route through render manager with normal priority
    request_safe_update(:normal, {
      reason: :direct_update_call,
      caller_info: caller(1..2)
    })
  end
  
  def request_safe_update(priority, metadata)
    return false unless @render_manager
    return false if @close_requested
    
    @render_manager.request_render(
      priority: priority,
      metadata: metadata.merge(
        view_class: self.class.name,
        view_id: object_id,
        timestamp: Time.now
      )
    )
  end
  
  def calculate_average_event_time
    return 0.0 if @event_processing_times.empty?
    
    total_time = @event_processing_times.sum
    average_ms = (total_time / @event_processing_times.size) * 1000
    average_ms.round(2)
  end
  
  def relevant_instance_variables
    instance_variables.reject do |var|
      var.to_s.start_with?('@__') ||
      var == :@page ||
      var == :@render_manager ||
      var == :@emergency_render_state
    end.map do |var|
      value = instance_variable_get(var)
      [var, describe_value(value)]
    end.to_h
  end
  
  def describe_value(value)
    case value
    when String
      value.length > 50 ? "String(#{value.length} chars)" : value
    when Array
      "Array(#{value.size} items)"
    when Hash
      "Hash(#{value.size} keys)"
    when NilClass, TrueClass, FalseClass, Integer, Float
      value
    else
      "#{value.class.name}(#{value.object_id})"
    end
  end
  
  def emergency_cleanup
    begin
      @render_manager&.shutdown
      RenderManagerRegistry.unregister(object_id)
    rescue => e
      # Log but don't re-raise during emergency cleanup
      managed_log(:error, "Emergency cleanup failed", {
        error: e.message
      })
    end
  end
  
  def managed_log(level, message, details = {})
    return unless self.class.debug_mode
    
    timestamp = Time.now.strftime("%H:%M:%S.%3N")
    puts "[#{timestamp}] MANAGED_VIEW #{level.upcase}: #{message}"
    
    if details.any?
      puts "  #{details.inspect}"
    end
  end
end

# Utility module for migration assistance
module ManagedViewMigration
  # Helper to migrate existing Live::View classes
  def self.migrate_view_class(view_class)
    unless view_class < Live::View
      raise ArgumentError, "#{view_class} must inherit from Live::View"
    end
    
    if view_class < ManagedView
      puts "#{view_class} already inherits from ManagedView"
      return
    end
    
    puts "Migrating #{view_class} to use ManagedView..."
    
    # This is a helper for manual migration - actual inheritance change must be done manually
    migration_checklist = [
      "1. Change class inheritance: `class #{view_class.name} < ManagedView`",
      "2. Replace `update!` calls with `safe_update!`",
      "3. Use `request_priority_update` for urgent updates",
      "4. Implement `handle_managed_event` instead of `handle`",
      "5. Add `after_bind` and `before_close` hooks if needed",
      "6. Remove manual throttling/debouncing code",
      "7. Test with ManagedView debug mode enabled"
    ]
    
    puts "Migration checklist for #{view_class.name}:"
    migration_checklist.each { |item| puts "  #{item}" }
    
    puts "\nExample migration:"
    puts <<~EXAMPLE
      # Before:
      class #{view_class.name} < Live::View
        def handle(event)
          # process event
          self.update!
        end
      end
      
      # After:
      class #{view_class.name} < ManagedView
        def handle_managed_event(event)
          # process event
          # update is automatic
        end
      end
    EXAMPLE
  end
  
  # Check if a view class needs migration
  def self.needs_migration?(view_class)
    view_class < Live::View && !(view_class < ManagedView)
  end
  
  # Find all view classes that need migration
  def self.find_views_needing_migration
    ObjectSpace.each_object(Class).select do |klass|
      needs_migration?(klass)
    end
  end
end

# Development helpers
module ManagedViewHelpers
  # Get status of all managed views
  def self.all_view_status
    RenderManagerRegistry.all_managers.map do |manager|
      manager.status
    end
  end
  
  # Emergency shutdown all views
  def self.emergency_shutdown_all!
    puts "[EMERGENCY] Shutting down all managed views..."
    RenderManagerRegistry.emergency_shutdown_all
    puts "[EMERGENCY] All managed views shut down"
  end
  
  # Get global render statistics
  def self.global_status
    RenderManagerRegistry.global_status
  end
  
  # Performance report for all views
  def self.performance_report
    managers = RenderManagerRegistry.all_managers
    
    total_renders = managers.sum { |m| m.status.dig(:performance, :total_renders) || 0 }
    total_errors = managers.sum { |m| m.status.dig(:performance, :error_count) || 0 }
    active_views = managers.count { |m| m.status[:active] }
    
    {
      total_managed_views: managers.size,
      active_views: active_views,
      total_renders: total_renders,
      total_errors: total_errors,
      global_error_rate: total_renders > 0 ? (total_errors.to_f / total_renders).round(4) : 0.0,
      average_queue_size: managers.map { |m| m.status[:queue_size] }.sum / [managers.size, 1].max,
      system_health: calculate_system_health(managers)
    }
  end
  
  private
  
  def self.calculate_system_health(managers)
    return :unknown if managers.empty?
    
    emergency_count = managers.count { |m| m.status[:emergency_mode] }
    suspended_count = managers.count { |m| m.status[:suspended] }
    high_queue_count = managers.count { |m| m.status[:queue_size] > 10 }
    
    if emergency_count > 0 || suspended_count > managers.size * 0.2
      :critical
    elsif high_queue_count > managers.size * 0.5
      :warning
    else
      :healthy
    end
  end
end