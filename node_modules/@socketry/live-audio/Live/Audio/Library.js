// Live Audio Sound Library
// Collection of pre-built synthesized sound effects

import { Sound } from '../Audio.js';

// Individual Sound Classes
export class JumpSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;
		
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'square';
		oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
		
		antiClipGain.gain.value = 0.6;
		this.createEnvelope(audioContext, gainNode, 0.01, 0.08, 0.3, 0.2, 0.3);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.3);
	}
}

export class CoinSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;
		
		const osc1 = audioContext.createOscillator();
		const osc2 = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const gain1 = audioContext.createGain();
		const gain2 = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		osc1.type = 'sine';
		osc2.type = 'sine';
		osc1.frequency.value = 523;
		osc2.frequency.value = 659;
		
		gain1.gain.value = 0.35;
		gain2.gain.value = 0.35;
		antiClipGain.gain.value = 1.0;
		
		this.createEnvelope(audioContext, gainNode, 0.01, 0.05, 0.4, 0.15, 0.15);
		
		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(antiClipGain);
		gain2.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		osc1.start();
		osc2.start();
		osc1.stop(audioContext.currentTime + 0.15);
		osc2.stop(audioContext.currentTime + 0.15);
	}
}

export class PowerUpSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const notes = [261.63, 329.63, 392.00, 523.25];
		const noteDuration = 0.08;
		
		notes.forEach((freq, index) => {
			const oscillator = audioContext.createOscillator();
			const gainNode = audioContext.createGain();
			const antiClipGain = audioContext.createGain();
			
			oscillator.type = 'triangle';
			oscillator.frequency.value = freq;
			
			antiClipGain.gain.value = 0.6;
			
			const startTime = index * noteDuration;
			const noteStartTime = audioContext.currentTime + startTime;
			const noteEndTime = noteStartTime + noteDuration + 0.01;
			
			gainNode.gain.setValueAtTime(0, noteStartTime);
			gainNode.gain.linearRampToValueAtTime(1, noteStartTime + 0.005);
			gainNode.gain.setValueAtTime(1, noteEndTime - 0.01);
			gainNode.gain.linearRampToValueAtTime(0, noteEndTime);
			
			oscillator.connect(antiClipGain);
			antiClipGain.connect(gainNode);
			gainNode.connect(inputNode);
			
			oscillator.start(noteStartTime);
			oscillator.stop(noteEndTime);
		});
	}
}

export class DeathSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 1.2);
		
		antiClipGain.gain.value = 0.47;
		this.createEnvelope(audioContext, gainNode, 0.1, 0.3, 0.7, 0.8, 1.2);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 1.2);
	}
}

export class ExplosionSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 0.8;
		const bufferSize = audioContext.sampleRate * duration;
		const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
		const data = buffer.getChannelData(0);
		
		// Generate white noise with exponential decay
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
		}
		
		const noiseSource = audioContext.createBufferSource();
		const deepRumble = audioContext.createOscillator();
		const midRumble = audioContext.createOscillator();
		const lowRumble = audioContext.createOscillator();
		const filter = audioContext.createBiquadFilter();
		const deepGain = audioContext.createGain();
		const midGain = audioContext.createGain();
		const lowGain = audioContext.createGain();
		const noiseGain = audioContext.createGain();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		noiseSource.buffer = buffer;
		
		deepRumble.type = 'sine';
		deepRumble.frequency.setValueAtTime(25, audioContext.currentTime);
		deepRumble.frequency.exponentialRampToValueAtTime(15, audioContext.currentTime + duration);
		deepGain.gain.value = 0.5;
		
		midRumble.type = 'square';
		midRumble.frequency.setValueAtTime(50, audioContext.currentTime);
		midRumble.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + duration);
		midGain.gain.value = 0.25;
		
		lowRumble.type = 'square';
		lowRumble.frequency.setValueAtTime(80, audioContext.currentTime);
		lowRumble.frequency.exponentialRampToValueAtTime(45, audioContext.currentTime + duration);
		lowGain.gain.value = 0.2;
		
		noiseGain.gain.value = 0.4;
		
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(1200, audioContext.currentTime);
		filter.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + duration);
		
		antiClipGain.gain.value = 0.7;
		this.createEnvelope(audioContext, gainNode, 0.01, 0.2, 0.4, 0.6, duration);
		
		deepRumble.connect(deepGain);
		midRumble.connect(midGain);
		lowRumble.connect(lowGain);
		noiseSource.connect(noiseGain);
		deepGain.connect(filter);
		midGain.connect(filter);
		lowGain.connect(filter);
		noiseGain.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		deepRumble.start();
		midRumble.start();
		lowRumble.start();
		noiseSource.start();
		deepRumble.stop(audioContext.currentTime + duration);
		midRumble.stop(audioContext.currentTime + duration);
		lowRumble.stop(audioContext.currentTime + duration);
	}
}

