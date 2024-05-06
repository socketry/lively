#!/usr/bin/env lively
# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

require 'async/ollama'
require 'markly'
require 'xrb/reference'

require_relative 'conversation'

class ChatbotView < Live::View
	def conversation
		@conversation ||= Conversation.find_by(id: @data[:conversation_id])
	end
	
	def update_conversation(prompt)
		Console.info(self, "Updating conversation", id: conversation.id, prompt: prompt)
		
		Async::Ollama::Client.open do |client|
			conversation_message = conversation.conversation_messages.create!(prompt: prompt, response: String.new)
			
			self.append(".conversation .messages") do |builder|
				self.render_message(builder, conversation_message)
			end
			
			generate = client.generate(prompt, context: conversation.context) do |response|
				response.body.each do |token|
					conversation_message.response += token
					
					self.replace(".message.id#{conversation_message.id}") do |builder|
						self.render_message(builder, conversation_message)
					end
				end
			end
			
			conversation_message.response = generate.response
			conversation_message.context = generate.context
			conversation_message.save!
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
			builder.inline_tag(:p, class: "prompt") do
				builder.text(message.prompt)
			end
			
			builder.inline_tag(:div, class: "response") do
				builder.raw(Markly.render_html(message.response))
			end
		end
	end
	
	def render(builder)
		builder.tag(:div, class: "conversation") do
			builder.tag(:div, class: "messages") do
				conversation.conversation_messages.each do |message|
					render_message(builder, message)
				end
			end
			
			builder.tag(:input, type: "text", class: "prompt", value: @data[:prompt], onkeypress: forward_keypress, autofocus: true, placeholder: "Type here...")
		end
	end
end

class Application < Lively::Application
	def self.resolver
		Live::Resolver.allow(ChatbotView)
	end
	
	def body(...)
		ChatbotView.new(...)
	end
	
	def handle(request)
		reference = ::XRB::Reference(request.path)
		
		if value = reference.query[:conversation_id]
			conversation_id = Integer(value)
		else
			conversation_id = nil
		end
		
		unless conversation_id
			reference.query[:conversation_id] = Conversation.create!(model: 'llama3').id
			
			return ::Protocol::HTTP::Response[302, {'location' => reference.to_s}]
		else
			return super(request, conversation_id: conversation_id)
		end
	end
end
