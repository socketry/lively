# frozen_string_literal: true

require "live"

module DataNexus
	class GameView < Live::View
		def tag_name
			"data-nexus-game"
		end

		def initialize(id = self.class.unique_id, data = {}, controller:)
			super(id, data)
			@controller = controller
			@field_width = 1280
			@field_height = 800
			@cursors = DeltaCursors.new
		end

		def bind(page)
			super

			if (w = @data["width"].to_i) > 0
				@field_width = w
				@field_height = @data["height"].to_i
			end

			@controller.add_view(self)
		end

		def close
			@controller.remove_view(self)
			super
		end

		# Called by the controller each tick to push state to this client.
		def send_tick!
			world = @controller.world
			snapshot = world.snapshot_for(@id, cursors: @cursors)
			player = world.players[@id]
			return unless player

			cx = @field_width / 2.0
			cy = @field_height / 2.0

			dispatch_event("[id=#{JSON.dump(@id)}]", "gametick",
				detail: snapshot.merge(
					screenCX: cx, screenCY: cy,
					viewWidth: @field_width, viewHeight: @field_height,
				),
				bubbles: true)
		end

		def reset_cursors!
			@cursors.reset!
		end

		def handle(event)
			world = @controller.world

			case event[:type]
			when "keydown"
				world.players[@id]&.handle_key(event[:detail][:key], true)
			when "keyup"
				world.players[@id]&.handle_key(event[:detail][:key], false)
			when "resize"
				if (w = event[:detail][:width].to_i) > 0
					@field_width = w
					@field_height = event[:detail][:height].to_i
				end
			when "build"
				detail = event[:detail] || {}
				world.build_tower(@id, detail[:pad].to_i, detail[:type].to_s)
			when "sell"
				detail = event[:detail] || {}
				world.sell_tower(@id, detail[:pad].to_i)
			when "core_upgrade"
				detail = event[:detail] || {}
				world.upgrade_core(@id, detail[:type].to_s)
			when "firewall"
				world.build_firewall(@id)
			when "restart"
				@controller.reset!
			end
		end

		def render(builder)
			builder.tag(:div,
				id: "game-field",
				class: "game-field",
				tabIndex: 0,
				autofocus: true,
				onkeydown: "live.forwardEvent(#{JSON.dump(@id)}, event, {key: event.key}); event.preventDefault();",
				onkeyup: "live.forwardEvent(#{JSON.dump(@id)}, event, {key: event.key});",
			) do
				builder.tag(:div, id: "hud", class: "hud") { builder.text("Connecting to Data Nexus...") }
			end
		end
	end
end
