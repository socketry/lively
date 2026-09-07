# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "json"
require "protocol/http/response"
require "xrb/markup"
require "xrb/tag"
require "xrb/template"

module Lively
	# Represents a complete HTML document.
	#
	# A page combines a renderable body with the stylesheets,
	# import map, JavaScript modules, and body attributes required to present it.
	# Pages are callable route handlers. The body is constructed for each request
	# using a block.
	class Page
		TEMPLATE = XRB::Template.load_file(File.expand_path("page.xrb", __dir__))
		
		# Initialize a new page.
		# @parameter title [String] The document title.
		# @parameter icon [String | Nil] The favicon URL.
		# @parameter stylesheets [Array(String | Hash)] Stylesheets in document order. Hash entries specify link attributes.
		# @parameter imports [Hash] JavaScript import map entries.
		# @parameter modules [Array(String)] JavaScript module URLs in document order.
		# @parameter body_attributes [Hash] Attributes applied to the body element.
		# @yields {|request, parameters| ...} Constructs the document body for a request.
		# 	@parameter request [Protocol::HTTP::Request | Nil] The incoming request.
		# 	@parameter parameters [Hash] The decoded query parameters.
		# 	@returns [Object | Nil] The document body.
		def initialize(title: "Lively", icon: nil, stylesheets: [], imports: {}, modules: [], body_attributes: {}, &body)
			@title = title
			@body = body || proc{nil}
			@icon = icon
			@stylesheets = stylesheets
			@imports = imports
			@modules = modules
			@body_attributes = body_attributes
			@template = TEMPLATE
			@rendered_body = nil
		end
		
		# @attribute [String] The document title.
		attr :title
		
		# Construct the renderable document body.
		# @parameter request [Protocol::HTTP::Request | Nil] The incoming request.
		# @parameter parameters [Hash] The decoded query parameters.
		# @returns [Object | Nil] The body, which must respond to `to_html`.
		def body(request = nil, parameters = {})
			return @body.call(request, parameters)
		end
		
		# @attribute [String | Nil] The favicon URL.
		attr :icon
		
		# @attribute [Array(String | Hash)] Stylesheets in document order.
		attr :stylesheets
		
		# @attribute [Hash] JavaScript import map entries.
		attr :imports
		
		# @attribute [Array(String)] JavaScript module URLs in document order.
		attr :modules
		
		# @attribute [Hash] Attributes applied to the body element.
		attr :body_attributes
		
		# @attribute [XRB::Template] The document template.
		attr :template
		
		# The opening body tag including configured attributes.
		# @returns [XRB::Tag]
		def body_tag
			XRB::Tag.opened("body", @body_attributes)
		end
		
		# A stylesheet link tag for the given URL or attributes.
		# @parameter stylesheet [String | Hash] The stylesheet URL or link attributes.
		# @returns [XRB::Tag]
		def stylesheet_tag(stylesheet)
			attributes = if stylesheet.respond_to?(:to_hash)
				stylesheet.to_hash
			else
				{href: stylesheet}
			end
			
			XRB::Tag.closed("link", {rel: "stylesheet", type: "text/css"}.merge(attributes))
		end
		
		# The rendered document body.
		# @returns [Object]
		# @parameter request [Protocol::HTTP::Request | Nil] The incoming request.
		# @parameter parameters [Hash] The decoded query parameters.
		def body_content(request = nil, parameters = {})
			return @rendered_body if @rendered_body
			
			return self.body(request, parameters)&.to_html || ""
		end
		
		# The serialized JavaScript import map.
		# @returns [XRB::MarkupString]
		def import_map
			json = JSON.pretty_generate(imports: @imports)
			json = json.gsub("<", "\\u003c").gsub(">", "\\u003e").gsub("&", "\\u0026")
			
			XRB::MarkupString.raw(json)
		end
		
		# Render this page to an HTML string.
		# @parameter request [Protocol::HTTP::Request | Nil] The incoming request.
		# @parameter parameters [Hash] The decoded query parameters.
		# @returns [String]
		def to_html(request = nil, parameters = {})
			rendering = self.dup
			rendering.instance_variable_set(:@rendered_body, body_content(request, parameters))
			
			@template.to_string(rendering)
		end
		
		# Render this page as an HTTP response.
		# @parameter request [Protocol::HTTP::Request] The incoming request.
		# @returns [Protocol::HTTP::Response] A successful HTML response.
		# @parameter parameters [Hash] The decoded query parameters.
		def call(request, parameters = {})
			Protocol::HTTP::Response[200, {"content-type" => "text/html; charset=utf-8"}, [to_html(request, parameters)]]
		end
	end
end
