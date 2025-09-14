# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2025, by Samuel Williams.

require_relative "../application"
require_relative "../assets"

require "falcon/environment/server"

# @namespace
module Lively
	# @namespace
	module Environment
		# Represents the environment configuration for a Lively application server.
		# 
		# This module provides server configuration including URL binding, process count,
		# application class resolution, and middleware stack setup. It integrates with
		# Falcon's server environment to provide a complete hosting solution.
		module Application
			include Falcon::Environment::Server
			
			# Get the server URL for this application.
			# @returns [String] The base URL where the server will be accessible.
			def url
				"http://localhost:9292"
			end
			
			# Get the number of server processes to run.
			# @returns [Integer] The number of worker processes.
			def count
				1
			end
			
			# Resolve the application class to use.
			# @returns [Class] The application class, either user-defined or default.
			def application
				if Object.const_defined?(:Application)
					Object.const_get(:Application)
				else
					Console.warn(self, "No Application class defined, using default.")
					::Lively::Application
				end
			end
			
			# Build the middleware stack for this application.
			# @returns [Protocol::HTTP::Middleware] The complete middleware stack.
			def middleware
				::Protocol::HTTP::Middleware.build do |builder|
					builder.use Lively::Assets, root: File.expand_path("public", self.root)
					builder.use Lively::Assets, root: File.expand_path("../../../public", __dir__)
					builder.use self.application
				end
			end
		end
	end
end
