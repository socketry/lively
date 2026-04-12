# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2026, by Samuel Williams.

require "live/resolver"

module Lively
	# Extends {Live::Resolver} to pass shared application state to views on construction.
	#
	# When the browser reconnects via WebSocket, the resolver creates new view
	# instances with the shared state (e.g. a controller) so all clients stay in sync.
	class Resolver < Live::Resolver
		# Initialize a new resolver with shared state.
		# @parameter state [Hash] Key-value pairs to pass to view constructors as keyword arguments.
		def initialize(state = nil)
			super()
			@state = state
		end
		
		# @attribute [Hash] The shared state passed to view constructors.
		attr :state
		
		# Resolve a client-side element to a server-side instance with shared state.
		# @parameter id [String] The unique element identifier.
		# @parameter data [Hash] The element data attributes.
		# @returns [Live::Element | Nil] The resolved element, or `nil`.
		def call(id, data)
			if klass = @allowed[data[:class]]
				return klass.new(id, data, **@state)
			end
		end
	end
end
