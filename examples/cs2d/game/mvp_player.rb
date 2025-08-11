# frozen_string_literal: true

class MVPPlayer
	attr_accessor :id, :name, :team, :x, :y, :angle, :health, :armor, :money
	attr_accessor :alive, :kills, :deaths, :consecutive_losses
	attr_reader :weapons, :current_weapon_index, :ammo
		
	def initialize(id:, name:, team:)
		@id = id
		@name = name
		@team = team
		@x = 0
		@y = 0
		@angle = 0
		@health = 100
		@armor = 0
		@money = 800
		@alive = true
		@kills = 0
		@deaths = 0
		@consecutive_losses = 0
			
		# 武器系統
		@weapons = [default_weapon]
		@current_weapon_index = 0
		@ammo = { clip: 30, reserve: 90 }
		@reloading = false
		@reload_timer = 0
		@last_shot_time = 0
	end
		
	def current_weapon
		@weapons[@current_weapon_index]
	end
		
	def default_weapon
		case @team
		when :ct
			{ name: "USP", damage: 35, firerate: 0.17, clip_size: 12, reload_time: 2.2, move_speed: 1.0, penetration: 1 }
		when :t
			{ name: "Glock", damage: 28, firerate: 0.15, clip_size: 20, reload_time: 2.2, move_speed: 1.0, penetration: 1 }
		else
			{ name: "Knife", damage: 50, firerate: 0.5, clip_size: 0, reload_time: 0, move_speed: 1.1, penetration: 0 }
		end
	end
		
	def add_weapon(weapon_type)
		weapon = case weapon_type
											when :ak47
												{ name: "AK-47", damage: 36, firerate: 0.1, clip_size: 30, reload_time: 2.5, move_speed: 0.85, penetration: 2 }
											when :m4a1
												{ name: "M4A1", damage: 33, firerate: 0.09, clip_size: 30, reload_time: 2.5, move_speed: 0.9, penetration: 2 }
											when :awp
												{ name: "AWP", damage: 115, firerate: 1.45, clip_size: 10, reload_time: 3.7, move_speed: 0.7, penetration: 3 }
											when :deagle
												{ name: "Desert Eagle", damage: 48, firerate: 0.225, clip_size: 7, reload_time: 2.2, move_speed: 0.95, penetration: 2 }
											else
												return
		end
			
		# 替換主武器或副武器
		if [:ak47, :m4a1, :awp].include?(weapon_type)
			@weapons[1] = weapon
			@current_weapon_index = 1
		else
			@weapons[0] = weapon
			@current_weapon_index = 0
		end
			
		# 重置彈藥
		@ammo = { clip: weapon[:clip_size], reserve: weapon[:clip_size] * 3 }
	end
		
	def can_shoot?
		return false unless @alive
		return false if @reloading
		return false if @ammo[:clip] <= 0
			
		Time.now.to_f - @last_shot_time > current_weapon[:firerate]
	end
		
	def shoot
		return unless can_shoot?
			
		@ammo[:clip] -= 1
		@last_shot_time = Time.now.to_f
			
		# 自動換彈
		reload if @ammo[:clip] == 0 && @ammo[:reserve] > 0
	end
		
	def reload
		return if @reloading
		return if @ammo[:clip] >= current_weapon[:clip_size]
		return if @ammo[:reserve] <= 0
			
		@reloading = true
		@reload_timer = current_weapon[:reload_time]
	end
		
	def update(delta_time)
		# 更新換彈
		if @reloading
			@reload_timer -= delta_time
			if @reload_timer <= 0
				finish_reload
			end
		end
	end
		
	def finish_reload
		needed = current_weapon[:clip_size] - @ammo[:clip]
		available = [@ammo[:reserve], needed].min
			
		@ammo[:clip] += available
		@ammo[:reserve] -= available
		@reloading = false
		@reload_timer = 0
	end
		
	def take_damage(damage)
		return unless @alive
			
		# 護甲吸收
		if @armor > 0
			absorbed = [damage * 0.5, @armor].min.to_i
			@armor -= absorbed
			actual_damage = damage - absorbed * 0.5
		else
			actual_damage = damage
		end
			
		@health = [@health - actual_damage, 0].max.to_i
			
		if @health <= 0
			@alive = false
			@deaths += 1
		end
	end
		
	def get_move_speed
		base_speed = 5.0
		base_speed * current_weapon[:move_speed]
	end
		
	def reset_for_round
		@health = 100
		@alive = true
		@weapons = [default_weapon]
		@current_weapon_index = 0
		@ammo = { clip: 30, reserve: 90 }
		@reloading = false
		@reload_timer = 0
		# 保留護甲（如果有的話）
	end
		
	def has_defuse_kit?
		@has_defuse_kit ||= false
	end
		
	def buy_defuse_kit
		@has_defuse_kit = true
	end
end