# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2025, by Samuel Williams.

require "lively/assets"
require "sus/fixtures/console"
require "protocol/http/request"
require "tmpdir"
require "fileutils"

describe Lively::Assets do
	include Sus::Fixtures::Console
	
	let(:delegate) {proc {|request| Protocol::HTTP::Response[404, [], "Not Found"]}}
	let(:assets) {Lively::Assets.new(delegate)}
	
	with "#initialize" do
		it "uses default values" do
			middleware = Lively::Assets.new(delegate)
			
			expect(middleware.root).to be == Lively::Assets::PUBLIC_ROOT
			expect(middleware.content_types).to be == Lively::Assets::DEFAULT_CONTENT_TYPES
			expect(middleware.cache_control).to be == Lively::Assets::DEFAULT_CACHE_CONTROL
		end
		
		it "accepts custom root path" do
			Dir.mktmpdir do |custom_root|
				middleware = Lively::Assets.new(delegate, root: custom_root)
				
				expect(middleware.root).to be == File.expand_path(custom_root)
			end
		end
		
		it "accepts custom content types" do
			custom_types = {".xyz" => "application/xyz"}
			middleware = Lively::Assets.new(delegate, content_types: custom_types)
			
			expect(middleware.content_types).to be == custom_types
		end
		
		it "accepts custom cache control" do
			custom_cache = "max-age=3600"
			middleware = Lively::Assets.new(delegate, cache_control: custom_cache)
			
			expect(middleware.cache_control).to be == custom_cache
		end
	end
	
	with "#freeze" do
		it "freezes all instance variables" do
			middleware = Lively::Assets.new(delegate)
			middleware.freeze
			
			expect(middleware).to be(:frozen?)
			expect(middleware.root).to be(:frozen?)
			expect(middleware.content_types).to be(:frozen?)
			expect(middleware.cache_control).to be(:frozen?)
		end
		
		it "returns self when already frozen" do
			middleware = Lively::Assets.new(delegate)
			middleware.freeze
			
			expect(middleware.freeze).to be_equal(middleware)
		end
	end
	
	with "#expand_path" do
		def around(&block)
			Dir.mktmpdir do |temp_dir|
				@temp_dir = temp_dir
				@middleware = Lively::Assets.new(delegate, root: temp_dir)
				super(&block)
			end
		end
		
		attr :temp_dir, :middleware
		
		it "expands relative paths within root" do
			File.write(File.join(temp_dir, "test.txt"), "content")
			expanded = middleware.expand_path("/test.txt")
			
			expect(File.basename(expanded)).to be == "test.txt"
			expect(expanded).to be(:include?, temp_dir)
		end
		
		it "returns nil for non-existent files" do
			expanded = middleware.expand_path("/nonexistent.txt")
			
			expect(expanded).to be_nil
		end
		
		it "handles nested paths" do
			nested_dir = File.join(temp_dir, "nested")
			Dir.mkdir(nested_dir)
			File.write(File.join(nested_dir, "file.txt"), "content")
			
			expanded = middleware.expand_path("/nested/file.txt")
			
			expect(File.basename(expanded)).to be == "file.txt"
			expect(expanded).to be(:include?, "nested/file.txt")
		end
	end
	
	with "#response_for" do
		def around(&block)
			Dir.mktmpdir do |temp_dir|
				@temp_dir = temp_dir
				@middleware = Lively::Assets.new(delegate, root: temp_dir)
				super(&block)
			end
		end
		
		attr :temp_dir, :middleware
		
		it "returns proper response for supported file types" do
			test_file = File.join(temp_dir, "test.html")
			File.write(test_file, "<html><body>Test</body></html>")
			
			response = middleware.response_for(test_file)
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 200
			expect(response.headers["content-type"]).to be == "text/html"
			expect(response.headers["cache-control"]).to be == ["no-store", "no-cache", "must-revalidate", "max-age=0"]
		end
		
		it "returns 415 for unsupported file types" do
			test_file = File.join(temp_dir, "test.unsupported")
			File.write(test_file, "some data")
			
			response = middleware.response_for(test_file)
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 415
		end
		
		it "includes proper headers for different file types" do
			# Test HTML file
			html_file = File.join(temp_dir, "test.html")
			File.write(html_file, "<html></html>")
			html_response = middleware.response_for(html_file)
			expect(html_response.headers["content-type"]).to be == "text/html"
			
			# Test CSS file
			css_file = File.join(temp_dir, "test.css")
			File.write(css_file, "body { color: red; }")
			css_response = middleware.response_for(css_file)
			expect(css_response.headers["content-type"]).to be == "text/css"
			
			# Test JavaScript file
			js_file = File.join(temp_dir, "test.js")
			File.write(js_file, "console.log('test');")
			js_response = middleware.response_for(js_file)
			expect(js_response.headers["content-type"]).to be == "application/javascript"
			
			# Test WebP image
			webp_file = File.join(temp_dir, "test.webp")
			File.write(webp_file, "fake webp data")
			webp_response = middleware.response_for(webp_file)
			expect(webp_response.headers["content-type"]).to be == "image/webp"
		end
		
		it "handles different content types correctly" do
			{
				"test.css" => "text/css",
				"test.js" => "application/javascript",
				"test.json" => "application/json",
				"test.png" => "image/png",
				"test.webp" => "image/webp",
				"test.mp3" => "audio/mpeg",
				"test.wasm" => "application/wasm"
			}.each do |filename, expected_type|
				file_path = File.join(temp_dir, filename)
				File.write(file_path, "content")
				
				response = middleware.response_for(file_path)
				expect(response.headers["content-type"]).to be == expected_type
			end
		end
	end
	
	with "#call" do
		def around(&block)
			Dir.mktmpdir do |temp_dir|
				@temp_dir = temp_dir
				@middleware = Lively::Assets.new(delegate, root: temp_dir)
				super(&block)
			end
		end
		
		attr :temp_dir, :middleware
		
		it "serves existing files with supported extensions" do
			test_file = File.join(temp_dir, "test.html")
			File.write(test_file, "<html><body>Test</body></html>")
			
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/test.html")
			response = middleware.call(request)
			
			expect(response.status).to be == 200
			expect(response.headers["content-type"]).to be == "text/html"
		end
		
		it "delegates to next middleware for non-existent files" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/nonexistent.html")
			response = middleware.call(request)
			
			expect(response.status).to be == 404
		end
		
		it "delegates to next middleware for unsupported file types" do
			unsupported_file = File.join(temp_dir, "test.unknown")
			File.write(unsupported_file, "content")
			
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/test.unknown")
			response = middleware.call(request)
			
			expect(response.status).to be == 415
		end
		
		it "prevents directory traversal attacks" do
			# Create a file outside the root directory
			parent_dir = File.dirname(temp_dir)
			malicious_file = File.join(parent_dir, "malicious.html")
			File.write(malicious_file, "malicious content")
			
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/../malicious.html")
			response = middleware.call(request)
			
			expect(response.status).to be == 404
		ensure
			File.delete(malicious_file) if File.exist?(malicious_file)
		end
		
		it "handles nested directory structures" do
			nested_dir = File.join(temp_dir, "assets", "images")
			FileUtils.mkdir_p(nested_dir)
			
			test_file = File.join(nested_dir, "logo.png")
			File.write(test_file, "fake png content")
			
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/assets/images/logo.png")
			response = middleware.call(request)
			
			expect(response.status).to be == 200
			expect(response.headers["content-type"]).to be == "image/png"
		end
		
		it "delegates to next middleware for directory requests" do
			# Create a subdirectory in the temp directory
			subdir = File.join(temp_dir, "subdir")
			Dir.mkdir(subdir)
			
			# Request the directory path
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/subdir")
			response = middleware.call(request)
			
			# Should delegate to next middleware, not try to serve the directory
			expect(response.status).to be == 404
		end
	end
	
	with "DEFAULT_CONTENT_TYPES" do
		it "includes essential web file types" do
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".html"]).to be == "text/html"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".css"]).to be == "text/css"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".js"]).to be == "application/javascript"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".mjs"]).to be == "application/javascript"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".json"]).to be == "application/json"
		end
		
		it "includes modern image formats" do
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".png"]).to be == "image/png"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".jpg"]).to be == "image/jpeg"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".jpeg"]).to be == "image/jpeg"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".gif"]).to be == "image/gif"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".webp"]).to be == "image/webp"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".svg"]).to be == "image/svg+xml"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".ico"]).to be == "image/x-icon"
		end
		
		it "includes audio and video formats" do
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".mp3"]).to be == "audio/mpeg"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".wav"]).to be == "audio/wav"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".ogg"]).to be == "audio/ogg"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".mp4"]).to be == "video/mp4"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".webm"]).to be == "video/webm"
		end
		
		it "includes modern web technologies" do
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".wasm"]).to be == "application/wasm"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".ttf"]).to be == "font/ttf"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".woff"]).to be == "font/woff"
			expect(Lively::Assets::DEFAULT_CONTENT_TYPES[".woff2"]).to be == "font/woff2"
		end
	end
	
	with "security considerations" do
		def around(&block)
			Dir.mktmpdir do |temp_dir|
				@temp_dir = temp_dir
				@middleware = Lively::Assets.new(delegate, root: temp_dir)
				super(&block)
			end
		end
		
		attr :temp_dir, :middleware
		
		it "prevents access to files outside root directory" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/../../../etc/passwd")
			response = middleware.call(request)
			
			expect(response.status).to be == 404
		end
		
		it "prevents access via symbolic links outside root" do
			link_path = File.join(temp_dir, "external_link")
			File.symlink("/etc", link_path) rescue nil # May fail on some systems
			
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/external_link/passwd")
			response = middleware.call(request)
			
			expect(response.status).to be == 404
		end
	end
end
