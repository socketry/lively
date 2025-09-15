// Game Audio Synthesis Library
// Web Audio API-based collection for classic game sounds with modular architecture

// Base Audio Output Node - handles routing to analysis and/or audio device
class AudioOutput {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.gainNode = audioContext.createGain();
		this.analysisNode = null;
		this.destination = audioContext.destination;
		
		// Connect directly to destination by default
		this.gainNode.connect(this.destination);
	}
	
	// Connect an analysis node for visualization
	connectAnalysis(analysisNode) {
		if (this.analysisNode) {
			this.gainNode.disconnect(this.analysisNode.input);
		}
		this.analysisNode = analysisNode;
		this.gainNode.disconnect(this.destination);
		this.gainNode.connect(this.analysisNode.input);
		this.analysisNode.connect(this.destination);
	}
	
	// Remove analysis and connect directly to destination
	disconnectAnalysis() {
		if (this.analysisNode) {
			this.gainNode.disconnect(this.analysisNode.input);
			this.analysisNode.disconnect(this.destination);
			this.analysisNode = null;
		}
		this.gainNode.connect(this.destination);
	}
	
	// Get the input node for sounds to connect to
	get input() {
		return this.gainNode;
	}
	
	// Control master volume
	setVolume(volume) {
		this.gainNode.gain.value = volume;
	}
	
	// Check if audio should be enabled
	audioEnabled() {
		// Check if audio context is available and running
		if (!this.audioContext || this.audioContext.state !== 'running') {
			return false;
		}
		
		// Check if master volume is effectively muted
		if (this.gainNode.gain.value <= 0) {
			return false;
		}
		
		// Could add more conditions here:
		// - User preferences (mute setting)
		// - Browser visibility (pause when tab hidden)
		// - Performance mode (disable in low-power situations)
		
		return true;
	}
}

// Analysis Node - handles waveform visualization and audio quality monitoring
class AnalysisNode {
	constructor(audioContext) {
		this.audioContext = audioContext;
		this.analyser = audioContext.createAnalyser();
		this.analyser.fftSize = 2048;
		this.analyser.smoothingTimeConstant = 0.8;
		
		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
		this.canvas = null;
		this.canvasContext = null;
		this.alertCanvas = null;
		this.alertContext = null;
		this.animationId = null;
		
		// Analysis state
		this.clipDetected = false;
		this.popDetected = false;
		this.clipThreshold = 0.95;
		this.popThreshold = 0.1;
		this.clipCounter = 0;
		this.popCounter = 0;
		
		// Rolling peak detection
		this.peakHistory = new Array(60).fill(0);
		this.peakHistoryIndex = 0;
		this.rollingPeak = 0;
		
		this.setupCanvas();
		this.startVisualization();
	}
	
	get input() {
		return this.analyser;
	}
	
	connect(destination) {
		this.analyser.connect(destination);
	}
	
	disconnect(destination) {
		this.analyser.disconnect(destination);
	}
	
	setupCanvas() {
		this.canvas = document.getElementById('waveform-canvas');
		if (!this.canvas) {
			this.canvas = document.createElement('canvas');
			this.canvas.id = 'waveform-canvas';
			this.canvas.width = 800;
			this.canvas.height = 200;
			this.canvas.style.border = '2px solid #333';
			this.canvas.style.borderRadius = '8px';
			this.canvas.style.background = '#000';
			document.body.appendChild(this.canvas);
		}
		this.canvasContext = this.canvas.getContext('2d');
		
		this.alertCanvas = document.getElementById('alert-canvas');
		if (!this.alertCanvas) {
			this.alertCanvas = document.createElement('canvas');
			this.alertCanvas.id = 'alert-canvas';
			this.alertCanvas.width = 800;
			this.alertCanvas.height = 100;
			this.alertCanvas.style.border = '2px solid #333';
			this.alertCanvas.style.borderRadius = '8px';
			this.alertCanvas.style.background = '#111';
			this.alertCanvas.style.marginTop = '10px';
			this.canvas.parentNode.insertBefore(this.alertCanvas, this.canvas.nextSibling);
		}
		this.alertContext = this.alertCanvas.getContext('2d');
	}
	
