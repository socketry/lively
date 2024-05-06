# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require 'live'
require 'protocol/http/middleware'
require 'async/websocket/adapters/http'

require_relative 'pages/index'
require_relative 'hello_world'

module Lively
	class Application < Protocol::HTTP::Middleware
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
		
		def self.resolver
			Live::Resolver.allow(HelloWorld)
		end
		
		def initialize(delegate, resolver: self.class.resolver)
			super(delegate)
			
			@resolver = resolver
		end
		
		def live(connection)
			Live::Page.new(@resolver).run(connection)
		end
		
		def title
			self.class.name
		end
		
		def body(...)
			HelloWorld.new(...)
		end
		
		def index(...)
			Pages::Index.new(title: self.title, body: self.body(...))
		end
		
		def handle(request, ...)
			return Protocol::HTTP::Response[200, [], [self.index(...).call]]
		end
		
		def call(request)
			if request.path == '/live'
				return Async::WebSocket::Adapters::HTTP.open(request, &self.method(:live)) || Protocol::HTTP::Response[400]
			else
				return handle(request)
			end
		end
	end
end
