# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "protocol/http"
require "protocol/url"

module Lively
	# Dispatches HTTP requests to handlers using exact path and method matches.
	#
	# Request targets are parsed with {Protocol::URL::Reference}. Handlers receive
	# the original request and the decoded query parameters.
	class Router
		EMPTY_PARAMETERS = {}.freeze
		ANY_METHOD = nil
		private_constant :EMPTY_PARAMETERS, :ANY_METHOD
		
		# Initialize a router.
		# @yields {|router| ...} The router to configure.
		def initialize
			@routes = {}
			
			yield self if block_given?
		end
		
		# Add a route.
		#
		# When `methods` is omitted, the handler accepts every HTTP method. Otherwise,
		# it may be a single method or an array of methods.
		#
		# @parameter path [String] The absolute path to match.
		# @parameter methods [String | Symbol | Array(String | Symbol) | Nil] The accepted HTTP methods.
		# @yields {|request, parameters| ...} The route handler.
		# 	@parameter request [Protocol::HTTP::Request] The original request.
		# 	@parameter parameters [Hash] The decoded query parameters.
		# @returns [Router] The router.
		def route(path, methods: nil, &handler)
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
			# @yields {|request, parameters| ...} The route handler.
			# @returns [Router] The router.
			define_method(name) do |path, &handler|
				route(path, methods: method, &handler)
			end
		end
		
		# Dispatch a request to a matching route.
		# @parameter request [Protocol::HTTP::Request] The request to dispatch.
		# @returns [Protocol::HTTP::Response | Nil] The handler or error response, or `nil` when no path matches.
		def call(request)
			reference = parse_reference(request.path)
			return Protocol::HTTP::Response[400] unless reference
			
			unless handlers = @routes[reference.path]
				return nil
			end
			
			unless handler = handlers[request.method] || handlers[ANY_METHOD]
				allowed_methods = handlers.keys.compact.sort.join(", ")
				return Protocol::HTTP::Response[405, [["allow", allowed_methods]]]
			end
			
			parameters = parse_query(reference)
			return Protocol::HTTP::Response[400] unless parameters
			
			return handler.call(request, parameters)
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
		
		def parse_reference(path)
			reference = Protocol::URL::Reference[path]
			return if reference&.fragment?
			
			return reference
		rescue ArgumentError
			nil
		end
		
		def parse_query(reference)
			reference.parse_query! || EMPTY_PARAMETERS
		rescue ArgumentError
			nil
		end
	end
end