	startVisualization() {
		const draw = () => {
			this.animationId = requestAnimationFrame(draw);
			this.analyser.getByteTimeDomainData(this.dataArray);
			this.analyzeAudioQuality();
			this.drawWaveform();
			this.drawQualityIndicators();
		};
		draw();
	}
	
	analyzeAudioQuality() {
		this.clipDetected = false;
		this.popDetected = false;
		let currentPeak = 0;
		
		for (let i = 0; i < this.dataArray.length; i++) {
			const sample = (this.dataArray[i] - 128) / 128.0;
			const sampleAbs = Math.abs(sample);
			currentPeak = Math.max(currentPeak, sampleAbs);
			
			if (sampleAbs > this.clipThreshold) {
				this.clipDetected = true;
				this.clipCounter = Math.min(this.clipCounter + 1, 60);
			}
			
			if (i > 0) {
				const previousSample = (this.dataArray[i-1] - 128) / 128.0;
				const amplitudeChange = Math.abs(sample - previousSample);
				if (amplitudeChange > this.popThreshold) {
					this.popDetected = true;
					this.popCounter = Math.min(this.popCounter + 1, 60);
				}
			}
		}
		
		this.peakHistory[this.peakHistoryIndex] = currentPeak;
		this.peakHistoryIndex = (this.peakHistoryIndex + 1) % this.peakHistory.length;
		this.rollingPeak = Math.max(...this.peakHistory);
		
		if (!this.clipDetected) this.clipCounter = Math.max(this.clipCounter - 1, 0);
		if (!this.popDetected) this.popCounter = Math.max(this.popCounter - 1, 0);
	}
	
	drawWaveform() {
		this.canvasContext.fillStyle = '#000';
		this.canvasContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
		
		this.canvasContext.lineWidth = 2;
		this.canvasContext.strokeStyle = this.clipCounter > 0 ? '#ff0000' : 
		                                  this.popCounter > 0 ? '#ff8800' : '#00ff41';
		
		this.canvasContext.beginPath();
		const sliceWidth = this.canvas.width / this.dataArray.length;
		let x = 0;
		
		for (let i = 0; i < this.dataArray.length; i++) {
			const v = this.dataArray[i] / 128.0;
			const y = v * this.canvas.height / 2;
			
			if (Math.abs((this.dataArray[i] - 128) / 128.0) > this.clipThreshold) {
				this.canvasContext.fillStyle = '#ff0000';
				this.canvasContext.fillRect(x - 1, y - 2, 3, 4);
			}
			
			if (i === 0) {
				this.canvasContext.moveTo(x, y);
			} else {
				this.canvasContext.lineTo(x, y);
			}
			x += sliceWidth;
		}
		
		this.canvasContext.stroke();
		this.drawThresholdLines();
	}
	
	drawThresholdLines() {
		const clipLine = this.canvas.height / 2 * (1 - this.clipThreshold);
		const clipLineBottom = this.canvas.height / 2 * (1 + this.clipThreshold);
		
		this.canvasContext.strokeStyle = '#444';
		this.canvasContext.lineWidth = 1;
		this.canvasContext.setLineDash([5, 5]);
		
		this.canvasContext.beginPath();
		this.canvasContext.moveTo(0, clipLine);
		this.canvasContext.lineTo(this.canvas.width, clipLine);
		this.canvasContext.moveTo(0, clipLineBottom);
		this.canvasContext.lineTo(this.canvas.width, clipLineBottom);
		this.canvasContext.stroke();
		this.canvasContext.setLineDash([]);
	}
	
