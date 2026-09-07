# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025-2026, by Samuel Williams.

require "lively/pages/index"
require "lively/resolver"
require "sus/fixtures/console"

describe Lively::Pages::Index do
	include Sus::Fixtures::Console
	
	with "#initialize" do
		it "creates with default values" do
			index = Lively::Pages::Index.new
			
			expect(index.title).to be == "Lively"
			expect(index.body).to be_nil
			expect(index.resolver).to be_nil
			expect(index.views).to be(:empty?)
		end
		
		it "accepts custom title and body" do
			index = Lively::Pages::Index.new(title: "Custom Title", body: "Custom Body")
			
			expect(index.title).to be == "Custom Title"
			expect(index.body).to be == "Custom Body"
		end
		
		it "composes live views lazily using the resolver" do
			message = Object.new
			view_class = Class.new(Live::View) do
				def initialize(id = self.class.unique_id, data = {}, message: nil)
					super(id, data)
					@message = message
				end
				
				attr :message
			end
			resolver = Lively::Resolver.new(message: message).allow(view_class)
			composed = false
			
			index = Lively::Pages::Index.new(resolver: resolver) do |page|
				composed = true
				page.view(view_class)
			end
			
			expect(composed).to be_falsey
			expect(index.views.first.message).to be_equal(message)
			expect(composed).to be_truthy
		end
		
		it "loads the XRB template" do
			index = Lively::Pages::Index.new
			
			template = index.template
			expect(template).not.to be_nil
			expect(template).to be_a(XRB::Template)
		end
	end
	
	with "#to_html" do
		it "generates HTML string" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:is_a?, String)
			expect(html).not.to be(:empty?)
		end
		
		it "includes DOCTYPE declaration" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, "<!DOCTYPE html>")
		end
		
		it "includes html structure" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, "<html>")
			expect(html).to be(:include?, "<head>")
			expect(html).to be(:include?, "<body>")
			expect(html).to be(:include?, "</html>")
		end
		
		it "includes the title in head" do
			index = Lively::Pages::Index.new(title: "Test Title")
			html = index.to_html
			
			expect(html).to be(:include?, "<title>Test Title</title>")
		end
		
		it "includes viewport meta tag" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, 'name="viewport"')
			expect(html).to be(:include?, "width=device-width")
		end
		
		it "includes charset meta tag" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, 'charset="UTF-8"')
		end
		
		it "includes static asset links" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, 'href="/_static/icon.png"')
			expect(html).to be(:include?, 'href="/_static/site.css"')
			expect(html).to be(:include?, 'href="/_static/index.css"')
		end
		
		it "includes import map" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, 'type="importmap"')
			expect(html).to be(:include?, '"live"')
			expect(html).to be(:include?, '"morphdom"')
		end
		
		it "includes Live.js initialization" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).to be(:include?, 'type="module"')
			expect(html).to be(:include?, "application.js")
		end
		
		it "includes body content when body responds to to_html" do
			mock_body = Object.new
			def mock_body.to_html
				"<div>Custom Body HTML</div>"
			end
			
			index = Lively::Pages::Index.new(body: mock_body)
			html = index.to_html
			
			expect(html).to be(:include?, "&lt;div&gt;Custom Body HTML&lt;/div&gt;")
		end
		
		it "supports pages without a body or live views" do
			index = Lively::Pages::Index.new(body: nil)
			html = index.to_html
			
			expect(html).not.to be(:include?, "No body specified!")
		end
		
		it "renders multiple live views in document order" do
			first_view = Class.new(Live::View) do
				def self.name
					"FirstView"
				end
				
				def render(builder)
					builder.text("First view")
				end
			end
			second_view = Class.new(Live::View) do
				def self.name
					"SecondView"
				end
				
				def render(builder)
					builder.text("Second view")
				end
			end
			resolver = Lively::Resolver.new.allow(first_view, second_view)
			index = Lively::Pages::Index.new(resolver: resolver) do |page|
				page.view(first_view)
				page.view(second_view)
			end
			
			html = index.to_html
			
			expect(html.index("First view")).to be < html.index("Second view")
			expect(index.views.size).to be == 2
		end
		
		it "composes fresh views using each request and its parameters" do
			view_class = Class.new(Live::View) do
				def initialize(id = self.class.unique_id, data = {}, message:)
					super(id, data)
					@message = message
				end
				
				def render(builder)
					builder.text(@message)
				end
			end
			resolver = Lively::Resolver.new.allow(view_class)
			index = Lively::Pages::Index.new(resolver: resolver) do |page, request, parameters|
				page.view(view_class, message: "#{request.method}:#{parameters.fetch("message")}")
			end
			
			request = Protocol::HTTP::Request["GET", "/?message=First"]
			first = index.call(request, {"message" => "First"}).read
			second = index.call(request, {"message" => "Second"}).read
			
			expect(first).to be(:include?, "GET:First")
			expect(second).to be(:include?, "GET:Second")
		end
		
		it "requires a resolver to construct live views" do
			index = Lively::Pages::Index.new
			
			expect do
				index.view(Lively::HelloWorld)
			end.to raise_exception(ArgumentError, message: be =~ /resolver/)
		end
	end
	
	with "template file" do
		let(:root) {File.expand_path("../../../lib/lively", __dir__)}
		let(:template_path) {File.join(root, "page.xrb")}
		
		it "template file exists" do
			expect(File.exist?(template_path)).to be == true
		end
		
		it "template file contains expected structure" do
			content = File.read(template_path)
			
			expect(content).to be(:include?, "<!DOCTYPE html>")
			expect(content).to be(:include?, "self.stylesheets")
			expect(content).to be(:include?, "self.modules")
		end
	end
end
