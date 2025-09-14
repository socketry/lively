# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

require "lively"
require "sus/fixtures/async"
require "sus/fixtures/console"

class MockBuilder
	def initialize
		@tags = []
		@content = []
	end
	
	attr :tags, :content
	
	def tag(name, &block)
		@tags << name
		@current_tag = name
		block.call if block_given?
		@current_tag = nil
	end
	
	def inline_tag(name, &block)
		tag(name, &block)
	end
	
	def text(content)
		@content << content
	end
end

describe Lively::HelloWorld do
	include Sus::Fixtures::Async
	include Sus::Fixtures::Console
	
	let(:hello_world) {Lively::HelloWorld.new}
	
	with "#initialize" do
		it "creates a new HelloWorld instance" do
			expect(hello_world).to be_a(Lively::HelloWorld)
		end
		
		it "inherits from Live::View" do
			expect(hello_world).to be_a(Live::View)
		end
		
		it "initializes with no clock" do
			expect(hello_world.clock).to be_nil
		end
	end
	
	with "#bind" do
		let(:mock_page) do
			mock = Object.new
			def mock.enqueue(*args)
				# Mock enqueue method to prevent errors
			end
			mock
		end
		
		it "sets up a clock when bound to a page" do
			Async do |task|
				hello_world.bind(mock_page)
				
				# Give the async task a moment to start
				task.sleep(0.01)
				
				expect(hello_world.clock).not.to be_nil
				
				# Clean up the clock
				hello_world.close
			end
		end
	end
	
	with "#close" do
		it "stops the clock when closed" do
			# Create a mock clock object
			mock_clock = Object.new
			stopped = false
			
			def mock_clock.stop
				@stopped = true
			end
			
			def mock_clock.stopped?
				@stopped || false
			end
			
			hello_world.instance_variable_set(:@clock, mock_clock)
			hello_world.close
			
			expect(mock_clock.stopped?).to be == true
		end
		
		it "handles nil clock gracefully" do
			hello_world.instance_variable_set(:@clock, nil)
			
			# Should not raise an error
			expect {hello_world.close}.not.to raise_exception
		end
	end
	
	with "#render" do
		let(:builder) {MockBuilder.new}
		
		it "renders an h1 tag" do
			hello_world.render(builder)
			
			expect(builder.tags.include?(:h1)).to be == true
		end
		
		it "renders paragraph tags" do
			hello_world.render(builder)
			
			expect(builder.tags.count(:p)).to be >= 3
		end
		
		it "renders a pre tag for code example" do
			hello_world.render(builder)
			
			expect(builder.tags.include?(:pre)).to be == true
		end
		
		it "includes current time in content" do
			hello_world.render(builder)
			
			expect(builder.content.any? {|c| c.include?("The time is")}).to be == true
		end
		
		it "includes introduction text" do
			hello_world.render(builder)
			
			expect(builder.content.any? {|c| c.include?("Hello, I'm Lively!")}).to be == true
		end
		
		it "includes framework description" do
			hello_world.render(builder)
			
			expect(builder.content.any? {|c| c.include?("simple client-server SPA framework")}).to be == true
		end
		
		it "includes code example" do
			hello_world.render(builder)
			
			code_example = builder.content.find {|c| c.include?("#!/usr/bin/env lively")}
			expect(code_example).not.to be_nil
			expect(code_example.include?("class Application")).to be == true
			expect(code_example.include?("Lively::HelloWorld.new")).to be == true
		end
		
		it "includes examples directory reference" do
			hello_world.render(builder)
			
			expect(builder.content.any? {|c| c.include?("examples/")}).to be == true
		end
	end
end
