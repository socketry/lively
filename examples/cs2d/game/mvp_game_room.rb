# frozen_string_literal: true

require "securerandom"
require_relative "mvp_player"
require_relative "mvp_round_manager"
require_relative "mvp_bomb_system"
require_relative "mvp_economy"
require_relative "mvp_map"

class MVPGameRoom
	attr_reader :name, :players, :round_manager, :bomb_system, :map
		
	MAX_PLAYERS = 10
	MIN_PLAYERS = 2
	TICK_RATE = 30.0
		
	def initialize(name)
		@name = name
		@players = {}
		@bullets = []
		@round_manager = MVPRoundManager.new(self)
		@bomb_system = MVPBombSystem.new(self)
		@economy = MVPEconomy.new
		@map = MVPMap.new
		@started = false
		@last_update = Time.now
	end
		
	def add_player(player_id)
		return if @players[player_id]
				
		# 分配隊伍
		team = assign_team
				
		@players[player_id] = MVPPlayer.new(
						id: player_id,
						name: "Player#{player_id[0..4]}",
						team: team
				)
				
		# 給予起始金錢
		@players[player_id].money = MVPEconomy::STARTING_MONEY
				
		# 如果遊戲已開始，玩家需要等待下回合
		if @started && @round_manager.phase != :freeze
			@players[player_id].alive = false
		end
				
		# 檢查是否可以開始遊戲
		check_game_start
	end
		
	def remove_player(player_id)
		@players.delete(player_id)
				
		# 如果人數不足，暫停遊戲
		if @players.size < MIN_PLAYERS
			@started = false
			@round_manager.pause
		end
	end
		
	def handle_player_input(player_id, input)
		player = @players[player_id]
		return unless player && player.alive
				
		# 凍結時間不能移動
		return if @round_manager.phase == :freeze
				
		# 處理移動
		if input[:move]
			move_player(player, input[:move])
		end
				
		# 處理射擊
		if input[:shoot]
			shoot(player, input[:angle])
		end
				
		# 處理換彈
		if input[:reload]
			player.reload
		end
				
		# 處理互動（安裝/拆除炸彈）
		if input[:use]
			handle_use_action(player)
		else
			# 停止安裝/拆除
			@bomb_system.stop_action(player_id)
		end
	end
		
	def buy_weapon(player_id, weapon_name)
		player = @players[player_id]
		return unless player
				
		# 只能在購買時間購買
		return unless @round_manager.can_buy?
				
		# 檢查金錢並購買
		price = MVPEconomy::WEAPONS[weapon_name.to_sym]
		return unless price
				
		if player.money >= price
			# 檢查隊伍限制武器
			if weapon_restricted?(weapon_name, player.team)
				return false
			end
						
			player.money -= price
			player.add_weapon(weapon_name.to_sym)
			true
		else
			false
		end
	end
		
	def update
		return unless @started
				
		delta_time = Time.now - @last_update
		@last_update = Time.now
				
		# 更新回合管理器
		@round_manager.update(delta_time)
				
		# 更新炸彈系統
		@bomb_system.update(delta_time)
				
		# 更新子彈
		update_bullets(delta_time)
				
		# 更新玩家
		@players.each_value do |player|
			player.update(delta_time)
		end
				
		# 檢查勝利條件
		check_victory_conditions
	end
		
	def get_state
		{
						players: players_state,
						bullets: bullets_state,
						round: @round_manager.get_state,
						bomb: @bomb_system.get_state,
						map: @map.get_state
				}
	end
		
	def start_planting(player_id)
		player = @players[player_id]
		return unless player && player.alive && player.team == :t
				
		# 檢查是否在炸彈點
		site = @map.get_bomb_site_at(player.x, player.y)
		return unless site
				
		@bomb_system.start_planting(player_id, site)
	end
		
	def start_defusing(player_id)
		player = @players[player_id]
		return unless player && player.alive && player.team == :ct
				
		@bomb_system.start_defusing(player_id)
	end
		
	def send_chat(player_id, message)
		player = @players[player_id]
		return unless player
				
		{
						type: "chat",
						player_name: player.name,
						team: player.team,
						message: message[0..100]
				}
	end
		
	def full?
		@players.size >= MAX_PLAYERS
	end
		
	def empty?
		@players.empty?
	end
		
	def started?
		@started
	end
		
	# 回合結束回調
	def on_round_end(winning_team, reason)
		# 發放獎金
		award_round_money(winning_team, reason)
				
		# 重置玩家狀態
		reset_players_for_new_round
				
		# 重置炸彈
		@bomb_system.reset
	end
		
	# 炸彈爆炸回調
	def on_bomb_exploded
		# T 勝利
		@round_manager.end_round(:t, :bomb_exploded)
				
		# 爆炸傷害
		@bomb_system.explosion_damage(@players)
	end
		
	# 炸彈拆除回調
	def on_bomb_defused(defuser_id)
		# CT 勝利
		@round_manager.end_round(:ct, :bomb_defused)
				
		# 拆彈獎勵
		if defuser = @players[defuser_id]
			defuser.money += MVPEconomy::BOMB_DEFUSE_REWARD
		end
	end
		
		private
		
	def assign_team
		ct_count = @players.values.count { |p| p.team == :ct }
		t_count = @players.values.count { |p| p.team == :t }
				
		ct_count <= t_count ? :ct : :t
	end
		
	def check_game_start
		if @players.size >= MIN_PLAYERS && !@started
			@started = true
			@round_manager.start_game
			reset_players_for_new_round
		end
	end
		
	def move_player(player, move_input)
		# 計算移動
		dx = move_input[:x] || 0
		dy = move_input[:y] || 0
				
		return if dx == 0 && dy == 0
				
		# 根據武器調整速度
		speed = player.get_move_speed
		speed *= 1.3 if move_input[:shift] # 奔跑
				
		# 正規化向量
		magnitude = Math.sqrt(dx * dx + dy * dy)
		dx = dx / magnitude * speed
		dy = dy / magnitude * speed
				
		# 新位置
		new_x = player.x + dx
		new_y = player.y + dy
				
		# 碰撞檢測
		unless @map.check_collision(new_x, new_y, 15)
			player.x = new_x
			player.y = new_y
		end
	end
		
	def shoot(player, angle)
		return unless player.can_shoot?
				
		weapon = player.current_weapon
		player.shoot
				
		# 創建子彈
		@bullets << {
						id: SecureRandom.hex(4),
						owner_id: player.id,
						team: player.team,
						x: player.x,
						y: player.y,
						vx: Math.cos(angle) * 20,
						vy: Math.sin(angle) * 20,
						damage: weapon[:damage],
						penetration: weapon[:penetration],
						life: 2.0 # 2秒生命週期
				}
	end
		
	def update_bullets(delta_time)
		@bullets.each do |bullet|
			# 更新位置
			bullet[:x] += bullet[:vx] * delta_time * 30
			bullet[:y] += bullet[:vy] * delta_time * 30
			bullet[:life] -= delta_time
						
			# 檢查碰撞
			if @map.check_collision(bullet[:x], bullet[:y], 2)
				bullet[:life] = 0
				next
			end
						
			# 檢查擊中玩家
			@players.each_value do |player|
				next if player.id == bullet[:owner_id]
				next if player.team == bullet[:team] # 友軍傷害關閉
				next unless player.alive
								
				distance = Math.sqrt((player.x - bullet[:x])**2 + (player.y - bullet[:y])**2)
				if distance < 15
					# 計算傷害
					damage = calculate_damage(bullet, player, distance)
					player.take_damage(damage)
										
					# 擊殺獎勵
					if !player.alive
						on_player_killed(bullet[:owner_id], player.id, bullet[:weapon_name])
					end
										
					bullet[:life] = 0
				end
			end
		end
				
		# 移除過期子彈
		@bullets.reject! { |b| b[:life] <= 0 }
	end
		
	def calculate_damage(bullet, player, distance)
		damage = bullet[:damage]
				
		# 距離衰減
		damage *= (1.0 - distance / 500.0) if distance > 100
				
		# 護甲減傷
		if player.armor > 0
			damage *= 0.5
		end
				
		damage.to_i
	end
		
	def on_player_killed(killer_id, victim_id, weapon_name)
		killer = @players[killer_id]
		victim = @players[victim_id]
				
		return unless killer && victim
				
		# 擊殺獎勵
		reward = MVPEconomy.kill_reward(weapon_name)
		killer.money = [killer.money + reward, MVPEconomy::MAX_MONEY].min
		killer.kills += 1
				
		victim.deaths += 1
				
		# 檢查團滅
		check_team_elimination
	end
		
	def check_team_elimination
		ct_alive = @players.values.count { |p| p.team == :ct && p.alive }
		t_alive = @players.values.count { |p| p.team == :t && p.alive }
				
		if ct_alive == 0
			@round_manager.end_round(:t, :elimination)
		elsif t_alive == 0
			@round_manager.end_round(:ct, :elimination)
		end
	end
		
	def check_victory_conditions
		return unless @round_manager.phase == :playing
				
		# 時間結束
		if @round_manager.round_time <= 0
			if @bomb_system.planted?
				# 炸彈已安裝，T勝利
				@round_manager.end_round(:t, :time)
			else
				# 炸彈未安裝，CT勝利
				@round_manager.end_round(:ct, :time)
			end
		end
	end
		
	def handle_use_action(player)
		if player.team == :t && !@bomb_system.planted?
			# T 嘗試安裝炸彈
			site = @map.get_bomb_site_at(player.x, player.y)
			@bomb_system.start_planting(player.id, site) if site
		elsif player.team == :ct && @bomb_system.planted?
			# CT 嘗試拆彈
			if @bomb_system.can_defuse?(player.x, player.y)
				@bomb_system.start_defusing(player.id)
			end
		end
	end
		
	def award_round_money(winning_team, reason)
		@players.each_value do |player|
			if player.team == winning_team
				player.money += MVPEconomy::ROUND_WIN_REWARD
			else
				# 連敗獎勵
				loss_bonus = MVPEconomy.calculate_loss_bonus(player.consecutive_losses)
				player.money += loss_bonus
				player.consecutive_losses += 1
			end
						
			# 上限檢查
			player.money = [player.money, MVPEconomy::MAX_MONEY].min
		end
				
		# 炸彈相關獎勵
		if reason == :bomb_planted && winning_team == :t
			@players.values.select { |p| p.team == :t }.each do |player|
				player.money += MVPEconomy::BOMB_PLANT_REWARD
			end
		end
	end
		
	def reset_players_for_new_round
		# 獲取重生點
		ct_spawns = @map.ct_spawns
		t_spawns = @map.t_spawns
				
		ct_index = 0
		t_index = 0
				
		@players.each_value do |player|
			player.reset_for_round
						
			# 設置重生位置
			if player.team == :ct
				spawn = ct_spawns[ct_index % ct_spawns.size]
				ct_index += 1
			else
				spawn = t_spawns[t_index % t_spawns.size]
				t_index += 1
			end
						
			player.x = spawn[:x]
			player.y = spawn[:y]
		end
				
		# 清空子彈
		@bullets.clear
	end
		
	def weapon_restricted?(weapon_name, team)
		case weapon_name.to_sym
		when :ak47
			team != :t
		when :m4a1
			team != :ct
		when :defuse
			team != :ct
		else
			false
		end
	end
		
	def players_state
		@players.transform_values do |player|
			{
								id: player.id,
								name: player.name,
								team: player.team,
								x: player.x,
								y: player.y,
								angle: player.angle,
								health: player.health,
								armor: player.armor,
								money: player.money,
								alive: player.alive,
								weapon: player.current_weapon[:name],
								ammo: player.ammo,
								kills: player.kills,
								deaths: player.deaths
						}
		end
	end
		
	def bullets_state
		@bullets.map do |bullet|
			{
								id: bullet[:id],
								x: bullet[:x],
								y: bullet[:y],
								team: bullet[:team]
						}
		end
	end
end