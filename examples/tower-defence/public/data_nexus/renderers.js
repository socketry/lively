import { TWO_PI, hexCorners, HEX_SIZE } from './constants.js';

/**
 * Individual entity rendering functions. Each takes a canvas context,
 * screen-space position, entity data, and optional flags.
 */

export function drawCore(ctx, sx, sy, state, time) {
	
	const pulse = 0.8 + Math.sin(time * 2) * 0.2;
	const hpRatio = state.core_hp / state.max_core_hp;
	const coreColor = hpRatio > 0.5 ? '#00ffcc' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';

	const grad = ctx.createRadialGradient(sx, sy, 10, sx, sy, 50 * pulse);
	grad.addColorStop(0, coreColor + '44');
	grad.addColorStop(1, 'transparent');
	ctx.fillStyle = grad;
	ctx.beginPath(); ctx.arc(sx, sy, 50 * pulse, 0, TWO_PI); ctx.fill();

	ctx.save();
	ctx.translate(sx, sy);
	ctx.rotate(time * 0.5);
	ctx.beginPath();
	for (let i = 0; i < 6; i++) {
		const a = i * Math.PI / 3;
		const r = 22;
		if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
		else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	ctx.closePath();
	ctx.fillStyle = '#050a14';
	ctx.fill();
	ctx.strokeStyle = coreColor;
	ctx.lineWidth = 2;
	ctx.stroke();
	ctx.restore();

	ctx.save();
	ctx.translate(sx, sy);
	ctx.rotate(-time * 0.8);
	ctx.beginPath();
	ctx.moveTo(0, -10); ctx.lineTo(10, 0); ctx.lineTo(0, 10); ctx.lineTo(-10, 0);
	ctx.closePath();
	ctx.fillStyle = coreColor;
	ctx.globalAlpha = 0.6;
	ctx.fill();
	ctx.globalAlpha = 1;
	ctx.restore();

	ctx.font = '9px "Courier New", monospace';
	ctx.fillStyle = coreColor;
	ctx.textAlign = 'center';
	ctx.fillText('DATA CORE', sx, sy + 38);
	ctx.textAlign = 'left';
}

export function drawPad(ctx, sx, sy, pad, isNearby = false, time = 0) {
	const baseColor = pad.ring === 'inner' ? 'rgba(0,255,200,' :
		pad.ring === 'outer' ? 'rgba(0,200,255,' : 'rgba(255,0,255,';
	const size = 20;

	if (pad.has_tower) return;

	if (isNearby) {
		
		const pulse = 0.3 + Math.sin(time * 4) * 0.15;
		ctx.fillStyle = baseColor + pulse + ')';
		ctx.beginPath();
		ctx.arc(sx, sy, size + 8, 0, TWO_PI);
		ctx.fill();
	}

	ctx.save();
	ctx.translate(sx, sy);
	ctx.setLineDash(isNearby ? [] : [4, 4]);
	ctx.strokeStyle = baseColor + (isNearby ? '0.7)' : '0.25)');
	ctx.lineWidth = isNearby ? 2.5 : 1.5;
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = i * Math.PI / 4 + Math.PI / 8;
		const px = Math.cos(a) * size;
		const py = Math.sin(a) * size;
		if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
	}
	ctx.closePath();
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.restore();

	ctx.fillStyle = baseColor + (isNearby ? '0.9)' : '0.25)');
	ctx.font = (isNearby ? 'bold 20px' : '16px') + ' "Courier New", monospace';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('+', sx, sy);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
}

