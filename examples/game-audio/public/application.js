// Game Audio Application - Extended Live.js setup with audio components
import { Live, ViewElement } from 'live';
import { Audio, Library, Visualizer } from 'live-audio';

// Register custom game audio element:
customElements.define('live-game-audio', class GameAudioElement extends ViewElement {
	#audio;
	#visualizer;
	
	loadSounds() {
		// Game sound effects.
		this.#audio.addSound('jump', new Library.JumpSound());
		this.#audio.addSound('coin', new Library.CoinSound());
		this.#audio.addSound('powerup', new Library.PowerUpSound());
		this.#audio.addSound('death', new Library.DeathSound());
		this.#audio.addSound('explosion', new Library.ExplosionSound());
		this.#audio.addSound('laser', new Library.LaserSound());
		this.#audio.addSound('beep', new Library.BeepSound());
		this.#audio.addSound('blip', new Library.BlipSound());
		
		// Animal sounds.
		this.#audio.addSound('meow', new Library.MeowSound());
		this.#audio.addSound('bark', new Library.BarkSound());
		this.#audio.addSound('roar', new Library.RoarSound());
		this.#audio.addSound('chirp', new Library.ChirpSound());
		this.#audio.addSound('howl', new Library.HowlSound());
		this.#audio.addSound('duck', new Library.DuckSound());
		this.#audio.addSound('alien', new Library.AlienSound());
		
		this.#audio.addSound('music', new Library.BackgroundMusicSound('/_static/music.mp3', 32.0 * 60.0 / 80.0, 96.0 * 60.0 / 80.0));
	}
	
	setupVisualization() {
		// Wait for DOM to be ready, then setup visualization
		const waveformCanvas = this.querySelector('#waveform-canvas');
		const alertCanvas = this.querySelector('#alert-canvas');
		
		if (waveformCanvas && alertCanvas) {
			// Store the canvas elements for use in the callback
			this.waveformCanvas = waveformCanvas;
			this.alertCanvas = alertCanvas;
		}
	}
	
	connectedCallback() {
		super.connectedCallback();
		
		// Setup visualization elements first
		setTimeout(() => this.setupVisualization(), 50);
		
		// Create and initialize the game audio controller with callbacks
		this.#audio = Audio.start({
			window,
			onOutputCreated: (controller, output) => {
				// Connect visualizer when output is created
				if (this.waveformCanvas && this.alertCanvas) {
					this.#visualizer = new Visualizer(output.audioContext, this.waveformCanvas, this.alertCanvas);
					output.connectAnalysis(this.#visualizer);
				}
			},
			onOutputDisposed: (controller, output) => {
				// Cleanup when output is disposed
				if (this.#visualizer) {
					output.disconnectAnalysis();
					this.#visualizer = null;
				}
			}
		});
		
		this.loadSounds();
	}
	
	disconnectedCallback() {
		// Cleanup the audio controller
		if (this.#audio) {
			this.#audio.dispose();
		}
		
		super.disconnectedCallback();
	}
	
	async enableVisualization() {
		if (this.#visualizer) {
			const output = await this.#audio.acquireOutput();
			if (output) {
				output.connectAnalysis(this.#visualizer);
			}
		}
	}
	
	async disableVisualization() {
		const output = await this.#audio.acquireOutput();
		if (output) {
			output.disconnectAnalysis();
		}
	}
	
	get audio() {
		return this.#audio;
	}
});

Live.start();

export { Live, ViewElement };