	drawQualityIndicators() {
		this.alertContext.fillStyle = '#111';
		this.alertContext.fillRect(0, 0, this.alertCanvas.width, this.alertCanvas.height);
		
		const centerY = this.alertCanvas.height / 2;
		this.alertContext.font = '16px monospace';
		this.alertContext.textAlign = 'left';
		
		if (this.clipCounter > 0) {
			this.alertContext.fillStyle = '#ff0000';
			this.alertContext.fillText('⚠️ CLIPPING DETECTED', 20, centerY - 10);
			this.alertContext.fillText(`Clip Level: ${Math.round(this.clipCounter / 60 * 100)}%`, 20, centerY + 10);
		} else if (this.popCounter > 0) {
			this.alertContext.fillStyle = '#ff8800';
			this.alertContext.fillText('⚠️ AUDIO POPS DETECTED', 20, centerY - 10);
			this.alertContext.fillText(`Pop Level: ${Math.round(this.popCounter / 60 * 100)}%`, 20, centerY + 10);
		} else {
			this.alertContext.fillStyle = '#00ff41';
			this.alertContext.fillText('✅ AUDIO QUALITY: GOOD', 20, centerY - 10);
			this.alertContext.fillText('No clipping or pops detected', 20, centerY + 10);
		}
		
		// Peak level meter
		const maxSample = Math.max(...Array.from(this.dataArray).map(x => Math.abs((x - 128) / 128.0)));
		const meterWidth = 200;
		const meterHeight = 20;
		const meterX = this.alertCanvas.width - meterWidth - 20;
		const meterY = centerY - meterHeight / 2;
		
		this.alertContext.fillStyle = '#333';
		this.alertContext.fillRect(meterX, meterY, meterWidth, meterHeight);
		
		const currentWidth = maxSample * meterWidth;
		this.alertContext.fillStyle = '#555';
		this.alertContext.fillRect(meterX, meterY, currentWidth, meterHeight);
		
		const peakWidth = this.rollingPeak * meterWidth;
		this.alertContext.fillStyle = this.rollingPeak > this.clipThreshold ? '#ff0000' :
		                              this.rollingPeak > 0.7 ? '#ff8800' : '#00ff41';
		this.alertContext.fillRect(meterX, meterY, peakWidth, meterHeight);
		
		this.alertContext.strokeStyle = '#666';
		this.alertContext.lineWidth = 1;
		this.alertContext.strokeRect(meterX, meterY, meterWidth, meterHeight);
		
		this.alertContext.fillStyle = '#ccc';
		this.alertContext.font = '12px monospace';
		this.alertContext.textAlign = 'center';
		this.alertContext.fillText('PEAK LEVEL (1s)', meterX + meterWidth / 2, meterY - 5);
		this.alertContext.fillText(`${Math.round(this.rollingPeak * 100)}%`, meterX + meterWidth / 2, meterY + meterHeight + 15);
		
		const clipMarkerX = meterX + this.clipThreshold * meterWidth;
		this.alertContext.strokeStyle = '#ff0000';
		this.alertContext.lineWidth = 2;
		this.alertContext.beginPath();
		this.alertContext.moveTo(clipMarkerX, meterY - 2);
		this.alertContext.lineTo(clipMarkerX, meterY + meterHeight + 2);
		this.alertContext.stroke();
	}
	
	setDetectionSensitivity(clipThreshold = 0.95, popThreshold = 0.1) {
		this.clipThreshold = clipThreshold;
		this.popThreshold = popThreshold;
	}
}

// Base Sound Class
class BaseSound {
	constructor(output) {
		this.output = output;
		this.audioContext = output.audioContext;
	}
	
	audioEnabled() {
		return this.output.audioEnabled();
	}
	
	createEnvelope(gainNode, attack, decay, sustain, release, duration) {
		const now = this.audioContext.currentTime;
		const initialGain = gainNode.gain.value;
		
		gainNode.gain.setValueAtTime(0, now);
		gainNode.gain.linearRampToValueAtTime(initialGain, now + attack);
		gainNode.gain.linearRampToValueAtTime(initialGain * sustain, now + attack + decay);
		if (duration - release > attack + decay) {
			gainNode.gain.setValueAtTime(initialGain * sustain, now + duration - release);
		}
		gainNode.gain.linearRampToValueAtTime(0, now + duration);
	}
	
	// Public interface - checks if enabled before playing
	play() {
		if (!this.audioEnabled()) return;
		this.start();
	}
	
	// Internal method to be implemented by subclasses - assumes audio is enabled
	start() {
		throw new Error('start() method must be implemented by subclass');
	}
}

// Individual Sound Classes
class JumpSound extends BaseSound {
	start() {
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'square';
		oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.3);
		
