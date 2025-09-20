# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2025, by Samuel Williams.

require "protocol/http/middleware"
require "protocol/http/body/file"
require "console"

module Lively
	# Represents an HTTP middleware for serving static assets.
	# 
	# This middleware serves static files from a configured root directory with
	# appropriate content type headers and caching controls. It supports a wide
	# range of web file formats including HTML, CSS, JavaScript, images, fonts,
	# audio, video, and WebAssembly files.
	class Assets < Protocol::HTTP::Middleware
		DEFAULT_CACHE_CONTROL = "no-store, no-cache, must-revalidate, max-age=0"
		
		DEFAULT_CONTENT_TYPES = {
			".html" => "text/html",
			".css" => "text/css",
			".js" => "application/javascript",
			".mjs" => "application/javascript",
			".json" => "application/json",
			".png" => "image/png",
			".jpg" => "image/jpeg",
			".jpeg" => "image/jpeg",
			".gif" => "image/gif",
			".webp" => "image/webp",
			".svg" => "image/svg+xml",
			".ico" => "image/x-icon",
			".mp3" => "audio/mpeg",
			".wav" => "audio/wav",
			".ogg" => "audio/ogg",
			".mp4" => "video/mp4",
			".webm" => "video/webm",
			".ttf" => "font/ttf",
			".woff" => "font/woff",
			".woff2" => "font/woff2",
			".wasm" => "application/wasm",
		}
		
		PUBLIC_ROOT = File.expand_path("../../public", __dir__)
		
		# Initialize a new assets middleware instance.
		# @parameter delegate [Protocol::HTTP::Middleware] The next middleware in the chain.
		# @parameter root [String] The root directory path for serving assets.
		# @parameter content_types [Hash] Mapping of file extensions to MIME types.
		# @parameter cache_control [String] Cache control header value for responses.
		def initialize(delegate, root: PUBLIC_ROOT, content_types: DEFAULT_CONTENT_TYPES, cache_control: DEFAULT_CACHE_CONTROL)
			super(delegate)
			
			@root = File.expand_path(root)
			
			@content_types = content_types
			@cache_control = cache_control
		end
		
		# @attribute [String] The absolute path to the root directory for serving assets.
		attr :root
		
		# @attribute [Hash] Mapping of file extensions to content types.
		attr :content_types
		
		# @attribute [String] Cache control header value for asset responses.
		attr :cache_control
		
		# Freeze this middleware instance and all its configuration.
		# @returns [Assets] Returns self for method chaining.
		def freeze
			return self if frozen?
			
			@root.freeze
			@content_types.freeze
			@cache_control.freeze
			
			super
		end
		
		# Generate an HTTP response for the given file path.
		# @parameter path [String] The absolute file path to serve.
		# @returns [Protocol::HTTP::Response] HTTP response with file content or error.
		def response_for(path)
			extension = File.extname(path)
			
			if content_type = @content_types[extension]
				headers = [
					["content-type", content_type],
					["cache-control", @cache_control],
				]
				
				return Protocol::HTTP::Response[200, headers, Protocol::HTTP::Body::File.open(path)]
			else
				Console.warn(self, "Unsupported media type!", path: path)
				return Protocol::HTTP::Response[415, [["content-type", "text/plain"]], "Unsupported media type: #{extension.inspect}!"]
			end
		end
		
		# Expand a relative path to an absolute path within the asset root.
		# @parameter path [String] The relative path to expand.
		# @returns [String | Nil] The absolute path if valid, `nil` if the file doesn't exist.
		def expand_path(path)
			path = path.split("/").map(&URI.method(:decode_uri_component))
			
			root = File.realpath(@root)
			path = File.realpath(File.join(@root, path))
			
			if path.start_with?(root) && File.file?(path)
				return path
			end
		rescue Errno::ENOENT
			nil
		end
		
		# Handle an incoming HTTP request.
		# @parameter request [Protocol::HTTP::Request] The incoming HTTP request.
		# @returns [Protocol::HTTP::Response] The HTTP response for the asset or delegates to next middleware.
		def call(request)
			if path = expand_path(request.path)
				return response_for(path)
			end
			
			super
		end
	end
end
