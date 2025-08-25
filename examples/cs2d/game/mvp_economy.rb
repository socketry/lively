# frozen_string_literal: true

class MVPEconomy
	STARTING_MONEY = 800
	MAX_MONEY = 16000
		
	# 回合獎勵
	ROUND_WIN_REWARD = 3250
	ROUND_LOSS_BASE = 1400
	ROUND_LOSS_INCREMENT = 500
	ROUND_LOSS_MAX = 3400
		
	# 特殊獎勵
	BOMB_PLANT_REWARD = 800  # T全隊
	BOMB_DEFUSE_REWARD = 3500  # 拆彈者額外獎勵
		
	# 武器價格
	WEAPONS = {
				# 手槍
				usp: 0,
				glock: 0,
				deagle: 650,  # CS 1.6 authentic
				
				# 步槍
				ak47: 2500,  # CS 1.6 authentic
				m4a1: 3100,
				awp: 4750,
				
				# 裝備
				kevlar: 650,
				helmet: 350,
				defuse: 200  # CS 1.6 authentic
		}.freeze
		
	# 擊殺獎勵
	KILL_REWARDS = {
				knife: 1500,
				pistol: 300,
				smg: 600,
				rifle: 300,
				awp: 100
		}.freeze
		
	def self.kill_reward(weapon_name)
		case weapon_name.to_s.downcase
		when "knife"
			KILL_REWARDS[:knife]
		when "usp", "glock", "deagle", "desert eagle"
			KILL_REWARDS[:pistol]
		when "ak47", "ak-47", "m4a1"
			KILL_REWARDS[:rifle]
		when "awp"
			KILL_REWARDS[:awp]
		else
			300
		end
	end
		
	def self.calculate_loss_bonus(consecutive_losses)
		bonus = ROUND_LOSS_BASE + (consecutive_losses * ROUND_LOSS_INCREMENT)
		[bonus, ROUND_LOSS_MAX].min
	end
	
	# CS 1.6 Team Purchase Validation
	def self.can_purchase?(weapon_name, team, player_money)
		weapon_name = weapon_name&.to_sym
		
		# Check if weapon exists and get price
		weapon_price = WEAPONS[weapon_name]
		return false unless weapon_price
		return false if player_money < weapon_price
		
		# Team restrictions (CS 1.6 authentic)
		case weapon_name
		when :ak47, :galil, :mac10
			return team.to_s.downcase == "t"
		when :m4a1, :famas, :mp5, :tmp, :fiveseven
			return team.to_s.downcase == "ct"
		when :defuse
			return team.to_s.downcase == "ct"  # Only CTs can buy defuse kits
		else
			return true  # Available to both teams
		end
	end
	
	def self.get_weapon_price(weapon_name)
		WEAPONS[weapon_name&.to_sym] || 0
	end
end