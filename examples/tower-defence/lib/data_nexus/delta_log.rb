# frozen_string_literal: true

module DataNexus
	# A generic log-based key-value store with per-reader delta compression.
	#
	# Each write (set/delete) appends to a version-indexed log. Readers track
	# their cursor (last-seen version) and receive either:
	#   - A full **keyframe** (all current state) if they've never read or
	#     their cursor is too old.
	#   - A **delta** (only keys changed since their cursor) for efficient
	#     incremental updates.
	#
	# The log is compacted to a bounded size; readers that fall behind get
	# an automatic keyframe on their next read.
	#
	# Usage:
	#   log = DeltaLog.new
	#   log.set("enemy:abc", {x: 10, y: 20, hp: 100})
	#   log.set("enemy:abc", {x: 12, y: 22, hp: 100})
	#   log.delete("enemy:abc")
	#
	#   # Per-reader snapshot:
	#   result = log.snapshot(cursor_version)
	#   # => {version: 5, keyframe: true, data: {...}}     # first read
	#   # => {version: 7, set: {...}, delete: [...]}        # delta
	#   # => {version: 7}                                   # no changes
	#
	class DeltaLog
		Entry = Data.define(:version, :key, :value, :deleted)
		
		attr_reader :version
		
		def initialize(max_log_size: 500)
			@version = 0
			@state = {}       # key => value (current full state)
			@log = []         # [Entry, ...]
			@min_version = 0
			@max_log_size = max_log_size
		end
		
		# Current number of live keys.
		def size
			@state.size
		end
		
		# Read a value by key (for server-side logic).
		def [](key)
			@state[key]
		end
		
		def key?(key)
			@state.key?(key)
		end
		
		def each(&block)
			@state.each(&block)
		end
		
		def values
			@state.values
		end
		
		def keys
			@state.keys
		end
		
		# ── Writes ────────────────────────────────────────────────────────
		
		# Set a single key. No-op if value is unchanged (deep ==).
		def set(key, value)
			return if @state.key?(key) && @state[key] == value
			@version += 1
			@state[key] = value
			@log << Entry.new(@version, key, value, false)
			compact!
		end
		
		# Delete a single key. No-op if key doesn't exist.
		def delete(key)
			return unless @state.key?(key)
			@version += 1
			@state.delete(key)
			@log << Entry.new(@version, key, nil, true)
			compact!
		end
		
		# Replace entire contents. Detects additions, changes, and removals.
		def replace(new_state)
			# Remove keys not present in new state
			(@state.keys - new_state.keys).each{|k| delete(k)}
			# Add/update all keys in new state
			new_state.each{|k, v| set(k, v)}
		end
		
		# Clear all state.
		def clear
			@state.keys.each{|k| delete(k)}
		end
		
		# ── Reads ─────────────────────────────────────────────────────────
		
		# Generate a snapshot relative to the reader's cursor.
		#
		# Returns a hash:
		#   {version:, keyframe: true, data: {...}}   — full state
		#   {version:, set: {...}, delete: [...]}     — delta
		#   {version:}                                — no changes
		def snapshot(cursor_version)
			if cursor_version <= 0 || cursor_version < @min_version
				# Reader is new or too far behind — full keyframe
				{version: @version, keyframe: true, data: @state.dup}
			elsif cursor_version >= @version
				# Nothing changed since cursor
				{version: @version}
			else
				# Delta: collect latest entry per key since cursor
				latest = {}
				@log.each do |entry|
					next if entry.version <= cursor_version
					latest[entry.key] = entry
				end
				
				sets = {}
				deletes = []
				latest.each do |key, entry|
					if entry.deleted
						deletes << key
					else
						sets[key] = entry.value
					end
				end
				
				result = {version: @version}
				result[:set] = sets unless sets.empty?
				result[:delete] = deletes unless deletes.empty?
				result
			end
		end
		
		private
		
		def compact!
			return if @log.size <= @max_log_size
			@log = @log.last(@max_log_size)
			@min_version = @log.first.version
		end
	end
	
	# Tracks per-reader cursors for multiple named DeltaLog channels.
	class DeltaCursors
		def initialize
			@cursors = Hash.new(0) # channel_name => version
		end
		
		# Get delta snapshot for a channel and advance the cursor.
		def snapshot(channel_name, log)
			result = log.snapshot(@cursors[channel_name])
			@cursors[channel_name] = result[:version]
			result
		end
		
		def reset!
			@cursors.clear
		end
	end
end
