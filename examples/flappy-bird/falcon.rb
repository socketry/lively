#!/usr/bin/env falcon-host
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025, by Samuel Williams.

require "lively"
require_relative "application"

service "sakura.local" do
	include Lively::Environment::Application
	
	# Bind to all interfaces:
	url {"http://[::]:9292"}
end
