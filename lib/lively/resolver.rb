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
		
		# Construct an allowed view with shared state.
		# @parameter view_class [Class] The view class to construct.
		# @parameter id [String] The unique identifier for the view.
		# @parameter data [Hash] The data associated with the view.
		# @parameter arguments [Hash] Additional keyword arguments for the view.
		# @returns [Live::View] A new view instance.
		# @raises [ArgumentError] If the view class is not allowed.
		def make(view_class, id: view_class.unique_id, data: {}, **arguments)
			unless @allowed[view_class.name].equal?(view_class)
				raise ArgumentError, "View class is not allowed: #{view_class}!"
			end
			
			view_class.new(id, data, **@state, **arguments)
		end
		
		# Resolve a client-side element to a server-side instance with shared state.
		# @parameter id [String] The unique element identifier.
		# @parameter data [Hash] The element data attributes.
		# @returns [Live::Element | Nil] The resolved element, or `nil`.
		def call(id, data)
			if klass = @allowed[data[:class]]
				return self.make(klass, id: id, data: data)
			end
		end
	end
end