		antiClipGain.gain.value = 0.6; // Reduced from 0.7 (15% reduction for square wave harshness)
		this.createEnvelope(gainNode, 0.01, 0.08, 0.3, 0.2, 0.3);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + 0.3);
	}
}

class CoinSound extends BaseSound {
	start() {
		const osc1 = this.audioContext.createOscillator();
		const osc2 = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const gain1 = this.audioContext.createGain();
		const gain2 = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		osc1.type = 'sine';
		osc2.type = 'sine';
		osc1.frequency.value = 523;
		osc2.frequency.value = 659;
		
		// Individual gains prevent constructive interference
		gain1.gain.value = 0.35;
		gain2.gain.value = 0.35;
		antiClipGain.gain.value = 1.0;
		
		this.createEnvelope(gainNode, 0.01, 0.05, 0.4, 0.15, 0.15);
		
		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(antiClipGain);
		gain2.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		osc1.start();
		osc2.start();
		osc1.stop(this.audioContext.currentTime + 0.15);
		osc2.stop(this.audioContext.currentTime + 0.15);
	}
}

class PowerUpSound extends BaseSound {
	start() {
		const notes = [261.63, 329.63, 392.00, 523.25];
		const noteDuration = 0.08;
		
		notes.forEach((freq, index) => {
			const oscillator = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();
			const antiClipGain = this.audioContext.createGain();
			
			oscillator.type = 'triangle';
			oscillator.frequency.value = freq;
			
			antiClipGain.gain.value = 0.6;
			
			const startTime = index * noteDuration;
			const noteStartTime = this.audioContext.currentTime + startTime;
			const noteEndTime = noteStartTime + noteDuration + 0.01;
			
			gainNode.gain.setValueAtTime(0, noteStartTime);
			gainNode.gain.linearRampToValueAtTime(1, noteStartTime + 0.005);
			gainNode.gain.setValueAtTime(1, noteEndTime - 0.01);
			gainNode.gain.linearRampToValueAtTime(0, noteEndTime);
			
			oscillator.connect(antiClipGain);
			antiClipGain.connect(gainNode);
			gainNode.connect(this.output.input);
			
			oscillator.start(noteStartTime);
			oscillator.stop(noteEndTime);
		});
	}
}

class DeathSound extends BaseSound {
	start() {
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1.2);
		
		antiClipGain.gain.value = 0.47; // Reduced from 0.55 (15% reduction for sawtooth harshness)
		this.createEnvelope(gainNode, 0.1, 0.3, 0.7, 0.8, 1.2);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + 1.2);
	}
}

class ExplosionSound extends BaseSound {
	start() {
		const duration = 0.8; // Extended from 0.5s for longer rumble
		const bufferSize = this.audioContext.sampleRate * duration;
		const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
		const data = buffer.getChannelData(0);
		
		// Generate white noise with exponential decay
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
		}
		
		const noiseSource = this.audioContext.createBufferSource();
		const deepRumble = this.audioContext.createOscillator();
		const midRumble = this.audioContext.createOscillator();
		const lowRumble = this.audioContext.createOscillator();
		const filter = this.audioContext.createBiquadFilter();
		const deepGain = this.audioContext.createGain();
		const midGain = this.audioContext.createGain();
		const lowGain = this.audioContext.createGain();
		const noiseGain = this.audioContext.createGain();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		noiseSource.buffer = buffer;
		
		// Multiple rumble layers for richer bass
		// Deep sub-bass rumble (keep sine for smooth sub-bass)
		deepRumble.type = 'sine';
		deepRumble.frequency.setValueAtTime(25, this.audioContext.currentTime);
		deepRumble.frequency.exponentialRampToValueAtTime(15, this.audioContext.currentTime + duration);
		deepGain.gain.value = 0.5;
		
