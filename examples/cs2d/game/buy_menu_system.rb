# frozen_string_literal: true

# CS 1.6 Complete Buy Menu System
# Handles weapon purchasing, economy management, and team restrictions
class BuyMenuSystem
	
	# Buy menu categories (CS 1.6 authentic structure)
	MENU_STRUCTURE = {
		main: {
			"1" => { label: "Pistols", submenu: :pistols },
			"2" => { label: "Shotguns", submenu: :shotguns },
			"3" => { label: "Sub-Machine Guns", submenu: :smgs },
			"4" => { label: "Rifles", submenu: :rifles },
			"5" => { label: "Machine Gun", submenu: :machinegun },
			"6" => { label: "Primary Ammo", action: :buy_primary_ammo },
			"7" => { label: "Secondary Ammo", action: :buy_secondary_ammo },
			"8" => { label: "Equipment", submenu: :equipment },
			"0" => { label: "Exit", action: :close_menu }
		},
		
		pistols: {
			"1" => { weapon: :glock, label: "Glock 18 Select Fire", price: 400, team: :both },
			"2" => { weapon: :usp, label: "USP .45 Tactical", price: 500, team: :both },
			"3" => { weapon: :p228, label: "228 Compact", price: 600, team: :both },
			"4" => { weapon: :deagle, label: "Desert Eagle .50AE", price: 650, team: :both },
			"5" => { weapon: :fiveseven, label: "ES Five-Seven", price: 750, team: :ct },
			"6" => { weapon: :elite, label: "Dual Berettas", price: 800, team: :t },
			"0" => { label: "Back", action: :back }
		},
		
		shotguns: {
			"1" => { weapon: :m3, label: "Leone 12 Gauge Super", price: 1700, team: :both },
			"2" => { weapon: :xm1014, label: "Leone YG1265 Auto Shotgun", price: 3000, team: :both },
			"0" => { label: "Back", action: :back }
		},
		
		smgs: {
			"1" => { weapon: :mac10, label: "Ingram MAC-10", price: 1400, team: :t },
			"2" => { weapon: :tmp, label: "Schmidt Machine Pistol", price: 1250, team: :ct },
			"3" => { weapon: :mp5, label: "MP5-Navy", price: 1500, team: :both },
			"4" => { weapon: :ump45, label: "UMP-45", price: 1700, team: :both },
			"5" => { weapon: :p90, label: "ES C90", price: 2350, team: :both },
			"0" => { label: "Back", action: :back }
		},
		
		rifles: {
			"1" => { weapon: :famas, label: "Clarion 5.56", price: 2250, team: :ct },
			"2" => { weapon: :galil, label: "Galil", price: 2000, team: :t },
			"3" => { weapon: :ak47, label: "AK-47", price: 2500, team: :t },
			"4" => { weapon: :m4a1, label: "M4A1 Carbine", price: 3100, team: :ct },
			"5" => { weapon: :aug, label: "Bullpup", price: 3500, team: :ct },
			"6" => { weapon: :sg552, label: "SG-552 Commando", price: 3500, team: :t },
			"7" => { weapon: :scout, label: "Scout", price: 2750, team: :both },
			"8" => { weapon: :awp, label: "AWP", price: 4750, team: :both },
			"9" => { weapon: :g3sg1, label: "G3/SG-1", price: 5000, team: :t },
			"0" => { label: "Back", action: :back }
		},
		
		machinegun: {
			"1" => { weapon: :m249, label: "M249 Para", price: 5750, team: :both },
			"0" => { label: "Back", action: :back }
		},
		
		equipment: {
			"1" => { equipment: :kevlar, label: "Kevlar Vest", price: 650, team: :both },
			"2" => { equipment: :kevlar_helmet, label: "Kevlar + Helmet", price: 1000, team: :both },
			"3" => { equipment: :flashbang, label: "Flashbang", price: 200, team: :both },
			"4" => { equipment: :hegrenade, label: "HE Grenade", price: 300, team: :both },
			"5" => { equipment: :smokegrenade, label: "Smoke Grenade", price: 300, team: :both },
			"6" => { equipment: :defuser, label: "Defuse Kit", price: 200, team: :ct },
			"7" => { equipment: :nightvision, label: "Night Vision", price: 1250, team: :both },
			"0" => { label: "Back", action: :back }
		}
	}.freeze
	
	# Quick buy presets (CS 1.6 style)
	QUICK_BUY_PRESETS = {
		eco: {
			ct: [:kevlar, :flashbang],
			t: [:kevlar, :flashbang]
		},
		force: {
			ct: [:deagle, :kevlar_helmet, :flashbang],
			t: [:deagle, :kevlar_helmet, :flashbang]
		},
		full: {
			ct: [:m4a1, :kevlar_helmet, :defuser, :hegrenade, :flashbang, :smokegrenade],
			t: [:ak47, :kevlar_helmet, :hegrenade, :flashbang, :smokegrenade]
		},
		awp: {
			ct: [:awp, :deagle, :kevlar_helmet, :flashbang],
			t: [:awp, :deagle, :kevlar_helmet, :flashbang]
		}
	}.freeze
	
	def initialize(player)
		@player = player
		@current_menu = :main
		@menu_stack = []
	end
	
	def open
		@current_menu = :main
		@menu_stack = []
		display_menu
	end
	
	def close
		@current_menu = nil
		@menu_stack = []
	end
	
	def is_open?
		!@current_menu.nil?
	end
	
	def handle_input(key)
		return false unless is_open?
		
		menu = MENU_STRUCTURE[@current_menu]
		return false unless menu
		
		option = menu[key.to_s]
		return false unless option
		
		if option[:submenu]
			# Navigate to submenu
			@menu_stack.push(@current_menu)
			@current_menu = option[:submenu]
			display_menu
		elsif option[:action]
			# Execute action
			case option[:action]
			when :back
				go_back
			when :close_menu
				close
			when :buy_primary_ammo
				buy_ammo(:primary)
			when :buy_secondary_ammo
				buy_ammo(:secondary)
			end
		elsif option[:weapon]
			# Buy weapon
			buy_weapon(option[:weapon], option[:price], option[:team])
		elsif option[:equipment]
			# Buy equipment
			buy_equipment(option[:equipment], option[:price], option[:team])
		end
		
		true
	end
	
	def quick_buy(preset_name)
		preset = QUICK_BUY_PRESETS[preset_name]
		return false unless preset
		
		items = preset[@player.team] || preset[:both]
		return false unless items
		
		total_cost = calculate_total_cost(items)
		return false if @player.money < total_cost
		
		# Purchase all items
		items.each do |item|
			if is_weapon?(item)
				weapon_info = get_weapon_info(item)
				buy_weapon(item, weapon_info[:price], weapon_info[:team]) if weapon_info
			else
				equipment_info = get_equipment_info(item)
				buy_equipment(item, equipment_info[:price], equipment_info[:team]) if equipment_info
			end
		end
		
		true
	end
	
	private
	
	def display_menu
		# This would be rendered in the actual game UI
		menu = MENU_STRUCTURE[@current_menu]
		return unless menu
		
		lines = ["=== Buy Menu ==="]
		lines << "Money: $#{@player.money}"
		lines << ""
		
		menu.each do |key, option|
			if option[:price]
				affordability = @player.money >= option[:price] ? "" : " [Can't Afford]"
				team_restriction = can_buy_for_team?(option[:team]) ? "" : " [Wrong Team]"
				lines << "#{key}. #{option[:label]} - $#{option[:price]}#{affordability}#{team_restriction}"
			else
				lines << "#{key}. #{option[:label]}"
			end
		end
		
		lines.join("\n")
	end
	
	def go_back
		if @menu_stack.empty?
			close
		else
			@current_menu = @menu_stack.pop
			display_menu
		end
	end
	
	def buy_weapon(weapon_type, price, team_restriction)
		# Check team restriction
		return false unless can_buy_for_team?(team_restriction)
		
		# Check money
		return false if @player.money < price
		
		# Check if player already has this category of weapon
		if is_primary_weapon?(weapon_type) && @player.has_primary_weapon?
			return false # Can't buy another primary
		elsif is_secondary_weapon?(weapon_type) && @player.has_secondary_weapon?
			return false # Can't buy another secondary
		end
		
		# Deduct money and add weapon
		@player.money -= price
		@player.add_weapon(weapon_type)
		
		# Auto-buy ammo
		buy_ammo_for_weapon(weapon_type)
		
		true
	end
	
	def buy_equipment(equipment_type, price, team_restriction)
		# Check team restriction
		return false unless can_buy_for_team?(team_restriction)
		
		# Check money
		return false if @player.money < price
		
		# Check if player already has this equipment
		case equipment_type
		when :kevlar
			return false if @player.armor >= 100
			@player.money -= price
			@player.armor = 100
			@player.has_helmet = false
		when :kevlar_helmet
			return false if @player.armor >= 100 && @player.has_helmet
			@player.money -= price
			@player.armor = 100
			@player.has_helmet = true
		when :flashbang
			return false if @player.flashbangs >= 2
			@player.money -= price
			@player.flashbangs = (@player.flashbangs || 0) + 1
		when :hegrenade
			return false if @player.has_hegrenade
			@player.money -= price
			@player.has_hegrenade = true
		when :smokegrenade
			return false if @player.has_smokegrenade
			@player.money -= price
			@player.has_smokegrenade = true
		when :defuser
			return false if @player.has_defuse_kit?
			@player.money -= price
			@player.buy_defuse_kit
		when :nightvision
			return false if @player.has_nightvision
			@player.money -= price
			@player.has_nightvision = true
		else
			return false
		end
		
		true
	end
	
	def buy_ammo(ammo_type)
		case ammo_type
		when :primary
			return false unless @player.current_primary_weapon
			price = calculate_ammo_price(@player.current_primary_weapon)
			return false if @player.money < price
			@player.money -= price
			@player.refill_primary_ammo
		when :secondary
			return false unless @player.current_secondary_weapon
			price = calculate_ammo_price(@player.current_secondary_weapon)
			return false if @player.money < price
			@player.money -= price
			@player.refill_secondary_ammo
		end
		
		true
	end
	
	def buy_ammo_for_weapon(weapon_type)
		# Auto-purchase one magazine of ammo with weapon
		ammo_price = calculate_ammo_price(weapon_type)
		if @player.money >= ammo_price
			@player.money -= ammo_price
			# Ammo is automatically added with weapon
		end
	end
	
	def calculate_ammo_price(weapon_type)
		# CS 1.6 ammo prices
		case weapon_type
		when :glock, :usp, :p228, :fiveseven, :elite
			60 # 9mm ammo
		when :deagle
			40 # .50AE ammo
		when :m3, :xm1014
			65 # 12 gauge
		when :mac10, :tmp, :mp5, :ump45, :p90
			25 # SMG ammo
		when :famas, :galil, :m4a1, :aug, :sg552
			60 # 5.56mm
		when :ak47
			80 # 7.62mm
		when :scout, :awp, :g3sg1
			125 # Sniper ammo
		when :m249
			60 # Machine gun ammo
		else
			0
		end
	end
	
	def can_buy_for_team?(team_restriction)
		case team_restriction
		when :ct
			@player.team == :ct
		when :t
			@player.team == :t
		when :both
			true
		else
			false
		end
	end
	
	def is_primary_weapon?(weapon_type)
		[:m3, :xm1014, :mac10, :tmp, :mp5, :ump45, :p90, :famas, :galil, 
		 :ak47, :m4a1, :aug, :sg552, :scout, :awp, :g3sg1, :m249].include?(weapon_type)
	end
	
	def is_secondary_weapon?(weapon_type)
		[:glock, :usp, :p228, :deagle, :fiveseven, :elite].include?(weapon_type)
	end
	
	def is_weapon?(item)
		is_primary_weapon?(item) || is_secondary_weapon?(item)
	end
	
	def get_weapon_info(weapon_type)
		MENU_STRUCTURE.each do |_, menu|
			menu.each do |_, option|
				return option if option[:weapon] == weapon_type
			end
		end
		nil
	end
	
	def get_equipment_info(equipment_type)
		MENU_STRUCTURE[:equipment].each do |_, option|
			return option if option[:equipment] == equipment_type
		end
		nil
	end
	
	def calculate_total_cost(items)
		total = 0
		items.each do |item|
			if is_weapon?(item)
				info = get_weapon_info(item)
				total += info[:price] if info
			else
				info = get_equipment_info(item)
				total += info[:price] if info
			end
		end
		total
	end
end