# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2026, by Samuel Williams.

require_relative "../page"

# @namespace
module Lively
	# @namespace
	module Pages
		# Represents the main index page for a Lively application.
		# 
		# This class renders the initial HTML page that users see when they visit
		# a Lively application. It uses an XRB template to generate the page structure
		# and embeds the Live view component for dynamic content.
		class Index < Page
			ICON = "/_static/icon.png"
			STYLESHEETS = [
				{href: "/_static/site.css", media: "screen"}.freeze,
				{href: "/_static/index.css", media: "screen"}.freeze,
			].freeze
			IMPORTS = {
				"live" => "/_components/@socketry/live/Live.js",
				"live-audio" => "/_components/@socketry/live-audio/Live/Audio.js",
				"morphdom" => "/_components/morphdom/morphdom-esm.js",
			}.freeze
			MODULES = ["/application.js"].freeze
			
			# Initialize a new index page.
			# @parameter view_class [Class | Nil] The root live view class.
			# @parameter view_arguments [Hash] Additional keyword arguments for the root view.
			# @parameter title [String] The title of the page.
			# @parameter resolver [Resolver | Nil] The resolver used to construct live views.
			# @parameter body [Object | Nil] Static body content rendered before any live views.
			def initialize(view_class = nil, view_arguments: {}, title: "Lively", resolver: nil, body: nil)
				@view_class = view_class
				@view_arguments = view_arguments
				
				super(
					title: title,
					resolver: resolver,
					body: body,
					icon: ICON,
					stylesheets: STYLESHEETS,
					imports: IMPORTS,
					modules: MODULES
				)
			end
			
			# @attribute [Class | Nil] The root live view class.
			attr :view_class
			
			# @attribute [Hash] Additional keyword arguments for the root view.
			attr :view_arguments
			
			# Construct the root live view for a request.
			# @parameter request [Protocol::HTTP::Request | Nil] The incoming request.
			# @parameter parameters [Hash] The decoded query parameters.
			# @returns [Array(Live::View)] The root view, or an empty array when none was configured.
			def views(request = nil, parameters = {})
				return [] unless @view_class
				
				return [view(@view_class, **@view_arguments)]
			end
		end
	end
end