		// Mid-bass rumble (square wave for punch)
		midRumble.type = 'square';
		midRumble.frequency.setValueAtTime(50, this.audioContext.currentTime);
		midRumble.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + duration);
		midGain.gain.value = 0.25; // Reduced from 0.4 due to square wave loudness
		
		// Low rumble punch (square wave for aggressive punch)
		lowRumble.type = 'square';
		lowRumble.frequency.setValueAtTime(80, this.audioContext.currentTime);
		lowRumble.frequency.exponentialRampToValueAtTime(45, this.audioContext.currentTime + duration);
		lowGain.gain.value = 0.2; // Reduced from 0.3 due to square wave loudness
		
		noiseGain.gain.value = 0.4; // Reduced to balance with multiple rumbles
		
		// Lower the filter cutoff for more bass emphasis
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(1200, this.audioContext.currentTime);
		filter.frequency.exponentialRampToValueAtTime(120, this.audioContext.currentTime + duration);
		
		// Reduce gain to prevent clipping (was peaking at 91%)
		antiClipGain.gain.value = 0.7; // Reduced from 0.8 to target ~80%
		this.createEnvelope(gainNode, 0.01, 0.2, 0.4, 0.6, duration);
		
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
		gainNode.connect(this.output.input);
		
		deepRumble.start();
		midRumble.start();
		lowRumble.start();
		noiseSource.start();
		deepRumble.stop(this.audioContext.currentTime + duration);
		midRumble.stop(this.audioContext.currentTime + duration);
		lowRumble.stop(this.audioContext.currentTime + duration);
	}
}

class LaserSound extends BaseSound {
	start() {
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(1200, this.audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.25);
		
		antiClipGain.gain.value = 0.5;
		this.createEnvelope(gainNode, 0.005, 0.02, 0.8, 0.225, 0.25);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + 0.25);
	}
}

class BeepSound extends BaseSound {
	start() {
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'sine';
		oscillator.frequency.value = 800;
		
		antiClipGain.gain.value = 0.7;
		this.createEnvelope(gainNode, 0.01, 0.02, 0.9, 0.07, 0.1);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + 0.1);
	}
}

class BlipSound extends BaseSound {
	start() {
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'square';
		oscillator.frequency.value = 1000;
		
		antiClipGain.gain.value = 0.6;
		this.createEnvelope(gainNode, 0.005, 0.01, 0.7, 0.035, 0.05);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + 0.05);
	}
}

class MeowSound extends BaseSound {
	start() {
		const duration = 0.6;
		const osc1 = this.audioContext.createOscillator();
		const osc2 = this.audioContext.createOscillator();
		const filter = this.audioContext.createBiquadFilter();
		const gainNode = this.audioContext.createGain();
		const gain1 = this.audioContext.createGain();
		const gain2 = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		osc1.type = 'sawtooth';
		osc2.type = 'triangle';
		
		gain1.gain.value = 0.3;
		gain2.gain.value = 0.2;
		
		osc1.frequency.setValueAtTime(300, this.audioContext.currentTime);
		osc1.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
		osc1.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + duration);
		
		osc2.frequency.setValueAtTime(600, this.audioContext.currentTime);
		osc2.frequency.linearRampToValueAtTime(1200, this.audioContext.currentTime + 0.1);
		osc2.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + duration);
		
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(1500, this.audioContext.currentTime);
		filter.frequency.linearRampToValueAtTime(2500, this.audioContext.currentTime + 0.1);
		filter.frequency.linearRampToValueAtTime(1000, this.audioContext.currentTime + duration);
		filter.Q.value = 3;
		
		antiClipGain.gain.value = 4.8; // Increased from 0.8 to boost from 13% to ~80%
		this.createEnvelope(gainNode, 0.05, 0.1, 0.7, 0.45, duration);
		
		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(filter);
		gain2.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		osc1.start();
		osc2.start();
		osc1.stop(this.audioContext.currentTime + duration);
		osc2.stop(this.audioContext.currentTime + duration);
	}
}

