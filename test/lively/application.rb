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
		
		it "defines body method on instance" do
			tag_class = Class.new(Live::View)
			application_class = Lively::Application[tag_class]
			instance = application_class.new(delegate)
			
			expect(instance).to respond_to(:body)
		end
		
		it "body method creates instance of custom tag" do
			tag_class = Class.new(Live::View)
			application_class = Lively::Application[tag_class]
			instance = application_class.new(delegate)
			
			body_instance = instance.body
			expect(body_instance).to be_a(tag_class)
		end
		
		it "passes state to body" do
			state_value = Object.new
			tag_class = Class.new(Live::View) do
				def initialize(id = self.class.unique_id, data = {}, my_state: nil)
					super(id, data)
					@my_state = my_state
				end
				attr :my_state
			end
			
			application_class = Lively::Application[tag_class, my_state: state_value]
			instance = application_class.new(delegate)
			
			body = instance.body
			expect(body.my_state).to be == state_value
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
				define_method(:state) { {controller: controller} }
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
				define_method(:state) { {controller: state_value} }
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
	
	with "#body" do
		it "returns a HelloWorld instance" do
			body = application.body
			
			expect(body).to be_a(Lively::HelloWorld)
		end
	end
	
	with "#index" do
		it "returns a Pages::Index instance" do
			index = application.index
			
			expect(index).to be_a(Lively::Pages::Index)
		end
		
		it "uses application title" do
			index = application.index
			
			expect(index.title).to be == application.title
		end
		
		it "uses application body" do
			index = application.index
			
			expect(index.body).to be_a(Lively::HelloWorld)
		end
	end
	
	with "#handle" do
		it "returns a 200 response" do
			response = application.handle(Protocol::HTTP::Request.new("http", "localhost", "GET", "/"))
			
			expect(response).to be_a(Protocol::HTTP::Response)
			expect(response.status).to be == 200
		end
		
		it "returns HTML content" do
			response = application.handle(Protocol::HTTP::Request.new("http", "localhost", "GET", "/"))
			
			expect(response.body).to be_a(Protocol::HTTP::Body::Buffered)
			html = response.body.read
			expect(html).to be_a(String)
			expect(html).to be(:include?, "<!DOCTYPE html>")
		end
		
		it "includes application title in response" do
			response = application.handle(Protocol::HTTP::Request.new("http", "localhost", "GET", "/"))
			html = response.body.read
			
			expect(html).to be(:include?, "Lively::Application")
		end
	end
	
	with "#call" do
		it "handles /live path for WebSocket connections" do
			request = Protocol::HTTP::Request.new("http", "localhost", "GET", "/live")
			
			expect(Async::WebSocket::Adapters::HTTP).to receive(:open).and_return(Protocol::HTTP::Response[101, [["upgrade", "websocket"]], []])
			
			response = application.call(request)
			
			expect(response).to be_a(Protocol::HTTP::Response)
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
		
		it "handles different paths correctly" do
			response = client.get("/some/other/path")
			
			expect(response.status).to be == 200
			expect(response.read).to be(:include?, "Hello, I'm Lively!")
		end
	end
end
