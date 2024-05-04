# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

module Lively
	module Environments
		module Application
			def self.load(configuration)
				configuration.load(:application)
				
				configuration.environment(:lively, :application) do
					# The middleware stack for the application.
					# @attribute [Protocol::HTTP::Middleware]
					middleware do
						::Protocol::HTTP::Middleware.build do |builder|
							builder.use Assets, root: File.expand_path('public', @root)
							builder.use Assets, root: File.expand_path('../../../public', __dir__)
							builder.use ::Application
						end
					end
				end
			end
		end
	end
end
