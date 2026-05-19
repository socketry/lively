# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require_relative "middleware"
require "async/htty/environment/server"

# @namespace
module Lively
	# @namespace
	module Environment
		# HTTY (terminal side-channel) environment for Lively applications.
		#
		# Combines {Async::HTTY::Environment} for HTTY transport with
		# {Lively::Environment::Middleware} for application and asset serving.
		module HTTY
			include Async::HTTY::Environment::Server
			include Lively::Environment::Middleware
		end
	end
end
