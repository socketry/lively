# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2026, by Samuel Williams.

require_relative "../application"
require_relative "../assets"

require "protocol/http/middleware/builder"

# @namespace
module Lively
	# @namespace
	module Environment
		# Shared middleware configuration for Lively application environments.
		#
		# Provides the application class resolver, asset middleware, and the
		# Lively middleware stack. Included by both {HTTP} and {HTTY} environments.
		module Middleware
			# Get the root directory for this application.
			# @returns [String] The current working directory.
			def root
				Dir.pwd
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
