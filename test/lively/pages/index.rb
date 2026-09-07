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
		end
		
		it "accepts a custom title" do
			index = Lively::Pages::Index.new(title: "Custom Title")
			
			expect(index.title).to be == "Custom Title"
		end
		
		it "accepts a root view class" do
			resolver = Lively::Resolver.new.allow(Lively::HelloWorld)
			index = Lively::Pages::Index.new(Lively::HelloWorld, resolver: resolver)
			
			expect(index.body).to be_a(Lively::HelloWorld)
		end
		
		it "constructs fresh root views using the resolver" do
			message = Object.new
			view_class = Class.new(Live::View) do
				def initialize(id = self.class.unique_id, data = {}, message: nil, suffix: nil)
					super(id, data)
					@message = [message, suffix]
				end
				
				attr :message
			end
			resolver = Lively::Resolver.new(message: message).allow(view_class)
			index = Lively::Pages::Index.new(view_class, resolver: resolver, view_arguments: {suffix: "Root"})
			first = index.body
			second = index.body
			
			expect(first.message).to be == [message, "Root"]
			expect(first).not.to be_equal(second)
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
		
		it "supports pages without a root view" do
			index = Lively::Pages::Index.new
			html = index.to_html
			
			expect(html).not.to be(:include?, "No body specified!")
		end
		
		it "requires a resolver to construct live views" do
			index = Lively::Pages::Index.new(Lively::HelloWorld)
			
			expect do
				index.to_html
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
