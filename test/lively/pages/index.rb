# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025-2026, by Samuel Williams.

require "lively/pages/index"
require "protocol/http/request"
require "sus/fixtures/console"

describe Lively::Pages::Index do
	include Sus::Fixtures::Console
	
	with "#initialize" do
		it "creates with default values" do
			index = Lively::Pages::Index.new
			
			expect(index.title).to be == "Lively"
			expect(index.body).to be_nil
		end
		
		it "accepts a custom title" do
			index = Lively::Pages::Index.new(title: "Custom Title")
			
			expect(index.title).to be == "Custom Title"
		end
		
		it "constructs fresh bodies using a block" do
			index = Lively::Pages::Index.new{Object.new}
			
			expect(index.body).not.to be_equal(index.body)
		end
		
		it "passes the request to the body block" do
			request = Protocol::HTTP::Request["GET", "/example?message=Hello"]
			index = Lively::Pages::Index.new{|request| request.path}
			
			expect(index.body(request)).to be == "/example?message=Hello"
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