export class LaserSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.25);
		
		antiClipGain.gain.value = 0.5;
		this.createEnvelope(audioContext, gainNode, 0.005, 0.02, 0.8, 0.225, 0.25);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.25);
	}
}

export class BeepSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'sine';
		oscillator.frequency.value = 800;
		
		antiClipGain.gain.value = 0.7;
		this.createEnvelope(audioContext, gainNode, 0.01, 0.02, 0.9, 0.07, 0.1);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.1);
	}
}

export class BlipSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'square';
		oscillator.frequency.value = 1000;
		
		antiClipGain.gain.value = 0.6;
		this.createEnvelope(audioContext, gainNode, 0.005, 0.01, 0.7, 0.035, 0.05);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.05);
	}
}

export class MeowSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 0.6;
		const osc1 = audioContext.createOscillator();
		const osc2 = audioContext.createOscillator();
		const filter = audioContext.createBiquadFilter();
		const gainNode = audioContext.createGain();
		const gain1 = audioContext.createGain();
		const gain2 = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		osc1.type = 'sawtooth';
		osc2.type = 'triangle';
		
		gain1.gain.value = 0.3;
		gain2.gain.value = 0.2;
		
		osc1.frequency.setValueAtTime(300, audioContext.currentTime);
		osc1.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.1);
		osc1.frequency.linearRampToValueAtTime(400, audioContext.currentTime + duration);
		
		osc2.frequency.setValueAtTime(600, audioContext.currentTime);
		osc2.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.1);
		osc2.frequency.linearRampToValueAtTime(600, audioContext.currentTime + duration);
		
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(1500, audioContext.currentTime);
		filter.frequency.linearRampToValueAtTime(2500, audioContext.currentTime + 0.1);
		filter.frequency.linearRampToValueAtTime(1000, audioContext.currentTime + duration);
		filter.Q.value = 3;
		
		antiClipGain.gain.value = 4.8;
		this.createEnvelope(audioContext, gainNode, 0.05, 0.1, 0.7, 0.45, duration);
		
		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(filter);
		gain2.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		osc1.start();
		osc2.start();
		osc1.stop(audioContext.currentTime + duration);
		osc2.stop(audioContext.currentTime + duration);
	}
}

export class BarkSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 0.12;
		const oscillator = audioContext.createOscillator();
		const filter1 = audioContext.createBiquadFilter();
		const filter2 = audioContext.createBiquadFilter();
		const gainNode = audioContext.createGain();
		const boostGain = audioContext.createGain();
		
		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(140, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(90, audioContext.currentTime + duration);
		
		filter1.type = 'bandpass';
		filter1.frequency.value = 900;
		filter1.Q.value = 4;
		
		filter2.type = 'bandpass';
		filter2.frequency.value = 1400;
		filter2.Q.value = 2;
		
		boostGain.gain.value = 4.8;
		
		this.createEnvelope(audioContext, gainNode, 0.005, 0.04, 0.4, 0.1, duration);
		
		oscillator.connect(filter1);
		filter1.connect(filter2);
		filter2.connect(boostGain);
		boostGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + duration);
	}
}

export class DuckSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 0.3;
		const oscillator = audioContext.createOscillator();
		const modulator = audioContext.createOscillator();
		const modulatorGain = audioContext.createGain();
		const filter = audioContext.createBiquadFilter();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'square';
		oscillator.frequency.value = 200;
		
		modulator.type = 'sine';
		modulator.frequency.value = 15;
		modulatorGain.gain.value = 30;
		modulator.connect(modulatorGain);
		modulatorGain.connect(oscillator.frequency);
		
		filter.type = 'lowpass';
		filter.frequency.value = 800;
		filter.Q.value = 2;
		
		antiClipGain.gain.value = 0.62;
		
		this.createEnvelope(audioContext, gainNode, 0.02, 0.1, 0.3, 0.18, duration);
		
		oscillator.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		modulator.start();
		oscillator.stop(audioContext.currentTime + duration);
		modulator.stop(audioContext.currentTime + duration);
	}
}

