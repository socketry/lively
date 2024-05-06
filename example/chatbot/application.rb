#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

require 'async/ollama'

require_relative 'conversation'

class ChatbotView < Live::View
	def initialize(...)
		super
		
		# Defaults:
		@data[:prompt] ||= ""
		@data[:conversation_id] ||= nil
	end
	
	def conversation
		@conversation ||= Conversation.create!(model: 'llama3').tap do |conversation|
			@data[:conversation_id] = conversation.id
		end
	end
	
	def update_conversation(prompt)
		Console.info(self, "update_conversation", prompt: prompt)
		
		Async::Ollama::Client.open do |client|
			conversation_message = conversation.conversation_messages.build(prompt: prompt, response: String.new)
			
			generate = client.generate(prompt) do |response|
				response.body.each do |token|
					conversation_message.response += token
					sleep 0.1
					self.update!
				end
			end
			
			conversation_message.response = generate.response
			conversation_message.context = generate.context
			conversation_message.save!
			
			self.update!
		end
	end
	
	def handle(event)
		Console.info(self, event)
		case event[:type]
		when "keypress"
			detail = event[:detail]
			@data[:prompt] = detail[:value]
			
			if detail[:key] == "Enter"
				prompt = @data[:prompt]
				@data[:prompt] = ""
				self.update!
				
				Async do
					update_conversation(prompt)
				end
				
				# self.eval('this.getElementBySelector("input.prompt").focus()')
			end
		end
	end
	
	def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {value: event.target.value, key: event.key})"
	end
	
	def render_message(builder, message)
		builder.tag(:p, class: "message") do
			builder.text(message.prompt)
		end
		
		builder.tag(:p, class: "response") do
			builder.text(message.response)
		end
	end
	
	def render(builder)
		builder.tag(:div, class: "conversation") do
			conversation.conversation_messages.each do |message|
				render_message(builder, message)
			end
			
			builder.tag(:input, type: "text", class: "prompt", value: @data[:prompt], onkeypress: forward_keypress, autofocus: true, placeholder: "Type here...")
		end
	end
end

Application = Lively::Application[ChatbotView]