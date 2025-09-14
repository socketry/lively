#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024-2025, by Samuel Williams.

require "async/ollama"
require "markly"
require "xrb/reference"

require_relative "conversation"
require_relative "toolbox"

class ChatbotView < Live::View
	def initialize(...)
		super
		
		@conversation = nil
		@toolbox ||= Toolbox.default
	end
	
	def conversation
		@conversation ||= Conversation.find_by(id: @data[:conversation_id])
	end
	
	def append_prompt(client, prompt)
		conversation_prompt = conversation.conversation_messages.create!(role: "user", content: prompt)
		conversation_reply = conversation.conversation_messages.create!(role: "assistant", content: "")
		
		self.append(".conversation .messages") do |builder|
			self.render_message(builder, conversation_prompt)
			self.render_message(builder, conversation_reply)
		end
		
		agent_conversation = conversation.agent_conversation(client)
		chat = agent_conversation.call(prompt) do |response|
			response.body.each do |token|
				conversation_reply.content += token
				
				self.replace(".message.id#{conversation_reply.id}") do |builder|
					self.render_message(builder, conversation_reply)
				end
			end
		end
		
		conversation_reply.content = chat.response
		conversation_reply.save!
		
		return conversation_reply
	end
	
	def update_conversation(prompt)
		Console.info(self, "Updating conversation", id: conversation.id, prompt: prompt)
		
		Async::Ollama::Client.open do |client|
			conversation_message = append_prompt(client, prompt)
			
			while conversation_message
				messages = @toolbox.each(conversation_message.content).to_a
				break if messages.empty?
				
				results = []
				
				messages.each do |message|
					result = @toolbox.call(message)
					results << result.to_json
				end
				
				conversation_message = append_prompt(client, results.join("\n"))
			end
		end
	end
	
	def handle(event)
		case event[:type]
		when "keypress"
			detail = event[:detail]
			
			if detail[:key] == "Enter"
				prompt = detail[:value]
				
				Async do
					update_conversation(prompt)
				end
			end
		end
	end
	
	def forward_keypress
		"live.forwardEvent(#{JSON.dump(@id)}, event, {value: event.target.value, key: event.key}); if (event.key == 'Enter') event.target.value = '';"
	end
	
	def render_message(builder, message)
		builder.tag(:div, class: "message id#{message.id}") do
			if message.role == "user"
				builder.inline_tag(:p, class: "prompt") do
					builder.text(message.content)
				end
			else
				builder.inline_tag(:div, class: "response") do
					builder.raw(Markly.render_html(message.content, extensions: %i[autolink table]))
				end
			end
		end
	end
	
	def render(builder)
		builder.tag(:div, class: "conversation") do
			builder.tag(:div, class: "messages") do
				conversation&.conversation_messages&.each do |message|
					render_message(builder, message)
				end
			end
			
			builder.tag(:input, type: "text", class: "prompt", value: @data[:prompt], onkeypress: forward_keypress, autofocus: true, placeholder: "Type prompt here...")
		end
	end
end

class Application < Lively::Application
	def self.resolver
		Live::Resolver.allow(ChatbotView)
	end
	
	def body(...)
		ChatbotView.root(...)
	end
	
	def handle(request)
		reference = ::XRB::Reference(request.path)
		
		if value = reference.query[:conversation_id]
			conversation_id = Integer(value)
		else
			conversation_id = nil
		end
		
		unless conversation_id
			reference.query[:conversation_id] = Conversation.create!(model: "llama3.1:latest").id
			
			Console.info(self, "Redirecting to new conversation", reference: reference)
			
			return ::Protocol::HTTP::Response[302, {"location" => reference.to_s}]
		else
			return super(request, conversation_id: conversation_id)
		end
	end
end
