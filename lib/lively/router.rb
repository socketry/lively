# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "protocol/http/middleware"
require "protocol/url"

module Lively
	# Dispatches HTTP requests to handlers using exact path and method matches.
	#
	# Request targets are parsed with {Protocol::URL::Reference}. Handlers receive
	# the original request.
	class Router < Protocol::HTTP::Middleware
		ANY_METHOD = nil
		private_constant :ANY_METHOD
		
		# Builds an immutable route table.
		class Builder
			# Initialize a route builder.
			def initialize
				@routes = {}
			end
			
			# A frozen snapshot of the configured routes.
			# @returns [Hash] The route table.
			def routes
				@routes.transform_values do |handlers|
					handlers.dup.freeze
				end.freeze
			end
			
			# Add a route.
			#
			# When `methods` is omitted, the handler accepts every HTTP method. Otherwise,
			# it may be a single method or an array of methods.
			#
			# @parameter path [String] The absolute path to match.
			# @parameter handler [Interface(:call) | Nil] A callable route handler.
			# @parameter methods [String | Symbol | Array(String | Symbol) | Nil] The accepted HTTP methods.
			# @yields {|request| ...} The route handler.
			# 	@parameter request [Protocol::HTTP::Request] The original request.
			# @returns [Builder] The builder.
			def route(path, handler = nil, methods: nil, &block)
				raise ArgumentError, "Provide a route handler or block, not both!" if handler && block
				handler ||= block
				raise ArgumentError, "A route handler is required!" unless handler
				
				path = route_path(path)
				methods = route_methods(methods)
				handlers = (@routes[path] ||= {})
				
				methods.each do |method|
					if handlers.key?(method)
						raise ArgumentError, "Route already defined for #{method || "any method"} #{path}!"
					end
					
					handlers[method] = handler
				end
				
				return self
			end
			
			Protocol::HTTP::Methods.each do |name, method|
				# Add a route for this HTTP method.
				# @parameter path [String] The absolute path to match.
				# @yields {|request| ...} The route handler.
				# @returns [Builder] The builder.
				define_method(name) do |path, handler = nil, &block|
					route(path, handler, methods: method, &block)
				end
			end
			
			private
			
			def route_path(path)
				url = Protocol::URL[path]
				
				unless url && !url.is_a?(Protocol::URL::Absolute)
					raise ArgumentError, "Route must be an absolute path: #{path.inspect}!"
				end
				
				reference = Protocol::URL::Reference[url]
				
				unless reference.path.absolute?
					raise ArgumentError, "Route must be an absolute path: #{path.inspect}!"
				end
				
				if reference.query? || reference.fragment?
					raise ArgumentError, "Route path cannot include a query or fragment: #{path.inspect}!"
				end
				
				return reference.path.freeze
			end
			
			def route_methods(methods)
				return [ANY_METHOD] unless methods
				
				methods = Array(methods)
				raise ArgumentError, "At least one HTTP method is required!" if methods.empty?
				
				return methods.map do |method|
					raise ArgumentError, "HTTP method cannot be nil!" unless method
					
					method.to_s.upcase
				end.uniq
			end
		end
		
		# Build and configure a frozen router.
		# @parameter delegate [Protocol::HTTP::Middleware] The middleware for unmatched requests.
		# @yields {|builder| ...} Configures the routes.
		# 	@parameter builder [Builder] The route builder.
		# @returns [Router] The configured router.
		def self.build(delegate = Protocol::HTTP::Middleware::NotFound)
			builder = Builder.new
			yield builder
			
			return new(delegate, builder.routes).freeze
		end
		
		# Initialize a router.
		# @parameter delegate [Protocol::HTTP::Middleware] The middleware for unmatched requests.
		# @parameter routes [Hash] The frozen route table.
		def initialize(delegate, routes)
			super(delegate)
			@routes = routes
		end
		
		# Dispatch a request to a matching route.
		# @parameter request [Protocol::HTTP::Request] The request to dispatch.
		# @returns [Protocol::HTTP::Response] The handler, error, or delegate response.
		def call(request)
			reference = parse_reference(request.path)
			return Protocol::HTTP::Response[400] unless reference
			
			return super unless handlers = @routes[reference.path]
			
			unless handler = handlers[request.method] || handlers[ANY_METHOD]
				allowed_methods = handlers.keys.compact.sort.join(", ")
				return Protocol::HTTP::Response[405, [["allow", allowed_methods]]]
			end
			
			return handler.call(request)
		end
		
		private
		
		def parse_reference(path)
			reference = Protocol::URL::Reference[path]
			return if reference&.fragment?
			
			return reference
		rescue ArgumentError
			nil
		end
		
	end
end
