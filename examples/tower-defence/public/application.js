import { Live, ViewElement } from 'live';
import { GameRenderer } from './data_nexus/game_renderer.js';

Live.start();

customElements.define('data-nexus-game', class DataNexusElement extends ViewElement {
	#renderer;
	#resizeObserver;

	connectedCallback() {
		this.dataset.width = this.clientWidth;
		this.dataset.height = this.clientHeight;
		super.connectedCallback();

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

	disconnectedCallback() {
		this.#resizeObserver?.disconnect();
		super.disconnectedCallback();
		this.#renderer?.destroy();
	}
});
