import { SERVER_TICK } from './constants.js';

/**
 * Stores previous + current server positions and angles for entities
 * and provides smooth interpolation between server ticks for 60fps rendering.
 * Angle interpolation takes the shortest path across the 360° boundary.
 */
export class EntityTracker {
	#entities = new Map();
	#tickTime = 0;

	update(items, idKey = 'id') {
		const seen = new Set();
		for (const item of items) {
			const id = item[idKey];
			seen.add(id);
			const existing = this.#entities.get(id);
			if (existing) {
				existing.prevX = existing.curX;
				existing.prevY = existing.curY;
				existing.prevAngle = existing.curAngle;
				existing.curX = item.x;
				existing.curY = item.y;
				existing.curAngle = item.angle ?? 0;
				existing.data = item;
			} else {
				const angle = item.angle ?? 0;
				this.#entities.set(id, {
					prevX: item.x, prevY: item.y, prevAngle: angle,
					curX: item.x, curY: item.y, curAngle: angle,
					data: item,
				});
			}
		}
		for (const id of this.#entities.keys()) {
			if (!seen.has(id)) this.#entities.delete(id);
		}
		this.#tickTime = performance.now();
	}

	/**
	 * Iterate with interpolated positions and angles.
	 * Callback: (id, x, y, angle, data) => void
	 */
	forEach(callback) {
		const elapsed = performance.now() - this.#tickTime;
		const t = Math.min(elapsed / SERVER_TICK, 1.0);
		for (const [id, e] of this.#entities) {
			const x = e.prevX + (e.curX - e.prevX) * t;
			const y = e.prevY + (e.curY - e.prevY) * t;

			// Shortest-path angle interpolation
			let da = e.curAngle - e.prevAngle;
			if (da > 180) da -= 360;
			if (da < -180) da += 360;
			const angle = e.prevAngle + da * t;

			callback(id, x, y, angle, e.data);
		}
	}
}
