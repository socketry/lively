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
			# @parameter resolver [Resolver | Nil] The resolver used to construct live views.
			# @parameter body [Object | Nil] Static body content rendered before any live views.
			# @yields {|page| ...} Configures the live views composed by this page.
			# 	@parameter page [Page] The page being configured.
			def initialize(title: "Lively", resolver: nil, body: nil, &block)
				super(
					title: title,
					resolver: resolver,
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
