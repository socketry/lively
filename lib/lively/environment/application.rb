# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2026, by Samuel Williams.

require_relative "middleware"
require_relative "http"
require_relative "htty"

# @namespace
module Lively
	# @namespace
	module Environment
		# Multiplexing environment for Lively applications.
		#
		# Declares the transport selection as explicit, overridable evaluator keys and uses `make_service` to compose the appropriate child environment at service startup time. This keeps transport selection in the service layer rather than in module inclusion hooks.
		#
		# The `htty` key controls which transport is used. Override it in a service block to force a specific transport regardless of the environment variable:
		#
		# ~~~ ruby
		# service "myapp" do
		#   include Lively::Environment::Application
		#   def htty = false  # always use HTTP
		# end
		# ~~~
		module Application
			include Lively::Environment::Middleware
			# Note: does not include Falcon::Environment::Server directly. Falcon is
			# brought in exclusively via http_environment so that the combined
			# evaluator's service_class resolves correctly without shadowing.
			
			# Whether to use HTTY transport. Reads ENV["HTTY"] by default.
			# @returns [Boolean]
			def htty
				ENV["HTTY"] == "1"
			end
			
			# The environment module to use for HTTY transport.
			# @returns [Module]
			def htty_environment
				Lively::Environment::HTTY
			end
			
			# The environment module to use for HTTP transport.
			# @returns [Module]
			def http_environment
				Lively::Environment::HTTP
			end
			
			# The environment module for the selected transport.
			# @returns [Module]
			def transport_environment
				htty ? htty_environment : http_environment
			end
			
			# Build the service by composing the transport environment on top of this one.
			# Called by Async::Service::Generic.wrap — self is the evaluator at call time.
			# @parameter environment [Async::Service::Environment]
			# @returns [Async::Service::Generic]
			def make_service(environment)
				combined = environment.with(transport_environment)
				combined_evaluator = combined.evaluator

				# Call `service_class.new` directly rather than `Async::Service::Generic.wrap` — the combined evaluator still has `Application` (and therefore `make_service`) in its ancestor chain, so `wrap` would recurse back into this method.
				return combined_evaluator.service_class.new(combined, combined_evaluator)
			end
		end
	end
end
