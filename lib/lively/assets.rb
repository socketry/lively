# frozen_string_literal: true

# Copyright, 2021, by Samuel G. D. Williams. <http://www.codeotaku.com>
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

module Lively
	class Assets < Protocol::HTTP::Middleware
		DEFAULT_CACHE_CONTROL = 'public, max-age=3600'
		
		DEFAULT_CONTENT_TYPES = {
			".html" => "text/html",
			".css" => "text/css",
			".js" => "application/javascript",
			".png" => "image/png",
			".jpeg" => "image/jpeg",
			".gif" => "image/gif",
		}
		
		def initialize(delegate, root: Dir.pwd, content_types: DEFAULT_CONTENT_TYPES, cache_control: DEFAULT_CACHE_CONTROL)
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
				['content-type', content_type],
				['cache-control', @cache_control],
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
