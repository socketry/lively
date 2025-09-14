# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require "live"
require "protocol/http/middleware"
require "async/websocket/adapters/http"

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
	class Application < Protocol::HTTP::Middleware
		# Create a new application class configured for a specific Live view tag.
		# @parameter tag [Class] The Live view class to use as the application body.
		# @returns [Class] A new application class configured for the specified tag.
		def self.[](tag)
			klass = Class.new(self)
			
			klass.define_singleton_method(:resolver) do
				Live::Resolver.allow(tag)
			end
			
			klass.define_method(:body) do
				tag.new
			end
			
			return klass
		end
		
		# Get the default resolver for this application.
		# @returns [Live::Resolver] A resolver configured to allow HelloWorld components.
		def self.resolver
			Live::Resolver.allow(HelloWorld)
		end
		
		# Initialize a new Lively application.
		# @parameter delegate [Protocol::HTTP::Middleware] The next middleware in the chain.
		# @parameter resolver [Live::Resolver] The resolver for Live components.
		def initialize(delegate, resolver: self.class.resolver)
			super(delegate)
			
			@resolver = resolver
		end
		
		# @attribute [Live::Resolver] The resolver for live components.
		attr :resolver
		
		# @attribute [Protocol::HTTP::Middleware] The delegate middleware for request handling.
		attr :delegate
		
		# Handle a WebSocket connection for live updates.
		# @parameter connection [Async::WebSocket::Connection] The WebSocket connection.
		def live(connection)
			Live::Page.new(@resolver).run(connection)
		end
		
		# Get the title for this application.
		# @returns [String] The class name of this application.
		def title
			self.class.name
		end
		
		# Create the body content for this application.
		# @parameter **options [Hash] Additional options to pass to the body constructor.
		# @returns [HelloWorld] A new HelloWorld instance.
		def body(...)
			HelloWorld.new(...)
		end
		
		# Create the index page for this application.
		# @parameter **options [Hash] Additional options to pass to the index constructor.
		# @returns [Pages::Index] A new index page instance.
		def index(...)
			Pages::Index.new(title: self.title, body: self.body(...))
		end
		
		# Handle a standard HTTP request.
		# @parameter request [Protocol::HTTP::Request] The incoming HTTP request.
		# @parameter **options [Hash] Additional options.
		# @returns [Protocol::HTTP::Response] The HTTP response with the rendered page.
		def handle(request, ...)
			return Protocol::HTTP::Response[200, [], [self.index(...).call]]
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
