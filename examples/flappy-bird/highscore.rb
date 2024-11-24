#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

require "sqlite3"

class Highscore
	def self.database
		@database ||= SQLite3::Database.new("highscores.sqlite3").tap do |database|
			database.execute("CREATE TABLE IF NOT EXISTS highscores (name TEXT, score INTEGER)")
		end
	end
	
	def self.create!(name, score)
		database.execute("INSERT INTO highscores (name, score) VALUES (?, ?)", [name, score])
	end
	
	def self.top10
		database.execute("SELECT * FROM highscores ORDER BY score DESC LIMIT 10")
	end
end
