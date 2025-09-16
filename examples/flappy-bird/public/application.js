// Flappy Bird Game - Live.js with Audio
import { Live, ViewElement } from 'live';
import { Audio, Library } from 'live-audio';

// Register custom flappy bird element with audio support:
customElements.define('live-flappy-bird', class FlappyBirdElement extends ViewElement {
	#audio;
	
	loadSounds() {
		// Game sound effects - use SampleSound for one-shot MP3 playback
		this.#audio.addSound('death', new Library.SampleSound('/_static/death.mp3'));
		this.#audio.addSound('clink', new Library.SampleSound('/_static/clink.mp3'));
		
		// Bird sounds - use SampleSound for one-shot MP3 playback
		this.#audio.addSound('bird', new Library.SampleSound('/_static/bird.mp3'));
		this.#audio.addSound('gull', new Library.SampleSound('/_static/gull.mp3'));
		this.#audio.addSound('kiwi', new Library.SampleSound('/_static/kiwi.mp3'));
		this.#audio.addSound('owl', new Library.SampleSound('/_static/owl.mp3'));
		
		// Background music with loop points
		this.#audio.addSound('music', new Library.BackgroundMusicSound('/_static/music.mp3', 32.0 * 60.0 / 80.0, 96.0 * 60.0 / 80.0));
	}
	
	connectedCallback() {
		super.connectedCallback();
		
		// Create and initialize the audio controller
		this.#audio = Audio.start({
			window,
			onOutputCreated: (controller, output) => {
				// Audio is ready - no visualization needed for this game
				console.log('Flappy Bird audio initialized');
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
	
	get audio() {
		return this.#audio;
	}
});

Live.start();
