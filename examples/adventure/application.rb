#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2025-2026, by Samuel Williams.

class Item
	attr_reader :name, :description
	
	def initialize(name, description)
		@name = name
		@description = description
	end
end

# Area class: represents a location in the adventure.
class Area
	attr_reader :name, :description, :exits, :characters, :items
	attr_accessor :visited
	
	def initialize(name, description)
		@name = name
		@description = description
		@exits = {}
		@characters = []
		@items = []
		@visited = false
	end
	
	def add_exit(direction, area)
		@exits[direction] = area
	end
	
	def add_character(character)
		@characters << character
	end
	
	def add_item(item)
		@items << item
	end
	
	def remove_item(item)
		@items.delete(item)
	end
end

# Character class: represents a person or creature you can talk to.
class Character
	attr_reader :name, :dialogue, :quest_items, :reward_item, :quest_complete
	attr_accessor :dialogue_index
	
	def initialize(name, dialogue, quest_items = nil, reward_item = nil)
		@name = name
		@dialogue = dialogue.is_a?(Array) ? dialogue : [dialogue]
		@quest_items = Array(quest_items) # Items they want
		@reward_item = reward_item # Item they give
		@dialogue_index = 0
		@quest_complete = false
	end
	
	def speak(player_inventory = [])
		if ready_to_complete?(player_inventory)
			return "perfect_trade"
		end
		
		# Return appropriate dialogue
		if @quest_complete && @dialogue.size > 1
			@dialogue.last # Final dialogue after quest
		else
			current_dialogue = @dialogue[@dialogue_index] || @dialogue.first
			@dialogue_index = [@dialogue_index + 1, @dialogue.size - 1].min
			current_dialogue
		end
	end
	
	def ready_to_complete?(player_inventory)
		return false if @quest_complete || @quest_items.empty?
		
		available_items = player_inventory.map(&:name).tally
		@quest_items.tally.all? do |name, quantity|
			available_items.fetch(name, 0) >= quantity
		end
	end
	
	def complete_quest!(player_inventory)
		return false unless ready_to_complete?(player_inventory)
		
		@quest_items.each do |name|
			index = player_inventory.index{|item| item.name == name}
			player_inventory.delete_at(index)
		end
		
		player_inventory << @reward_item if @reward_item
		@quest_complete = true
		true
	end
end

