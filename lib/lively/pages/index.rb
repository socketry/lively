# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require "xrb/template"

# @namespace
module Lively
	# @namespace
	module Pages
		# Represents the main index page for a Lively application.
		# 
		# This class renders the initial HTML page that users see when they visit
		# a Lively application. It uses an XRB template to generate the page structure
		# and embeds the Live view component for dynamic content.
		class Index
			# Initialize a new index page.
			# @parameter title [String] The title of the page.
			# @parameter body [Object] The body content of the page.
			def initialize(title: "Lively", body: nil)
				@title = title
				@body = body
				
				path = File.expand_path("index.xrb", __dir__)
				@template = XRB::Template.load_file(path)
			end
			
			# @attribute [String] The title of the page.
			attr :title
			
			# @attribute [Object] The body content of the page.
			attr :body
			
			# @attribute [XRB::Template] The XRB template for rendering the page.
			attr :template
			
			# Render this page to a string.
			# @returns [String] The rendered HTML for this page.
			def call
				@template.to_string(self)
			end
		end
	end
end
