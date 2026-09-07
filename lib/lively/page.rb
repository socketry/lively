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
	# A page combines application content and live views with the stylesheets,
	# import map, JavaScript modules, and body attributes required to present it.
	# Pages are callable route handlers. Subclasses can override {#views} to
	# construct fresh live views for each request.
	class Page
		TEMPLATE = XRB::Template.load_file(File.expand_path("page.xrb", __dir__))
		
		# Initialize a new page.
		# @parameter title [String] The document title.
		# @parameter resolver [Resolver | Nil] The resolver used to construct live views.
		# @parameter body [Object | Nil] Static document body content rendered before any live views.
		# @parameter icon [String | Nil] The favicon URL.
		# @parameter stylesheets [Array(String | Hash)] Stylesheets in document order. Hash entries specify link attributes.
		# @parameter imports [Hash] JavaScript import map entries.
		# @parameter modules [Array(String)] JavaScript module URLs in document order.
		# @parameter body_attributes [Hash] Attributes applied to the body element.
		def initialize(title: "Lively", resolver: nil, body: nil, icon: nil, stylesheets: [], imports: {}, modules: [], body_attributes: {})
			@title = title
			@resolver = resolver
			@body = body
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
		
		# @attribute [Resolver | Nil] The resolver used to construct live views.
		attr :resolver
		
		# @attribute [Object | Nil] The document body.
		attr :body
		
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
		
		# Construct a live view for the page.
		# @parameter view_class [Class] The view class to construct.
		# @parameter arguments [Hash] Additional keyword arguments for the view.
		# @returns [Live::View] The constructed view.
		# @raises [ArgumentError] If no resolver was provided or the view is not allowed.
		def view(view_class, **arguments)
			raise ArgumentError, "A resolver is required to construct views!" unless @resolver
			
			return @resolver.make(view_class, **arguments)
		end
		
		# Construct the live views for a request. Subclasses can override this method
		# to return zero or more views in document order.
		# @returns [Array(Live::View)] The views in document order.
		# @parameter request [Protocol::HTTP::Request | Nil] The incoming request.
		# @parameter parameters [Hash] The decoded query parameters.
		def views(request = nil, parameters = {})
			return []
		end
		
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
		
		# The rendered static body and live views.
		# @returns [Object]
		# @parameter request [Protocol::HTTP::Request | Nil] The incoming request.
		# @parameter parameters [Hash] The decoded query parameters.
		def body_content(request = nil, parameters = {})
			return @rendered_body if @rendered_body
			
			views = self.views(request, parameters)
			
			XRB::Builder.fragment do |builder|
				if @body
					body = @body.respond_to?(:to_html) ? @body.to_html : @body
					builder << body
				end
				
				views.each do |view|
					builder << view.to_html
				end
			end
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
