# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "live/resolver"

module Lively
	# Extends {Live::Resolver} to pass shared application state to views on construction.
	#
	# When the browser reconnects via WebSocket, the resolver creates new view
	# instances with the shared state (e.g. a controller) so all clients stay in sync.
	class Resolver < Live::Resolver
		# Initialize a new resolver with shared state.
		# @parameter state [Hash] Key-value pairs to pass to view constructors as keyword arguments.
		def initialize(state = {})
			super()
			@state = state
		end
		
		# @attribute [Hash] The shared state passed to view constructors.
		attr :state
		
		private
		
		# Construct a view with shared application state.
		def make(view_class, id, data, **options)
			super(view_class, id, data, **@state, **options)
		end
	end
end
