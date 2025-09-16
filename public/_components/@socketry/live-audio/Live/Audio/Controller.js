// Audio Controller - manages sound instances and provides unified API
import { Output } from './Output.js';
import { Sound } from './Sound.js';

// Get or create shared AudioContext (keyed by window)
async function getSharedAudioContext(window = globalThis) {
	const contextKey = '_liveAudioContext';
	
	let audioContext = window[contextKey];
	
	if (!audioContext || audioContext.state === 'closed') {
		audioContext = new (window.AudioContext || window.webkitAudioContext)({
			latencyHint: 'interactive',
		});
		
		if (audioContext.state === 'suspended') {
			await audioContext.resume();
		}
		
		window[contextKey] = audioContext;
		
		console.log(`Live Audio Context created - Sample rate: ${audioContext.sampleRate}Hz, State: ${audioContext.state}`);
	}
	
	return audioContext;
}

export class Controller {
	#window = null;
	#audioContext = null;
	#output = null;
	#sounds = {};
	#volume = 1.0;
	
	// Callbacks:
	#onOutputCreated = null;
	#onOutputDisposed = null;
	
	constructor(window = globalThis, options = {}) {
		this.#window = window;
		this.#onOutputCreated = options.onOutputCreated || null;
		this.#onOutputDisposed = options.onOutputDisposed || null;
	}
	
	// Acquire output with AudioContext ready - returns null if not available.
	async acquireOutput() {
		let output = this.#output;
		
		if (!output) {
			// First get the AudioContext at Controller level
			const audioContext = await getSharedAudioContext(this.#window);
			if (!audioContext) return null;
			
			// Then create Output instance with AudioContext:
			this.#output = output = new Output(audioContext);
			
			// Apply the controller's volume to the new output
			output.setVolume(this.#volume);
			
			// Call the output created callback if provided
			if (this.#onOutputCreated) {
				this.#onOutputCreated(this, output);
			}
		}
		
		return output;
	}
	
	// Add a sound to this controller instance
	addSound(name, value) {
		this.#sounds[name] = value;
		return value;
	}
	
	// Play a sound by name
	async playSound(name) {
		// Return early if volume is zero (muted)
		if (this.#volume <= 0) return;
		
		const sound = this.#sounds[name];
		if (sound) {
			const output = await this.acquireOutput();
			if (!output) return;
			sound.play(output);
		} else {
			console.warn(`Sound '${name}' not found`);
		}
	}
	
	// Stop a sound by name
	stopSound(name) {
		const sound = this.#sounds[name];
		if (sound) {
			sound.stop();
		} else {
			console.warn(`Sound '${name}' not found`);
		}
	}
	
	// Stop all sounds
	stopAllSounds() {
		if (this.#sounds) {
			Object.values(this.#sounds).forEach(sound => sound.stop());
		}
	}
	
	// Get a sound instance for direct access
	getSound(name) {
		return this.#sounds[name];
	}
	
	// List all available sound names
	listSounds() {
		return Object.keys(this.#sounds);
	}
	
	// Remove a sound
	removeSound(name) {
		if (this.#sounds[name]) {
			delete this.#sounds[name];
			return true;
		}
		return false;
	}
	
	// Set master volume
	async setVolume(volume) {
		this.#volume = volume;
		
		// Apply to output if it exists, or acquire it
		const output = await this.acquireOutput();
		if (output) {
			output.setVolume(volume);
		}
	}
	
	// Get current volume
	get volume() {
		return this.#volume;
	}
	
	// Get sounds object (for testing)
	get sounds() {
		return this.#sounds;
	}
	
	// Get window object (for testing)
	get window() {
		return this.#window;
	}
	
	// Dispose of the controller and clean up resources
	dispose() {
		if (this.#output) {
			const output = this.#output;
			
			// Call the disposal callback if provided
			if (this.#onOutputDisposed) {
				this.#onOutputDisposed(this, output);
			}
			
			output.dispose();
			this.#output = null;
		}
		
		this.#sounds = {};
	}
}
