# frozen_string_literal: true

class NetworkManager
	attr_reader :latency, :packet_loss, :jitter
		
	def initialize
		@latency = 0
		@packet_loss = 0.0
		@jitter = 0
		@last_ping_time = Time.now
		@ping_samples = []
		@packet_stats = { sent: 0, received: 0, lost: 0 }
				
		# Network optimization settings
		@compression_enabled = true
		@delta_compression = true
		@priority_system_enabled = true
				
		# Message queuing
		@outgoing_messages = []
		@incoming_message_buffer = []
		@message_priorities = {}
	end
		
	def calculate_latency(server_timestamp, client_timestamp)
		return 0 unless server_timestamp && client_timestamp
				
		rtt = (client_timestamp - server_timestamp).abs
		@ping_samples << rtt
				
		# Keep only last 10 samples
		@ping_samples = @ping_samples.last(10)
				
		# Calculate average latency
		@latency = @ping_samples.sum / @ping_samples.size
				
		# Calculate jitter (variance in latency)
		if @ping_samples.size > 1
			avg = @latency
			variance = @ping_samples.map { |sample| (sample - avg) ** 2 }.sum / @ping_samples.size
			@jitter = Math.sqrt(variance)
		end
				
		@latency
	end
		
	def update_packet_stats(packets_sent, packets_received)
		@packet_stats[:sent] = packets_sent
		@packet_stats[:received] = packets_received
		@packet_stats[:lost] = packets_sent - packets_received
				
		@packet_loss = @packet_stats[:sent] > 0 ? 
						(@packet_stats[:lost].to_f / @packet_stats[:sent]) * 100 : 0
	end
		
	def compress_message(message)
		return message unless @compression_enabled
				
		# Simple JSON compression - remove null/empty values
		compressed = {}
				
		message.each do |key, value|
			case value
			when Hash
				compressed_hash = compress_hash(value)
				compressed[key] = compressed_hash unless compressed_hash.empty?
			when Array
				compressed_array = value.reject(&:nil?).compact
				compressed[key] = compressed_array unless compressed_array.empty?
			when nil, "", 0, false
			# Skip empty values
			else
				compressed[key] = value
			end
		end
				
		compressed
	end
		
	def decompress_message(message)
		# Currently just returns the message as-is
		# Could implement proper decompression if needed
		message
	end
		
	def prioritize_message(message)
		return message unless @priority_system_enabled
				
		priority = calculate_message_priority(message)
		message[:priority] = priority
		message
	end
		
	def queue_outgoing_message(message)
		prioritized_message = prioritize_message(message)
		compressed_message = compress_message(prioritized_message)
				
		@outgoing_messages << {
						message: compressed_message,
						priority: compressed_message[:priority] || 0,
						timestamp: Time.now.to_f * 1000,
						attempts: 0
				}
				
		# Sort by priority (higher priority first)
		@outgoing_messages.sort_by! { |msg| -msg[:priority] }
	end
		
	def get_next_outgoing_message
		return nil if @outgoing_messages.empty?
				
		# Get highest priority message
		message_data = @outgoing_messages.shift
		message_data[:attempts] += 1
				
		# If this is a critical message and it fails, retry it
		if message_data[:priority] >= 8 && message_data[:attempts] < 3
			# Re-queue for retry
			@outgoing_messages.unshift(message_data)
		end
				
		message_data[:message]
	end
		
	def process_incoming_message(raw_message)
		decompressed = decompress_message(raw_message)
				
		# Add to processing buffer
		@incoming_message_buffer << {
						message: decompressed,
						received_at: Time.now.to_f * 1000,
						processed: false
				}
				
		# Process messages in order
		process_message_buffer
	end
		
	def get_network_stats
		{
						latency: @latency.round(2),
						jitter: @jitter.round(2),
						packet_loss: @packet_loss.round(2),
						packets_sent: @packet_stats[:sent],
						packets_received: @packet_stats[:received],
						packets_lost: @packet_stats[:lost],
						outgoing_queue_size: @outgoing_messages.size,
						incoming_buffer_size: @incoming_message_buffer.size
				}
	end
		
	def should_use_lag_compensation?
		@latency > 50 # Use lag compensation if latency > 50ms
	end
		
	def should_use_prediction?
		@latency > 30 || @packet_loss > 2.0
	end
		
	def should_use_interpolation?
		@jitter > 10 || @packet_loss > 1.0
	end
		
	def get_prediction_time
		# How far ahead to predict based on network conditions
		base_prediction = @latency / 1000.0 # Convert to seconds
		jitter_factor = @jitter / 1000.0
				
		# Add some buffer for packet loss
		packet_loss_factor = @packet_loss / 100.0 * 0.1
				
		base_prediction + jitter_factor + packet_loss_factor
	end
		
	def get_interpolation_delay
		# How much to delay interpolation to smooth out jitter
		[@jitter / 1000.0 * 2, 0.1].min # Maximum 100ms delay
	end
		
	def adaptive_quality_settings
		settings = {
						update_rate: 30, # Default 30 Hz
						compression_level: 1,
						delta_updates: true,
						position_smoothing: true
				}
				
		# Adjust based on network conditions
		if @latency > 100
			settings[:update_rate] = 20 # Reduce update rate for high latency
			settings[:compression_level] = 2 # Increase compression
		end
				
		if @packet_loss > 5.0
			settings[:delta_updates] = false # Use full updates for packet loss
			settings[:compression_level] = 3 # Maximum compression
		end
				
		if @jitter > 20
			settings[:position_smoothing] = true # Enable extra smoothing
			settings[:update_rate] = 25 # Slightly reduce update rate
		end
				
		settings
	end
		
	def estimate_server_time(local_time)
		# Estimate what the server time is right now
		local_time + (@latency / 2000.0) # Half RTT in seconds
	end
		
	def clear_message_queues
		@outgoing_messages.clear
		@incoming_message_buffer.clear
	end
		
	def reset_stats
		@ping_samples.clear
		@packet_stats = { sent: 0, received: 0, lost: 0 }
		@latency = 0
		@packet_loss = 0.0
		@jitter = 0
	end
		
		private
		
	def compress_hash(hash)
		compressed = {}
		hash.each do |key, value|
			case value
			when nil, "", 0, false
			# Skip empty values
			when Hash
				sub_compressed = compress_hash(value)
				compressed[key] = sub_compressed unless sub_compressed.empty?
			when Array
				compressed_array = value.reject(&:nil?).compact
				compressed[key] = compressed_array unless compressed_array.empty?
			else
				compressed[key] = value
			end
		end
		compressed
	end
		
	def calculate_message_priority(message)
		case message[:type]
		when "player_shot", "player_killed", "player_hit"
			10 # Highest priority - combat events
		when "movement_result", "position_correction"
			9 # High priority - movement validation
		when "game_state_delta", "round_started", "round_ended"
			8 # Important game state
		when "player_joined", "player_left"
			7 # Player management
		when "weapon_purchased", "team_changed"
			6 # Game actions
		when "chat_message", "vote_kick_update"
			5 # Social features
		when "bomb_plant_started", "bomb_defuse_started"
			10 # Critical game events
		when "full_game_state"
			4 # Large state updates (lower priority)
		when "network_ping"
			3 # Network diagnostics
		else
			5 # Default priority
		end
	end
		
	def process_message_buffer
		# Process messages in chronological order
		@incoming_message_buffer.sort_by! { |msg| msg[:received_at] }
				
		processed_messages = []
				
		@incoming_message_buffer.each do |msg_data|
			next if msg_data[:processed]
						
			# Process the message
			yield msg_data[:message] if block_given?
						
			msg_data[:processed] = true
			processed_messages << msg_data
		end
				
		# Clean up processed messages
		@incoming_message_buffer.reject! { |msg| msg[:processed] }
				
		processed_messages
	end
end