// Analysis Node - handles waveform visualization and audio quality monitoring
export class Visualizer {
	constructor(audioContext, waveformCanvas = null, alertCanvas = null) {
		this.audioContext = audioContext;
		this.analyser = audioContext.createAnalyser();
		this.analyser.fftSize = 2048;
		this.analyser.smoothingTimeConstant = 0.8;
		
		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
		this.canvas = waveformCanvas;
		this.canvasContext = null;
		this.alertCanvas = alertCanvas;
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
		
		// Only set up canvas and start visualization if canvases are provided
		if (this.canvas || this.alertCanvas) {
			try {
				this.setupCanvas();
				this.startVisualization();
			} catch (error) {
				console.warn('Visualizer canvas setup failed:', error.message);
				this.canvasContext = null;
				this.alertContext = null;
			}
		}
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
		// Use provided canvases or fall back to finding/creating them
		if (!this.canvas) {
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
		}
		
		if (this.canvas) {
			this.canvasContext = this.canvas.getContext('2d');
		}
		
		if (!this.alertCanvas) {
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
				if (this.canvas && this.canvas.parentNode) {
					this.canvas.parentNode.insertBefore(this.alertCanvas, this.canvas.nextSibling);
				} else {
					document.body.appendChild(this.alertCanvas);
				}
			}
		}
		
		if (this.alertCanvas) {
			this.alertContext = this.alertCanvas.getContext('2d');
		}
	}
	
	startVisualization() {
		// Don't start visualization if canvas contexts are not available
		if (!this.canvasContext || !this.alertContext) {
			return;
		}
		
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
		if (!this.canvasContext || !this.canvas) return;
		
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
		if (!this.alertContext || !this.alertCanvas) return;
		
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
