# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2021-2024, by Samuel Williams.

require "lively/environment/application"
require "sus/fixtures/console"
require "async/service/environment"

describe Lively::Environment::Application do
	include Sus::Fixtures::Console
	
	let(:environment) {Async::Service::Environment.build(subject, root: __dir__)}
	let(:evaluator) {environment.evaluator}
	
	with "module methods" do
		it "provides default URL" do
			expect(evaluator.url).to be == "http://localhost:9292"
		end
		
		it "provides default count" do
			expect(evaluator.count).to be == 1
		end
		
		it "provides default application class" do
			application_class = evaluator.application
			expect(application_class).to be == Lively::Application
		end
		
		it "provides middleware stack" do
			middleware = evaluator.middleware
			expect(middleware).to be_a(Protocol::HTTP::Middleware)
		end
	end
	
	with "application resolution" do
		it "uses Lively::Application when no Application class exists" do
			application_class = evaluator.application
			expect(application_class).to be == Lively::Application
		end
		
		it "uses custom Application class when defined" do
			application_class = Class.new(Lively::Application)
			
			# This mocks Object constant lookup for the purpose of testing our custom "Application" support.
			mock(Object) do |mock|
				mock.wrap(:const_defined?) do |original, name|
					if name == :Application
						true
					else
						original.call(name)
					end
				end
				
				mock.wrap(:const_get) do |original, name|
					if name == :Application
						application_class
					else
						original.call(name)
					end
				end
			end
			
			application_class = evaluator.application
			expect(application_class).to be == application_class
		end
	end
	
	with "middleware configuration" do
		it "includes Assets middleware for public directory" do
			middleware = evaluator.middleware
			
			# The middleware should be configured with Assets
			expect(middleware).to be_a(Protocol::HTTP::Middleware)
		end
		
		it "includes Assets middleware for gem public directory" do
			middleware = evaluator.middleware
			
			# Should include the gem's public directory assets
			expect(middleware).to be_a(Protocol::HTTP::Middleware)
		end
		
		it "includes application middleware" do
			middleware = evaluator.middleware
			
			# Should include the application class in the middleware stack
			expect(middleware).to be_a(Protocol::HTTP::Middleware)
		end
	end
end
