# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require "lively"
require "sus/fixtures/console"

describe Lively do
	include Sus::Fixtures::Console
	
	it "has a version number" do
		expect(Lively::VERSION).to be =~ /^\d+\.\d+\.\d+$/
	end
	
	it "loads all required components" do
		expect(defined?(Lively::Assets)).to be_truthy
		expect(defined?(Lively::Application)).to be_truthy
		expect(defined?(Lively::HelloWorld)).to be_truthy
		expect(defined?(Lively::Pages::Index)).to be_truthy
		expect(defined?(Lively::Environment::Application)).to be_truthy
	end
end
