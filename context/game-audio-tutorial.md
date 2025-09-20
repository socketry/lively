# Game Audio Tutorial

This guide shows you how to add audio to your Live.js games and applications using the `live-audio` library. You'll learn how to play sound effects, background music, and create dynamic audio experiences.

## Overview

The `live-audio` library provides:

- **Synthesized sound effects** - Generated sounds like jumps, coins, explosions
- **Sample playback** - MP3/audio file playback for custom sounds and music
- **Real-time audio control** - Volume, playback control, and audio routing
- **Web Audio API integration** - Professional audio processing capabilities

## Getting Started

### Project Structure

Your Live.js project should have this basic structure:

```
my-game/
  application.rb            # Your lively application file.
  public/
    application.js          # Your main JavaScript file.
    _static/
      audio/                # Audio files directory.
```

### 1. Setting Up Audio in Your Application

First, create your main JavaScript file `public/application.js` and import the audio library:

```javascript
import { Live, ViewElement } from 'live';
import { Audio, Library } from 'live-audio';

// Start Live.js:
Live.start();

// Create a custom element with audio support:
customElements.define('live-game', class GameElement extends ViewElement {
	#audio;
	
	connectedCallback() {
		super.connectedCallback();
		
		// Initialize audio controller:
		this.#audio = Audio.start({
			window,
			onOutputCreated: (controller, output) => {
				console.log('Audio system ready');
			}
		});
		
		this.loadSounds();
	}
	
	disconnectedCallback() {
		// Clean up audio:
		if (this.#audio) {
			this.#audio.dispose();
		}
		super.disconnectedCallback();
	}
	
	loadSounds() {
		// We'll add sounds here.
	}
	
	get audio() {
		return this.#audio;
	}
});
```

### 2. Adding Synthesized Sound Effects

The library includes many pre-built synthesized sounds:

```javascript
loadSounds() {
	// Game action sounds
	this.#audio.addSound('jump', new Library.JumpSound());
	this.#audio.addSound('coin', new Library.CoinSound());
	this.#audio.addSound('powerup', new Library.PowerUpSound());
	this.#audio.addSound('death', new Library.DeathSound());
	
	// Combat sounds
	this.#audio.addSound('laser', new Library.LaserSound());
	this.#audio.addSound('explosion', new Library.ExplosionSound());
	
	// Interface sounds
	this.#audio.addSound('beep', new Library.BeepSound());
	this.#audio.addSound('blip', new Library.BlipSound());
	
	// Animal sounds
	this.#audio.addSound('meow', new Library.MeowSound());
	this.#audio.addSound('bark', new Library.BarkSound());
	this.#audio.addSound('duck', new Library.DuckSound());
	this.#audio.addSound('roar', new Library.RoarSound());
	this.#audio.addSound('howl', new Library.HowlSound());
	this.#audio.addSound('chirp', new Library.ChirpSound());
}
```

### 3. Playing Sounds

To play sounds from your Ruby application, you need to connect your custom element to a Ruby view and use the `script(...)` method.

**Ruby Application (`application.rb`):**

```ruby
require 'lively'

class GameView < Live::View
	def tag_name
		# This must correspond to the tag you defined in `application.js` since we are depending on client-side JavaScript.
		"live-game"
	end
	
	def play_sound(sound_name)
		# Use script() to call JavaScript methods on your custom element
		script("this.audio.playSound('#{sound_name}')")
	end
	
	def player_jump
		@player.jump
		play_sound('jump')  # Play jump sound
	end
	
	def collect_coin
		@score += 10
		play_sound('coin')   # Play coin sound
	end
	
	def player_dies
		@lives -= 1
		play_sound('death')  # Play death sound
	end
end
```

### 4. Custom Sound Effects

You can create your own synthesized sound effects by extending the `Sound` class. Here's a complete example of creating a custom "bounce" sound:

```javascript
import { Sound } from 'live-audio';

class BounceSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const inputNode = output.input;
		
		// Create oscillator and gain nodes:
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const antiClipGain = audioContext.createGain();
		
		// Configure the oscillator:
		oscillator.type = 'sine';
		oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
		oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.2);
		
		// Set volume to prevent clipping
		antiClipGain.gain.value = 0.6;
		
		// Create an envelope: attack, decay, sustain, release:
		this.createEnvelope(audioContext, gainNode, 0.01, 0.05, 0.3, 0.15, 0.2);
		
		// Connect the audio graph:
		oscillator.connect(antiClipGain);
		antiClipGain.connect(gainNode);
		gainNode.connect(inputNode);
		
		// Start and stop the sound:
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.2);
	}
}
```

Then add it to your audio controller in the `loadSounds()` method:

```javascript
loadSounds() {
	// Add built-in sounds:
	this.#audio.addSound('jump', new Library.JumpSound());
	this.#audio.addSound('coin', new Library.CoinSound());
	
	// Add your custom sound:
	this.#audio.addSound('bounce', new BounceSound());
}
```

Now you can play your custom sound from Ruby:

```ruby
def ball_bounce
	@ball.bounce
	play_sound('bounce')  # Play your custom bounce sound
end
```

#### Understanding the `createEnvelope` Method

The `createEnvelope` method shapes how your sound's volume changes over time:

```javascript
// createEnvelope(audioContext, gainNode, attack, decay, sustain, release, duration)
this.createEnvelope(audioContext, gainNode, 0.1, 0.3, 0.6, 1.1, 1.5);
```

- **Attack (0.1s)**: How quickly the sound reaches full volume
- **Decay (0.3s)**: How quickly it drops to sustain level  
- **Sustain (0.6)**: The volume level maintained (0.0 to 1.0)
- **Release (1.1s)**: How long the fade-out takes
- **Duration (1.5s)**: Total sound length

### Using Audio Samples

You can also use audio samples (like MP3 or WAV files) for more complex sounds or music. Place your audio files in the `public/_static/audio/` directory.

Then load and play them like this:

```javascript
loadSounds() {
	// Load an audio sample
	this.#audio.addSound('jump', new Library.SampleSound('/_static/audio/jump.mp3'));
}
```

#### Background Music

To add background music, load a sample and play it in a loop:

```javascript
loadSounds() {
	// Load background music with looping:
	this.#audio.addSound('music', new Library.BackgroundMusicSound('/_static/audio/music.mp3'));
	
	// For more control over loop points (optional):
	this.#audio.addSound('theme', new Library.BackgroundMusicSound(
		'/_static/audio/theme.mp3', 
		{
			loopStart: 5.2,    // Loop start time in seconds
			loopEnd: 45.8      // Loop end time in seconds
		}
	));
}

// Start background music when audio system is ready:
onOutputCreated: (controller, output) => {
	console.log('Audio system ready');
	this.#audio.playSound('music');
}
```

You can also control background music from your Ruby application:

```ruby
def start_level
	@level += 1
	play_sound('music')  # Start background music
end

def pause_game
	@paused = true
	script("this.audio.stopSound('music')")  # Stop background music
end

def resume_game
	@paused = false
	play_sound('music')  # Resume background music
end
```
