#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

require "active_record"
require "console"
require "console/compatible/logger"

ActiveRecord::Base.establish_connection(adapter: "sqlite3", database: "conversation.sqlite3")
ActiveRecord::Base.logger = Console::Compatible::Logger.new(Console)

ActiveRecord::Schema.define do
	create_table :conversations, if_not_exists: true do |table|
		table.string "model", null: false
		table.timestamps
	end
	
	create_table :conversation_messages, if_not_exists: true do |table|
		table.belongs_to :conversation, null: false, foreign_key: true
		
		table.text :role
		table.text :content
		table.timestamps
	end
end

class ConversationMessage < ActiveRecord::Base
end

class Conversation < ActiveRecord::Base
	has_many :conversation_messages
	
	def messages
		self.conversation_messages.order(created_at: :asc).map do |message|
			{
				role: message.role,
				content: message.content,
			}
		end
	end
	
	def agent_conversation(client)
		Async::Ollama::Conversation.new(client, model: self.model, messages: self.messages)
	end
end
