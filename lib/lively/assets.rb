# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require "protocol/http/middleware"
require "protocol/http/body/file"

module Lively
	class Assets < Protocol::HTTP::Middleware
		DEFAULT_CACHE_CONTROL = "no-store, no-cache, must-revalidate, max-age=0"
		
		DEFAULT_CONTENT_TYPES = {
			".html" => "text/html",
			".css" => "text/css",
			".js" => "application/javascript",
			".png" => "image/png",
			".jpeg" => "image/jpeg",
			".gif" => "image/gif",
			".mp3" => "audio/mpeg",
		}
		
		PUBLIC_ROOT = File.expand_path("../../public", __dir__)
		
		def initialize(delegate, root: PUBLIC_ROOT, content_types: DEFAULT_CONTENT_TYPES, cache_control: DEFAULT_CACHE_CONTROL)
			super(delegate)
			
			@root = root
			
			@content_types = content_types
			@cache_control = cache_control
		end
		
		def freeze
			return self if frozen?
			
			@root.freeze
			@content_types.freeze
			@cache_control.freeze
			
			super
		end
		
		def response_for(path, content_type)
			headers = [
				["content-type", content_type],
				["cache-control", @cache_control],
			]
			
			return Protocol::HTTP::Response[200, headers, Protocol::HTTP::Body::File.open(path)]
		end
		
		def expand_path(path)
			File.realpath(File.join(@root, path))
		rescue Errno::ENOENT
			nil
		end
		
		def call(request)
			if path = expand_path(request.path)
				extension = File.extname(path)
				content_type = @content_types[extension]
				
				if path.start_with?(@root) && File.exist?(path) && content_type
					return response_for(path, content_type)
				end
			end
			
			super
		end
	end
end
