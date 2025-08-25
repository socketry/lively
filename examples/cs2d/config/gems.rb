# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025, by Your Name.

source "https://rubygems.org"

gem "lively", path: "../../"
gem "async-redis", "~> 0.10"
gem "json", "~> 2.7"

group :test, :development do
  gem "rspec", "~> 3.12"
  gem "rspec-core", "~> 3.12"
  gem "rspec-expectations", "~> 3.12"
  gem "rspec-mocks", "~> 3.12"
  gem "factory_bot", "~> 6.2"
  gem "simplecov", "~> 0.22"
  gem "simplecov-html", "~> 0.12"
  gem "webmock", "~> 3.18"
  gem "timecop", "~> 0.9"
  gem "redis-namespace", "~> 1.10"
end

group :development do
  gem "rubocop", "~> 1.50"
  gem "rubocop-rspec", "~> 2.22"
  gem "rubocop-performance", "~> 1.18"
end