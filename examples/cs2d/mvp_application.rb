#!/usr/bin/env lively
# frozen_string_literal: true

require_relative "game/mvp_game_server"
require_relative "game/mvp_round_manager"
require_relative "game/mvp_bomb_system"
require_relative "game/mvp_economy"

class CS16MVPView < Live::View
  def initialize(...)
    super
    @server = MVPGameServer.instance
    @room = nil
    @player_id = nil
  end
  
  def bind(page)
    super
    @page = page
    @player_id = page.id
    
    # 自動加入或創建房間
    @room = @server.find_or_create_room
    @room.add_player(@player_id)
    
    # 開始遊戲循環
    start_game_loop
    self.update!
  end
  
  def close
    @room&.remove_player(@player_id)
    super
  end
  
  def handle(event)
    return unless @room
    
    case event[:type]
    when "player_input"
      @room.handle_player_input(@player_id, event[:data])
    when "buy_weapon"
      @room.buy_weapon(@player_id, event[:weapon])
    when "plant_bomb"
      @room.start_planting(@player_id)
    when "defuse_bomb"
      @room.start_defusing(@player_id)
    when "chat"
      @room.send_chat(@player_id, event[:message])
    end
  end
  
  def start_game_loop
    Thread.new do
      loop do
        sleep(1.0 / 30) # 30 FPS
        @room&.update
        broadcast_state
      end
    end
  end
  
  def broadcast_state
    return unless @room
    
    state = @room.get_state
    @room.players.each_key do |player_id|
      if page = Live::Page.pages[player_id]
        page.live.push({
          type: "game_state",
          data: state
        }.to_json)
      end
    end
  end
  
  def render(builder)
    builder.tag(:div, id: "cs16-mvp", style: "width: 100vw; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #1a1a1a;") do
      builder.tag(:canvas, id: "game-canvas", style: "display: block; width: 100%; height: 100%;")
      
      # HUD
      builder.tag(:div, id: "hud", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
        render_top_bar(builder)
        render_bottom_bar(builder)
        render_buy_menu(builder)
        render_bomb_indicator(builder)
        render_death_screen(builder)
      end
    end
    
    builder.tag(:script, type: "module") do
      builder.text(cs16_mvp_client)
    end
  end
  
  private
  
  def render_top_bar(builder)
    builder.tag(:div, id: "top-bar", style: "position: absolute; top: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: center; padding: 0 20px; color: white; font-family: 'Courier New', monospace;") do
      # 隊伍分數
      builder.tag(:div, style: "display: flex; gap: 20px;") do
        builder.tag(:div, id: "ct-score", style: "color: #4488ff; font-size: 24px; font-weight: bold;") { builder.text("CT: 0") }
        builder.tag(:div, style: "color: #666; font-size: 20px;") { builder.text("-") }
        builder.tag(:div, id: "t-score", style: "color: #ff8844; font-size: 24px; font-weight: bold;") { builder.text("T: 0") }
      end
      
      # 回合時間
      builder.tag(:div, id: "round-timer", style: "font-size: 32px; font-weight: bold;") do
        builder.text("1:55")
      end
      
      # 回合數
      builder.tag(:div, id: "round-info", style: "text-align: right;") do
        builder.tag(:div, id: "round-number", style: "font-size: 14px; color: #aaa;") { builder.text("Round 1/30") }
        builder.tag(:div, id: "round-phase", style: "font-size: 16px; color: #ffaa00;") { builder.text("Buy Time") }
      end
    end
  end
  
  def render_bottom_bar(builder)
    builder.tag(:div, id: "bottom-bar", style: "position: absolute; bottom: 0; left: 0; right: 0; height: 100px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: flex-end; padding: 20px; color: white; font-family: 'Courier New', monospace;") do
      # 生命值與護甲
      builder.tag(:div, style: "display: flex; flex-direction: column; gap: 5px;") do
        builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
          builder.tag(:div, style: "background: #ff4444; width: 200px; height: 20px; position: relative;") do
            builder.tag(:div, id: "health-bar", style: "background: #ff6666; height: 100%; width: 100%;")
            builder.tag(:span, style: "position: absolute; top: 0; left: 50%; transform: translateX(-50%); line-height: 20px; font-size: 12px;") do
              builder.text("100 HP")
            end
          end
        end
        builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
          builder.tag(:div, style: "background: #444488; width: 200px; height: 20px; position: relative;") do
            builder.tag(:div, id: "armor-bar", style: "background: #6666ff; height: 100%; width: 0%;")
            builder.tag(:span, style: "position: absolute; top: 0; left: 50%; transform: translateX(-50%); line-height: 20px; font-size: 12px;") do
              builder.text("0 Armor")
            end
          end
        end
      end
      
      # 金錢
      builder.tag(:div, id: "money", style: "font-size: 24px; color: #44ff44; font-weight: bold;") do
        builder.text("$800")
      end
      
      # 彈藥
      builder.tag(:div, id: "ammo", style: "text-align: right;") do
        builder.tag(:div, style: "font-size: 32px; font-weight: bold;") do
          builder.tag(:span, id: "ammo-clip") { builder.text("30") }
          builder.tag(:span, style: "color: #666; font-size: 24px;") { builder.text(" / ") }
          builder.tag(:span, id: "ammo-reserve", style: "color: #aaa; font-size: 24px;") { builder.text("90") }
        end
        builder.tag(:div, id: "weapon-name", style: "font-size: 14px; color: #aaa;") { builder.text("Glock-18") }
      end
    end
  end
  
  def render_buy_menu(builder)
    builder.tag(:div, id: "buy-menu", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); border: 2px solid #666; border-radius: 10px; padding: 20px; display: none; pointer-events: auto;") do
      builder.tag(:h2, style: "color: #ffaa00; margin-bottom: 20px; text-align: center;") { builder.text("Buy Menu") }
      
      builder.tag(:div, style: "display: grid; grid-template-columns: repeat(2, 200px); gap: 10px;") do
        # 手槍
        builder.tag(:div, class: "buy-category", style: "grid-column: span 2;") do
          builder.tag(:h3, style: "color: #888; font-size: 14px; margin-bottom: 5px;") { builder.text("PISTOLS") }
          builder.tag(:button, class: "buy-item", data: {weapon: "deagle", price: "650"}, style: "width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer;") do
            builder.text("Desert Eagle - $650")
          end
        end
        
        # 步槍
        builder.tag(:div, class: "buy-category", style: "grid-column: span 2;") do
          builder.tag(:h3, style: "color: #888; font-size: 14px; margin-bottom: 5px;") { builder.text("RIFLES") }
          builder.tag(:button, class: "buy-item t-only", data: {weapon: "ak47", price: "2700"}, style: "width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer; margin-bottom: 5px;") do
            builder.text("AK-47 - $2700")
          end
          builder.tag(:button, class: "buy-item ct-only", data: {weapon: "m4a1", price: "3100"}, style: "width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer; margin-bottom: 5px;") do
            builder.text("M4A1 - $3100")
          end
          builder.tag(:button, class: "buy-item", data: {weapon: "awp", price: "4750"}, style: "width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer;") do
            builder.text("AWP - $4750")
          end
        end
        
        # 裝備
        builder.tag(:div, class: "buy-category", style: "grid-column: span 2;") do
          builder.tag(:h3, style: "color: #888; font-size: 14px; margin-bottom: 5px;") { builder.text("EQUIPMENT") }
          builder.tag(:button, class: "buy-item", data: {weapon: "kevlar", price: "650"}, style: "width: 48%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer; margin-right: 4%;") do
            builder.text("Kevlar - $650")
          end
          builder.tag(:button, class: "buy-item", data: {weapon: "helmet", price: "350"}, style: "width: 48%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer;") do
            builder.text("Helmet - $350")
          end
          builder.tag(:button, class: "buy-item ct-only", data: {weapon: "defuse", price: "400"}, style: "width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid #444; color: white; cursor: pointer; margin-top: 5px;") do
            builder.text("Defuse Kit - $400")
          end
        end
      end
      
      builder.tag(:div, style: "margin-top: 20px; text-align: center; color: #666; font-size: 12px;") do
        builder.text("Press B to close • Numbers 1-9 for quick buy")
      end
    end
  end
  
  def render_bomb_indicator(builder)
    builder.tag(:div, id: "bomb-indicator", style: "position: absolute; top: 100px; left: 50%; transform: translateX(-50%); display: none;") do
      builder.tag(:div, id: "bomb-timer", style: "background: rgba(255,0,0,0.8); color: white; padding: 10px 20px; border-radius: 5px; font-size: 24px; font-weight: bold; text-align: center;") do
        builder.tag(:div) { builder.text("💣 BOMB PLANTED") }
        builder.tag(:div, id: "bomb-countdown", style: "font-size: 32px; color: #ffff00;") { builder.text("0:45") }
      end
      
      builder.tag(:div, id: "defuse-progress", style: "background: rgba(0,0,255,0.8); color: white; padding: 10px 20px; border-radius: 5px; margin-top: 10px; display: none;") do
        builder.tag(:div) { builder.text("Defusing...") }
        builder.tag(:div, style: "width: 200px; height: 20px; background: rgba(0,0,0,0.5); margin-top: 5px;") do
          builder.tag(:div, id: "defuse-bar", style: "width: 0%; height: 100%; background: #00ff00;")
        end
      end
    end
  end
  
  def render_death_screen(builder)
    builder.tag(:div, id: "death-screen", style: "position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: none; pointer-events: auto;") do
      builder.tag(:div, style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: white;") do
        builder.tag(:h1, style: "color: #ff4444; font-size: 48px; margin-bottom: 20px;") { builder.text("YOU DIED") }
        builder.tag(:div, id: "killer-info", style: "font-size: 20px; margin-bottom: 10px;") { builder.text("Killed by Player123 with AK-47") }
        builder.tag(:div, style: "font-size: 16px; color: #aaa;") { builder.text("Spectating teammates...") }
      end
    end
  end
  
  def cs16_mvp_client
    File.read(File.expand_path("public/_static/cs16_mvp.js", __dir__))
  end
end

Application = Lively::Application[CS16MVPView]