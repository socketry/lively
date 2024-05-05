# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require 'xrb/template'

module Lively
	module Pages
		class Index
			def initialize(title: "Lively", body: "Hello World")
				@title = title
				@body = body
				
				path = File.expand_path("index.xrb", __dir__)
				@template = XRB::Template.load_file(path)
			end
			
			attr :title
			attr :body
			
			def call
				@template.to_string(self)
			end
		end
	end
end
