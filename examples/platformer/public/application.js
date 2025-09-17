import { Live, ViewElement } from 'live';
import { Audio, Library } from 'live-audio';

Live.start();

// Custom element for the platformer game with audio support only
customElements.define('platformer-game', class PlatformerGameElement extends ViewElement {
	#audio;
	
	connectedCallback() {
		super.connectedCallback();
		
		console.log('Platformer game element connected - audio-only mode');
		
		// Initialize audio controller
		this.#audio = Audio.start({
			window,
			onOutputCreated: (controller, output) => {
				console.log('Audio system ready for platformer game');
			}
		});
		
		this.loadSounds();
	}
	
	disconnectedCallback() {
		// Clean up audio
		if (this.#audio) {
			this.#audio.dispose();
		}
		super.disconnectedCallback();
	}
	
	loadSounds() {
		try {
			// Load platformer-specific sounds
			this.#audio.addSound('jump', new Library.JumpSound());
			this.#audio.addSound('collect', new Library.CoinSound());
			this.#audio.addSound('death', new Library.DeathSound());
			this.#audio.addSound('levelup', new Library.PowerUpSound());
			this.#audio.addSound('cat_collision', new Library.HowlSound()); // Cat enemy collision
			this.#audio.addSound('portal_teleport', new Library.TeleportSound()); // Portal teleportation
			
			// Interface sounds
			this.#audio.addSound('beep', new Library.BeepSound());
			this.#audio.addSound('blip', new Library.BlipSound());
			
			console.log('All platformer sounds loaded successfully');
		} catch (error) {
			console.error('Error loading sounds:', error);
		}
	}
	
	playSound(soundName) {
		if (this.#audio) {
			this.#audio.playSound(soundName);
		}
	}
	
	get audio() {
		return this.#audio;
	}
});
