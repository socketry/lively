# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2026, by Samuel Williams.

require_relative "middleware"
require "falcon/environment/server"

# @namespace
module Lively
	# @namespace
	module Environment
		# Falcon (TCP/HTTP) environment for Lively applications.
		#
		# Combines {Falcon::Environment::Server} for HTTP transport with
		# {Lively::Environment::Middleware} for application and asset serving.
		module HTTP
			include Falcon::Environment::Server
			include Lively::Environment::Middleware
			
			# The URL this server binds to.
			# @returns [String]
			def url
				ENV.fetch("LIVELY_URL", "http://localhost:9292")
			end
			
			# The number of worker processes/threads to run.
			# @returns [Integer]
			def count
				1
			end
		end
	end
end
