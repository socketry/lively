import { TWO_PI } from './constants.js';

class Particle {
	constructor(x, y, vx, vy, color, life, size) {
		this.x = x; this.y = y; this.vx = vx; this.vy = vy;
		this.color = color; this.life = life; this.maxLife = life; this.size = size;
	}
}

export class ParticleSystem {
	#particles = [];

	emit(x, y, color, count = 5) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * TWO_PI;
			const speed = 30 + Math.random() * 80;
			this.#particles.push(new Particle(
				x, y,
				Math.cos(angle) * speed, Math.sin(angle) * speed,
				color, 0.4 + Math.random() * 0.4, 2 + Math.random() * 3
			));
		}
	}

	update(dt) {
		for (let i = this.#particles.length - 1; i >= 0; i--) {
			const p = this.#particles[i];
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.life -= dt;
			if (p.life <= 0) this.#particles.splice(i, 1);
		}
	}

	draw(ctx, camX, camY, cx, cy) {
		for (const p of this.#particles) {
			const sx = cx + (p.x - camX);
			const sy = cy + (p.y - camY);
			const alpha = Math.max(0, p.life / p.maxLife);
			ctx.globalAlpha = alpha;
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(sx, sy, p.size * alpha, 0, TWO_PI);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
	}
}
