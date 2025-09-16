// Base Audio Output Node - handles routing to analysis and/or audio device

export class Output {
	#audioContext = null;
	#gainNode = null;
	#analysisNode = null;
	#destination = null;
	
	constructor(audioContext, initialGain = 1.0) {
		if (!audioContext || typeof audioContext.createGain !== 'function') {
			throw new Error('Output requires a valid AudioContext');
		}
		
		this.#audioContext = audioContext;
		
		// Initialize audio nodes
		this.#gainNode = this.#audioContext.createGain();
		this.#destination = this.#audioContext.destination;
		
		// Default volume is 1.0
		this.#gainNode.gain.value = initialGain;
		
		// Connect directly to destination by default
		this.#gainNode.connect(this.#destination);
	}
	
	// Synchronous getter for audioContext
	get audioContext() {
		return this.#audioContext;
	}
	
	// Connect an analysis node for visualization
	connectAnalysis(analysisNode) {
		if (this.#analysisNode) {
			this.#gainNode.disconnect(this.#analysisNode.input);
		}
		this.#analysisNode = analysisNode;
		this.#gainNode.disconnect(this.#destination);
		this.#gainNode.connect(this.#analysisNode.input);
		this.#analysisNode.connect(this.#destination);
	}
	
	// Remove analysis and connect directly to destination
	disconnectAnalysis() {
		if (this.#analysisNode) {
			this.#gainNode.disconnect(this.#analysisNode.input);
			this.#analysisNode.disconnect(this.#destination);
			this.#analysisNode = null;
		}
		this.#gainNode.connect(this.#destination);
	}
	
	get input() {
		return this.#gainNode;
	}
	
	// Public getter for gain node (for testing)
	get gainNode() {
		return this.#gainNode;
	}
	
	// Get current volume from the gain node
	get volume() {
		return this.#gainNode.gain.value;
	}
	
	// Apply volume to the gain node (called by Controller)
	setVolume(volume) {
		this.#gainNode.gain.value = volume;
	}
	
	// Clean up resources
	dispose() {
		if (this.#gainNode) {
			this.#gainNode.disconnect();
			this.#gainNode = null;
		}
		
		if (this.#analysisNode) {
			this.#analysisNode.disconnect();
			this.#analysisNode = null;
		}
		
		this.#audioContext = null;
		this.#destination = null;
	}
}
