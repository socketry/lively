# frozen_string_literal: true

# CS 1.6 Classic HUD Components Module
# Contains all HUD rendering methods for CS16 Classic game
module CS16HudComponents
	def render_classic_hud(builder)
		builder.tag(:div, id: "hud", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
			# Health & Armor (Classic style)
			builder.tag(:div, style: "position: absolute; bottom: 20px; left: 20px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				builder.tag(:div, style: "font-size: 36px; font-weight: bold;") do
					builder.tag(:span, style: "color: #ff4444;") { builder.text("❤") }
					builder.tag(:span, id: "health-display") { builder.text(" 100") }
				end
				builder.tag(:div, style: "font-size: 36px; font-weight: bold;") do
					builder.tag(:span, style: "color: #4444ff;") { builder.text("🛡") }
					builder.tag(:span, id: "armor-display") { builder.text(" 0") }
				end
			end
			
			# Ammo (Classic style)
			builder.tag(:div, style: "position: absolute; bottom: 20px; right: 20px; color: #fff; text-align: right; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				builder.tag(:div, style: "font-size: 48px; font-weight: bold;") do
					builder.tag(:span, id: "ammo-current") { builder.text("13") }
					builder.tag(:span, style: "color: #888; font-size: 32px;") { builder.text(" / ") }
					builder.tag(:span, id: "ammo-reserve", style: "font-size: 32px;") { builder.text("24") }
				end
				builder.tag(:div, id: "weapon-name", style: "font-size: 24px; color: #ffaa00;") do
					builder.text("USP")
				end
			end
			
			# Money (Classic green color)
			builder.tag(:div, style: "position: absolute; top: 100px; left: 20px; color: #00ff00; font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				builder.text("$ ")
				builder.tag(:span, id: "money-display") { builder.text("800") }
			end
			
			# Round timer & score (Classic style)
			builder.tag(:div, style: "position: absolute; top: 20px; left: 50%; transform: translateX(-50%); text-align: center;") do
				builder.tag(:div, style: "font-size: 32px; color: #fff; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
					builder.tag(:span, id: "round-timer") { builder.text("1:55") }
				end
				builder.tag(:div, style: "margin-top: 10px; font-size: 28px; color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
					builder.tag(:span, style: "color: #4444ff;") do
						builder.text("CT ")
						builder.tag(:span, id: "ct-score") { builder.text("0") }
					end
					builder.tag(:span, style: "margin: 0 20px;") { builder.text("-") }
					builder.tag(:span, style: "color: #ffaa00;") do
						builder.tag(:span, id: "t-score") { builder.text("0") }
						builder.text(" T")
					end
				end
				builder.tag(:div, id: "round-info", style: "margin-top: 5px; font-size: 18px; color: #aaa;") do
					builder.text("Round 1 / 30")
				end
			end
			
			# C4 Timer (when planted)
			builder.tag(:div, id: "c4-timer", style: "position: absolute; top: 150px; left: 50%; transform: translateX(-50%); display: none; background: rgba(255,0,0,0.2); padding: 10px; border: 2px solid #ff0000;") do
				builder.tag(:div, style: "font-size: 36px; color: #ff0000; font-weight: bold; text-align: center;") do
					builder.text("💣 C4")
				end
				builder.tag(:div, style: "font-size: 48px; color: #ffff00; font-weight: bold; text-align: center;") do
					builder.tag(:span, id: "c4-countdown") { builder.text("35") }
				end
			end
			
			# Minimap (Classic radar)
			builder.tag(:div, style: "position: absolute; top: 150px; right: 20px; width: 200px; height: 200px; background: rgba(0,0,0,0.7); border: 2px solid #555;") do
				builder.tag(:canvas, id: "minimap", width: 200, height: 200)
			end
			
			# Spectator info
			builder.tag(:div, id: "spectator-info", style: "position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); color: #fff; font-size: 24px; display: none; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
				builder.text("Spectating: ")
				builder.tag(:span, id: "spectating-player")
			end
			
			# Buy time indicator
			builder.tag(:div, id: "buy-time-indicator", style: "position: absolute; top: 200px; left: 20px; color: #00ff00; font-size: 20px; display: none;") do
				builder.text("Buy Time: ")
				builder.tag(:span, id: "buy-time-left") { builder.text("90") }
				builder.text("s")
			end
			
			# Buy button (visual fallback)
			builder.tag(:button, id: "buy-button", 
				style: "position: absolute; top: 140px; left: 20px; padding: 10px 20px; background: #ff6b00; color: #fff; border: 2px solid #fff; cursor: pointer; font-size: 18px; font-weight: bold; z-index: 999; pointer-events: auto;",
				onclick: "window.toggleBuyMenu ? window.toggleBuyMenu() : console.error('toggleBuyMenu not found')") do
				builder.text("[B] Buy Menu")
			end
			
			# Freeze time indicator
			builder.tag(:div, id: "freeze-time-indicator", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #ffaa00; font-size: 48px; font-weight: bold; display: none; text-shadow: 3px 3px 6px rgba(0,0,0,0.9);") do
				builder.text("Freeze Time: ")
				builder.tag(:span, id: "freeze-time-left") { builder.text("15") }
			end
		end
	end

	def render_classic_buy_menu(builder)
		builder.tag(:div, id: "buy-menu", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 900px; height: 650px; background: rgba(20,20,20,0.95); border: 3px solid #ff6b00; display: none; padding: 20px; color: #fff; overflow-y: auto; pointer-events: auto; z-index: 1000;") do
			builder.tag(:h2, style: "text-align: center; color: #ff6b00; margin-bottom: 20px;") { builder.text("Buy Menu - Classic CS 1.6") }
			
			# Money display
			builder.tag(:div, style: "text-align: center; font-size: 24px; color: #00ff00; margin-bottom: 20px;") do
				builder.text("Money: $")
				builder.tag(:span, id: "buy-menu-money") { builder.text("800") }
			end
			
			# Buy time remaining
			builder.tag(:div, id: "buy-menu-timer", style: "text-align: center; font-size: 18px; color: #ffaa00; margin-bottom: 10px;") do
				builder.text("Buy time remaining: ")
				builder.tag(:span, id: "buy-menu-time-left") { builder.text("90") }
				builder.text("s")
			end
			
			# Categories in classic layout
			builder.tag(:div, style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;") do
				# Pistols (Classic CS 1.6 prices)
				render_weapon_category(builder, "Pistols", [
					{ name: "USP", price: 0, key: "1", id: "usp", team: "ct" },
					{ name: "Glock-18", price: 0, key: "1", id: "glock", team: "t" },
					{ name: "P228", price: 600, key: "2", id: "p228" },
					{ name: "Desert Eagle", price: 650, key: "3", id: "deagle" },
					{ name: "Five-SeveN", price: 750, key: "4", id: "fiveseven", team: "ct" },
					{ name: "Dual Berettas", price: 800, key: "5", id: "elite" }
				])
				
				# SMGs (Classic CS 1.6 prices)
				render_weapon_category(builder, "SMGs", [
					{ name: "MAC-10", price: 1400, key: "1", id: "mac10", team: "t" },
					{ name: "TMP", price: 1250, key: "2", id: "tmp", team: "ct" },
					{ name: "MP5-Navy", price: 1500, key: "3", id: "mp5" },
					{ name: "UMP45", price: 1700, key: "4", id: "ump45" },
					{ name: "P90", price: 2350, key: "5", id: "p90" }
				])
				
				# Shotguns (Classic CS 1.6 prices)
				render_weapon_category(builder, "Shotguns", [
					{ name: "M3 Super 90", price: 1700, key: "1", id: "m3" },
					{ name: "XM1014", price: 3000, key: "2", id: "xm1014" }
				])
			end
			
			# Second row
			builder.tag(:div, style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;") do
				# Rifles (Classic CS 1.6 prices)
				render_weapon_category(builder, "Rifles", [
					{ name: "Galil", price: 2000, key: "1", id: "galil", team: "t" },
					{ name: "FAMAS", price: 2250, key: "2", id: "famas", team: "ct" },
					{ name: "AK-47", price: 2500, key: "3", id: "ak47", team: "t" },
					{ name: "M4A1", price: 3100, key: "4", id: "m4a1", team: "ct" },
					{ name: "SG 552", price: 3500, key: "5", id: "sg552", team: "t" },
					{ name: "AUG", price: 3500, key: "6", id: "aug", team: "ct" }
				])
				
				# Snipers (Classic CS 1.6 prices)
				render_weapon_category(builder, "Sniper Rifles", [
					{ name: "Scout", price: 2750, key: "1", id: "scout" },
					{ name: "AWP", price: 4750, key: "2", id: "awp" },
					{ name: "G3SG1", price: 5000, key: "3", id: "g3sg1", team: "t" },
					{ name: "SG550", price: 4200, key: "4", id: "sg550", team: "ct" }
				])
				
				# Machine Gun
				builder.tag(:div) do
					builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px; font-size: 16px;") { builder.text("Machine Gun") }
					builder.tag(:div, class: "weapon-list", style: "font-size: 14px;") do
						builder.tag(:div, class: "weapon-item", data: { weapon: "m249" }, style: "padding: 3px; cursor: pointer;") do
							builder.text("[1] M249 - $5750")
						end
					end
				end
			end
			
			# Equipment row
			builder.tag(:div, style: "display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;") do
				# Equipment (Classic CS 1.6 prices)
				render_equipment_category(builder, "Equipment", [
					{ name: "Kevlar Vest", price: 650, key: "1", id: "kevlar" },
					{ name: "Kevlar + Helmet", price: 1000, key: "2", id: "kevlar_helmet" },
					{ name: "Defuse Kit", price: 200, key: "3", id: "defuse", team: "ct" },
					{ name: "Night Vision", price: 1250, key: "4", id: "nvg" }
				])
				
				# Grenades (Classic CS 1.6 prices and limits)
				render_grenade_category(builder, "Grenades", [
					{ name: "HE Grenade", price: 300, key: "1", id: "hegrenade", max: 1 },
					{ name: "Flashbang", price: 200, key: "2", id: "flashbang", max: 2 },
					{ name: "Smoke Grenade", price: 300, key: "3", id: "smokegrenade", max: 1 }
				])
			end
			
			# Bind instructions
			builder.tag(:div, style: "margin-top: 20px; padding-top: 10px; border-top: 1px solid #555; font-size: 12px; color: #888; text-align: center;") do
				builder.text("Press number keys to buy | Press B to close | ESC to cancel")
			end
		end
	end

	def render_classic_scoreboard(builder)
		builder.tag(:div, id: "scoreboard", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 800px; background: rgba(0,0,0,0.9); border: 2px solid #555; display: none; padding: 20px; color: #fff;") do
			builder.tag(:h2, style: "text-align: center; color: #ff6b00; margin-bottom: 20px;") do
				round = @game_state ? @game_state[:round] : 1
				max_rounds = @game_state ? @game_state[:max_rounds] : 30
				builder.text("Scoreboard - Round #{round} / #{max_rounds}")
			end
			
			# CT Team
			builder.tag(:div, style: "margin-bottom: 20px;") do
				builder.tag(:h3, style: "color: #4444ff; border-bottom: 2px solid #4444ff; padding-bottom: 5px;") do
					ct_score = @game_state ? @game_state[:ct_score] : 0
					builder.text("Counter-Terrorists - Score: #{ct_score}")
				end
				render_team_scoreboard(builder, "ct-team-scores")
			end
			
			# T Team
			builder.tag(:div) do
				builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px;") do
					t_score = @game_state ? @game_state[:t_score] : 0
					builder.text("Terrorists - Score: #{t_score}")
				end
				render_team_scoreboard(builder, "t-team-scores")
			end
			
			# Instructions
			builder.tag(:div, style: "margin-top: 20px; text-align: center; font-size: 12px; color: #888;") do
				builder.text("Hold TAB to view | Release to close")
			end
		end
	end

	def render_classic_chatbox(builder)
		builder.tag(:div, id: "chatbox", style: "position: absolute; bottom: 150px; left: 20px; width: 400px; max-height: 200px; background: rgba(0,0,0,0.5); padding: 10px; overflow-y: auto; font-size: 14px; color: #fff;") do
			builder.tag(:div, id: "chat-messages")
			builder.tag(:input, id: "chat-input", type: "text", placeholder: "Press Y for all chat, U for team chat...",
				style: "width: 100%; background: rgba(0,0,0,0.7); border: 1px solid #555; color: #fff; padding: 5px; margin-top: 5px; display: none;")
		end
	end

	def render_classic_killfeed(builder)
		builder.tag(:div, id: "killfeed", style: "position: absolute; top: 100px; right: 20px; width: 300px; font-size: 14px;") do
			# Killfeed entries will be added dynamically
		end
	end

	private

	def render_weapon_category(builder, title, weapons)
		builder.tag(:div) do
			builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px; font-size: 16px;") { builder.text(title) }
			builder.tag(:div, class: "weapon-list", style: "font-size: 14px;") do
				weapons.each do |weapon|
					builder.tag(:div, class: "weapon-item", data: { weapon: weapon[:id] }, style: "padding: 5px; cursor: pointer; border: 1px solid transparent; border-radius: 3px; margin: 2px 0; transition: all 0.2s;") do
						builder.text("[#{weapon[:key]}] #{weapon[:name]} - $#{weapon[:price]}")
						builder.text(" (#{weapon[:team].upcase} only)") if weapon[:team]
					end
				end
			end
		end
	end

	def render_equipment_category(builder, title, equipment)
		builder.tag(:div) do
			builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px; font-size: 16px;") { builder.text(title) }
			builder.tag(:div, class: "equipment-list", style: "font-size: 14px;") do
				equipment.each do |item|
					builder.tag(:div, class: "equipment-item", data: { equipment: item[:id] }, style: "padding: 5px; cursor: pointer; border: 1px solid transparent; border-radius: 3px; margin: 2px 0; transition: all 0.2s;") do
						builder.text("[#{item[:key]}] #{item[:name]} - $#{item[:price]}")
						builder.text(" (#{item[:team].upcase} only)") if item[:team]
					end
				end
			end
		end
	end

	def render_grenade_category(builder, title, grenades)
		builder.tag(:div) do
			builder.tag(:h3, style: "color: #ffaa00; border-bottom: 2px solid #ffaa00; padding-bottom: 5px; font-size: 16px;") { builder.text(title) }
			builder.tag(:div, class: "grenade-list", style: "font-size: 14px;") do
				grenades.each do |grenade|
					builder.tag(:div, class: "grenade-item", data: { grenade: grenade[:id] }, style: "padding: 5px; cursor: pointer; border: 1px solid transparent; border-radius: 3px; margin: 2px 0; transition: all 0.2s;") do
						builder.text("[#{grenade[:key]}] #{grenade[:name]} - $#{grenade[:price]} (Max: #{grenade[:max]})")
					end
				end
			end
		end
	end

	def render_team_scoreboard(builder, tbody_id)
		builder.tag(:table, style: "width: 100%; color: #fff; font-size: 14px;") do
			builder.tag(:thead) do
				builder.tag(:tr) do
					builder.tag(:th, style: "text-align: left; padding: 5px;") { builder.text("Name") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("K") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("A") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("D") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("ADR") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("MVP") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("$") }
					builder.tag(:th, style: "text-align: center; padding: 5px;") { builder.text("Ping") }
				end
			end
			builder.tag(:tbody, id: tbody_id)
		end
	end
end