class BarkSound extends BaseSound {
	start() {
		const duration = 0.12;
		const oscillator = this.audioContext.createOscillator();
		const filter1 = this.audioContext.createBiquadFilter();
		const filter2 = this.audioContext.createBiquadFilter();
		const gainNode = this.audioContext.createGain();
		const boostGain = this.audioContext.createGain();
		
		oscillator.type = 'sawtooth';
		oscillator.frequency.setValueAtTime(140, this.audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(90, this.audioContext.currentTime + duration);
		
		// Formant-like filtering for bark quality - reduced Q for more volume
		filter1.type = 'bandpass';
		filter1.frequency.value = 900;
		filter1.Q.value = 4; // Reduced from 6
		
		filter2.type = 'bandpass';
		filter2.frequency.value = 1400;
		filter2.Q.value = 2; // Reduced from 4
		
		// Major gain boost to compensate for dual filter losses and target 80%
		boostGain.gain.value = 4.8; // Slightly reduced from 5.0 to target 80%
		
		// Aggressive envelope for punchy bark
		this.createEnvelope(gainNode, 0.005, 0.04, 0.4, 0.1, duration);
		
		oscillator.connect(filter1);
		filter1.connect(filter2);
		filter2.connect(boostGain);
		boostGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + duration);
	}
}

class RoarSound extends BaseSound {
	start() {
		const duration = 1.0;
		const lowOsc = this.audioContext.createOscillator();
		const highOsc = this.audioContext.createOscillator();
		const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * duration, this.audioContext.sampleRate);
		const noiseData = noiseBuffer.getChannelData(0);
		
		// Generate filtered noise for texture
		for (let i = 0; i < noiseData.length; i++) {
			const t = i / this.audioContext.sampleRate;
			const envelope = Math.sin(Math.PI * t / duration);
			noiseData[i] = (Math.random() * 2 - 1) * 0.3 * envelope;
		}
		
		const noiseSource = this.audioContext.createBufferSource();
		noiseSource.buffer = noiseBuffer;
		
		const lowGain = this.audioContext.createGain();
		const highGain = this.audioContext.createGain();
		const noiseGain = this.audioContext.createGain();
		const filter = this.audioContext.createBiquadFilter();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		// Bass heavy square wave with frequency sweep
		lowOsc.type = 'square';
		lowOsc.frequency.setValueAtTime(60, this.audioContext.currentTime);
		lowOsc.frequency.linearRampToValueAtTime(90, this.audioContext.currentTime + 0.3);
		lowOsc.frequency.linearRampToValueAtTime(45, this.audioContext.currentTime + duration);
		lowGain.gain.value = 0.7; // Strong bass presence
		
		// Higher pitch square wave for harmonic richness
		highOsc.type = 'square';
		highOsc.frequency.setValueAtTime(180, this.audioContext.currentTime);
		highOsc.frequency.linearRampToValueAtTime(270, this.audioContext.currentTime + 0.3);
		highOsc.frequency.linearRampToValueAtTime(135, this.audioContext.currentTime + duration);
		highGain.gain.value = 0.4; // Supporting harmonics
		
		noiseGain.gain.value = 0.3; // Texture layer
		
		// Light lowpass filtering to tame square wave harshness while keeping bass
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(1200, this.audioContext.currentTime);
		filter.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + duration);
		filter.Q.value = 1;
		
		// Reduce gain to prevent clipping (was hitting 100%)
		antiClipGain.gain.value = 0.5; // Reduced from 1.0 to prevent clipping
		this.createEnvelope(gainNode, 0.1, 0.2, 0.8, 0.7, duration);
		
		lowOsc.connect(lowGain);
		highOsc.connect(highGain);
		noiseSource.connect(noiseGain);
		lowGain.connect(filter);
		highGain.connect(filter);
		noiseGain.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		lowOsc.start();
		highOsc.start();
		noiseSource.start();
		lowOsc.stop(this.audioContext.currentTime + duration);
		highOsc.stop(this.audioContext.currentTime + duration);
	}
}

