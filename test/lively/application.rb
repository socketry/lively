# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025-2026, by Samuel Williams.

require "lively"
require "sus/fixtures/async"
require "sus/fixtures/console"
require "sus/fixtures/async/http"

describe Lively::Application do
	include Sus::Fixtures::Console
	
	let(:delegate) {proc{|request| Protocol::HTTP::Response[404, [], "Not Found"]}}
	let(:application) {Lively::Application.new(delegate)}
	
	with ".[]" do
		it "creates a subclass with custom tag" do
			tag_class = Class.new(Live::View)
			application_class = Lively::Application[tag_class]
			
			expect(application_class).to be_a(Class)
			expect(application_class.superclass).to be == Lively::Application
		end
		
		it "stores views as a constant" do
			tag_class = Class.new(Live::View)
			application_class = Lively::Application[tag_class]
			
			expect(application_class::VIEWS).to be == [tag_class]
		end
		
		it "stores state as a constant" do
			tag_class = Class.new(Live::View)
			game = Object.new
			application_class = Lively::Application[tag_class, game: game]
			
			expect(application_class::STATE).to be == {game: game}
		end
		
		it "renders the custom view at the root route with shared state" do
			tag_class = Class.new(Live::View) do
				def initialize(id = self.class.unique_id, data = {}, message:)
					super(id, data)
					@message = message
				end
				
				def render(builder)
					builder.text(@message)
				end
			end
			
			application_class = Lively::Application[tag_class, message: "Custom root view"]
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/")
			response = application_class.new(delegate).call(request)
			
			expect(response.status).to be == 200
			expect(response.read).to be(:include?, "Custom root view")
		end
		
		it "resolver allows the custom tag" do
			tag_class = Class.new(Live::View)
			application_class = Lively::Application[tag_class]
			instance = application_class.new(delegate)
			
			resolver = instance.resolver
			expect(resolver).to be_a(Lively::Resolver)
			expect(resolver.allowed).to have_keys(tag_class.name)
		end
		
		it "resolver passes state to views" do
			state_value = Object.new
			tag_class = Class.new(Live::View)
			application_class = Lively::Application[tag_class, my_state: state_value]
			instance = application_class.new(delegate)
			
			expect(instance.resolver.state[:my_state]).to be == state_value
		end
	end
	
	with "#state" do
		it "returns empty hash by default" do
			expect(application.state).to be == {}
		end
		
		it "can be overridden in subclasses" do
			controller = Object.new
			app_class = Class.new(Lively::Application) do
				define_method(:state) {{controller: controller}}
			end
			
			app = app_class.new(delegate)
			expect(app.state).to be == {controller: controller}
		end
	end
	
	with "#resolver" do
		it "returns a Lively::Resolver" do
			resolver = application.resolver
			expect(resolver).to be_a(Lively::Resolver)
		end
		
		it "allows HelloWorld by default" do
			resolver = application.resolver
			expect(resolver.allowed).to have_keys("Lively::HelloWorld")
		end
		
		it "passes state to resolver" do
			state_value = Object.new
			app_class = Class.new(Lively::Application) do
				define_method(:state) {{controller: state_value}}
			end
			
			app = app_class.new(delegate)
			expect(app.resolver.state[:controller]).to be == state_value
		end
		
		it "is memoized" do
			expect(application.resolver).to be_equal(application.resolver)
		end
	end
	
	with "#initialize" do
		it "inherits from Protocol::HTTP::Middleware" do
			expect(application).to be_a(Protocol::HTTP::Middleware)
		end
		
		it "accepts delegate" do
			expect(application.delegate).to be == delegate
		end
	end
	
	with "#live" do
		it "creates a Live::Page with resolver and runs it" do
			mock_connection = Object.new
			
			mock_page = Object.new
			def mock_page.run(connection)
				@connection = connection
				"live_page_running"
			end
			def mock_page.connection; @connection; end
			
			expect(Live::Page).to receive(:new).and_return(mock_page)
			
			result = application.live(mock_connection)
			
			expect(result).to be == "live_page_running"
			expect(mock_page.connection).to be == mock_connection
		end
	end
	
	with "#title" do
		it "returns the class name" do
			expect(application.title).to be == "Lively::Application"
		end
		
		it "returns custom class name for subclass" do
			application_class = Class.new(Lively::Application)
			application_class.define_singleton_method(:name){"CustomApp"}
			instance = application_class.new(delegate)
			
			expect(instance.title).to be == "CustomApp"
		end
	end
	
	with "#router" do
		it "is memoized" do
			expect(application.router).to be_equal(application.router)
		end
		
		it "constructs the root view only when its route is requested" do
			resolved = []
			resolver = Object.new
			resolver.define_singleton_method(:make) do |view_class|
				resolved << view_class
				view_class.new
			end
			
			application_class = Class.new(Lively::Application) do
				define_method(:resolver) {resolver}
			end
			application = application_class.new(delegate)
			
			application.router
			expect(resolved).to be(:empty?)
			
			application.call(Protocol::HTTP::Request.new("http", "localhost", "GET", "/"))
			expect(resolved).to be == [Lively::HelloWorld]
		end
		
		it "routes the default view explicitly" do
			response = application.router.call(Protocol::HTTP::Request.new("http", "localhost", "GET", "/"))
			html = response.read
			
			expect(response.status).to be == 200
			expect(html).to be(:include?, "<!DOCTYPE html>")
			expect(html).to be(:include?, "Lively::Application")
		end
		
		it "can be extended by subclasses" do
			application_class = Class.new(Lively::Application) do
				def configure_routes(router)
					super
					
					router.get("/example") do |request|
						Protocol::HTTP::Response[200, [], [request.path]]
					end
				end
			end
			
			application = application_class.new(delegate)
			response = application.call(Protocol::HTTP::Request.new("http", "localhost", "GET", "/example?message=Hello"))
			
			expect(response.status).to be == 200
			expect(response.read).to be == "/example?message=Hello"
		end
		
		it "allows the root view to be selected by its route" do
			other_view = Class.new(Live::View)
			root_view = Class.new(Live::View) do
				def render(builder)
					builder.text("Selected root view")
				end
			end
			
			application_class = Class.new(Lively::Application) do
				define_method(:allowed_views) {[other_view, root_view]}
				
				define_method(:configure_routes) do |router|
					router.get("/") do |request|
						body = resolver.make(root_view)
						Lively::Pages::Index.new(title: title, body: body).call(request)
					end
				end
			end
			
			response = application_class.new(delegate).call(Protocol::HTTP::Request.new("http", "localhost", "GET", "/"))
			
			expect(response.status).to be == 200
			expect(response.read).to be(:include?, "Selected root view")
		end
	end
	
	with "#call" do
		it "delegates unmatched requests" do
			response = application.call(Protocol::HTTP::Request.new("http", "localhost", "GET", "/unknown"))
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 404
			expect(response.read).to be == "Not Found"
		end
		
		it "preserves system routes when application routes are replaced" do
			application_class = Class.new(Lively::Application) do
				def configure_routes(router)
					router.get("/") do |request|
						body = resolver.make(Lively::HelloWorld)
						Lively::Pages::Index.new(title: title, body: body).call(request)
					end
				end
			end
			
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/live")
			expect(Async::WebSocket::Adapters::HTTP).to receive(:open).and_return(Protocol::HTTP::Response[101, [["upgrade", "websocket"]], []])
			
			response = application_class.new(delegate).call(request)
			
			expect(response.status).to be == 101
		end
		
		it "handles /live path for WebSocket connections" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/live")
			
			expect(Async::WebSocket::Adapters::HTTP).to receive(:open).and_return(Protocol::HTTP::Response[101, [["upgrade", "websocket"]], []])
			
			response = application.call(request)
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 101
		end
		
		it "handles a query on the /live path" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/live?connection=test")
			
			expect(Async::WebSocket::Adapters::HTTP).to receive(:open).and_return(Protocol::HTTP::Response[101, [["upgrade", "websocket"]], []])
			
			response = application.call(request)
			
			expect(response.status).to be == 101
		end
		
		it "returns 400 when WebSocket upgrade fails" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/live")
			
			expect(Async::WebSocket::Adapters::HTTP).to receive(:open).and_return(nil)
			
			response = application.call(request)
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 400
		end
		
		it "handles non-live paths with regular response" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/")
			response = application.call(request)
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 200
		end
	end
	
	with "integration" do
		include Sus::Fixtures::Async::HTTP::ServerContext
		
		let(:app) {application}
		
		it "creates a complete application pipeline" do
			response = client.get("/")
			
			expect(response.status).to be == 200
			
			html = response.read
			expect(html).to be(:include?, "<!DOCTYPE html>")
			expect(html).to be(:include?, "Hello, I'm Lively!")
			expect(html).to be(:include?, "application.js")
		end
		
		it "serves HTTP requests through the full stack" do
			response = client.get("/")
			
			expect(response).to be(:success?)
			expect(response.read).to be(:include?, "Hello, I'm Lively!")
		end
		
		it "delegates unmatched paths" do
			response = client.get("/some/other/path")
			
			expect(response.status).to be == 404
			expect(response.read).to be == "Not Found"
		end
	end
end
