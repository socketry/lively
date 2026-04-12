/**
 * Client-side mirror of a server DeltaLog channel.
 *
 * Receives either:
 *   - Keyframe: {version, keyframe: true, data: {key: value, ...}}
 *   - Delta:    {version, set: {key: value, ...}, delete: [key, ...]}
 *   - No-op:    {version}
 *
 * Maintains a local key-value map and provides array/object accessors
 * for the renderer.
 */
export class DeltaState {
	#state = {};
	#version = 0;

	get version() { return this.#version; }
	get size() { return Object.keys(this.#state).length; }

	/**
	 * Apply a server update (keyframe or delta).
	 * Returns true if state changed.
	 */
	apply(update) {
		if (!update || update.version === undefined) return false;
		this.#version = update.version;

		if (update.keyframe) {
			this.#state = update.data || {};
			return true;
		}

		let changed = false;
		if (update.set) {
			for (const [key, value] of Object.entries(update.set)) {
				this.#state[key] = value;
				changed = true;
			}
		}
		if (update.delete) {
			for (const key of update.delete) {
				delete this.#state[key];
				changed = true;
			}
		}
		return changed;
	}

	/** Get a value by key. */
	get(key) {
		return this.#state[key];
	}

	/** Iterate all values. */
	values() {
		return Object.values(this.#state);
	}

	/** Iterate all entries as [key, value]. */
	entries() {
		return Object.entries(this.#state);
	}

	/** Get as a plain object (for backward compat). */
	toObject() {
		return this.#state;
	}

	/** Get all values as an array (for backward compat). */
	toArray() {
		return Object.values(this.#state);
	}

	/** Clear all state. */
	clear() {
		this.#state = {};
		this.#version = 0;
	}
}

/**
 * Manages multiple DeltaState channels and applies bulk updates
 * from the server gametick event.
 */
export class DeltaStateManager {
	#channels = {};

	constructor(channelNames) {
		for (const name of channelNames) {
			this.#channels[name] = new DeltaState();
		}
	}

	/** Get a channel by name. */
	channel(name) {
		return this.#channels[name];
	}

	/**
	 * Apply a server tick payload. Each channel key in the detail
	 * is a delta/keyframe update.
	 */
	apply(detail) {
		for (const [name, state] of Object.entries(this.#channels)) {
			if (detail[name]) {
				state.apply(detail[name]);
			}
		}
	}
}