class ChirpSound extends BaseSound {
	start() {
		const duration = 0.15;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(2000, this.audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(4000, this.audioContext.currentTime + 0.05);
		oscillator.frequency.exponentialRampToValueAtTime(3000, this.audioContext.currentTime + duration);
		
		antiClipGain.gain.value = 0.5;
		this.createEnvelope(gainNode, 0.01, 0.03, 0.5, 0.11, duration);
		
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		oscillator.stop(this.audioContext.currentTime + duration);
	}
}

class HowlSound extends BaseSound {
	start() {
		const duration = 2.0;
		const osc1 = this.audioContext.createOscillator();
		const osc2 = this.audioContext.createOscillator();
		const filter = this.audioContext.createBiquadFilter();
		const gainNode = this.audioContext.createGain();
		const gain1 = this.audioContext.createGain();
		const gain2 = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		osc1.type = 'sine';
		osc2.type = 'triangle';
		
		gain1.gain.value = 0.4;
		gain2.gain.value = 0.3;
		
		const baseFreq = 330; // Increased from 220 for higher pitch
		osc1.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);
		osc1.frequency.linearRampToValueAtTime(baseFreq * 1.5, this.audioContext.currentTime + 0.5);
		osc1.frequency.linearRampToValueAtTime(baseFreq * 0.8, this.audioContext.currentTime + duration);
		
		osc2.frequency.setValueAtTime(baseFreq * 1.5, this.audioContext.currentTime);
		osc2.frequency.linearRampToValueAtTime(baseFreq * 2, this.audioContext.currentTime + 0.5);
		osc2.frequency.linearRampToValueAtTime(baseFreq, this.audioContext.currentTime + duration);
		
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(800, this.audioContext.currentTime);
		filter.frequency.linearRampToValueAtTime(1200, this.audioContext.currentTime + 0.5);
		filter.frequency.linearRampToValueAtTime(600, this.audioContext.currentTime + duration);
		filter.Q.value = 2;
		
		antiClipGain.gain.value = 4.0; // Increased from 0.7 to boost from 7% to ~80%
		this.createEnvelope(gainNode, 0.2, 0.3, 0.8, 1.5, duration);
		
		osc1.connect(gain1);
		osc2.connect(gain2);
		gain1.connect(filter);
		gain2.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		osc1.start();
		osc2.start();
		osc1.stop(this.audioContext.currentTime + duration);
		osc2.stop(this.audioContext.currentTime + duration);
	}
}

class DuckSound extends BaseSound {
	start() {
		const duration = 0.3;
		const oscillator = this.audioContext.createOscillator();
		const modulator = this.audioContext.createOscillator();
		const modulatorGain = this.audioContext.createGain();
		const filter = this.audioContext.createBiquadFilter();
		const gainNode = this.audioContext.createGain();
		const antiClipGain = this.audioContext.createGain();
		
		oscillator.type = 'square';
		oscillator.frequency.value = 200;
		
		// FM for quack character
		modulator.type = 'sine';
		modulator.frequency.value = 15;
		modulatorGain.gain.value = 30;
		modulator.connect(modulatorGain);
		modulatorGain.connect(oscillator.frequency);
		
		filter.type = 'lowpass';
		filter.frequency.value = 800;
		filter.Q.value = 2;
		
		// Slight gain increase to target 80%
		antiClipGain.gain.value = 0.62;
		
		this.createEnvelope(gainNode, 0.02, 0.1, 0.3, 0.18, duration);
		
		oscillator.connect(filter);
		filter.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(this.output.input);
		
		oscillator.start();
		modulator.start();
		oscillator.stop(this.audioContext.currentTime + duration);
		modulator.stop(this.audioContext.currentTime + duration);
	}
}

class AlienSound extends BaseSound {
	start() {
		const duration = 0.8;
		const carrier = this.audioContext.createOscillator();
		const modulator = this.audioContext.createOscillator();
		const modulatorGain = this.audioContext.createGain();
		const ringMod = this.audioContext.createGain();
		const filter = this.audioContext.createBiquadFilter();
		const gainNode = this.audioContext.createGain();
		const volumeControl = this.audioContext.createGain();
		
		carrier.type = 'sine';
		carrier.frequency.setValueAtTime(150, this.audioContext.currentTime);
		carrier.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.4);
		carrier.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + duration);
		
		modulator.type = 'sine';
		modulator.frequency.setValueAtTime(30, this.audioContext.currentTime);
		modulator.frequency.linearRampToValueAtTime(80, this.audioContext.currentTime + duration);
		
		modulatorGain.gain.value = 0.5;
		
		filter.type = 'highpass';
		filter.frequency.value = 100;
		
		// Volume control to target 80%
		volumeControl.gain.value = 0.48;
		
		// Ring modulation setup
		modulator.connect(modulatorGain);
		modulatorGain.connect(ringMod.gain);
		carrier.connect(ringMod);
		
		this.createEnvelope(gainNode, 0.1, 0.2, 0.6, 0.5, duration);
		
		ringMod.connect(filter);
		filter.connect(volumeControl);
		volumeControl.connect(gainNode);
		gainNode.connect(this.output.input);
		
		carrier.start();
		modulator.start();
		carrier.stop(this.audioContext.currentTime + duration);
		modulator.stop(this.audioContext.currentTime + duration);
	}
}

