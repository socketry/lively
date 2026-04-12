import { TWO_PI } from './constants.js';

const GRID_TILE = 512;

export class GridField {
	#tile;

	constructor() {
		const c = document.createElement('canvas');
		c.width = GRID_TILE; c.height = GRID_TILE;
		const ctx = c.getContext('2d');

		ctx.fillStyle = '#050a14';
		ctx.fillRect(0, 0, GRID_TILE, GRID_TILE);

		ctx.strokeStyle = 'rgba(0,255,200,0.06)';
		ctx.lineWidth = 1;
		for (let i = 0; i <= GRID_TILE; i += 64) {
			ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GRID_TILE); ctx.stroke();
			ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(GRID_TILE, i); ctx.stroke();
		}

		ctx.fillStyle = 'rgba(0,255,200,0.08)';
		for (let x = 0; x <= GRID_TILE; x += 64) {
			for (let y = 0; y <= GRID_TILE; y += 64) {
				ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TWO_PI); ctx.fill();
			}
		}
		this.#tile = c;
	}

	draw(ctx, w, h, camX, camY) {
		const ox = (((camX) % GRID_TILE) + GRID_TILE) % GRID_TILE;
		const oy = (((camY) % GRID_TILE) + GRID_TILE) % GRID_TILE;
		const pat = ctx.createPattern(this.#tile, 'repeat');
		ctx.save();
		ctx.translate(-ox, -oy);
		ctx.fillStyle = pat;
		ctx.fillRect(0, 0, w + GRID_TILE, h + GRID_TILE);
		ctx.restore();
	}
}
