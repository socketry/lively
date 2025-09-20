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

// Create a custom element with audio support:
customElements.define('live-game', class GameElement extends ViewElement {
	#audio;
	
	connectedCallback() {
		super.connectedCallback();
		
		// Initialize audio controller
		this.#audio = Audio.start({
			window,
			onOutputCreated: (controller, output) => {
				console.log('Audio system ready');
				this.loadSounds();
			}
		});
	}
	
	disconnectedCallback() {
		// Clean up audio
		if (this.#audio) {
			this.#audio.dispose();
		}
		super.disconnectedCallback();
	}
	
	loadSounds() {
		// We'll add sounds here
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