// Main GameAudio class for managing sound instances
class GameAudio {
	constructor(audioContext = null) {
		this.audioContext = audioContext;
		this.output = new AudioOutput(this.audioContext);
		this.analysis = new AnalysisNode(this.audioContext);
		this.sounds = {};
		
		// Connect output to analysis by default:
		this.output.connectAnalysis(this.analysis);
		this.loadSounds();
	}
	
	// Static method to get or create shared AudioContext
	static async getSharedAudioContext() {
		if (!window.audioContext || window.audioContext.state === 'closed') {
			window.audioContext = new (window.AudioContext || window.webkitAudioContext)({
				// Optimize for low latency over power consumption:
				latencyHint: 'interactive',
			});
			
			if (window.audioContext.state === 'suspended') {
				await window.audioContext.resume();
			}
			
			console.log(`Shared AudioContext created - Sample rate: ${window.audioContext.sampleRate}Hz, State: ${window.audioContext.state}, Base latency: ${window.audioContext.baseLatency}s, Output latency: ${window.audioContext.outputLatency}s`);
		}
		
		return window.audioContext;
	}
	
	// Static method to get or create shared GameAudio instance
	static async getSharedInstance() {
		if (!window.gameAudio) {
			try {
				const audioContext = await GameAudio.getSharedAudioContext();
				window.gameAudio = new GameAudio(audioContext);
			} catch (error) {
				console.warn('GameAudio initialization failed:', error.message);
				// Return null so we can try again later
				return null;
			}
		}
		
		return window.gameAudio;
	}
	
	// Static method to play a sound
	static async playSound(name) {
		const instance = await GameAudio.getSharedInstance();
		instance?.playSound(name);
	}
	
	loadSounds() {
		this.sounds = {
			'jump': new JumpSound(this.output),
			'coin': new CoinSound(this.output),
			'powerup': new PowerUpSound(this.output),
			'death': new DeathSound(this.output),
			'explosion': new ExplosionSound(this.output),
			'laser': new LaserSound(this.output),
			'beep': new BeepSound(this.output),
			'blip': new BlipSound(this.output),
			'meow': new MeowSound(this.output),
			'bark': new BarkSound(this.output),
			'duck': new DuckSound(this.output),
			'alien': new AlienSound(this.output),
			'roar': new RoarSound(this.output),
			'chirp': new ChirpSound(this.output),
			'howl': new HowlSound(this.output)
		};
	}
	
	// Play a sound by name
	playSound(name) {
		const sound = this.sounds[name];
		if (sound) {
			sound.play();
		} else {
			console.warn(`Sound '${name}' not found`);
		}
	}
	
	// Get a sound instance for direct access
	getSound(name) {
		return this.sounds[name];
	}
	
	// Enable/disable visualization
	enableVisualization() {
		if (this.analysis && !this.output.analysisNode) {
			this.output.connectAnalysis(this.analysis);
		}
	}
	
	disableVisualization() {
		this.output.disconnectAnalysis();
	}
	
	// Set master volume
	setVolume(volume) {
		if (this.output) {
			this.output.setVolume(volume);
		}
	}
}

// Utility functions:
async function setVolume(volume) {
	(await GameAudio.getSharedInstance())?.setVolume(volume);
	// Update the display
	const display = document.getElementById('volume-display');
	if (display) {
		display.textContent = Math.round(volume * 100) + '%';
	}
}

async function enableVisualization() {
	(await GameAudio.getSharedInstance())?.enableVisualization();
}

async function disableVisualization() {
	(await GameAudio.getSharedInstance())?.disableVisualization();
}
