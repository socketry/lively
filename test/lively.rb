# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

describe Lively do
	it "has a version number" do
		expect(Lively::VERSION).to be =~ /^\d+\.\d+\.\d+$/
	end
end
