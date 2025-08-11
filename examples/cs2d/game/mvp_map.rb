# frozen_string_literal: true

class MVPMap
	attr_reader :width, :height, :walls, :bomb_sites
		
	def initialize
		@width = 1280
		@height = 720
		@walls = []
		@bomb_sites = []
				
		setup_dust2_mini
	end
		
	def setup_dust2_mini
		# 簡化版 de_dust2 地圖
		# 外牆
		@walls << { x: 0, y: 0, width: @width, height: 20 } # 上
		@walls << { x: 0, y: @height - 20, width: @width, height: 20 } # 下
		@walls << { x: 0, y: 0, width: 20, height: @height } # 左
		@walls << { x: @width - 20, y: 0, width: 20, height: @height } # 右
				
		# 中間結構
		@walls << { x: 300, y: 200, width: 100, height: 320 } # 左側牆
		@walls << { x: 880, y: 200, width: 100, height: 320 } # 右側牆
		@walls << { x: 500, y: 300, width: 280, height: 120 } # 中間障礙
				
		# 炸彈點
		@bomb_sites << { name: "A", x: 200, y: 360, radius: 100 }
		@bomb_sites << { name: "B", x: 1080, y: 360, radius: 100 }
	end
		
	def ct_spawns
		[
						{ x: 640, y: 100 },
						{ x: 600, y: 100 },
						{ x: 680, y: 100 },
						{ x: 560, y: 130 },
						{ x: 720, y: 130 }
				]
	end
		
	def t_spawns
		[
						{ x: 640, y: 620 },
						{ x: 600, y: 620 },
						{ x: 680, y: 620 },
						{ x: 560, y: 590 },
						{ x: 720, y: 590 }
				]
	end
		
	def check_collision(x, y, radius)
		# 邊界檢查
		return true if x - radius < 0 || x + radius > @width
		return true if y - radius < 0 || y + radius > @height
				
		# 牆壁碰撞
		@walls.each do |wall|
			if x + radius > wall[:x] && 
									x - radius < wall[:x] + wall[:width] &&
									y + radius > wall[:y] && 
									y - radius < wall[:y] + wall[:height]
				return true
			end
		end
				
		false
	end
		
	def get_bomb_site_at(x, y)
		@bomb_sites.each do |site|
			distance = Math.sqrt((x - site[:x])**2 + (y - site[:y])**2)
			return site[:name] if distance <= site[:radius]
		end
		nil
	end
		
	def get_state
		{
						width: @width,
						height: @height,
						walls: @walls,
						bomb_sites: @bomb_sites
				}
	end
end