import { TOWER_OPTIONS, CORE_UPGRADE_OPTIONS } from './constants.js';

/**
 * Renders all HUD elements: top bar stats, inventory, build/core upgrade panels,
 * and game over overlay. Manages screen-space button hit regions for click handling.
 */
export class HUD {
	#nearbyEmptyPad = null;
	#nearbyTower = null;
	#nearbyCore = false;
	#buildButtons = [];
	#coreButtons = [];

	get nearbyEmptyPad() { return this.#nearbyEmptyPad; }
	set nearbyEmptyPad(v) { this.#nearbyEmptyPad = v; }
	get nearbyTower() { return this.#nearbyTower; }
	set nearbyTower(v) { this.#nearbyTower = v; }
	get nearbyCore() { return this.#nearbyCore; }
	set nearbyCore(v) { this.#nearbyCore = v; }
	get buildButtons() { return this.#buildButtons; }
	get coreButtons() { return this.#coreButtons; }

	draw(ctx, w, h, state, myId) {
		if (!state) return;
		const me = state.players?.[myId];

		this.#drawTopBar(ctx, w, state);
		this.#drawInventory(ctx, w, h, me);

		if (state.game_over) {
			this.#drawGameOver(ctx, w, h, state);
		}

		if (this.#nearbyEmptyPad && !state.game_over) {
			this.#drawBuildPanel(ctx, w, h, me);
		} else {
			this.#buildButtons = [];
		}

		if (this.#nearbyCore && !state.game_over) {
			this.#drawCorePanel(ctx, w, h, me, state);
		} else {
			this.#coreButtons = [];
		}
	}

	#drawTopBar(ctx, w, state) {
		ctx.fillStyle = 'rgba(0,10,20,0.85)';
		ctx.fillRect(0, 0, w, 44);
		ctx.strokeStyle = 'rgba(0,255,200,0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(0, 44); ctx.lineTo(w, 44); ctx.stroke();

		ctx.font = '13px "Courier New", monospace';
		ctx.textBaseline = 'middle';
		const y = 22;
		let x = 16;

		const corePercent = state.core_hp / state.max_core_hp;
		const coreColor = corePercent > 0.5 ? '#00ffcc' : corePercent > 0.25 ? '#ffaa00' : '#ff3333';
		ctx.fillStyle = coreColor;
		ctx.fillText(`◆ CORE: ${state.core_hp}/${state.max_core_hp}`, x, y);
		x += 200;

		ctx.fillStyle = '#00ccff';
		ctx.fillText(`WAVE: ${state.wave}`, x, y);
		x += 100;

		if (state.wave_timer > 0 && state.wave === 0) {
			ctx.fillStyle = '#ffdd00';
			ctx.fillText(`NEXT WAVE: ${state.wave_timer.toFixed(0)}s`, x, y);
		} else if (state.wave_timer > 0) {
			ctx.fillStyle = '#888';
			ctx.fillText(`NEXT: ${state.wave_timer.toFixed(0)}s`, x, y);
		}
		x += 150;

		ctx.fillStyle = '#ff6644';
		ctx.fillText(`THREATS: ${state.enemies?.length || 0}`, x, y);
		x += 130;

		ctx.fillStyle = '#aaaaaa';
		const playerCount = Object.keys(state.players || {}).length;
		ctx.fillText(`RUNNERS: ${playerCount}`, x, y);
		x += 120;

		const buffs = state.core_buffs || {};
		const buffParts = [];
		if (buffs.overclock > 0) buffParts.push(`⚡${buffs.overclock}`);
		if (buffs.amplify > 0) buffParts.push(`🗲${buffs.amplify}`);
		if (buffs.accelerate > 0) buffParts.push(`»${buffs.accelerate}`);
		if (buffs.fortify > 0) buffParts.push(`🛡${buffs.fortify}`);
		if (buffParts.length > 0) {
			ctx.fillStyle = '#ffd700';
			ctx.fillText(buffParts.join(' '), x, y);
		}
	}

	#drawInventory(ctx, w, h, me) {
		if (!me) return;
		const inv    = me.inventory    || {};
		const limits = me.carry_limits || {};

		// Proportional slot widths — fixed relative to type frequency, not
		// level-dependent, so the layout never shifts as the player levels up.
		const cubeTypes = [
			{key: 'core',    color: '#00ffcc', label: 'CORE',  weight: 6},
			{key: 'cipher',  color: '#ff00ff', label: 'CIPH',  weight: 4},
			{key: 'quantum', color: '#00ccff', label: 'QBIT',  weight: 3},
			{key: 'void',    color: '#ff3333', label: 'VOID',  weight: 2},
			{key: 'nexus',   color: '#ffd700', label: 'NXS',   weight: 1.5},
			{key: 'prism',   color: '#dd88ff', label: 'PRM',   weight: 1},
		];
		const totalWeight = cubeTypes.reduce((s, ct) => s + ct.weight, 0);

		const panelW  = 560;
		const slotH   = 46;
		const headerH = 18;
		const panelH  = headerH + slotH;
		const panelY  = h - panelH;

		// Panel background + top border
		ctx.fillStyle = 'rgba(0,10,20,0.85)';
		ctx.fillRect(0, panelY, panelW, panelH);
		ctx.strokeStyle = 'rgba(0,255,200,0.3)';
		ctx.lineWidth = 1;
		ctx.beginPath(); ctx.moveTo(0, panelY); ctx.lineTo(panelW, panelY); ctx.stroke();

		// Header line
		ctx.font = '11px "Courier New", monospace';
		ctx.fillStyle = '#888';
		ctx.textBaseline = 'middle';
		ctx.fillText(`INVENTORY  LVL ${me.level}  [F] FIREWALL core:3`, 8, panelY + headerH / 2);

		// Per-type slots
		let x = 0;
		const slotY = panelY + headerH;
		const barH  = 4;

		for (const ct of cubeTypes) {
			const slotW = Math.round(panelW * ct.weight / totalWeight);
			const count = inv[ct.key]    || 0;
			const limit = limits[ct.key] || 0;
			const fill  = limit > 0 ? count / limit : 0;
			const empty = count === 0;

			// Slot tint
			ctx.fillStyle = empty ? 'rgba(255,255,255,0.02)' : ct.color + '15';
			ctx.fillRect(x, slotY, slotW, slotH);

			// Label
			ctx.font = '9px "Courier New", monospace';
			ctx.textBaseline = 'top';
			ctx.fillStyle = empty ? 'rgba(255,255,255,0.25)' : ct.color + 'aa';
			ctx.fillText(ct.label, x + 4, slotY + 3);

			// Count (omit limit text on the two narrowest slots)
			ctx.font = '13px "Courier New", monospace';
			ctx.fillStyle = empty ? 'rgba(255,255,255,0.18)' : ct.color;
			const countText = slotW > 46 ? `${count}/${limit}` : `${count}`;
			ctx.fillText(countText, x + 4, slotY + 14);

			// Fill bar
			const barY = slotY + slotH - barH;
			ctx.fillStyle = 'rgba(255,255,255,0.06)';
			ctx.fillRect(x, barY, slotW, barH);
			if (fill > 0) {
				ctx.fillStyle = ct.color;
				ctx.fillRect(x, barY, Math.round(slotW * fill), barH);
			}

			// Slot divider
			ctx.strokeStyle = 'rgba(0,255,200,0.12)';
			ctx.beginPath();
			ctx.moveTo(x + slotW, slotY);
			ctx.lineTo(x + slotW, slotY + slotH);
			ctx.stroke();

			x += slotW;
		}
	}

	#drawGameOver(ctx, w, h, state) {
		ctx.fillStyle = 'rgba(0,0,0,0.7)';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = '#ff3333';
		ctx.font = 'bold 48px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText('DATA CORE BREACHED', w/2, h/2 - 30);
		ctx.fillStyle = '#00ffcc';
		ctx.font = '20px "Courier New", monospace';
		ctx.fillText(`Survived ${state.wave} waves`, w/2, h/2 + 20);
		ctx.fillStyle = '#888';
		ctx.font = '14px "Courier New", monospace';
		ctx.fillText('Press R to restart', w/2, h/2 + 60);
		ctx.textAlign = 'left';
	}

	#drawBuildPanel(ctx, w, h, me) {
		const inv = me?.inventory || {};
		const panelW = 220;
		const panelH = TOWER_OPTIONS.length * 36 + 32;
		const panelX = w - panelW - 16;
		const panelY = 56;

		ctx.fillStyle = 'rgba(0,10,25,0.92)';
		ctx.strokeStyle = 'rgba(0,255,200,0.4)';
		ctx.lineWidth = 1;
		ctx.fillRect(panelX, panelY, panelW, panelH);
		ctx.strokeRect(panelX, panelY, panelW, panelH);

		ctx.font = '11px "Courier New", monospace';
		ctx.fillStyle = '#00ffcc';
		ctx.textBaseline = 'middle';
		ctx.fillText('BUILD TOWER [1-4]', panelX + 10, panelY + 14);

		this.#buildButtons = [];
		TOWER_OPTIONS.forEach((t, i) => {
			const by = panelY + 28 + i * 36;
			const bx = panelX + 6;
			const bw = panelW - 12;
			const bh = 32;
			const canAfford = Object.entries(t.cost).every(([k, v]) => (inv[k] || 0) >= v);

			ctx.fillStyle = canAfford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
			ctx.fillRect(bx, by, bw, bh);
			ctx.strokeStyle = canAfford ? t.color + '88' : 'rgba(255,255,255,0.1)';
			ctx.lineWidth = 1;
			ctx.strokeRect(bx, by, bw, bh);

			ctx.fillStyle = canAfford ? '#ffdd00' : '#444';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.fillText(t.key, bx + 8, by + 12);

			ctx.fillStyle = canAfford ? t.color : '#555';
			ctx.font = '11px "Courier New", monospace';
			ctx.fillText(t.label, bx + 26, by + 12);

			ctx.fillStyle = canAfford ? '#888' : '#444';
			ctx.font = '9px "Courier New", monospace';
			ctx.fillText(Object.entries(t.cost).map(([k, v]) => `${k}:${v}`).join(' '), bx + 26, by + 24);

			if (canAfford) {
				this.#buildButtons.push({x: bx, y: by, w: bw, h: bh, type: t.type});
			}
		});
		ctx.textBaseline = 'alphabetic';
	}

	#drawCorePanel(ctx, w, h, me, state) {
		const inv = me?.inventory || {};
		const buffs = state.core_buffs || {};
		const nexusCount = inv['nexus'] || 0;

		const panelW = 240;
		const panelH = CORE_UPGRADE_OPTIONS.length * 40 + 36;
		const panelX = w - panelW - 16;
		const panelY = 56;

		ctx.fillStyle = 'rgba(0,10,25,0.92)';
		ctx.strokeStyle = 'rgba(255,215,0,0.5)';
		ctx.lineWidth = 1;
		ctx.fillRect(panelX, panelY, panelW, panelH);
		ctx.strokeRect(panelX, panelY, panelW, panelH);

		ctx.font = '11px "Courier New", monospace';
		ctx.fillStyle = '#ffd700';
		ctx.textBaseline = 'middle';
		ctx.fillText(`CORE UPGRADES [${nexusCount} nexus]`, panelX + 10, panelY + 14);

		this.#coreButtons = [];
		CORE_UPGRADE_OPTIONS.forEach((opt, i) => {
			const by = panelY + 30 + i * 40;
			const bx = panelX + 6;
			const bw = panelW - 12;
			const bh = 36;
			const level = buffs[opt.type] || 0;
			const canAfford = nexusCount >= 1;

			ctx.fillStyle = canAfford ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
			ctx.fillRect(bx, by, bw, bh);
			ctx.strokeStyle = canAfford ? opt.color + '88' : 'rgba(255,255,255,0.1)';
			ctx.lineWidth = 1;
			ctx.strokeRect(bx, by, bw, bh);

			ctx.fillStyle = canAfford ? '#ffd700' : '#444';
			ctx.font = 'bold 13px "Courier New", monospace';
			ctx.fillText(opt.key, bx + 8, by + 12);

			ctx.fillStyle = canAfford ? opt.color : '#555';
			ctx.font = '11px "Courier New", monospace';
			ctx.fillText(`${opt.label}${level > 0 ? ' x' + level : ''}`, bx + 26, by + 12);

			ctx.fillStyle = canAfford ? '#888' : '#444';
			ctx.font = '9px "Courier New", monospace';
			ctx.fillText(`${opt.desc}  [nexus:1]`, bx + 26, by + 26);

			if (canAfford) {
				this.#coreButtons.push({x: bx, y: by, w: bw, h: bh, type: opt.type});
			}
		});
		ctx.textBaseline = 'alphabetic';
	}
}
