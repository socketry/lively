# frozen_string_literal: true

require 'simplecov'
SimpleCov.start do
  add_filter '/spec/'
  add_filter '/vendor/'
  add_filter '/tmp/'
  add_filter '/docker/'
  add_filter '/node_modules/'
  add_filter '/cstrike/'
  
  add_group 'Controllers', 'src'
  add_group 'Game Logic', 'game'
  add_group 'Libraries', 'lib'
  add_group 'Application', 'application.rb'
  
  minimum_coverage 80
  track_files '{application.rb,src,game,lib}/**/*.rb'
end

require 'rspec'
require 'factory_bot'
require 'webmock/rspec'
require 'timecop'
require 'json'
require 'async/redis'

# Load application files
$LOAD_PATH.unshift(File.expand_path('..', __dir__))
$LOAD_PATH.unshift(File.expand_path('../src', __dir__))
$LOAD_PATH.unshift(File.expand_path('../game', __dir__))
$LOAD_PATH.unshift(File.expand_path('../lib', __dir__))

# Configure WebMock
WebMock.disable_net_connect!(allow_localhost: true)

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups
  config.filter_run_when_matching :focus
  config.example_status_persistence_file_path = "spec/examples.txt"
  config.disable_monkey_patching!
  config.warnings = true

  config.default_formatter = "doc" if config.files_to_run.one?

  config.profile_examples = 10

  config.order = :random
  Kernel.srand config.seed

  # Include FactoryBot methods
  config.include FactoryBot::Syntax::Methods

  # Setup and teardown
  config.before(:suite) do
    FactoryBot.find_definitions
  end

  config.before(:each) do
    # Clear Redis test database
    redis = Async::Redis::Client.new(database: 1)
    Async do
      redis.flushdb
    end.wait
  end

  config.after(:each) do
    Timecop.return
    WebMock.reset!
  end
end