export class AlienSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 0.8;
		const carrier = audioContext.createOscillator();
		const modulator = audioContext.createOscillator();
		const modulatorGain = audioContext.createGain();
		const ringMod = audioContext.createGain();
		const filter = audioContext.createBiquadFilter();
		const gainNode = audioContext.createGain();
		const volumeControl = audioContext.createGain();
		
		carrier.type = 'sine';
		carrier.frequency.setValueAtTime(150, audioContext.currentTime);
		carrier.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.4);
		carrier.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + duration);
		
		modulator.type = 'sine';
		modulator.frequency.setValueAtTime(30, audioContext.currentTime);
		modulator.frequency.linearRampToValueAtTime(80, audioContext.currentTime + duration);
		
		modulatorGain.gain.value = 0.5;
		
		filter.type = 'highpass';
		filter.frequency.value = 100;
		
		volumeControl.gain.value = 0.48;
		
		modulator.connect(modulatorGain);
		modulatorGain.connect(ringMod.gain);
		carrier.connect(ringMod);
		
		this.createEnvelope(audioContext, gainNode, 0.1, 0.2, 0.6, 0.5, duration);
		
		ringMod.connect(filter);
		filter.connect(volumeControl);
		volumeControl.connect(gainNode);
		gainNode.connect(inputNode);
		
		carrier.start();
		modulator.start();
		carrier.stop(audioContext.currentTime + duration);
		modulator.stop(audioContext.currentTime + duration);
	}
}

export class RoarSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 1.0;
		const lowOsc = audioContext.createOscillator();
		const highOsc = audioContext.createOscillator();
		const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
		const noiseData = noiseBuffer.getChannelData(0);
		
		// Generate filtered noise for texture
		for (let i = 0; i < noiseData.length; i++) {
			const t = i / audioContext.sampleRate;
			const envelope = Math.sin(Math.PI * t / duration);
			noiseData[i] = (Math.random() * 2 - 1) * 0.3 * envelope;
		}
		
		const noiseSource = audioContext.createBufferSource();
		noiseSource.buffer = noiseBuffer;
		
		const lowGain = audioContext.createGain();
		const highGain = audioContext.createGain();
		const noiseGain = audioContext.createGain();
		const filter = audioContext.createBiquadFilter();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		// Bass heavy square wave with frequency sweep
		lowOsc.type = 'square';
		lowOsc.frequency.setValueAtTime(60, audioContext.currentTime);
		lowOsc.frequency.linearRampToValueAtTime(90, audioContext.currentTime + 0.3);
		lowOsc.frequency.linearRampToValueAtTime(45, audioContext.currentTime + duration);
		lowGain.gain.value = 0.7; // Strong bass presence
		
		// Higher pitch square wave for harmonic richness
		highOsc.type = 'square';
		highOsc.frequency.setValueAtTime(180, audioContext.currentTime);
		highOsc.frequency.linearRampToValueAtTime(270, audioContext.currentTime + 0.3);
		highOsc.frequency.linearRampToValueAtTime(135, audioContext.currentTime + duration);
		highGain.gain.value = 0.4; // Supporting harmonics
		
		noiseGain.gain.value = 0.3; // Texture layer
		
		// Light lowpass filtering to tame square wave harshness while keeping bass
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(1200, audioContext.currentTime);
		filter.frequency.linearRampToValueAtTime(800, audioContext.currentTime + duration);
		filter.Q.value = 1;
		
		// Reduce gain to prevent clipping (was hitting 100%)
		antiClipGain.gain.value = 0.5; // Reduced from 1.0 to prevent clipping
		this.createEnvelope(audioContext, gainNode, 0.1, 0.2, 0.8, 0.7, duration);
		
		lowOsc.connect(lowGain);
		highOsc.connect(highGain);
		noiseSource.connect(noiseGain);
		lowGain.connect(filter);
		highGain.connect(filter);
		noiseGain.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		lowOsc.start();
		highOsc.start();
		noiseSource.start();
		lowOsc.stop(audioContext.currentTime + duration);
		highOsc.stop(audioContext.currentTime + duration);
	}
}

export class ChirpSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 0.15;
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(2000, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(4000, audioContext.currentTime + 0.05);
		oscillator.frequency.exponentialRampToValueAtTime(3000, audioContext.currentTime + duration);
		
		antiClipGain.gain.value = 0.5;
		this.createEnvelope(audioContext, gainNode, 0.01, 0.03, 0.5, 0.11, duration);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + duration);
	}
}

