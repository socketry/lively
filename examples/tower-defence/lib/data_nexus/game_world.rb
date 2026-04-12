# frozen_string_literal: true

module DataNexus
	class GameWorld
		attr_reader :players, :enemies, :towers, :dropped_cubes, :projectiles
		attr_reader :core_hp, :max_core_hp, :wave_number, :wave_timer
		attr_reader :core_buffs, :hex_grid, :firewalls

		# Delta log channels for efficient per-client updates.
		attr_reader :channels

		def initialize
			@players = {}
			@enemies = []
			@towers = {}
			@firewalls = {} # [q,r] => Firewall
			@dropped_cubes = []
			@projectiles = []
			@pads = build_pads
			@hex_grid = HexGrid.new
			@core_hp = 1000
			@max_core_hp = 1000
			@wave_number = 0
			@wave_timer = 10.0
			@spawn_queue = []
			@spawn_timer = 0.0
			@random = Random.new
			@game_over = false
			@core_buffs = {overclock: 0, amplify: 0, accelerate: 0, fortify: 0}

			# Delta-compressed channels
			@channels = {
				pads: DeltaLog.new,       # almost never changes
				towers: DeltaLog.new,     # changes on build/upgrade/sell
				firewalls: DeltaLog.new,  # changes on build/destroy/hp
				hex_deaths: DeltaLog.new, # changes when enemies die
				core: DeltaLog.new,       # hp, buffs, wave — changes infrequently
				enemies: DeltaLog.new,    # changes every tick (positions)
				players: DeltaLog.new,    # changes every tick (positions)
				cubes: DeltaLog.new,      # changes on drop/pickup/age
			}

			setup_initial_defences
		end

		# ── Global multipliers from core buffs ────────────────────────────

		def fire_rate_multiplier
			1.0 + @core_buffs[:overclock] * 0.15
		end

		def damage_multiplier
			1.0 + @core_buffs[:amplify] * 0.15
		end

		def speed_multiplier
			1.0 + @core_buffs[:accelerate] * 0.15
		end

		def firewall_multiplier
			1.0 + @core_buffs[:fortify] * 0.25
		end

		# ── Setup ─────────────────────────────────────────────────────────

		def build_pads
			pads = []
			INNER_PADS.each { |p| pads << p.merge(ring: :inner, index: pads.size) }
			OUTER_PADS.each { |p| pads << p.merge(ring: :outer, index: pads.size) }
			FAR_PADS.each { |p| pads << p.merge(ring: :far, index: pads.size) }
			pads
		end

		def setup_initial_defences
			# Place 4 pulse turrets at cardinal directions (right, down, left, up)
			[0, 2, 4, 6].each do |i|
				pad = INNER_PADS[i]
				@towers[i] = Tower.new(i, :pulse, pad[:x], pad[:y])
			end
		end

		# ── Player management ─────────────────────────────────────────────

		def add_player(id)
			angle = @random.rand * Math::PI * 2
			px = Math.cos(angle) * 80
			py = Math.sin(angle) * 80
			@players[id] = Player.new(id, px, py)
		end

		def remove_player(id)
			@players.delete(id)
		end

		def game_over?
			@game_over
		end

		# ── Main tick ─────────────────────────────────────────────────────

		def tick(dt)
			return if @game_over

			tick_waves(dt)
			tick_spawns(dt)

			@players.each_value { |p| p.tick(dt, speed_multiplier: speed_multiplier) }
			@enemies.each { |e| e.tick(dt, hex_grid: @hex_grid) }

			tick_tower_combat(dt)
			tick_firewall_combat(dt)
			tick_enemy_deaths
			tick_core_collisions
			tick_game_over
			tick_cube_pickup
			tick_cube_aging(dt)
			tick_tower_upgrades(dt)
			tick_firewall_cleanup
			@hex_grid.tick(dt)
			sync_channels
		end

		# ── Player actions ────────────────────────────────────────────────

		def build_tower(player_id, pad_index, tower_type)
			player = @players[player_id]
			return {error: "Player not found"} unless player

			pad = @pads[pad_index]
			return {error: "Invalid pad"} unless pad
			return {error: "Pad already has tower"} if @towers[pad_index]

			dx = player.x - pad[:x]
			dy = player.y - pad[:y]
			return {error: "Too far from pad"} if Math.sqrt(dx * dx + dy * dy) > Player::DEPOSIT_RANGE

			defn = TOWER_DEFS[tower_type.to_sym]
			return {error: "Unknown tower type"} unless defn

			cost = defn[:cost]
			cost.each do |cube_type, amount|
				return {error: "Not enough #{cube_type}"} if player.inventory[cube_type] < amount
			end

			cost.each { |cube_type, amount| player.remove_cubes(cube_type, amount) }

			tower = Tower.new(pad_index, tower_type.to_sym, pad[:x], pad[:y])
			@towers[pad_index] = tower
			{success: true}
		end

		def sell_tower(player_id, pad_index)
			player = @players[player_id]
			return {error: "Player not found"} unless player

			tower = @towers[pad_index]
			return {error: "No tower here"} unless tower
			return {error: "Tower is upgrading"} if tower.upgrading

			dx = player.x - tower.x
			dy = player.y - tower.y
			return {error: "Too far"} if Math.sqrt(dx * dx + dy * dy) > Player::DEPOSIT_RANGE

			tower.sell_value.each do |cube_type, count|
				next if count <= 0
				@dropped_cubes << DroppedCube.new(cube_type, count, tower.x, tower.y)
			end

			@towers.delete(pad_index)
			{success: true}
		end

		def build_firewall(player_id)
			player = @players[player_id]
			return {error: "Player not found"} unless player

			q, r = Hex.to_hex(player.x, player.y)
			key = [q, r]

			# Can't place on existing firewall
			return {error: "Firewall already here"} if @firewalls.key?(key)

			# Can't place on the core hex
			return {error: "Can't place on core"} if q == 0 && r == 0

			# Check cost
			FIREWALL_COST.each do |cube_type, amount|
				return {error: "Not enough #{cube_type}"} if player.inventory[cube_type] < amount
			end

			FIREWALL_COST.each { |cube_type, amount| player.remove_cubes(cube_type, amount) }
			@firewalls[key] = Firewall.new(q, r)
			{success: true}
		end

		def upgrade_core(player_id, upgrade_type)
			player = @players[player_id]
			return {error: "Player not found"} unless player

			upgrade = CORE_UPGRADES[upgrade_type.to_sym]
			return {error: "Unknown upgrade"} unless upgrade

			dist = Math.sqrt(player.x ** 2 + player.y ** 2)
			return {error: "Too far from core"} if dist > Player::DEPOSIT_RANGE

			cost = upgrade[:cost]
			cost.each do |cube_type, amount|
				return {error: "Not enough #{cube_type}"} if player.inventory[cube_type] < amount
			end

			cost.each { |cube_type, amount| player.remove_cubes(cube_type, amount) }
			@core_buffs[upgrade_type.to_sym] += 1
			{success: true}
		end

		# ── Snapshot ──────────────────────────────────────────────────────

		# Delta-compressed snapshot. Each channel is a DeltaLog; the cursors
		# object tracks per-reader progress so only changes are sent.
		def snapshot_for(player_id, cursors:)
			player = @players[player_id]
			return {} unless player

			# Per-tick volatile data (always sent in full)
			result = {
				camX: player.x.round(1),
				camY: player.y.round(1),
				projectiles: @projectiles.compact,
				hex_size: Hex::HEX_SIZE,
			}

			# Delta-compressed channels
			@channels.each do |name, log|
				result[name] = cursors.snapshot(name, log)
			end

			result
		end

		def restart!
			@enemies.clear
			@towers.clear
			@firewalls.clear
			@hex_grid = HexGrid.new
			@dropped_cubes.clear
			@projectiles.clear
			@spawn_queue.clear
			@core_hp = @max_core_hp
			@wave_number = 0
			@wave_timer = 10.0
			@game_over = false
			@core_buffs = {overclock: 0, amplify: 0, accelerate: 0, fortify: 0}
			@channels.each_value(&:clear)
			setup_initial_defences
			@players.each_value(&:reset!)
		end

		private

		# ── Channel sync ──────────────────────────────────────────────

		def sync_channels
			# Pads (rarely change — only has_tower flag)
			pad_state = {}
			@pads.each do |p|
				pad_state[p[:index]] = {
					x: p[:x], y: p[:y], ring: p[:ring].to_s,
					index: p[:index], has_tower: @towers.key?(p[:index]),
				}
			end
			@channels[:pads].replace(pad_state)

			# Towers (change on build/upgrade/sell/upgrade-progress)
			tower_state = {}
			@towers.each { |idx, t| tower_state[idx] = t.to_h }
			@channels[:towers].replace(tower_state)

			# Firewalls (change on build/destroy/hp)
			fw_state = {}
			@firewalls.each { |key, fw| fw_state[key.join(",")] = fw.to_h }
			@channels[:firewalls].replace(fw_state)

			# Hex deaths (change when enemies die, then slowly decay)
			death_state = {}
			@hex_grid.death_counts_snapshot.each do |d|
				death_state["#{d[:q]},#{d[:r]}"] = d
			end
			@channels[:hex_deaths].replace(death_state)

			# Core state (hp, buffs, wave — changes infrequently)
			@channels[:core].set(:state, {
				core_hp: @core_hp,
				max_core_hp: @max_core_hp,
				wave: @wave_number,
				wave_timer: @wave_timer.round(1),
				game_over: @game_over,
				core_buffs: @core_buffs.transform_keys(&:to_s),
				firewall_mult: firewall_multiplier.round(2),
			})

			# Enemies (change every tick — positions move)
			enemy_state = {}
			@enemies.each { |e| enemy_state[e.id] = e.to_h }
			@channels[:enemies].replace(enemy_state)

			# Players (change every tick — positions move)
			player_state = {}
			@players.each { |id, p| player_state[id] = p.to_h }
			@channels[:players].replace(player_state)

			# Cubes (change on drop/pickup/age-out)
			cube_state = {}
			@dropped_cubes.each { |c| cube_state[c.id] = c.to_h }
			@channels[:cubes].replace(cube_state)
		end

		# ── Tick sub-steps ────────────────────────────────────────────────

		def tick_waves(dt)
			@wave_timer -= dt
			if @wave_timer <= 0 && @spawn_queue.empty?
				@wave_number += 1
				prepare_wave(@wave_number)
				@wave_timer = wave_interval
			end
		end

		def tick_spawns(dt)
			return if @spawn_queue.empty?

			@spawn_timer -= dt
			if @spawn_timer <= 0
				spawn_info = @spawn_queue.shift
				if spawn_info
					angle = @random.rand * Math::PI * 2
					dist = 800 + @wave_number * 30
					enemy = Enemy.new(spawn_info[:type], Math.cos(angle) * dist, Math.sin(angle) * dist, spawn_info[:multiplier])
					enemy.target_x = 0
					enemy.target_y = 0
					@enemies << enemy
				end
				@spawn_timer = 0.4 + @random.rand * 0.3
			end
		end

		def tick_tower_combat(dt)
			@projectiles.clear
			@towers.each_value do |tower|
				result = tower.tick(dt, @enemies, fire_rate_mult: fire_rate_multiplier, damage_mult: damage_multiplier)
				@projectiles << result if result
			end
		end

		def tick_firewall_combat(dt)
			@firewalls.each_value do |fw|
				next unless fw.alive?
				hits = fw.tick(dt, @enemies, multiplier: firewall_multiplier)
				@projectiles.concat(hits)
			end
		end

		def tick_firewall_cleanup
			@firewalls.reject! { |_, fw| !fw.alive? }
		end

		def tick_enemy_deaths
			@enemies.reject! do |enemy|
				unless enemy.alive?
					# Record death on hex grid for pathfinding heuristic
					@hex_grid.record_death(enemy.x, enemy.y)

					enemy.drops.each do |cube_type, count|
						ox = enemy.x + @random.rand(-15.0..15.0)
						oy = enemy.y + @random.rand(-15.0..15.0)
						@dropped_cubes << DroppedCube.new(cube_type, count, ox, oy)
					end
					true
				else
					false
				end
			end
		end

		def tick_core_collisions
			@enemies.reject! do |enemy|
				if enemy.distance_to(0, 0) < 30
					@core_hp -= (enemy.hp * 0.5).round
					@core_hp = 0 if @core_hp < 0
					true
				else
					false
				end
			end
		end

		def tick_game_over
			@game_over = true if @core_hp <= 0
		end

		def tick_cube_pickup
			@players.each_value do |player|
				@dropped_cubes.reject! do |cube|
					dx = player.x - cube.x
					dy = player.y - cube.y
					if Math.sqrt(dx * dx + dy * dy) < Player::PICKUP_RANGE
						player.add_cube(cube.type, cube.count) > 0
					else
						false
					end
				end
			end
		end

		def tick_cube_aging(dt)
			@dropped_cubes.reject! { |c| !c.tick(dt) }
		end

		def tick_tower_upgrades(dt)
			@towers.each do |_pad_index, tower|
				# Players within DEPOSIT_RANGE can sustain an in-progress upgrade
				nearby_players = @players.values.select do |player|
					dist = Math.sqrt((player.x - tower.x) ** 2 + (player.y - tower.y) ** 2)
					dist < Player::DEPOSIT_RANGE
				end

				if tower.upgrading
					if nearby_players.any?
						completed = tower.advance_upgrade!(dt, nearby_players.size)
						nearby_players.each(&:level_up!) if completed
					end
				elsif tower.can_upgrade?
					# Starting a new upgrade requires being very close AND stationary
					close_players = @players.values.select do |player|
						dist = Math.sqrt((player.x - tower.x) ** 2 + (player.y - tower.y) ** 2)
						dist < Player::UPGRADE_RANGE
					end
					next if close_players.empty?

					stationary = close_players.select { |p| p.vx.abs < 1.0 && p.vy.abs < 1.0 }
					next if stationary.empty?

					cost = tower.upgrade_cost
					pooled = Hash.new(0)
					nearby_players.each { |p| p.inventory.each { |t, c| pooled[t] += c } }
					next unless cost.all? { |cube_type, amount| pooled[cube_type] >= amount }

					cost.each do |cube_type, amount|
						remaining = amount
						nearby_players.each do |p|
							break if remaining <= 0
							remaining -= p.remove_cubes(cube_type, remaining)
						end
					end
					tower.begin_upgrade!
					tower.advance_upgrade!(dt, nearby_players.size)
				end
			end
		end

		def wave_interval
			[30.0 - @wave_number * 0.5, 10.0].max
		end

		def prepare_wave(wave_num)
			multiplier = 1.0 + (wave_num - 1) * 0.15

			if wave_num % 10 == 0 && wave_num >= 10
				# Architect boss wave: fewer regular units, focused boss encounter
				prepare_boss_wave(wave_num, multiplier)
			else
				prepare_regular_wave(wave_num, multiplier)
			end
		end

		def prepare_regular_wave(wave_num, multiplier)
			# More units overall — gives more cube drops and builds up death heatmap
			count = 8 + wave_num * 3

			# Weighted type pools: heavier on drones/crawlers for volume
			pool = []
			pool += [:drone] * 4
			pool += [:crawler] * 3 if wave_num >= 2
			pool += [:phantom] * 2 if wave_num >= 4
			pool += [:sentinel] * 2 if wave_num >= 6
			pool += [:specter] * 1 if wave_num >= 8

			count.times do
				@spawn_queue << {type: pool[@random.rand(pool.size)], multiplier: multiplier}
			end

			# Overlord sub-bosses every 5 waves
			if wave_num % 5 == 0 && wave_num >= 5
				[wave_num / 5, 3].min.times do
					@spawn_queue << {type: :overlord, multiplier: multiplier * 1.3}
				end
			end
		end

		def prepare_boss_wave(wave_num, multiplier)
			# Large swarm of weak escorts first — seed the death heatmap
			escort_count = 15 + wave_num
			escort_count.times do
				@spawn_queue << {type: :drone, multiplier: multiplier * 0.8}
			end

			# Then the architect(s)
			architects = [wave_num / 10, 2].min
			architects.times do
				@spawn_queue << {type: :architect, multiplier: multiplier * 1.5}
			end

			# Trailing support wave
			(5 + wave_num / 2).times do
				type = [:crawler, :phantom, :specter][@random.rand(3)]
				@spawn_queue << {type: type, multiplier: multiplier}
			end
		end
	end
end