# The main adventure view.
class AdventureView < Live::View
	def initialize(...)
		super
		@areas = build_world
		@current_area = @areas[:forest]
		@current_area.visited = true
		@inventory = []
		@messages = ["You awaken as a lost princess in a misty forest. Your beloved golden fish, Shimmer, is missing!", "You must find her before the curse becomes permanent!"]
		@game_complete = false
	end
	
	def build_world
		# Create all areas
		forest = Area.new("Misty Forest", "Tall ancient trees surround you. Mist swirls between the trunks, and you hear distant water.")
		pond = Area.new("Shimmering Pond", "A tranquil pond reflects the sky. Lily pads float on the surface, and a small waterfall feeds it.")
		cottage = Area.new("Witch's Cottage", "A cozy cottage with herbs drying from the rafters. Mysterious bottles line the shelves.")
		garden = Area.new("Enchanted Garden", "A garden full of magical flowers that glow softly. Strange plants grow in impossible colors.")
		cave = Area.new("Crystal Cave", "A cave filled with glowing crystals. Deep pools of water reflect the crystal light.")
		tower = Area.new("Ancient Tower", "An old stone tower covered in ivy. Stairs spiral upward into darkness.")
		bridge = Area.new("Moonstone Bridge", "An elegant bridge made of white stone that seems to glow with inner light.")
		sanctuary = Area.new("Water Sanctuary", "A sacred pool surrounded by marble columns. This is where water spirits dwell.")
		
		# Connect areas
		forest.add_exit(:north, pond)
		forest.add_exit(:east, cottage)
		forest.add_exit(:west, garden)
		
		pond.add_exit(:south, forest)
		pond.add_exit(:east, cave)
		pond.add_exit(:north, bridge)
		
		cottage.add_exit(:west, forest)
		cottage.add_exit(:north, tower)
		
		garden.add_exit(:east, forest)
		garden.add_exit(:north, sanctuary)
		
		cave.add_exit(:west, pond)
		
		tower.add_exit(:south, cottage)
		tower.add_exit(:west, bridge)
		
		bridge.add_exit(:south, pond)
		bridge.add_exit(:east, tower)
		bridge.add_exit(:west, sanctuary)
		
		sanctuary.add_exit(:south, garden)
		sanctuary.add_exit(:east, bridge)
		
		# Create items
		magic_herbs = Item.new("Magic Herbs", "Glowing herbs that sparkle with magical energy.")
		crystal_shard = Item.new("Crystal Shard", "A piece of crystal that pulses with inner light.")
		moonstone = Item.new("Moonstone", "A pale stone that seems to hold moonlight within.")
		water_lily = Item.new("Water Lily", "A pristine lily that never wilts, sacred to water spirits.")
		
		# Place items in areas
		garden.add_item(magic_herbs)
		cave.add_item(crystal_shard)
		tower.add_item(moonstone)
		pond.add_item(water_lily)
		
		# Create characters with quests
		frog = Character.new("Wise Frog", [
			"*Ribbit* Greetings, Princess! I sense great sadness in you.",
			"Your fish was taken by the Water Spirit to the sanctuary.",
			"But the spirit is angry - someone stole her sacred lily!",
			"Bring me a Water Lily and I'll give you something to appease her."
		], "Water Lily", crystal_shard)
		
		witch = Character.new("Forest Witch", [
			"Ah, a lost princess! I've been expecting you.",
			"I saw your fish - beautiful creature, trapped by magic.",
			"The Water Spirit needs an offering of crystal and herbs.",
			"Find me Magic Herbs and I'll enchant this Crystal Shard for you."
		], "Magic Herbs", moonstone)
		
		garden_sprite = Character.new("Garden Sprite", [
			"*Tinkles like silver bells* Hello, sad princess!",
			"I saw everything! A dark shadow took your precious fish.",
			"The herbs you seek grow right here, but...",
			"I'm so lonely. Will you stay and talk with me a while?"
		])
		
		water_spirit = Character.new("Water Spirit", [
			"WHO DARES DISTURB MY SANCTUARY?",
			"Your fish... yes, I have her. She is safe from the curse.",
			"But I am ANGRY! Someone stole my sacred lily!",
			"Bring me a Crystal Shard and Moonstone, and I will return your fish."
		], ["Crystal Shard", "Moonstone"], nil)
		
		hermit = Character.new("Old Hermit", [
			"*Looks up from ancient books* Princess, you seek what was lost.",
			"I've studied the curse for decades in this tower.",
			"Time runs short - find your fish before the new moon!",
			"Take this Moonstone. It will help you in the final ritual."
		])
		
		# Place characters
		pond.add_character(frog)
		cottage.add_character(witch)
		garden.add_character(garden_sprite)
		sanctuary.add_character(water_spirit)
		tower.add_character(hermit)
		
		{
			forest: forest,
			pond: pond,
			cottage: cottage,
			garden: garden,
			cave: cave,
			tower: tower,
			bridge: bridge,
			sanctuary: sanctuary
		}
	end
	
	def get_area_image(area_name)
		case area_name
		when "Misty Forest"
			"misty_forest.png"
		when "Shimmering Pond"
			"shimmering_pond.png"
		when "Witch's Cottage"
			"witches_cottage.png"
		when "Enchanted Garden"
			"enchanted_garden.png"
		when "Crystal Cave"
			"crystal_cave.png"
		when "Ancient Tower"
			"ancient_tower.png"
		when "Moonstone Bridge"
			"moonstone_bridge.png"
		when "Water Sanctuary"
			"water_sanctuary.png"
		else
			"misty_forest.png" # fallback
		end
	end
	
	def handle(event)
		Console.info(self, "Received event:", event)
		
		case event[:type]
		when "click"
			if event[:detail][:direction]
				direction = event[:detail][:direction].to_sym
				if destination = @current_area.exits[direction]
					first_visit = !destination.visited
					@current_area = destination
					@current_area.visited = true
					@messages << "You walk #{direction} to the #{@current_area.name}."
					
					# Special discovery messages
					if first_visit
						case @current_area.name
						when "Crystal Cave"
							@messages << "The crystals hum with ancient magic..."
						when "Water Sanctuary"
							@messages << "You feel a powerful presence watching you."
						when "Ancient Tower"
							@messages << "Dust motes dance in shafts of light from high windows."
						end
					end
				else
					@messages << "You can't go that way."
				end
				self.update!
				
			elsif event[:detail][:character]
				index = event[:detail][:character].to_i
				if character = @current_area.characters[index]
					response = character.speak(@inventory)
					
					if response == "perfect_trade"
						if character.complete_quest!(@inventory)
							if character.name == "Water Spirit"
								@messages << "The Water Spirit's eyes glow as you present both items."
								@messages << "\"You have proven worthy, Princess. Your fish is returned!\""
								@messages << "Shimmer swims joyfully around you - the curse is broken!"
								@messages << "🐟✨ CONGRATULATIONS! You have completed your quest! ✨🐟"
								@game_complete = true
							elsif character.reward_item
								quest_items = character.quest_items.join(" and ")
								@messages << "#{character.name} takes the #{quest_items} gratefully."
								@messages << "#{character.name} gives you a #{character.reward_item.name}!"
							end
						end
					else
						@messages << "#{character.name} says: \"#{response}\""
					end
				else
					@messages << "There's no one to talk to."
				end
				self.update!
				
			elsif event[:detail][:item]
				index = event[:detail][:item].to_i
				if item = @current_area.items[index]
					@inventory << item
					@current_area.remove_item(item)
					@messages << "You pick up the #{item.name}."
					@messages << "#{item.description}"
				end
				self.update!
			end
		end
	end
	
	def render(builder)
		builder.tag("div", class: "game-container") do
			builder.tag("h1"){builder.text("Adventure: The Lost Princess")}
			
			# Show inventory
			unless @inventory.empty?
				builder.tag("div", class: "inventory") do
					builder.tag("span", class: "controls-label"){builder.text("Inventory:")}
					@inventory.each do |item|
						builder.tag("span", class: "inventory-item"){builder.text(item.name)}
					end
				end
			end
			
			# Area image and description
			builder.tag("div", class: "area-container") do
				builder.tag("div", class: "area-image") do
					builder.tag("img", src: "_static/images/#{get_area_image(@current_area.name)}", alt: @current_area.name)
				end
				builder.tag("div", class: "area-description") do
					builder.tag("h2"){builder.text(@current_area.name)}
					builder.text(@current_area.description)
				end
			end
			
			# Show completion message if game is won
			if @game_complete
				builder.tag("div", class: "victory-message") do
					builder.text("🎉 Quest Complete! Shimmer is safe and the curse is broken! 🎉")
				end
			end
			
			if @current_area.exits.any?
				builder.tag("div", class: "controls") do
					builder.tag("span", class: "controls-label"){builder.text("Exits:")}
					@current_area.exits.each_key do |direction|
						builder.tag("button", onclick: "live.forwardEvent('#{@id}', event, {direction: '#{direction}'});"){builder.text(direction.capitalize)}
					end
				end
			end
			
			if @current_area.items.any?
				builder.tag("div", class: "controls") do
					builder.tag("span", class: "controls-label"){builder.text("Items:")}
					@current_area.items.each_with_index do |item, index|
						builder.tag("button", class: "item-button", onclick: "live.forwardEvent('#{@id}', event, {item: #{index}});"){builder.text("Take #{item.name}")}
					end
				end
			end
			
			if @current_area.characters.any?
				builder.tag("div", class: "controls") do
					builder.tag("span", class: "controls-label"){builder.text("Talk to:")}
					@current_area.characters.each_with_index do |character, index|
						builder.tag("button", onclick: "live.forwardEvent('#{@id}', event, {character: #{index}});"){builder.text(character.name)}
					end
				end
			end
			
			builder.tag("div", class: "messages") do
				@messages.last(6).each do |msg|
					builder.tag("p"){builder.text(msg)}
				end
			end
		end
	end
end

Application = Lively::Application[AdventureView]