export class HowlSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;

		const duration = 2.0;
		const osc1 = audioContext.createOscillator();
		const osc2 = audioContext.createOscillator();
		const filter = audioContext.createBiquadFilter();
		const gainNode = audioContext.createGain();
		const gain1 = audioContext.createGain();
		const gain2 = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		osc1.type = 'sine';
		osc2.type = 'triangle';
		
		gain1.gain.value = 0.4;
		gain2.gain.value = 0.3;
		
		const baseFreq = 330; // Increased from 220 for higher pitch
		osc1.frequency.setValueAtTime(baseFreq, audioContext.currentTime);
		osc1.frequency.linearRampToValueAtTime(baseFreq * 1.5, audioContext.currentTime + 0.5);
		osc1.frequency.linearRampToValueAtTime(baseFreq * 0.8, audioContext.currentTime + duration);
		
		osc2.frequency.setValueAtTime(baseFreq * 1.5, audioContext.currentTime);
		osc2.frequency.linearRampToValueAtTime(baseFreq * 2, audioContext.currentTime + 0.5);
		osc2.frequency.linearRampToValueAtTime(baseFreq, audioContext.currentTime + duration);
		
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(800, audioContext.currentTime);
		filter.frequency.linearRampToValueAtTime(1200, audioContext.currentTime + 0.5);
		filter.frequency.linearRampToValueAtTime(600, audioContext.currentTime + duration);
		filter.Q.value = 2;
		
		antiClipGain.gain.value = 4.0; // Increased from 0.7 to boost from 7% to ~80%
		this.createEnvelope(audioContext, gainNode, 0.2, 0.3, 0.8, 1.5, duration);
		
		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(filter);
		gain2.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		osc1.start();
		osc2.start();
		osc1.stop(audioContext.currentTime + duration);
		osc2.stop(audioContext.currentTime + duration);
	}
}

// Sample Sound class - loads and plays audio files (one-shot by default)
export class SampleSound extends Sound {
	constructor(url, volume = 0.8) {
		super();
		this.url = url;
		this.volume = volume;
		this.source = null;
		this.gainNode = null;
		this.audioBuffer = null;
		this.isPlaying = false;
	}
	
	async start(output) {
		if (this.isPlaying) {
			console.log('Sample is already playing');
			return;
		}
		
		const audioContext = output.audioContext;
		const inputNode = output.input;
		
		try {
			this.gainNode = audioContext.createGain();
			this.gainNode.gain.value = this.volume;
			this.gainNode.connect(inputNode);
			
			if (!this.audioBuffer) {
				await this.loadAudioBuffer(audioContext);
			}
			
			this.playAudioBuffer(audioContext);
			console.log('Sample started:', this.url);
		} catch (error) {
			console.error('Failed to start sample:', error);
		}
	}
	
	async loadAudioBuffer(audioContext) {
		console.log('Loading sample from:', this.url);
		
		try {
			// Add a timeout to prevent hanging
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
			
			const response = await fetch(this.url, { 
				signal: controller.signal 
			});
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			const arrayBuffer = await response.arrayBuffer();
			this.audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
			
			console.log(`Sample loaded: ${this.audioBuffer.duration.toFixed(2)}s`);
		} catch (error) {
			console.warn('Failed to load sample:', error.message);
			// Create a dummy silent buffer so the sound doesn't fail completely
			this.audioBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
		}
	}
	
	playAudioBuffer(audioContext) {
		this.source = audioContext.createBufferSource();
		this.source.buffer = this.audioBuffer;
		
		// Configure looping (overridden in subclasses)
		this.configurePlayback(this.source);
		
		this.source.connect(this.gainNode);
		
		this.source.onended = () => {
			this.isPlaying = false;
			this.source = null;
		};
		
		this.source.start(0);
		this.isPlaying = true;
	}
	
	// Override this method in subclasses to configure looping behavior
	configurePlayback(source) {
		// Default: no looping (one-shot)
		source.loop = false;
	}
	
	stop() {
		if (this.source && this.isPlaying) {
			this.source.stop();
			this.source.disconnect();
			this.source = null;
			
			if (this.gainNode) {
				this.gainNode.disconnect();
				this.gainNode = null;
			}
			
			this.isPlaying = false;
		}
	}
	
	setVolume(volume) {
		this.volume = volume;
		if (this.gainNode) {
			this.gainNode.gain.value = volume;
		}
	}
}

// Background Music class extending SampleSound with looping functionality
export class BackgroundMusicSound extends SampleSound {
	constructor(url, options = {}) {
		const { volume = 0.8, loop = true, loopStart, loopEnd } = options;
		super(url, volume);
		
		// Store loop configuration
		this.options = {
			loop,
			loopStart,
			loopEnd
		};
	}
	
	// Override to configure looping with specific loop points
	configurePlayback(source) {
		const { loop, loopStart, loopEnd } = this.options;
		
		// Only set loop properties if they are explicitly provided:
		if (loop !== undefined) {
			source.loop = loop;
		}
		
		if (loopStart !== undefined) {
			source.loopStart = loopStart;
		}
		
		if (loopEnd !== undefined) {
			source.loopEnd = loopEnd;
		}
	}
	
	async start(output) {
		if (this.isPlaying) {
			return;
		}
		
		await super.start(output);
	}
}
