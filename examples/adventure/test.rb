# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025-2026, by Samuel Williams.

require "lively"
require_relative "application"
Object.send(:remove_const, :Application)

class TestAdventureView < AdventureView
	def update!
		# The view is not attached to a live page during these state-machine tests.
	end
end

describe AdventureView do
	let(:view) {TestAdventureView.new("test", {})}
	let(:areas) {view.instance_variable_get(:@areas)}
	let(:inventory) {view.instance_variable_get(:@inventory)}
	let(:messages) {view.instance_variable_get(:@messages)}
	
	it "allows the Water Spirit quest to complete after initially missing an item" do
		view.instance_variable_set(:@current_area, areas[:sanctuary])
		inventory << Item.new("Crystal Shard", "A test crystal shard.")
		
		view.handle(type: "click", detail: {character: 0})
		expect(view.instance_variable_get(:@game_complete)).to be == false
		
		inventory << Item.new("Moonstone", "A test moonstone.")
		view.handle(type: "click", detail: {character: 0})
		
		expect(view.instance_variable_get(:@game_complete)).to be == true
		expect(inventory).to be(:empty?)
	end
	
	it "consumes only the items required for a trade" do
		view.instance_variable_set(:@current_area, areas[:pond])
		inventory << Item.new("Water Lily", "The quest item.")
		inventory << Item.new("Water Lily", "A spare item.")
		
		view.handle(type: "click", detail: {character: 0})
		
		expect(inventory.map(&:name).tally).to be == {"Water Lily" => 1, "Crystal Shard" => 1}
	end
	
	it "shows discovery messages only on the first visit" do
		view.instance_variable_set(:@current_area, areas[:pond])
		
		view.handle(type: "click", detail: {direction: "east"})
		view.handle(type: "click", detail: {direction: "west"})
		view.handle(type: "click", detail: {direction: "east"})
		
		discovery_message = "The crystals hum with ancient magic..."
		expect(messages.count(discovery_message)).to be == 1
	end
	
	it "provides a return route for every connection" do
		areas.each_value do |area|
			area.exits.each_value do |destination|
				expect(destination.exits.values).to be(:include?, area)
			end
		end
	end
end
