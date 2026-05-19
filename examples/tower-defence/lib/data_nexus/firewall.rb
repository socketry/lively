# frozen_string_literal: true

module DataNexus
	# A firewall can be placed on any hex tile. It deals massive damage to
	# enemies that pass through it, but takes damage proportional to the
	# enemy's max HP. When destroyed, it's gone.
	class Firewall
		DAMAGE_PER_SECOND = 240.0 # damage dealt to enemies on this tile each second
		DAMAGE_TAKEN_RATIO = 0.04 # fraction of enemy max_hp taken as self-damage per hit
		DAMAGE_TYPE = :crypto
		
		attr_reader :id, :q, :r, :x, :y, :hp, :max_hp, :color
		
		def initialize(q, r)
			@id = SecureRandom.hex(4)
			@q = q
			@r = r
			@x, @y = Hex.to_world(q, r)
			@max_hp = 800
			@hp = @max_hp
			@color = "#ff00ff"
			@cooldown = 0.0
		end
		
		def alive?
			@hp > 0
		end
		
		def hex_key
			[@q, @r]
		end
		
		# Tick: damage all enemies on this hex tile, take damage back.
		# Returns array of {enemy:, damage:} for projectile effects.
		def tick(dt, enemies, multiplier: 1.0)
			return [] unless alive?
			
			hits = []
			enemies.each do |enemy|
				next unless enemy.alive?
				eq, er = Hex.to_hex(enemy.x, enemy.y)
				next unless eq == @q && er == @r
				
				# Deal damage to enemy (scaled by fortify buff)
				dealt = enemy.take_damage((DAMAGE_PER_SECOND * multiplier * dt).round, DAMAGE_TYPE)
				
				# Take damage proportional to enemy's max HP (reduced by fortify buff)
				self_damage = (enemy.max_hp * DAMAGE_TAKEN_RATIO * dt / multiplier).round
				@hp -= self_damage
				@hp = 0 if @hp < 0
				
				hits << {
					from_x: @x, from_y: @y,
					to_x: enemy.x, to_y: enemy.y,
					color: @color,
					killed: !enemy.alive?,
					target_id: enemy.id,
				}
			end
			
			hits
		end
		
		def to_h
			{
				id: @id, q: @q, r: @r,
				x: @x.round(1), y: @y.round(1),
				hp: @hp, max_hp: @max_hp,
				color: @color,
			}
		end
	end
end
