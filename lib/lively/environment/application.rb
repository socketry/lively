# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require_relative '../application'
require_relative '../assets'

require 'falcon/environment/server'

module Lively
	module Environment
		module Application
			include Falcon::Environment::Server
			
			def application
				if Object.const_defined?(:Application)
					::Application
				else
					Console.warn(self, "No Application class defined, using default.")
					::Lively::Application
				end
			end
			
			def middleware
				::Protocol::HTTP::Middleware.build do |builder|
					builder.use Lively::Assets, root: File.expand_path('public', self.root)
					builder.use Lively::Assets, root: File.expand_path('../../../public', __dir__)
					builder.use self.application
				end
			end
		end
	end
end
