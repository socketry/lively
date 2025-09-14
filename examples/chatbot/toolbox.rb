# frozen_string_literal: true

# Released under the MIT License.
# Copyright, 2024, by Samuel Williams.

require "async/http/internet/instance"

class Tool
	def initialize(name, explain, &block)
		@name = name
		@explain = explain
		@block = block
	end
	
	attr :name
	attr :explain
	
	def as_json
		{
			"name" => @name,
			"explain" => @explain,
		}
	end
	
	def call(message)
		@block.call(message)
	end
end

class Toolbox
	def self.default
		self.new.tap do |toolbox|
			toolbox.register("ruby", '{"tool":"ruby", "code": "..."}') do |message|
				eval(message[:code])
			end
			
			toolbox.register("internet.get", '{"tool":"internet.get", "url": "http://..."}') do |message|
				Async::HTTP::Internet.get(message[:url]).read
			end
			
			toolbox.register("explain", '{"tool":"explain"}') do |message|
				toolbox.as_json
			end
		end
	end
	
	PROMPT = "You have access to the following tools, which you can invoke by replying with a single line of valid JSON:\n\n"
	
	USAGE = <<~EOF
		Use these tools to enhance your ability to answer user queries accurately.
		
		When you need to use a tool to answer the user's query, respond **only** with the JSON invocation.
			- Example: {"tool":"ruby", "code": "5+5"}
			- **Do not** include any explanations, greetings, or additional text when invoking a tool.
			- If you are dealing with numbers, ensure you provide them as Integers or Floats, not Strings.
		
		After invoking a tool:
			1. You will receive the tool's result as the next input.
			2. Use the result to formulate a direct, user-friendly response that answers the original query.
			3. Assume the user is unaware of the tool invocation or its result, so clearly summarize the answer without referring to the tool usage or the response it generated.
		
		Continue the conversation naturally after providing the answer. Ensure your responses are concise and user-focused.
		
		## Example Flow:
		
		User: "Why doesn't 5 + 5 equal 11?"
		Assistant (invokes tool): {"tool": "ruby", "code": "5+5"}
		(Tool Result): 10
		Assistant: "The result of 5 + 5 is 10, because addition follows standard arithmetic rules."
	EOF
	
	def initialize
		@tools = {}
	end
	
	def as_json
		{
			"prompt" => PROMPT,
			"tools" => @tools.map(&:as_json),
			"usage" => USAGE,
		}
	end
	
	attr :tools
	
	def register(name, explain, &block)
		@tools[name] = Tool.new(name, explain, &block)
	end
	
	def tool?(response)
		if response.start_with?("{")
			begin
				return JSON.parse(response, symbolize_names: true)
			rescue => error
				Console.debug(self, error)
			end
		end
		
		return false
	end
	
	def each(text)
		return to_enum(:each, text) unless block_given?
		
		text.each_line do |line|
			if message = tool?(line)
				yield message
			end
		end
	end
	
	def call(message)
		name = message[:tool]
		
		if tool = @tools[name]
			result = tool.call(message)
			
			return {result: result}.to_json
		else
			raise ArgumentError.new("Unknown tool: #{name}")
		end
	rescue => error
		{error: error.message}.to_json
	end
	
	def explain
		buffer = String.new
		buffer << PROMPT
		
		@tools.each do |name, tool|
			buffer << tool.explain
		end
		
		buffer << "\n" << USAGE << "\n"
		
		return buffer
	end
end
