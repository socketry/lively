# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require "lively/pages/index"
require "sus/fixtures/console"

describe Lively::Pages::Index do
	include Sus::Fixtures::Console
	
	with "#initialize" do
		it "creates with default values" do
			index = Lively::Pages::Index.new
			
			expect(index.title).to be == "Lively"
			expect(index.body).to be_nil
		end
		
		it "accepts custom title and body" do
			index = Lively::Pages::Index.new(title: "Custom Title", body: "Custom Body")
			
			expect(index.title).to be == "Custom Title"
			expect(index.body).to be == "Custom Body"
		end
		
		it "loads the XRB template" do
			index = Lively::Pages::Index.new
			
			template = index.template
			expect(template).not.to be_nil
			expect(template).to be_a(XRB::Template)
		end
	end
	
	with "#call" do
		it "generates HTML string" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:is_a?, String)
			expect(html).not.to be(:empty?)
		end
		
		it "includes DOCTYPE declaration" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, "<!DOCTYPE html>")
		end
		
		it "includes html structure" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, "<html>")
			expect(html).to be(:include?, "<head>")
			expect(html).to be(:include?, "<body>")
			expect(html).to be(:include?, "</html>")
		end
		
		it "includes the title in head" do
			index = Lively::Pages::Index.new(title: "Test Title")
			html = index.call
			
			expect(html).to be(:include?, "<title>Test Title</title>")
		end
		
		it "includes viewport meta tag" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, 'name="viewport"')
			expect(html).to be(:include?, "width=device-width")
		end
		
		it "includes charset meta tag" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, 'charset="UTF-8"')
		end
		
		it "includes static asset links" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, 'href="/_static/icon.png"')
			expect(html).to be(:include?, 'href="/_static/site.css"')
			expect(html).to be(:include?, 'href="/_static/index.css"')
		end
		
		it "includes import map" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, 'type="importmap"')
			expect(html).to be(:include?, '"live"')
			expect(html).to be(:include?, '"morphdom"')
		end
		
		it "includes Live.js initialization" do
			index = Lively::Pages::Index.new
			html = index.call
			
			expect(html).to be(:include?, 'type="module"')
			expect(html).to be(:include?, "Live.start()")
		end
		
		it "includes body content when body responds to to_html" do
			mock_body = Object.new
			def mock_body.to_html
				"<div>Custom Body HTML</div>"
			end
			
			index = Lively::Pages::Index.new(body: mock_body)
			html = index.call
			
			expect(html).to be(:include?, "&lt;div&gt;Custom Body HTML&lt;/div&gt;")
		end
		
		it "shows fallback message when body is nil" do
			index = Lively::Pages::Index.new(body: nil)
			html = index.call
			
			expect(html).to be(:include?, "No body specified!")
		end
	end
	
	with "template file" do
		let(:root) {File.expand_path("../../../lib/lively/pages", __dir__)}
		let(:template_path) {File.join(root, "index.xrb")}
		
		it "template file exists" do
			expect(File.exist?(template_path)).to be == true
		end
		
		it "template file contains expected structure" do
			content = File.read(template_path)
			
			expect(content).to be(:include?, "<!DOCTYPE html>")
			expect(content).to be(:include?, "/_static/")
			expect(content).to be(:include?, "Live.start()")
		end
	end
end
