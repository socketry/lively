#!/usr/bin/env lively
# frozen_string_literal: true

require 'securerandom'
require 'json'

class CS2DView < Live::View
  def bind(page)
    super
    # Console.info(self, "CS2D bind method called - WebSocket connection established")
    
    # Initialize minimal game state
    @player_id = SecureRandom.uuid
    @game_state = {
      players: {},
      phase: 'waiting',
      round_time: 30,
      ct_score: 0,
      t_score: 0,
      round: 1
    }
    
    # Add current player to game state
    @game_state[:players][@player_id] = {
      id: @player_id,
      name: "Player_#{@player_id[0..7]}",
      team: 'ct',
      x: 640,
      y: 360,
      health: 100,
      alive: true
    }
    
    # Console.info(self, "CS2D game state initialized for player #{@player_id}")
    self.update!
    # Console.info(self, "CS2D render update sent via WebSocket")
    
    # Initialize JavaScript after render - proper Lively pattern
    initialize_game_javascript
  end

  def render(builder)
    # Console.info(self, "CS2D render method called - rendering complete game interface")
    
    # Render the complete game container with proper structure
    render_game_container(builder)
    
    # Console.info(self, "CS2D render completed - full game interface sent")
  end
  
  def render_game_container(builder)
    builder.tag(:div, id: "cs2d-container", data: { live: @id }, 
                style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #000; position: relative;") do
      # Game canvas
      builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
                 style: "display: block; margin: 0 auto; cursor: crosshair;",
                 tabIndex: 0)
                 
      # Simple HUD
      builder.tag(:div, style: "position: absolute; top: 20px; left: 20px; color: white; font-family: Arial; font-size: 24px;") do
        player_name = @player_id ? "Player: #{@player_id[0..7]}" : "CS2D Game"
        builder.text(player_name)
      end
    end
  end

  def initialize_game_javascript
    # Console.info(self, "Initializing CS2D game JavaScript via WebSocket...")
    
    # First test that JavaScript injection works
    self.script(<<~JAVASCRIPT)
      console.log('CS2D: WebSocket JavaScript injection working!');
      document.body.style.backgroundColor = '#2a2a2a';
      
      // Create visible indicators
      const testDiv = document.createElement('div');
      testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: lime; color: black; padding: 10px; z-index: 99999; font-weight: bold;';
      testDiv.textContent = 'WebSocket JS Active';
      document.body.appendChild(testDiv);
      
      // Draw on canvas
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw initial background
          ctx.fillStyle = '#1a3d1a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw loading text
          ctx.fillStyle = '#00FF00';
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('CS2D Game Ready!', canvas.width/2, canvas.height/2);
          ctx.fillText('JavaScript Injection Working', canvas.width/2, canvas.height/2 + 60);
          console.log('CS2D: Canvas initialized via WebSocket');
        }
      }
      
      // Status indicator
      const statusDiv = document.createElement('div');
      statusDiv.style.cssText = 'position: fixed; bottom: 10px; right: 10px; background: yellow; color: black; padding: 10px; z-index: 99999; font-weight: bold;';
      statusDiv.textContent = 'Game Active';
      document.body.appendChild(statusDiv);
    JAVASCRIPT
    
    # Console.info(self, "CS2D JavaScript initialization complete")
  end

  def close
    # Console.info(self, "CS2D view closing - cleaning up")
  end
end

Application = Lively::Application[CS2DView]