export function drawTower(ctx, sx, sy, tower, isNearby = false, canAffordUpgrade = false, gameState = null, time = 0) {
	

	// Range indicator
	ctx.beginPath();
	ctx.arc(sx, sy, tower.range, 0, TWO_PI);
	ctx.strokeStyle = tower.color + (isNearby ? '30' : '15');
	ctx.lineWidth = isNearby ? 1.5 : 1;
	ctx.stroke();

	// Affordable upgrade glow
	if (canAffordUpgrade && !isNearby) {
		const pulse = 0.2 + Math.sin(time * 2) * 0.1;
		ctx.strokeStyle = '#00ffcc';
		ctx.globalAlpha = pulse;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(sx, sy, 22 + tower.level * 3, 0, TWO_PI);
		ctx.stroke();
		ctx.globalAlpha = 1;
	}

	// Highlight glow when nearby
	if (isNearby) {
		const pulse = 0.12 + Math.sin(time * 3) * 0.06;
		ctx.fillStyle = tower.color;
		ctx.globalAlpha = pulse;
		ctx.beginPath();
		ctx.arc(sx, sy, 30 + tower.level * 3, 0, TWO_PI);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Upgrade progress ring
	if (tower.upgrading) {
		const effectiveTime = tower.upgrade_time || 2.5;
		const progress = Math.min((tower.upgrade_progress || 0) / effectiveTime, 1);
		const ringRadius = 26 + tower.level * 3;
		ctx.beginPath();
		ctx.arc(sx, sy, ringRadius, 0, TWO_PI);
		ctx.strokeStyle = 'rgba(255,255,255,0.1)';
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(sx, sy, ringRadius, -Math.PI / 2, -Math.PI / 2 + TWO_PI * progress);
		ctx.strokeStyle = '#ffdd00';
		ctx.lineWidth = 4;
		ctx.stroke();
		ctx.globalAlpha = 0.15 + Math.sin(time * 6) * 0.1;
		ctx.fillStyle = '#ffdd00';
		ctx.beginPath();
		ctx.arc(sx, sy, ringRadius + 5, 0, TWO_PI);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// Tower body
	ctx.save();
	ctx.translate(sx, sy);
	ctx.rotate(tower.upgrading ? time * 1.5 : time * 0.3);

	const size = 14 + tower.level * 3;
	const sides = tower.type === 'pulse' ? 3 : tower.type === 'thermal' ? 4 :
		tower.type === 'crypto' ? 5 : 6;
	ctx.beginPath();
	for (let i = 0; i < sides; i++) {
		const a = i * TWO_PI / sides - Math.PI / 2;
		if (i === 0) ctx.moveTo(Math.cos(a) * size, Math.sin(a) * size);
		else ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
	}
	ctx.closePath();
	ctx.fillStyle = '#0a0f1a';
	ctx.fill();
	ctx.strokeStyle = tower.upgrading ? '#ffdd00' : (isNearby ? '#ffffff' : tower.color);
	ctx.lineWidth = isNearby ? 3 : 2;
	ctx.stroke();

	for (let i = 0; i < tower.level; i++) {
		const a = i * TWO_PI / 3;
		ctx.beginPath();
		ctx.arc(Math.cos(a) * 6, Math.sin(a) * 6, 2, 0, TWO_PI);
		ctx.fillStyle = tower.color;
		ctx.fill();
	}
	ctx.restore();

	// Label
	ctx.font = (isNearby ? '10px' : '8px') + ' "Courier New", monospace';
	ctx.fillStyle = isNearby ? '#ffffff' : tower.color;
	ctx.textAlign = 'center';
	ctx.fillText(tower.type.toUpperCase() + ` L${tower.level}`, sx, sy + size + 10);

	if (isNearby) {
		let infoY = sy + size + 22;
		ctx.font = '8px "Courier New", monospace';

		ctx.fillStyle = '#888';
		ctx.fillText(`DMG:${tower.damage} RNG:${tower.range} ${tower.damage_type.toUpperCase()}`, sx, infoY);
		infoY += 11;

		if (tower.upgrading) {
			ctx.fillStyle = '#ffdd00';
			const effectiveTime = tower.upgrade_time || 2.5;
			const pct = Math.round(Math.min((tower.upgrade_progress || 0) / effectiveTime, 1) * 100);
			ctx.fillText(`UPGRADING... ${pct}%`, sx, infoY);
		} else if (tower.can_upgrade && tower.upgrade_cost) {
			ctx.fillStyle = '#00ffcc';
			ctx.fillText('\u25B2 ' + Object.entries(tower.upgrade_cost).map(([k, v]) => `${k}:${v}`).join(' '), sx, infoY);
		} else {
			ctx.fillStyle = '#ffdd00';
			ctx.fillText('\u2605 MAX LEVEL', sx, infoY);
		}
		infoY += 12;

		if (!tower.upgrading && tower.sell_value) {
			ctx.fillStyle = '#ff4444';
			const sellParts = Object.entries(tower.sell_value).filter(([, v]) => v > 0).map(([k, v]) => `${k}:${v}`);
			ctx.fillText(`[0] SELL \u2192 ${sellParts.join(' ')}`, sx, infoY);
		}
	} else if (!tower.upgrading && tower.can_upgrade && tower.upgrade_cost) {
		ctx.font = '7px "Courier New", monospace';
		ctx.fillStyle = 'rgba(255,255,255,0.2)';
		ctx.fillText('\u25B2 ' + Object.entries(tower.upgrade_cost).map(([k, v]) => `${k}:${v}`).join(' '), sx, sy + size + 20);
	}

	ctx.textAlign = 'left';
}

export function drawCube(ctx, sx, sy, cube, time = 0) {
	
	const bob = Math.sin(time * 3 + sx * 0.1) * 3;

	ctx.globalAlpha = 0.3;
	ctx.fillStyle = cube.color;
	ctx.beginPath();
	ctx.arc(sx, sy + bob, 10, 0, TWO_PI);
	ctx.fill();
	ctx.globalAlpha = 1;

	ctx.save();
	ctx.translate(sx, sy + bob);
	ctx.rotate(time * 2);
	ctx.beginPath();
	ctx.moveTo(0, -7); ctx.lineTo(7, 0); ctx.lineTo(0, 7); ctx.lineTo(-7, 0);
	ctx.closePath();
	ctx.fillStyle = cube.color;
	ctx.fill();
	ctx.strokeStyle = '#ffffff44';
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();

	if (cube.count > 1) {
		ctx.font = '9px "Courier New", monospace';
		ctx.fillStyle = '#fff';
		ctx.textAlign = 'center';
		ctx.fillText(`×${cube.count}`, sx, sy + bob + 16);
		ctx.textAlign = 'left';
	}
}

export function drawEnemy(ctx, sx, sy, enemy, time = 0) {
	const size = enemy.size;
	const isArchitect = enemy.type === 'architect';

	// Threat glow
	ctx.globalAlpha = isArchitect ? 0.35 : 0.2;
	ctx.fillStyle = enemy.color;
	ctx.beginPath();
	ctx.arc(sx, sy, size + (isArchitect ? 15 : 6), 0, TWO_PI);
	ctx.fill();
	ctx.globalAlpha = 1;

	if (isArchitect) {
		for (let ring = 0; ring < 3; ring++) {
			ctx.save();
			ctx.translate(sx, sy);
			ctx.rotate(time * (0.5 + ring * 0.3) * (ring % 2 === 0 ? 1 : -1));
			const r = size - ring * 6;
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = i * Math.PI / 3;
				if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
				else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			ctx.closePath();
			if (ring === 0) { ctx.fillStyle = '#0a0a0a'; ctx.fill(); }
			ctx.strokeStyle = '#ffd700';
			ctx.globalAlpha = 0.9 - ring * 0.25;
			ctx.lineWidth = 2.5 - ring * 0.5;
			ctx.stroke();
			ctx.globalAlpha = 1;
			ctx.restore();
		}
		const pulse = 4 + Math.sin(time * 4) * 2;
		ctx.fillStyle = '#ffd700';
		ctx.globalAlpha = 0.8;
		ctx.beginPath();
		ctx.arc(sx, sy, pulse, 0, TWO_PI);
		ctx.fill();
		ctx.globalAlpha = 1;

		ctx.font = 'bold 9px "Courier New", monospace';
		ctx.fillStyle = '#ffd700';
		ctx.textAlign = 'center';
		ctx.fillText('ARCHITECT', sx, sy + size + 12);
		ctx.textAlign = 'left';
	} else {
		// Regular enemy: spiky rotating star
		ctx.save();
		ctx.translate(sx, sy);
		ctx.rotate(time * 1.5);
		ctx.beginPath();
		for (let i = 0; i < 8; i++) {
			const a = i * Math.PI / 4;
			const r = i % 2 === 0 ? size : size * 0.6;
			if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
			else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fillStyle = enemy.color + 'aa';
		ctx.fill();
		ctx.strokeStyle = enemy.color;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		ctx.restore();
	}

	// Health bar
	if (enemy.hp < enemy.max_hp) {
		const barW = size * 2;
		const barH = 3;
		const bx = sx - barW / 2;
		const by = sy - size - 8;
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillRect(bx, by, barW, barH);
		const hpRatio = enemy.hp / enemy.max_hp;
		ctx.fillStyle = hpRatio > 0.5 ? '#00ff88' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
		ctx.fillRect(bx, by, barW * hpRatio, barH);
	}
}

export function drawFirewall(ctx, sx, sy, fw, time = 0) {
	
	const hpRatio = fw.hp / fw.max_hp;

	// Hex outline
	const corners = hexCorners(sx, sy, HEX_SIZE * 0.9);
	ctx.beginPath();
	corners.forEach(([cx, cy], i) => i === 0 ? ctx.moveTo(cx, cy) : ctx.lineTo(cx, cy));
	ctx.closePath();

	// Fill with translucent magenta
	const pulse = 0.15 + Math.sin(time * 3) * 0.05;
	ctx.fillStyle = `rgba(255,0,255,${pulse})`;
	ctx.fill();

	// Border — color shifts from magenta to red as HP drops
	const borderColor = hpRatio > 0.5 ? '#ff00ff' : hpRatio > 0.25 ? '#ff6644' : '#ff3333';
	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 2;
	ctx.stroke();

	// Center icon — shield/firewall symbol
	ctx.save();
	ctx.translate(sx, sy);
	ctx.rotate(time * 0.5);
	ctx.strokeStyle = borderColor;
	ctx.lineWidth = 1.5;
	ctx.globalAlpha = 0.7;
	ctx.beginPath();
	for (let i = 0; i < 4; i++) {
		const a = i * Math.PI / 2;
		ctx.moveTo(0, 0);
		ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
	}
	ctx.stroke();
	ctx.globalAlpha = 1;
	ctx.restore();

	// HP bar
	if (hpRatio < 1) {
		const barW = 24;
		const barH = 3;
		ctx.fillStyle = 'rgba(0,0,0,0.6)';
		ctx.fillRect(sx - barW/2, sy - 20, barW, barH);
		ctx.fillStyle = borderColor;
		ctx.fillRect(sx - barW/2, sy - 20, barW * hpRatio, barH);
	}

	// Label
	ctx.font = '7px "Courier New", monospace';
	ctx.fillStyle = borderColor;
	ctx.textAlign = 'center';
	ctx.fillText('FIREWALL', sx, sy + 22);
	ctx.textAlign = 'left';
}

// Pre-compute hex death corner offsets
const DEATH_HEX_CORNERS = [];
for (let i = 0; i < 6; i++) {
	const angle = Math.PI / 180 * (60 * i - 30);
	DEATH_HEX_CORNERS.push([HEX_SIZE * 0.92 * Math.cos(angle), HEX_SIZE * 0.92 * Math.sin(angle)]);
}

export function drawHexDeaths(ctx, sx, sy, deaths) {
	const intensity = Math.min(deaths / 10, 1.0);
	if (intensity < 0.02) return;

	ctx.beginPath();
	ctx.moveTo(sx + DEATH_HEX_CORNERS[0][0], sy + DEATH_HEX_CORNERS[0][1]);
	for (let i = 1; i < 6; i++) {
		ctx.lineTo(sx + DEATH_HEX_CORNERS[i][0], sy + DEATH_HEX_CORNERS[i][1]);
	}
	ctx.closePath();

	const r = Math.round(255 - intensity * 80);
	const g = Math.round(60 - intensity * 50);
	ctx.fillStyle = `rgba(${r},${g},10,${0.08 + intensity * 0.25})`;
	ctx.fill();

	if (intensity > 0.3) {
		ctx.strokeStyle = `rgba(255,60,20,${intensity * 0.4})`;
		ctx.lineWidth = 1;
		ctx.stroke();
	}
}

export function drawPlayer(ctx, sx, sy, player, isMe, interpolatedAngle = null, time = 0) {
	
	const size = isMe ? 14 : 11;
	const angle = interpolatedAngle ?? player.angle;

	if (isMe) {
		ctx.strokeStyle = player.color + '33';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(sx, sy, 25 + Math.sin(time * 2) * 3, 0, TWO_PI);
		ctx.stroke();
	}

	ctx.save();
	ctx.translate(sx, sy);
	ctx.rotate((angle - 90) * Math.PI / 180 + Math.PI / 2);
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.lineTo(-size * 0.7, size * 0.6);
	ctx.lineTo(size * 0.7, size * 0.6);
	ctx.closePath();
	ctx.fillStyle = isMe ? player.color : player.color + '88';
	ctx.fill();
	ctx.strokeStyle = '#ffffff44';
	ctx.lineWidth = 1;
	ctx.stroke();
	ctx.restore();

	ctx.font = '10px "Courier New", monospace';
	ctx.fillStyle = player.color + (isMe ? '' : '88');
	ctx.textAlign = 'center';
	ctx.fillText(player.name, sx, sy + size + 14);

	if (player.carrying > 0) {
		ctx.font = '8px "Courier New", monospace';
		ctx.fillStyle = '#ffdd00';
		ctx.fillText(`[${player.carrying}]`, sx, sy + size + 24);
	}

	ctx.textAlign = 'left';
}
