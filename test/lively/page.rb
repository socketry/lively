# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "lively/page"
require "protocol/http/request"

describe Lively::Page do
	with "#initialize" do
		it "accepts document content and assets" do
			body = Object.new
			page = subject.new(
				title: "Example",
				body: body,
				icon: "/icon.png",
				stylesheets: [{href: "/site.css", media: "screen"}],
				imports: {"example" => "/example.js"},
				modules: ["/application.js"],
				body_attributes: {class: "example"}
			)
			
			expect(page.title).to be == "Example"
			expect(page.body).to be_equal(body)
			expect(page.icon).to be == "/icon.png"
			expect(page.stylesheets).to be == [{href: "/site.css", media: "screen"}]
			expect(page.imports).to be == {"example" => "/example.js"}
			expect(page.modules).to be == ["/application.js"]
			expect(page.body_attributes).to be == {class: "example"}
			expect(page.template).to be_a(XRB::Template)
		end
		
	end
	
	with "#to_html" do
		it "renders through a per-request context" do
			page = subject.new
			request = Protocol::HTTP::Request["GET", "/"]
			body = Object.new
			context = subject::Context.new(page, request, body)
			
			expect(context.page).to be_equal(page)
			expect(context.request).to be_equal(request)
			expect(context.body).to be_equal(body)
		end
		
		it "renders the configured document" do
			body = Object.new
			def body.to_html
				XRB::MarkupString.raw("<main>Example</main>")
			end
			
			page = subject.new(
				title: "Example",
				body: body,
				icon: "/icon.png",
				stylesheets: ["/site.css", {href: "/theme.css", media: "print"}],
				imports: {"example" => "/example.js"},
				modules: ["/application.js"],
				body_attributes: {
					class: "playback",
					data: {autoplay: "true", controls: "false"},
				}
			)
			
			html = page.to_html
			
			expect(html).to be(:include?, "<!DOCTYPE html>")
			expect(html).to be(:include?, "<title>Example</title>")
			expect(html).to be(:include?, 'href="/icon.png"')
			expect(html).to be(:include?, 'href="/site.css"')
			expect(html).to be(:include?, 'href="/theme.css"')
			expect(html).to be(:include?, 'href="/theme.css" media="print"')
			expect(html).to be(:include?, 'src="/application.js"')
			expect(html).to be(:include?, '<body class="playback" data-autoplay="true" data-controls="false">')
			expect(html).to be(:include?, "<main>Example</main>")
			
			json = html.match(/<script type="importmap">\s*(.*?)\s*<\/script>/m)[1]
			expect(JSON.parse(json)).to be == {"imports" => {"example" => "/example.js"}}
		end
		
		it "escapes import map content for an inline script" do
			html = subject.new(imports: {"example" => "</script><script>"}).to_html
			
			expect(html.scan("</script>").size).to be == 1
			expect(html).to be(:include?, '"example": "\\u003c/script\\u003e\\u003cscript\\u003e"')
		end
		
		it "omits optional document assets" do
			html = subject.new.to_html
			
			expect(html).not.to be(:include?, 'rel="icon"')
			expect(html).not.to be(:include?, 'rel="stylesheet"')
			expect(html).not.to be(:include?, 'type="importmap"')
			expect(html).not.to be(:include?, 'type="module"')
			expect(html).not.to be(:include?, "No body specified!")
		end
		
		it "escapes document values" do
			body = Object.new
			def body.to_html
				"<main>Example</main>"
			end
			
			page = subject.new(
				title: "<Example>",
				body: body,
				stylesheets: ["/site.css?one=1&two=2"],
				body_attributes: {title: 'one & "two"'}
			)
			
			html = page.to_html
			
			expect(html).to be(:include?, "<title>&lt;Example&gt;</title>")
			expect(html).to be(:include?, 'href="/site.css?one=1&amp;two=2"')
			expect(html).to be(:include?, 'title="one &amp; &quot;two&quot;"')
			expect(html).to be(:include?, "&lt;main&gt;Example&lt;/main&gt;")
		end
	end
	
	with "#call" do
		it "returns an HTML response" do
			request = Protocol::HTTP::Request["GET", "/"]
			response = subject.new(title: "Example").call(request)
			
			expect(response.status).to be == 200
			expect(response.headers["content-type"]).to be == "text/html; charset=utf-8"
			expect(response.read).to be(:include?, "<title>Example</title>")
		end
	end
end
