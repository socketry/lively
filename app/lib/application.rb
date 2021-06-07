
require 'lively'
require_relative 'game_of_life'

class Application < Lively::Application
	def self.resolver
		Live::Resolver.allow(GameOfLife)
	end
	
	def body
		::GameOfLife.new('game-of-life')
	end
end
