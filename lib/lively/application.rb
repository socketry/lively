# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require 'live'
require 'async/websocket/adapters/http'

require_relative 'pages/index'

module Lively
	class Application < Protocol::HTTP::Middleware
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
		
		def body
			"Hello World"
		end
		
		def index
			Pages::Index.new(title: self.title, body: self.body)
		end
		
		def call(request)
			if request.path == '/live'
				return Async::WebSocket::Adapters::HTTP.open(request, &self.method(:live)) || Protocol::HTTP::Response[400]
			else
				return Protocol::HTTP::Response[200, [], [self.index.call]]
			end
		end
	end
end
