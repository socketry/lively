import { TWO_PI, HEX_SIZE, SQRT3, hexToWorld } from './constants.js';

// Pre-render a seamlessly tiling hex grid to an offscreen canvas.
// The repeat unit for pointy-top axial hexes is:
//   Width  = sqrt(3) * HEX_SIZE  (one q-step)
//   Height = 3 * HEX_SIZE        (two r-steps)
// Contains 2 hex centers: (0,0) and (0,1) in axial coords.

const TILE_W = SQRT3 * HEX_SIZE;   // ~69.3px
const TILE_H = 3 * HEX_SIZE;       // 120px

// Pre-compute hex corner offsets once
const CORNER_DX = [];
const CORNER_DY = [];
for (let i = 0; i < 6; i++) {
	const angle = Math.PI / 180 * (60 * i - 30);
	CORNER_DX.push(HEX_SIZE * 0.98 * Math.cos(angle));
	CORNER_DY.push(HEX_SIZE * 0.98 * Math.sin(angle));
}

function buildTile() {
	const c = document.createElement('canvas');
	// Use integer pixel size (ceil to avoid sub-pixel gaps at tile seams)
	c.width = Math.ceil(TILE_W);
	c.height = Math.ceil(TILE_H);
	const ctx = c.getContext('2d');

	// Dark background
	ctx.fillStyle = '#050a14';
	ctx.fillRect(0, 0, c.width, c.height);

	// Two hex centers in the tile (axial (0,0) and (0,1)):
	//   (0,0) -> pixel (0, 0)
	//   (0,1) -> pixel (sqrt3/2 * size, 1.5 * size)
	const centers = [
		[0, 0],
		[SQRT3 / 2 * HEX_SIZE, 1.5 * HEX_SIZE],
	];

	// Draw hex outlines — draw at each center and also at wrapped
	// positions so edges that cross tile boundaries are complete.
	ctx.strokeStyle = 'rgba(0,255,200,0.05)';
	ctx.lineWidth = 0.5;
	ctx.beginPath();

	for (const [hx, hy] of centers) {
		// Draw at original and all 8 wrapped positions for edge continuity
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const cx = hx + dx * TILE_W;
				const cy = hy + dy * TILE_H;
				ctx.moveTo(cx + CORNER_DX[0], cy + CORNER_DY[0]);
				for (let i = 1; i < 6; i++) {
					ctx.lineTo(cx + CORNER_DX[i], cy + CORNER_DY[i]);
				}
				ctx.closePath();
			}
		}
	}
	ctx.stroke();

	// Center dots
	ctx.fillStyle = 'rgba(0,255,200,0.08)';
	ctx.beginPath();
	for (const [hx, hy] of centers) {
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const cx = hx + dx * TILE_W;
				const cy = hy + dy * TILE_H;
				ctx.moveTo(cx + 1.2, cy);
				ctx.arc(cx, cy, 1.2, 0, TWO_PI);
			}
		}
	}
	ctx.fill();

	return c;
}

/**
 * Draws the hex grid background using a pre-rendered tiling pattern.
 * The tile aligns with the game's axial hex coordinate system so
 * background lines match tower pads, firewalls, and death heatmap.
 */
export class GridField {
	#tile;
	#pattern = null;

	constructor() {
		this.#tile = buildTile();
	}

	draw(ctx, w, h, camX, camY) {
		// Lazily create pattern (needs a ctx to bind to)
		if (!this.#pattern) {
			this.#pattern = ctx.createPattern(this.#tile, 'repeat');
		}

		// Offset so the pattern aligns with world-space hex (0,0) at camera center
		const ox = ((camX % TILE_W) + TILE_W) % TILE_W;
		const oy = ((camY % TILE_H) + TILE_H) % TILE_H;

		// The hex (0,0) in world space is at pixel (0,0).
		// Screen center = (w/2, h/2) maps to camera position.
		// Pattern origin needs to be at (w/2 - camX, h/2 - camY) in screen space.
		const patternX = w / 2 - ox;
		const patternY = h / 2 - oy;

		ctx.save();
		ctx.translate(patternX, patternY);
		ctx.fillStyle = this.#pattern;
		ctx.fillRect(-patternX, -patternY, w, h);
		ctx.restore();
	}
}
