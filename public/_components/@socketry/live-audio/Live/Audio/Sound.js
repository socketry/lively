// Base Sound Class
export class Sound {
	createEnvelope(audioContext, gainNode, attack, decay, sustain, release, duration) {
		const now = audioContext.currentTime;
		const initialGain = gainNode.gain.value;
		
		gainNode.gain.setValueAtTime(0, now);
		gainNode.gain.linearRampToValueAtTime(initialGain, now + attack);
		gainNode.gain.linearRampToValueAtTime(initialGain * sustain, now + attack + decay);
		if (duration - release > attack + decay) {
			gainNode.gain.setValueAtTime(initialGain * sustain, now + duration - release);
		}
		gainNode.gain.linearRampToValueAtTime(0, now + duration);
	}
	
	// Public interface - takes output and extracts what's needed.
	play(output) {
		// Return early if volume is zero (muted) - subclasses can override this behavior:
		if (output.volume <= 0) return;
		
		this.start(output);
	}
	
	// Internal method to be implemented by subclasses.
	start(output) {
		throw new Error('start() method must be implemented by subclass');
	}
	
	// Default stop implementation (no-op for most sounds).
	stop() {
		// Most sounds are fire-and-forget, so this is a no-op by default.
		// Subclasses can override this for continuous sounds like music.
	}
}
