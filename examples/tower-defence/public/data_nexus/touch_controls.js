/**
 * Touch controls modeled after Orbital Panic:
 * - Touch and drag to set desired heading → auto-rotates and thrusts
 * - Tap near center of screen → brake
 * - Release → stop thrusting (drag slows you down naturally)
 *
 * Translates touch gestures into virtual key press/release events
 * (ArrowUp/Down/Left/Right) sent to the server.
 */
export class TouchControls {
	#element;
	#active = false;
	#touchX = 0;
	#touchY = 0;
	#myAngle = 0; // degrees, updated each tick from server state
	#activeKeys = new Set();

	constructor(element) {
		this.#element = element;
		const opts = { passive: false };
		document.addEventListener('touchstart', e => this.#onTouchStart(e), opts);
		document.addEventListener('touchmove', e => this.#onTouchMove(e), opts);
		document.addEventListener('touchend', e => this.#onTouchEnd(e), opts);
		document.addEventListener('touchcancel', e => this.#onTouchEnd(e), opts);
	}

	/**
	 * Called each server tick to sync the current player angle
	 * so touch steering calculates the correct rotation delta.
	 */
	onTick(players) {
		const myId = this.#element.id;
		if (myId && players[myId]) {
			this.#myAngle = players[myId].angle ?? this.#myAngle;
		}
		if (this.#active) this.#apply();
	}

	// ── Private ──────────────────────────────────────────────────────────

	#send(key, type) {
		if (window.live) window.live.forward(this.#element.id, { type, detail: { key } });
	}

	#press(key) {
		if (this.#activeKeys.has(key)) return;
		this.#activeKeys.add(key);
		this.#send(key, 'keydown');
	}

	#release(key) {
		if (!this.#activeKeys.has(key)) return;
		this.#activeKeys.delete(key);
		this.#send(key, 'keyup');
	}

	#releaseAll() {
		for (const key of [...this.#activeKeys]) this.#release(key);
	}

	#onTouchStart(e) {
		e.preventDefault();
		const t = e.touches[0];
		this.#touchX = t.clientX;
		this.#touchY = t.clientY;
		this.#active = true;
		this.#apply();
	}

	#onTouchMove(e) {
		e.preventDefault();
		const t = e.touches[0];
		this.#touchX = t.clientX;
		this.#touchY = t.clientY;
		this.#apply();
	}

	#onTouchEnd(e) {
		e.preventDefault();
		if (e.touches.length === 0) {
			this.#active = false;
			this.#releaseAll();
		} else {
			const t = e.touches[0];
			this.#touchX = t.clientX;
			this.#touchY = t.clientY;
		}
	}

	#apply() {
		if (!this.#active) { this.#releaseAll(); return; }

		const rect = this.#element.getBoundingClientRect();
		const vcx = rect.left + rect.width / 2;
		const vcy = rect.top + rect.height / 2;
		const dx = this.#touchX - vcx;
		const dy = this.#touchY - vcy;
		const dist = Math.sqrt(dx * dx + dy * dy);

		// Tap near center → brake
		if (dist < 40) {
			this.#release('ArrowLeft');
			this.#release('ArrowRight');
			this.#release('ArrowUp');
			this.#press('ArrowDown');
			return;
		}

		// Otherwise: thrust forward and steer toward touch point
		this.#release('ArrowDown');
		this.#press('ArrowUp');

		// Desired heading: 0° = up, clockwise (matches server convention)
		const desired = Math.atan2(dx, -dy) * 180 / Math.PI;
		const delta = ((desired - this.#myAngle) + 540) % 360 - 180;

		if (Math.abs(delta) < 8) {
			this.#release('ArrowLeft');
			this.#release('ArrowRight');
		} else if (delta < 0) {
			this.#release('ArrowRight');
			this.#press('ArrowLeft');
		} else {
			this.#release('ArrowLeft');
			this.#press('ArrowRight');
		}
	}
}
