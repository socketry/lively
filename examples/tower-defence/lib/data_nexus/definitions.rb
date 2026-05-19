# frozen_string_literal: true

# All game constants and data definitions live here.

module DataNexus
	TICK_RATE = 1.0 / 20 # 20 Hz server tick
	CHUNK_SIZE = 512 # pixels per chunk side
	UPGRADE_TIME = 2.5 # seconds to stand near a tower to upgrade it
	
	# ── Data-cube / resource types ──────────────────────────────────────────
	CUBE_TYPES = {
		core:    {color: "#00ffcc", tier: 0, label: "Core Data"},
		cipher:  {color: "#ff00ff", tier: 1, label: "Cipher Shard"},
		quantum: {color: "#00ccff", tier: 2, label: "Quantum Bit"},
		void:    {color: "#ff3333", tier: 3, label: "Void Fragment"},
		nexus:   {color: "#ffd700", tier: 4, label: "Nexus Shard"},
		prism:   {color: "#dd88ff", tier: 5, label: "Prism Core"},
	}.freeze
	
	# Per-type inventory capacity schedule.
	# base  — slots at level 1.
	# gain  — slots added each time the interval elapses.
	# every — how many levels between each gain (+1 gain per N levels).
	# Common types grow fast; rare types grow slowly.
	CARRY_SCHEDULE = {
		core:    {base: 12, gain: 2, every: 1}, # +2 every level
		cipher:  {base:  8, gain: 1, every: 1}, # +1 every level
		quantum: {base:  5, gain: 1, every: 2}, # +1 every 2 levels
		void:    {base:  3, gain: 1, every: 3}, # +1 every 3 levels
		nexus:   {base:  2, gain: 1, every: 5}, # +1 every 5 levels
		prism:   {base:  1, gain: 1, every: 8}, # +1 every 8 levels
	}.freeze
	
	# ── Core upgrade definitions ──────────────────────────────────────────
	CORE_UPGRADES = {
		overclock: {
			label: "OVERCLOCK", key: "1", color: "#00ffcc",
			desc: "+15% tower fire rate", cost: {nexus: 1},
		},
		amplify: {
			label: "AMPLIFY", key: "2", color: "#ff6600",
			desc: "+15% tower damage", cost: {nexus: 1},
		},
		accelerate: {
			label: "ACCELERATE", key: "3", color: "#00ccff",
			desc: "+15% player speed", cost: {nexus: 1},
		},
		fortify: {
			label: "FORTIFY", key: "4", color: "#ff00ff",
			desc: "+25% firewall HP & damage", cost: {nexus: 1},
		},
	}.freeze
	
	# ── Damage / shield types ──────────────────────────────────────────────
	DAMAGE_TYPES = %i[kinetic thermal crypto disrupt].freeze
	
	# ── Tower definitions ──────────────────────────────────────────────────
	TOWER_DEFS = {
		pulse: {
			label: "Pulse Turret", cost: {core: 5}, range: 200, damage: 8,
			damage_type: :kinetic, fire_rate: 3.0, color: "#00ffcc",
			upgrades: {
				1 => {cost: {core: 8}, damage: 12, range: 220},
				2 => {cost: {core: 12, cipher: 4}, damage: 18, range: 250, fire_rate: 4.0},
				3 => {cost: {cipher: 10, quantum: 3}, damage: 28, range: 280, fire_rate: 5.0},
				4 => {cost: {void: 3, prism: 1}, damage: 42, range: 310, fire_rate: 6.5},
				5 => {cost: {nexus: 1, prism: 2}, damage: 65, range: 340, fire_rate: 8.0},
			},
		},
		thermal: {
			label: "Thermal Lance", cost: {core: 8}, range: 160, damage: 15,
			damage_type: :thermal, fire_rate: 1.5, color: "#ff6600",
			upgrades: {
				1 => {cost: {core: 10}, damage: 22, range: 180},
				2 => {cost: {cipher: 6}, damage: 32, range: 200},
				3 => {cost: {cipher: 8, quantum: 5}, damage: 50, range: 240, fire_rate: 2.0},
				4 => {cost: {void: 4, prism: 1}, damage: 78, range: 265, fire_rate: 2.5},
				5 => {cost: {nexus: 1, prism: 2}, damage: 115, range: 295, fire_rate: 3.0},
			},
		},
		crypto: {
			label: "Crypto Jammer", cost: {core: 6, cipher: 2}, range: 250, damage: 5,
			damage_type: :crypto, fire_rate: 2.0, color: "#ff00ff",
			upgrades: {
				1 => {cost: {cipher: 5}, damage: 8, range: 280},
				2 => {cost: {cipher: 8, quantum: 3}, damage: 12, range: 320},
				3 => {cost: {quantum: 8, void: 2}, damage: 20, range: 380, fire_rate: 3.0},
				4 => {cost: {void: 3, prism: 1}, damage: 32, range: 430, fire_rate: 4.0},
				5 => {cost: {nexus: 1, prism: 2}, damage: 50, range: 490, fire_rate: 5.5},
			},
		},
		disrupt: {
			label: "Disruptor", cost: {core: 10, cipher: 4}, range: 180, damage: 20,
			damage_type: :disrupt, fire_rate: 1.0, color: "#ff3333",
			upgrades: {
				1 => {cost: {cipher: 6, quantum: 2}, damage: 30},
				2 => {cost: {quantum: 6, void: 2}, damage: 45, range: 200},
				3 => {cost: {void: 8}, damage: 70, range: 240, fire_rate: 1.5},
				4 => {cost: {void: 5, prism: 1}, damage: 105, range: 265, fire_rate: 1.8},
				5 => {cost: {nexus: 1, prism: 2}, damage: 155, range: 300, fire_rate: 2.5},
			},
		},
	}.freeze
	
	# ── Tower pad positions (relative to data core) ───────────────────────
	# Snap world coords to nearest hex center (inline, before Hex module is loaded).
	HEX_SZ = 40.0
	SQ3 = Math.sqrt(3)
	
	def self.snap_to_hex(wx, wy)
		qf = (SQ3 / 3.0 * wx - 1.0 / 3.0 * wy) / HEX_SZ
		rf = (2.0 / 3.0 * wy) / HEX_SZ
		sf = -qf - rf
		rq = qf.round; rr = rf.round; rs = sf.round
		qd = (rq - qf).abs; rd = (rr - rf).abs; sd = (rs - sf).abs
		if qd > rd && qd > sd then rq = -rr - rs
		elsif rd > sd then rr = -rq - rs
		end
		{x: (HEX_SZ * (SQ3 * rq + SQ3 / 2.0 * rr)).round(1),
			y: (HEX_SZ * (1.5 * rr)).round(1)}
	end
	
	def self.hex_ring_pads(count, radius, offset_angle: 0.0)
		seen = {}
		(0...count).filter_map do |i|
			angle = i * Math::PI * 2 / count + offset_angle
			pad = snap_to_hex(Math.cos(angle) * radius, Math.sin(angle) * radius)
			key = "#{pad[:x]},#{pad[:y]}"
			next if seen[key]
			seen[key] = true
			pad
		end
	end
	
	INNER_PADS = hex_ring_pads(8, 150).freeze
	OUTER_PADS = hex_ring_pads(16, 350).freeze
	FAR_PADS = hex_ring_pads(24, 600, offset_angle: Math::PI / 24).freeze
	
	# ── Firewall cost ──────────────────────────────────────────────────
	FIREWALL_COST = {core: 3}.freeze
	
	# ── Enemy definitions ────────────────────────────────────────────────
	ENEMY_DEFS = {
		drone: {
			hp: 30, speed: 60, reward: {core: 1}, color: "#88ff88",
			size: 10, shield: nil, damage_resist: {},
		},
		crawler: {
			hp: 80, speed: 35, reward: {core: 2}, color: "#ffaa00",
			size: 14, shield: nil, damage_resist: {kinetic: 0.3},
		},
		phantom: {
			hp: 40, speed: 90, reward: {core: 1, cipher: 1}, color: "#cc44ff",
			size: 9, shield: :crypto, damage_resist: {crypto: 0.5},
		},
		sentinel: {
			hp: 150, speed: 25, reward: {core: 3, cipher: 1}, color: "#ff4444",
			size: 18, shield: :thermal, damage_resist: {thermal: 0.5, kinetic: 0.2},
		},
		specter: {
			hp: 60, speed: 120, reward: {cipher: 2, quantum: 1}, color: "#00eeff",
			size: 8, shield: :disrupt, damage_resist: {disrupt: 0.6},
		},
		overlord: {
			hp: 400, speed: 20, reward: {quantum: 3, void: 1, prism: 1}, color: "#ff0066",
			size: 24, shield: :crypto, damage_resist: {kinetic: 0.3, thermal: 0.3, crypto: 0.3},
		},
		architect: {
			hp: 1500, speed: 12, reward: {nexus: 1, void: 3, quantum: 5, prism: 2}, color: "#ffd700",
			size: 32, shield: :disrupt, damage_resist: {kinetic: 0.4, thermal: 0.4, crypto: 0.4, disrupt: 0.2},
		},
	}.freeze
end
