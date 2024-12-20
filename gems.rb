# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

source "https://rubygems.org"

gemspec

gem "utopia"
gem "io-watch"

group :maintenance, optional: true do
	gem "bake-gem"
	gem "bake-modernize"
	
	gem "utopia-project"
end

group :test do
	gem "sus"
	gem "covered"
	gem "decode"
	gem "rubocop"
	
	gem "sus-fixtures-async-http"
	gem "sus-fixtures-async-webdriver"
	
	gem "bake-test"
	gem "bake-test-external"
end
