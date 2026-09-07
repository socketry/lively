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
			# @parameter title [String] The title of the page.
			# @parameter body [Object | Nil] The document body. It must respond to `to_html`.
			# @yields {|request, parameters| ...} Constructs the document body for a request.
			# 	@parameter request [Protocol::HTTP::Request | Nil] The incoming request.
			# 	@parameter parameters [Hash] The decoded query parameters.
			# 	@returns [Object | Nil] The document body.
			def initialize(title: "Lively", body: nil, &block)
				super(
					title: title,
					body: body,
					icon: ICON,
					stylesheets: STYLESHEETS,
					imports: IMPORTS,
					modules: MODULES,
					&block
				)
			end
		end
	end
end
