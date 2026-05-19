# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2026, by Samuel Williams.

require "lively/resolver"

describe Lively::Resolver do
	let(:resolver) {subject.new}
	
	with "no state" do
		it "resolves a view by class name" do
			view_class = Class.new(Live::View)
			resolver.allow(view_class)
			
			view = resolver.call("test-id", {class: view_class.name})
			expect(view).to be_a(view_class)
			expect(view.id).to be == "test-id"
		end
		
		it "returns nil for unknown classes" do
			result = resolver.call("test-id", {class: "Unknown"})
			expect(result).to be_nil
		end
		
		it "has empty state by default" do
			expect(resolver.state).to be(:empty?)
		end
	end
	
	with "state" do
		let(:state_value) {Object.new}
		let(:resolver) {subject.new({controller: state_value})}
		
		it "stores the state" do
			expect(resolver.state).to be == {controller: state_value}
		end
		
		it "passes state to views as keyword arguments" do
			view_class = Class.new(Live::View) do
				def initialize(id = self.class.unique_id, data = {}, controller: nil)
					super(id, data)
					@controller = controller
				end
				attr :controller
			end
			
			resolver.allow(view_class)
			
			view = resolver.call("test-id", {class: view_class.name})
			expect(view).to be_a(view_class)
			expect(view.controller).to be == state_value
		end
	end
end
