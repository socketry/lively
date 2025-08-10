#!/usr/bin/env falcon-host

require "lively"
require_relative "application"

service "sakura.local" do
	include Lively::Environment::Application
	
	# Bind to all interfaces:
	url {"http://[::]:9292"}
end
