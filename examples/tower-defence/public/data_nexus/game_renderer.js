import { SERVER_TICK, TOWER_OPTIONS } from './constants.js';
import { GridField } from './grid_field.js';
import { ParticleSystem } from './particles.js';
import { EntityTracker } from './entity_tracker.js';
import { HUD } from './hud.js';
import { TouchControls } from './touch_controls.js';
import { DeltaStateManager } from './delta_state.js';
import { drawCore, drawPad, drawTower, drawCube, drawEnemy, drawPlayer, drawFirewall, drawHexDeaths } from './renderers.js';


const DEPOSIT_RANGE = 80; // must match server Player::DEPOSIT_RANGE

/**
 * Main game renderer. Owns the canvas, camera interpolation, entity tracking,
 * input handling, and orchestrates all drawing each frame.
 */
export class GameRenderer {
	#element;
	#canvas;
	#ctx;
	#grid;
	#particles;
	#hud;
	#touch;

	#camX = 0; #camY = 0;
	#targetCamX = 0; #targetCamY = 0;
	#initialized = false;
	#lastFrame = 0;
	#state = null;

	#playerTracker = new EntityTracker();
	#enemyTracker = new EntityTracker();
	#cubeTracker = new EntityTracker();



	// Delta-compressed state channels
	#delta = new DeltaStateManager([
		'pads', 'towers', 'firewalls', 'hex_deaths',
		'core', 'enemies', 'players', 'cubes',
	]);

	constructor(element) {
		this.#element = element;
		this.#canvas = document.createElement('canvas');
		this.#canvas.style.cssText = 'position:fixed;inset:0;z-index:0;';
		document.body.prepend(this.#canvas);
		this.#ctx = this.#canvas.getContext('2d');
		this.#grid = new GridField();
		this.#particles = new ParticleSystem();
		this.#hud = new HUD();
		this.#touch = new TouchControls(element);

		this.#resize();
		window.addEventListener('resize', () => this.#resize());
		document.addEventListener('click', (e) => this.#onClick(e));
		document.addEventListener('keydown', (e) => this.#onKeyDown(e));
		document.addEventListener('gametick', (e) => this.#onTick(e.detail));
		requestAnimationFrame(this.#frame.bind(this));
	}

	get isGameOver() {
		const core = this.#delta.channel('core').get('state');
		return core?.game_over === true;
	}

	destroy() {
		this.#canvas?.remove();
	}

	// ── Input ────────────────────────────────────────────────────────────

	#onClick(e) {
		const pad = this.#hud.nearbyEmptyPad;
		if (pad) {
			for (const btn of this.#hud.buildButtons) {
				if (e.clientX >= btn.x && e.clientX <= btn.x + btn.w &&
						e.clientY >= btn.y && e.clientY <= btn.y + btn.h) {
					this.#send('build', { pad: pad.index, type: btn.type });
					return;
				}
			}
		}
		for (const btn of this.#hud.coreButtons) {
			if (e.clientX >= btn.x && e.clientX <= btn.x + btn.w &&
					e.clientY >= btn.y && e.clientY <= btn.y + btn.h) {
				this.#send('core_upgrade', { type: btn.type });
				return;
			}
		}
	}

	#onKeyDown(e) {
		const pad = this.#hud.nearbyEmptyPad;
		if (pad) {
			const opt = TOWER_OPTIONS.find(t => t.key === e.key);
			if (opt) { this.#send('build', { pad: pad.index, type: opt.type }); return; }
		}
		if (this.#hud.nearbyCore && !pad) {
			const coreOpts = ['overclock', 'amplify', 'accelerate', 'fortify'];
			const idx = parseInt(e.key) - 1;
			if (idx >= 0 && idx < coreOpts.length) {
				this.#send('core_upgrade', { type: coreOpts[idx] });
				return;
			}
		}
		if (e.key === 'f' || e.key === 'F' || e.key === '5') {
			this.#send('firewall', {});
			return;
		}
		if (e.key === '0') {
			const tower = this.#hud.nearbyTower;
			if (tower && !tower.upgrading) {
				this.#send('sell', { pad: tower.pad });
			}
		}
	}

	#send(type, detail) {
		window.live.forward(this.#element.id, { type, detail });
	}

	// ── Resize ───────────────────────────────────────────────────────────

	#resize() {
		const dpr = window.devicePixelRatio || 1;
		const w = window.innerWidth;
		const h = window.innerHeight;
		this.#canvas.width = w * dpr;
		this.#canvas.height = h * dpr;
		this.#canvas.style.width = w + 'px';
		this.#canvas.style.height = h + 'px';
		this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	// ── Server tick ──────────────────────────────────────────────────────

	#onTick(detail) {
		if (!this.#initialized) {
			this.#camX = detail.camX;
			this.#camY = detail.camY;
			this.#initialized = true;
		}
		this.#targetCamX = detail.camX;
		this.#targetCamY = detail.camY;

		// Apply delta-compressed channel updates
		this.#delta.apply(detail);

		// Feed interpolation trackers from delta state
		const players = this.#delta.channel('players').toObject();
		const playerList = Object.entries(players).map(([id, p]) => ({...p, id}));
		this.#playerTracker.update(playerList, 'id');
		this.#enemyTracker.update(this.#delta.channel('enemies').toArray(), 'id');
		this.#cubeTracker.update(this.#delta.channel('cubes').toArray(), 'id');

		if (detail.projectiles) {
			for (const proj of detail.projectiles) {
				this.#particles.emit(proj.to_x, proj.to_y, proj.color, 4);
				if (proj.killed) this.#particles.emit(proj.to_x, proj.to_y, '#ffffff', 12);
			}
		}

		this.#state = detail;
		this.#updateProximity();
		this.#touch.onTick(players);
	}

	#updateProximity() {
		const myId = this.#element.id;
		const players = this.#delta.channel('players').toObject();
		const me = players[myId];
		if (!me) {
			this.#hud.nearbyEmptyPad = null;
			this.#hud.nearbyTower = null;
			this.#hud.nearbyCore = false;
			return;
		}

		// Nearby empty pad
		let nearPad = null, nearPadDist = Infinity;
		for (const pad of this.#delta.channel('pads').values()) {
			if (pad.has_tower) continue;
			const d = Math.hypot(me.x - pad.x, me.y - pad.y);
			if (d < DEPOSIT_RANGE && d < nearPadDist) { nearPad = pad; nearPadDist = d; }
		}
		this.#hud.nearbyEmptyPad = nearPad;

		// Nearby tower
		let nearTower = null, nearTowerDist = Infinity;
		for (const tower of this.#delta.channel('towers').values()) {
			const d = Math.hypot(me.x - tower.x, me.y - tower.y);
			if (d < DEPOSIT_RANGE && d < nearTowerDist) { nearTower = tower; nearTowerDist = d; }
		}
		this.#hud.nearbyTower = nearTower;

		// Nearby core
		this.#hud.nearbyCore = Math.hypot(me.x, me.y) < DEPOSIT_RANGE;
	}

	// ── Render loop ──────────────────────────────────────────────────────

	#frame(ts) {
		if (this.#lastFrame === 0) this.#lastFrame = ts;
		const dt = Math.min(ts - this.#lastFrame, 100) / 1000;
		this.#lastFrame = ts;

		if (this.#initialized) {
			const factor = 1 - Math.pow(0.2, dt / (SERVER_TICK / 1000));
			this.#camX += (this.#targetCamX - this.#camX) * factor;
			this.#camY += (this.#targetCamY - this.#camY) * factor;
		}

		this.#particles.update(dt);
		this.#draw(ts / 1000);
		requestAnimationFrame(this.#frame.bind(this));
	}

	#draw(time) {
		const ctx = this.#ctx;
		const dpr = window.devicePixelRatio || 1;
		const w = this.#canvas.width / dpr;
		const h = this.#canvas.height / dpr;
		const cx = w / 2;
		const cy = h / 2;
		const camX = this.#camX;
		const camY = this.#camY;

		this.#grid.draw(ctx, w, h, camX, camY);

		if (!this.#state) return;
		const state = this.#state;
		const myId = this.#element.id;
		const d = this.#delta; // shorthand for channel access

		// Core state (for drawCore and HUD)
		const coreState = d.channel('core').get('state') || {};

		// Hex death heatmap
		for (const hd of d.channel('hex_deaths').values()) {
			const sx = cx + hd.x - camX;
			const sy = cy + hd.y - camY;
			if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
			drawHexDeaths(ctx, sx, sy, hd.deaths);
		}

		// Data Core
		drawCore(ctx, cx - camX, cy - camY, coreState, time);

		// Tower pads
		for (const pad of d.channel('pads').values()) {
			const sx = cx + pad.x - camX;
			const sy = cy + pad.y - camY;
			if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
			drawPad(ctx, sx, sy, pad, this.#hud.nearbyEmptyPad?.index === pad.index, time);
		}

		// Towers
		const myPlayer = d.channel('players').get(myId);
		const myInv = myPlayer?.inventory || {};
		for (const tower of d.channel('towers').values()) {
			const sx = cx + tower.x - camX;
			const sy = cy + tower.y - camY;
			if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
			const isNearby = this.#hud.nearbyTower?.pad === tower.pad;
			let canAfford = false;
			if (tower.can_upgrade && tower.upgrade_cost && !tower.upgrading) {
				canAfford = Object.entries(tower.upgrade_cost).every(([k, v]) => (myInv[k] || 0) >= v);
			}
			drawTower(ctx, sx, sy, tower, isNearby, canAfford, coreState, time);
		}

		// Firewalls
		for (const fw of d.channel('firewalls').values()) {
			const sx = cx + fw.x - camX;
			const sy = cy + fw.y - camY;
			if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) continue;
			drawFirewall(ctx, sx, sy, fw, time);
		}

		// Projectiles (always sent in full, not delta-compressed)
		for (const proj of (state.projectiles || [])) {
			ctx.strokeStyle = proj.color;
			ctx.lineWidth = 2;
			ctx.globalAlpha = 0.7;
			ctx.beginPath();
			ctx.moveTo(cx + proj.from_x - camX, cy + proj.from_y - camY);
			ctx.lineTo(cx + proj.to_x - camX, cy + proj.to_y - camY);
			ctx.stroke();
			ctx.globalAlpha = 1;
		}

		// Cubes (interpolated)
		this.#cubeTracker.forEach((id, ix, iy, _angle, cube) => {
			const sx = cx + ix - camX;
			const sy = cy + iy - camY;
			if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) return;
			drawCube(ctx, sx, sy, cube, time);
		});

		// Enemies (interpolated)
		this.#enemyTracker.forEach((id, ix, iy, _angle, enemy) => {
			const sx = cx + ix - camX;
			const sy = cy + iy - camY;
			if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) return;
			drawEnemy(ctx, sx, sy, enemy, time);
		});

		// Players (interpolated position + angle)
		this.#playerTracker.forEach((id, ix, iy, angle, player) => {
			const sx = cx + ix - camX;
			const sy = cy + iy - camY;
			if (sx < -30 || sx > w + 30 || sy < -30 || sy > h + 30) return;
			drawPlayer(ctx, sx, sy, player, id === myId, angle, time);
		});

		// Particles
		this.#particles.draw(ctx, camX, camY, cx, cy);

		// HUD — merge core state + player data for the HUD
		const hudState = {
			...coreState,
			players: d.channel('players').toObject(),
			enemies: d.channel('enemies').toArray(),
		};
		this.#hud.draw(ctx, w, h, hudState, myId);
	}
}
