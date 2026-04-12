# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2026, by Samuel Williams.

require "live"
require "protocol/http/middleware"
require "async/websocket/adapters/http"

require_relative "resolver"
require_relative "pages/index"
require_relative "hello_world"

# @namespace
module Lively
	# Represents the main Lively application middleware.
	# 
	# This class serves as the entry point for Lively applications, handling both
	# standard HTTP requests for the initial page load and WebSocket connections
	# for live updates. It integrates with the Live framework to provide real-time
	# interactive web applications.
	#
	# Use {.[]} to create a simple application class for a single view, optionally
	# with shared state. For more complex applications, subclass and override
	# {#allowed_views}, {#state}, and {#body}.
	class Application < Protocol::HTTP::Middleware
		VIEWS = [HelloWorld].freeze
		STATE = {}.freeze
		
		# Create a new application class configured for a specific Live view tag,
		# optionally with shared state that is passed to all views.
		#
		# @parameter tag [Class] The Live view class to use as the application body.
		# @parameter state [Hash] Shared state to pass to all views as keyword arguments.
		# @returns [Class] A new application class configured for the specified tag.
		def self.[](*tags, **state)
			klass = Class.new(self)
			
			klass.const_set(:VIEWS, tags)
			klass.const_set(:STATE, state)
			
			return klass
		end
		
		# Initialize a new Lively application.
		# @parameter delegate [Protocol::HTTP::Middleware] The next middleware in the chain.
		def initialize(delegate)
			super(delegate)
		end
		
		# @attribute [Protocol::HTTP::Middleware] The delegate middleware for request handling.
		attr :delegate
		
		# The shared state for this application, passed to all views via the resolver.
		# Override this in subclasses to provide custom state.
		# @returns [Hash] Key-value pairs passed as keyword arguments to view constructors.
		def state
			self.class::STATE
		end
		
		# The view classes that this application allows.
		# Override this in subclasses to specify which views can be resolved.
		# @returns [Array(Class)] The allowed view classes.
		def allowed_views
			self.class::VIEWS
		end
		
		# The resolver for live components.
		# Built from {#allowed_views} and {#state}.
		# @returns [Lively::Resolver] The resolver instance.
		def resolver
			@resolver ||= Resolver.new(self.state).tap do |resolver|
				resolver.allow(*self.allowed_views)
			end
		end
		
		# Handle a WebSocket connection for live updates.
		# @parameter connection [Async::WebSocket::Connection] The WebSocket connection.
		def live(connection)
			Live::Page.new(self.resolver).run(connection)
		end
		
		# Get the title for this application.
		# @returns [String] The class name of this application.
		def title
			self.class.name
		end
		
		# Create the body content for this application.
		# @returns [Live::View] A new view instance.
		def body
			self.allowed_views.first.new(**self.state)
		end
		
		# Create the index page for this application.
		# @returns [Pages::Index] A new index page instance.
		def index
			Pages::Index.new(title: self.title, body: self.body)
		end
		
		# Handle a standard HTTP request.
		# @parameter request [Protocol::HTTP::Request] The incoming HTTP request.
		# @returns [Protocol::HTTP::Response] The HTTP response with the rendered page.
		def handle(request)
			return Protocol::HTTP::Response[200, [], [self.index.call]]
		end
		
		# Process an incoming HTTP request.
		# @parameter request [Protocol::HTTP::Request] The incoming HTTP request.
		# @returns [Protocol::HTTP::Response] The appropriate response for the request.
		def call(request)
			if request.path == "/live"
				return Async::WebSocket::Adapters::HTTP.open(request, &self.method(:live)) || Protocol::HTTP::Response[400]
			else
				return handle(request)
			end
		end
	end
end
