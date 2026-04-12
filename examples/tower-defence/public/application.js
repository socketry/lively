import { Live, ViewElement } from 'live';
import { Audio, Library } from 'live-audio';
import { GameRenderer } from './data_nexus/game_renderer.js';

Live.start();

customElements.define('data-nexus-game', class DataNexusElement extends ViewElement {
	#renderer;
	#resizeObserver;
	#audio;

	connectedCallback() {
		this.dataset.width = this.clientWidth;
		this.dataset.height = this.clientHeight;
		super.connectedCallback();

		// Initialize audio
		this.#audio = Audio.start({
			window,
			onOutputCreated: (controller, output) => {
				console.log('Data Nexus audio initialized');
			}
		});
		this.#loadSounds();

		this.#resizeObserver = new ResizeObserver((entries) => {
			const { inlineSize: width, blockSize: height } = entries[0].contentBoxSize[0];
			if (window.live) {
				window.live.forward(this.id, { type: 'resize', detail: { width, height } });
			}
		});
		this.#resizeObserver.observe(this);

		this.#renderer = new GameRenderer(this);

		document.addEventListener('keydown', (e) => {
			if ((e.key === 'r' || e.key === 'R') && this.#renderer?.isGameOver) {
				window.live.forward(this.id, { type: 'restart', detail: {} });
			}
		});
	}

	#loadSounds() {
		// Tower combat
		this.#audio.addSound('laser', new Library.LaserSound());
		this.#audio.addSound('explosion', new Library.ExplosionSound());

		// Player actions
		this.#audio.addSound('build', new Library.PowerUpSound());
		this.#audio.addSound('coin', new Library.CoinSound());
		this.#audio.addSound('beep', new Library.BeepSound());

		// Alerts
		this.#audio.addSound('death', new Library.DeathSound());
		this.#audio.addSound('alien', new Library.AlienSound());
		this.#audio.addSound('roar', new Library.RoarSound());
	}

	disconnectedCallback() {
		this.#resizeObserver?.disconnect();
		if (this.#audio) this.#audio.dispose();
		super.disconnectedCallback();
		this.#renderer?.destroy();
	}

	get audio() {
		return this.#audio;
	}
});
