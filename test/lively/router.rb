# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "lively/router"

describe Lively::Router do
	def request(method, path)
		Protocol::HTTP::Request.new("http", "localhost", method, path)
	end
	
	with "exact routes" do
		it "dispatches to callable handlers" do
			handler = Object.new
			def handler.call(request, parameters)
				Protocol::HTTP::Response[200, [], ["#{request.method}:#{parameters.fetch("message")}"]]
			end
			
			router = subject.new do |router|
				router.get("/example", handler)
			end
			
			response = router.call(request("GET", "/example?message=Hello"))
			
			expect(response.read).to be == "GET:Hello"
		end
		
		it "dispatches by path and method" do
			router = subject.new do |router|
				router.get("/example") do |request, parameters|
					Protocol::HTTP::Response[200, [], ["#{request.method}:#{parameters.fetch("message")}"]]
				end
			end
			
			response = router.call(request("GET", "/example?message=Hello%20World"))
			
			expect(response.status).to be == 200
			expect(response.read).to be == "GET:Hello World"
		end
		
		it "supports nested query parameters" do
			router = subject.new do |router|
				router.get("/example") do |_request, parameters|
					Protocol::HTTP::Response[200, [], [parameters.dig("user", "name")]]
				end
			end
			
			response = router.call(request("GET", "/example?user[name]=Sam"))
			
			expect(response.read).to be == "Sam"
		end
		
		it "supports routes accepting every method" do
			router = subject.new do |router|
				router.route("/example") do |request|
					Protocol::HTTP::Response[200, [], [request.method]]
				end
			end
			
			expect(router.call(request("PATCH", "/example")).read).to be == "PATCH"
		end
		
		it "supports routes accepting several methods" do
			router = subject.new do |router|
				router.route("/example", methods: ["GET", "HEAD"]) do |request|
					Protocol::HTTP::Response[200, [], [request.method]]
				end
			end
			
			expect(router.call(request("GET", "/example")).read).to be == "GET"
			expect(router.call(request("HEAD", "/example")).read).to be == "HEAD"
		end
	end
	
	with "unmatched requests" do
		it "returns nil for an unknown path" do
			router = subject.new
			
			expect(router.call(request("GET", "/missing"))).to be_nil
		end
		
		it "returns method not allowed for a known path" do
			router = subject.new do |router|
				router.get("/example"){Protocol::HTTP::Response[200]}
				router.post("/example"){Protocol::HTTP::Response[201]}
			end
			
			response = router.call(request("DELETE", "/example"))
			
			expect(response.status).to be == 405
			expect(response.headers["allow"]).to be == ["GET", "POST"]
		end
	end
	
	with "invalid input" do
		it "rejects a handler and block together" do
			handler = proc{Protocol::HTTP::Response[200]}
			
			expect do
				subject.new{|router| router.get("/example", handler){Protocol::HTTP::Response[201]}}
			end.to raise_exception(ArgumentError)
		end
		
		it "rejects relative route paths" do
			expect do
				subject.new{|router| router.get("example"){}}
			end.to raise_exception(ArgumentError)
		end
		
		it "rejects complete URLs as route paths" do
			expect do
				subject.new{|router| router.get("https://example.com/example"){}}
			end.to raise_exception(ArgumentError)
		end
		
		it "rejects route paths containing a query" do
			expect do
				subject.new{|router| router.get("/example?mode=test"){}}
			end.to raise_exception(ArgumentError)
		end
		
		it "rejects duplicate routes" do
			expect do
				subject.new do |router|
					router.get("/example"){}
					router.get("/example"){}
				end
			end.to raise_exception(ArgumentError)
		end
		
		it "returns bad request for malformed query parameters" do
			router = subject.new do |router|
				router.get("/example"){Protocol::HTTP::Response[200]}
			end
			
			expect(router.call(request("GET", "/example?broken=%")).status).to be == 400
		end
	end
end
