// CS 1.6 Classic Rules JavaScript Implementation
// Extracted from cs16_classic_rules.rb for better maintainability

console.log('CS 1.6 Classic: Initializing game with strict classic rules...');

// DOM Resilience System for Lively Framework
// Handles dynamic DOM updates and ensures Buy Menu works properly
(function() {
	// Monitor DOM changes to reattach events when needed
	let domObserver = null;
	let lastBuyMenuState = 'none';
	
	// Setup DOM observer for Lively updates
	function setupDOMMonitor() {
		if (domObserver) {
			domObserver.disconnect();
		}
		
		domObserver = new MutationObserver(function(mutations) {
			// Check if buy menu was added/removed
			const buyMenu = document.getElementById('buy-menu');
			if (buyMenu) {
				// Preserve buy menu state across DOM updates
				if (lastBuyMenuState === 'block' && buyMenu.style.display === 'none') {
					console.log('DOM Update detected: Restoring buy menu state');
					buyMenu.style.display = 'block';
					buyMenu.style.pointerEvents = 'auto';
					buyMenu.style.zIndex = '9999';
				}
				
				// Reattach event listeners if needed
				ensureBuyMenuEvents();
			}
		});
		
		// Start observing when DOM is ready
		if (document.body) {
			domObserver.observe(document.body, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ['style', 'class']
			});
			console.log('DOM Monitor: Active and watching for changes');
		} else {
			// Retry when body is available
			setTimeout(setupDOMMonitor, 100);
		}
	}
	
	// Ensure buy menu events are attached
	function ensureBuyMenuEvents() {
		// Use event delegation on document level to survive DOM updates
		if (!window._buyMenuEventsAttached) {
			document.addEventListener('click', function(e) {
				// Handle buy button clicks
				if (e.target.id === 'buy-button' || e.target.closest('#buy-button')) {
					e.preventDefault();
					e.stopPropagation();
					window.toggleBuyMenu();
				}
				
				// Handle weapon purchase clicks
				if (e.target.classList.contains('weapon-item') || e.target.closest('.weapon-item')) {
					const item = e.target.closest('.weapon-item');
					const weaponId = item.getAttribute('data-weapon');
					if (weaponId && typeof purchaseWeapon === 'function') {
						purchaseWeapon(weaponId);
					}
				}
			}, true);
			
			window._buyMenuEventsAttached = true;
			console.log('Buy Menu: Event delegation attached');
		}
	}
	
	// Track buy menu state
	window.addEventListener('click', function() {
		const buyMenu = document.getElementById('buy-menu');
		if (buyMenu) {
			lastBuyMenuState = window.getComputedStyle(buyMenu).display;
		}
	});
	
	// Initialize DOM monitor
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', setupDOMMonitor);
	} else {
		setupDOMMonitor();
	}
	
	console.log('DOM Resilience System: Initialized for Lively Framework');
})();

// Classic CS 1.6 Configuration
const CLASSIC_CONFIG = {
	// Timing
	ROUND_TIME: 115, // 1:55
	FREEZE_TIME: 15, // 15 seconds freeze
	BUY_TIME: 90, // Can buy for 90 seconds
	C4_TIMER: 35, // 35 second bomb timer
	PLANT_TIME: 3, // 3 seconds to plant
	DEFUSE_TIME: 10, // 10 seconds without kit
	DEFUSE_TIME_KIT: 5, // 5 seconds with kit
	
	// Economy
	STARTING_MONEY: 800,
	MAX_MONEY: 16000,
	WIN_ELIMINATION: 3250,
	WIN_BOMB_DEFUSED: 3500,
	WIN_BOMB_EXPLODED: 3500,
	WIN_TIME_EXPIRED: 3250,
	LOSS_BASE: 1400,
	LOSS_INCREMENT: 500,
	LOSS_MAX: 3400,
	PLANT_BONUS: 800,
	DEFUSE_BONUS: 300,
	
	// Weapons (Classic CS 1.6 prices)
	WEAPON_PRICES: {
		// Pistols
		glock: 0, usp: 0, p228: 600, deagle: 650, fiveseven: 750, elite: 800,
		// SMGs
		mac10: 1400, tmp: 1250, mp5: 1500, ump45: 1700, p90: 2350,
		// Shotguns
		m3: 1700, xm1014: 3000,
		// Rifles
		galil: 2000, famas: 2250, ak47: 2500, m4a1: 3100, sg552: 3500, aug: 3500,
		// Snipers
		scout: 2750, awp: 4750, g3sg1: 5000, sg550: 4200,
		// Machine Gun
		m249: 5750,
		// Equipment
		kevlar: 650, kevlar_helmet: 1000, defuse: 200, nvg: 1250,
		// Grenades
		hegrenade: 300, flashbang: 200, smokegrenade: 300
	},
	
	// Kill rewards (Classic)
	KILL_REWARDS: {
		knife: 1500,
		pistol: 300,
		smg: 600,
		shotgun: 900,
		rifle: 300,
		sniper: 100,
		grenade: 300,
		other: 300
	},
	
	// Movement speeds (Classic)
	MOVEMENT_SPEEDS: {
		base: 250,
		walk: 130,
		crouch: 85,
		ladder: 150,
		weapon_modifiers: {
			knife: 1.2,
			pistol: 1.0,
			smg: 0.95,
			rifle: 0.85,
			sniper: 0.65,
			m249: 0.6
		}
	},
	
	// Damage values (Classic)
	DAMAGE_VALUES: {
		ak47: { base: 36, headshot: 143, armor_pen: 0.9 },
		m4a1: { base: 33, headshot: 131, armor_pen: 0.9 },
		awp: { base: 115, headshot: 415, armor_pen: 0.95 },
		deagle: { base: 48, headshot: 149, armor_pen: 0.85 },
		usp: { base: 34, headshot: 102, armor_pen: 0.75 },
		glock: { base: 28, headshot: 84, armor_pen: 0.75 }
	},
	
	// Map settings
	MAP_WIDTH: 1280,
	MAP_HEIGHT: 720,
	
	// Network
	TICK_RATE: 64,
	UPDATE_RATE: 30
};

// Game state - will be initialized by the Ruby view
let gameState = null;

// Input state
const input = {
	keys: {},
	mouse: { x: 0, y: 0, down: false },
	angle: 0
};

// Canvas references - will be set by initializeGame
let canvas = null;
let ctx = null;
let minimapCanvas = null;
let minimapCtx = null;

// Initialize game function - called from Ruby with player ID
function initializeGame(localPlayerId) {
	console.log('CS 1.6 Classic: Starting initialization with player ID:', localPlayerId);
	
	// Initialize game state
	gameState = {
		localPlayerId: localPlayerId,
		players: {},
		bullets: [],
		grenades: [],
		smokeAreas: [],
		flashEffects: [],
		bomb: null,
		round: 1,
		maxRounds: 30,
		freezeTime: CLASSIC_CONFIG.FREEZE_TIME,
		buyTime: CLASSIC_CONFIG.BUY_TIME,
		roundTime: CLASSIC_CONFIG.ROUND_TIME,
		ctScore: 0,
		tScore: 0,
		phase: 'freeze',
		consecutiveLosses: { ct: 0, t: 0 },
		viewportX: 0,
		viewportY: 0,
		killfeed: [],
		chatMessages: [],
		lastUpdate: Date.now()
	};
	
	console.log('CS 1.6 Classic: Game state initialized');
	
	// Initialize local player immediately to prevent null reference errors
	gameState.players[gameState.localPlayerId] = {
		id: gameState.localPlayerId,
		name: 'You',
		team: 'ct',
		x: 200,
		y: 360,
		angle: 0,
		health: 100,
		armor: 0,
		alive: true,
		money: 800,
		currentWeapon: 'usp',
		grenades: { he: 0, flash: 2, smoke: 1 },
		hasDefuseKit: false,
		kills: 0,
		deaths: 0,
		assists: 0,
		score: 0,
		damage_taken: 0,
		damage_given: 0
	};
	
	// Get canvas and context
	canvas = document.getElementById('game-canvas');
	if (!canvas) {
		console.error('CS 1.6 Classic: Canvas element not found!');
		return;
	}
	
	ctx = canvas.getContext('2d');
	if (!ctx) {
		console.error('CS 1.6 Classic: Failed to get canvas 2D context');
		return;
	}
	
	console.log('CS 1.6 Classic: Canvas initialized successfully', canvas.width, 'x', canvas.height);
	
	minimapCanvas = document.getElementById('minimap');
	minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
	
	// Prevent canvas from blocking keyboard events
	canvas.addEventListener('click', (e) => {
		// Don't focus canvas when clicked
		e.preventDefault();
		// Keep focus on document for keyboard events
		canvas.blur();
	});
	
	// Initialize bot players for classic 5v5 gameplay
	try {
		initializeBotPlayers();
		console.log('CS 1.6 Classic: Bot players initialized');
	} catch (error) {
		console.error('CS 1.6 Classic: Error initializing bots:', error);
	}
	
	// Initialize input handlers
	try {
		initializeInputHandlers();
		console.log('CS 1.6 Classic: Input handlers initialized');
	} catch (error) {
		console.error('CS 1.6 Classic: Error initializing input:', error);
	}
	
	// Initialize shop system after page load
	setTimeout(() => {
		try {
			// Ensure buy menu exists and is properly initialized
			const buyMenu = document.getElementById('buy-menu');
			if (buyMenu) {
				console.log('Buy menu found during initialization');
				// Ensure it starts hidden but is ready to be shown
				buyMenu.style.display = 'none';
				buyMenu.style.pointerEvents = 'auto';
				buyMenu.style.zIndex = '1000';
			} else {
				console.error('Buy menu not found during initialization!');
			}
			
			initializeShopSystem();
			updateMoneyDisplay();
		} catch (error) {
			console.error('CS 1.6 Classic: Error initializing shop:', error);
		}
	}, 100);
	
	// Hide loading screen immediately
	const loadingScreen = document.getElementById('loading-screen');
	if (loadingScreen) {
		loadingScreen.style.display = 'none';
		console.log('CS 1.6 Classic: Loading screen hidden');
	} else {
		console.log('CS 1.6 Classic: No loading screen found');
	}
	console.log('CS 1.6 Classic: Game ready with classic rules!');
	
	// Start a simple test render instead of full game loop
	console.log('CS 1.6 Classic: Starting test render...');
	testRender();
}

// Simple test render to verify canvas works
function testRender() {
	console.log('CS 1.6 Classic: Test render starting...');
	
	if (!ctx) {
		console.error('CS 1.6 Classic: No context for test render');
		return;
	}
	
	// Clear canvas with dark gray
	ctx.fillStyle = '#2a2a2a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Draw test text
	ctx.fillStyle = '#ffffff';
	ctx.font = '48px Arial';
	ctx.textAlign = 'center';
	ctx.fillText('CS 1.6 Classic', canvas.width / 2, canvas.height / 2 - 50);
	
	// Draw buy button reminder
	ctx.font = '24px Arial';
	ctx.fillStyle = '#ff6b00';
	ctx.fillText('Press B for Buy Menu', canvas.width / 2, canvas.height / 2);
	
	// Draw money
	ctx.fillStyle = '#00ff00';
	ctx.fillText('Money: $800', canvas.width / 2, canvas.height / 2 + 50);
	
	console.log('CS 1.6 Classic: Test render complete!');
	
	// Start the actual game loop after a delay
	setTimeout(() => {
		console.log('CS 1.6 Classic: Starting real game loop...');
		gameLoop();
	}, 1000);
}

// Initialize all bot players
function initializeBotPlayers() {
	// Add CT bots (4 more to make 5 total with local player)
	for (let i = 0; i < 4; i++) {
		const botId = `bot_ct_${i}`;
		gameState.players[botId] = {
			id: botId,
			name: `CT Bot ${i + 1}`,
			team: 'ct',
			x: 200 + (i * 30),
			y: 330 + (i * 20),
			angle: 0,
			health: 100,
			armor: 0,
			alive: true,
			money: 800,
			currentWeapon: 'usp',
			grenades: { he: 0, flash: 1, smoke: 0 },
			hasDefuseKit: false,
			kills: 0,
			deaths: 0,
			assists: 0,
			score: 0,
			damage_taken: 0,
			damage_given: 0
		};
	}
	
	// Add T bots (5 total)
	for (let i = 0; i < 5; i++) {
		const botId = `bot_t_${i}`;
		gameState.players[botId] = {
			id: botId,
			name: `T Bot ${i + 1}`,
			team: 't',
			x: 1080 - (i * 30),
			y: 330 + (i * 20),
			angle: Math.PI,
			health: 100,
			armor: 0,
			alive: true,
			money: 800,
			currentWeapon: 'glock',
			grenades: { he: 0, flash: 1, smoke: 0 },
			hasDefuseKit: false,
			kills: 0,
			deaths: 0,
			assists: 0,
			score: 0,
			damage_taken: 0,
			damage_given: 0
		};
	}
	
	console.log('CS 1.6 Classic: Initialized', Object.keys(gameState.players).length, 'players for 5v5 match');
	
	// Give bomb to random T player
	const tPlayers = Object.values(gameState.players).filter(p => p.team === 't');
	if (tPlayers.length > 0) {
		const bombCarrier = tPlayers[Math.floor(Math.random() * tPlayers.length)];
		bombCarrier.bomb = true;
		console.log(`${bombCarrier.name} has the bomb!`);
	}
}

// Classic CS 1.6 game loop
function gameLoop() {
	try {
		const now = Date.now();
		const deltaTime = (now - gameState.lastUpdate) / 1000;
		gameState.lastUpdate = now;
		
		// Update game state
		updateGame(deltaTime);
		
		// Render game
		render();
		
		requestAnimationFrame(gameLoop);
	} catch (error) {
		console.error('CS 1.6 Classic: Error in game loop:', error);
		console.error('Stack trace:', error.stack);
	}
}

function updateGame(deltaTime) {
	// Update round timers
	if (gameState.phase === 'freeze') {
		gameState.freezeTime -= deltaTime;
		if (gameState.freezeTime <= 0) {
			gameState.phase = 'playing';
			console.log('CS 1.6 Classic: Round started!');
		}
		updateFreezeTimeDisplay(Math.ceil(gameState.freezeTime));
	} else if (gameState.phase === 'playing') {
		gameState.roundTime -= deltaTime;
		if (gameState.roundTime <= 0) {
			endRound('ct', 'time_expired');
		}
		updateRoundTimer(Math.ceil(gameState.roundTime));
		
		// Update buy time
		const buyTimeLeft = CLASSIC_CONFIG.BUY_TIME - (CLASSIC_CONFIG.ROUND_TIME - gameState.roundTime);
		if (buyTimeLeft > 0) {
			updateBuyTimeDisplay(Math.ceil(buyTimeLeft));
		} else {
			hideBuyTimeDisplay();
		}
	}
	
	// Update bomb timer if planted
	if (gameState.bomb && gameState.bomb.planted) {
		gameState.bomb.timeLeft -= deltaTime;
		if (gameState.bomb.timeLeft <= 0) {
			bombExploded();
		}
		updateC4Timer(Math.ceil(gameState.bomb.timeLeft));
	}
	
	// Update player movement
	updatePlayerMovement(deltaTime);
	
	// Update bot AI
	updateBotAI(deltaTime);
	
	// Update bullets
	updateBullets(deltaTime);
	
	// Update grenades
	updateGrenades(deltaTime);
	
	// Update smoke areas
	updateSmokeAreas(deltaTime);
	
	// Update flash effects
	updateFlashEffects(deltaTime);
	
	// Check round end conditions
	checkRoundEndConditions();
}

function render() {
	if (!ctx) return;
	
	// Clear canvas
	ctx.fillStyle = '#2a2a2a';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Apply viewport transform
	ctx.save();
	ctx.translate(-gameState.viewportX, -gameState.viewportY);
	
	// Render map
	renderMap();
	
	// Render bomb sites
	renderBombSites();
	
	// Render smoke
	renderSmoke();
	
	// Render players
	renderPlayers();
	
	// Render bullets
	renderBullets();
	
	// Render grenades
	renderGrenades();
	
	// Render bomb if planted
	if (gameState.bomb && gameState.bomb.planted) {
		renderBomb();
	}
	
	ctx.restore();
	
	// Render HUD elements (not affected by viewport)
	renderHUD();
	renderCrosshair();
	renderMinimap();
	renderFlashEffects();
}

function renderMap() {
	// Classic dust2 style map
	ctx.strokeStyle = '#555';
	ctx.lineWidth = 3;
	
	// Outer walls
	ctx.strokeRect(50, 50, CLASSIC_CONFIG.MAP_WIDTH - 100, CLASSIC_CONFIG.MAP_HEIGHT - 100);
	
	// Mid walls
	ctx.beginPath();
	ctx.moveTo(640, 50);
	ctx.lineTo(640, 300);
	ctx.moveTo(640, 420);
	ctx.lineTo(640, 670);
	ctx.stroke();
	
	// Boxes and cover
	ctx.fillStyle = '#444';
	// A site boxes
	ctx.fillRect(200, 150, 60, 60);
	ctx.fillRect(300, 200, 40, 40);
	// B site boxes
	ctx.fillRect(900, 500, 60, 60);
	ctx.fillRect(1000, 450, 40, 40);
}

function renderBombSites() {
	// A site
	ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
	ctx.fillRect(150, 100, 200, 200);
	ctx.fillStyle = '#ff6400';
	ctx.font = 'bold 36px Arial';
	ctx.textAlign = 'center';
	ctx.fillText('A', 250, 200);
	
	// B site
	ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
	ctx.fillRect(900, 400, 200, 200);
	ctx.fillStyle = '#ff6400';
	ctx.fillText('B', 1000, 500);
}

function renderPlayers() {
	for (const player of Object.values(gameState.players)) {
		if (!player.alive) continue;
		
		// Player body
		ctx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ffaa00';
		ctx.beginPath();
		ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
		ctx.fill();
		
		// Player direction indicator
		ctx.strokeStyle = ctx.fillStyle;
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(player.x, player.y);
		ctx.lineTo(
			player.x + Math.cos(player.angle) * 25,
			player.y + Math.sin(player.angle) * 25
		);
		ctx.stroke();
		
		// Player name
		ctx.fillStyle = '#fff';
		ctx.font = '12px Arial';
		ctx.textAlign = 'center';
		ctx.fillText(player.name, player.x, player.y - 25);
		
		// Health bar
		const barWidth = 30;
		const barHeight = 4;
		const healthPercent = player.health / 100;
		ctx.fillStyle = '#000';
		ctx.fillRect(player.x - barWidth/2, player.y - 35, barWidth, barHeight);
		ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
		ctx.fillRect(player.x - barWidth/2, player.y - 35, barWidth * healthPercent, barHeight);
		
		// Bomb carrier indicator
		if (player.bomb) {
			ctx.fillStyle = '#ff0000';
			ctx.font = 'bold 16px Arial';
			ctx.fillText('💣', player.x, player.y + 35);
		}
		
		// Defuse kit indicator
		if (player.defuseKit) {
			ctx.fillStyle = '#00ff00';
			ctx.font = '12px Arial';
			ctx.fillText('🔧', player.x + 15, player.y);
		}
	}
}

function renderBullets() {
	ctx.strokeStyle = '#ffff00';
	ctx.lineWidth = 2;
	
	for (const bullet of gameState.bullets) {
		ctx.beginPath();
		ctx.moveTo(bullet.x - bullet.vx * 0.05, bullet.y - bullet.vy * 0.05);
		ctx.lineTo(bullet.x, bullet.y);
		ctx.stroke();
	}
}

function renderGrenades() {
	for (const grenade of gameState.grenades) {
		if (grenade.type === 'flashbang') {
			ctx.fillStyle = '#ffffff';
		} else if (grenade.type === 'smoke') {
			ctx.fillStyle = '#888888';
		} else if (grenade.type === 'he') {
			ctx.fillStyle = '#ff0000';
		}
		
		ctx.beginPath();
		ctx.arc(grenade.x, grenade.y, 5, 0, Math.PI * 2);
		ctx.fill();
	}
}

function renderSmoke() {
	for (const smoke of gameState.smokeAreas) {
		const opacity = Math.min(1, smoke.duration / 18);
		ctx.fillStyle = `rgba(150, 150, 150, ${opacity * 0.8})`;
		
		// Multiple circles for smoke effect
		for (let i = 0; i < 5; i++) {
			const offsetX = (Math.random() - 0.5) * 20;
			const offsetY = (Math.random() - 0.5) * 20;
			const radius = smoke.radius + (Math.random() * 30);
			
			ctx.globalAlpha = opacity * 0.6;
			ctx.beginPath();
			ctx.arc(smoke.x + offsetX, smoke.y + offsetY, radius, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.globalAlpha = 1;
}

function renderBomb() {
	const bomb = gameState.bomb;
	
	// Bomb model
	ctx.fillStyle = '#ff0000';
	ctx.fillRect(bomb.x - 10, bomb.y - 10, 20, 20);
	
	// Blinking light
	const blink = Math.sin(Date.now() * 0.01) > 0;
	if (blink) {
		ctx.fillStyle = '#ffff00';
		ctx.beginPath();
		ctx.arc(bomb.x, bomb.y, 5, 0, Math.PI * 2);
		ctx.fill();
	}
	
	// Timer text
	ctx.fillStyle = '#ff0000';
	ctx.font = 'bold 16px Arial';
	ctx.textAlign = 'center';
	ctx.fillText(bomb.timeLeft.toFixed(1) + 's', bomb.x, bomb.y - 20);
}

function renderCrosshair() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2;
	
	// Dynamic crosshair based on CS 1.6 mechanics
	let gap = 5;
	let length = 10;
	
	// Expand crosshair based on movement and weapon
	const isMoving = input.keys['KeyW'] || input.keys['KeyA'] || 
					input.keys['KeyS'] || input.keys['KeyD'];
	const isCrouching = input.keys['ControlLeft'] || input.keys['ControlRight'];
	const isWalking = input.keys['ShiftLeft'] || input.keys['ShiftRight'];
	
	// Base crosshair expansion
	let expansion = 0;
	
	if (isMoving) {
		expansion += isCrouching ? 2 : isWalking ? 4 : 8;
	}
	
	// Weapon-specific expansion
	if (player.currentWeapon === 'primary') {
		const primaryWeapon = player.primaryWeapon;
		if (['ak47', 'm4a1'].includes(primaryWeapon)) {
			expansion += isMoving ? 6 : 2;
		} else if (['awp', 'scout'].includes(primaryWeapon)) {
			expansion += isMoving ? 3 : 1;
		}
	}
	
	// Apply expansion
	gap += expansion;
	length = Math.max(8, 15 - expansion * 0.3);
	
	// Crosshair color - green for normal, red when aiming at enemy
	ctx.strokeStyle = '#00ff00';
	ctx.lineWidth = 2;
	
	// Add slight transparency for better visibility
	ctx.globalAlpha = 0.9;
	
	// Draw crosshair with classic CS 1.6 style
	ctx.beginPath();
	
	// Horizontal lines
	ctx.moveTo(centerX - gap - length, centerY);
	ctx.lineTo(centerX - gap, centerY);
	ctx.moveTo(centerX + gap, centerY);
	ctx.lineTo(centerX + gap + length, centerY);
	
	// Vertical lines  
	ctx.moveTo(centerX, centerY - gap - length);
	ctx.lineTo(centerX, centerY - gap);
	ctx.moveTo(centerX, centerY + gap);
	ctx.lineTo(centerX, centerY + gap + length);
	
	ctx.stroke();
	
	// Center dot (optional - classic CS had setting for this)
	if (true) { // Could be made configurable
		ctx.fillStyle = '#00ff00';
		ctx.globalAlpha = 0.7;
		ctx.fillRect(centerX - 1, centerY - 1, 2, 2);
	}
	
	// Reset alpha
	ctx.globalAlpha = 1.0;
	
	// Add scope overlay for sniper rifles
	if (player.currentWeapon === 'primary' && 
		['awp', 'scout', 'g3sg1', 'sg550'].includes(player.primaryWeapon) &&
		input.mouse.down) {
		renderScopeOverlay(centerX, centerY);
	}
}

function renderScopeOverlay(centerX, centerY) {
	// Simple scope overlay for sniper rifles
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 2;
	ctx.globalAlpha = 0.8;
	
	// Scope circle
	ctx.beginPath();
	ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
	ctx.stroke();
	
	// Scope crosshairs
	ctx.beginPath();
	ctx.moveTo(centerX - 80, centerY);
	ctx.lineTo(centerX + 80, centerY);
	ctx.moveTo(centerX, centerY - 80);
	ctx.lineTo(centerX, centerY + 80);
	ctx.stroke();
	
	// Darken areas outside scope
	ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
	ctx.fillRect(0, 0, canvas.width, centerY - 80);
	ctx.fillRect(0, centerY + 80, canvas.width, canvas.height - centerY - 80);
	ctx.fillRect(0, centerY - 80, centerX - 80, 160);
	ctx.fillRect(centerX + 80, centerY - 80, canvas.width - centerX - 80, 160);
	
	ctx.globalAlpha = 1.0;
}

function renderMinimap() {
	if (!minimapCtx) return;
	
	const scale = 200 / CLASSIC_CONFIG.MAP_WIDTH;
	
	// Clear minimap
	minimapCtx.fillStyle = '#1a1a1a';
	minimapCtx.fillRect(0, 0, 200, 200);
	
	// Draw map outline
	minimapCtx.strokeStyle = '#555';
	minimapCtx.lineWidth = 1;
	minimapCtx.strokeRect(0, 0, 200, 200);
	
	// Draw bomb sites
	minimapCtx.fillStyle = 'rgba(255, 100, 0, 0.3)';
	// A site
	minimapCtx.fillRect(150 * scale, 100 * scale, 200 * scale, 200 * scale);
	// B site
	minimapCtx.fillRect(900 * scale, 400 * scale, 200 * scale, 200 * scale);
	
	// Draw players
	for (const player of Object.values(gameState.players)) {
		if (!player.alive) continue;
		
		minimapCtx.fillStyle = player.team === 'ct' ? '#4444ff' : '#ffaa00';
		minimapCtx.beginPath();
		minimapCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
		minimapCtx.fill();
		
		// Highlight local player
		if (player.id === gameState.localPlayerId) {
			minimapCtx.strokeStyle = '#00ff00';
			minimapCtx.lineWidth = 2;
			minimapCtx.stroke();
		}
	}
	
	// Draw bomb if planted
	if (gameState.bomb && gameState.bomb.planted) {
		minimapCtx.fillStyle = '#ff0000';
		minimapCtx.beginPath();
		minimapCtx.arc(gameState.bomb.x * scale, gameState.bomb.y * scale, 5, 0, Math.PI * 2);
		minimapCtx.fill();
	}
}

function renderFlashEffects() {
	for (const flash of gameState.flashEffects) {
		if (flash.playerId === gameState.localPlayerId) {
			const intensity = flash.duration / 5;
			ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.9})`;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
		}
	}
}

function renderHUD() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player) return;

	// HUD Background
	ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
	ctx.fillRect(0, canvas.height - 120, canvas.width, 120);

	// Health
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 24px Arial';
	ctx.textAlign = 'left';
	ctx.fillText('Health:', 20, canvas.height - 80);
	
	const healthPercent = player.health / 100;
	ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
	ctx.fillRect(110, canvas.height - 95, 100 * healthPercent, 20);
	ctx.strokeStyle = '#ffffff';
	ctx.strokeRect(110, canvas.height - 95, 100, 20);
	
	ctx.fillStyle = '#ffffff';
	ctx.font = '16px Arial';
	ctx.fillText(player.health.toString(), 120, canvas.height - 80);

	// Armor
	if (player.armor > 0) {
		ctx.fillText('Armor:', 20, canvas.height - 50);
		const armorPercent = player.armor / 100;
		ctx.fillStyle = '#4444ff';
		ctx.fillRect(110, canvas.height - 65, 100 * armorPercent, 20);
		ctx.strokeStyle = '#ffffff';
		ctx.strokeRect(110, canvas.height - 65, 100, 20);
		
		ctx.fillStyle = '#ffffff';
		ctx.fillText(player.armor.toString(), 120, canvas.height - 50);
	}

	// Money
	ctx.fillStyle = '#00ff00';
	ctx.font = 'bold 20px Arial';
	ctx.textAlign = 'left';
	ctx.fillText(`$${player.money}`, 240, canvas.height - 80);

	// Current weapon
	ctx.fillStyle = '#ffffff';
	ctx.font = '16px Arial';
	ctx.fillText(`Weapon: ${player.currentWeapon.toUpperCase()}`, 240, canvas.height - 55);

	// Round info
	ctx.textAlign = 'center';
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 18px Arial';
	const minutes = Math.floor(gameState.roundTime / 60);
	const seconds = Math.floor(gameState.roundTime % 60);
	ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, canvas.width / 2, 30);
	
	ctx.font = '14px Arial';
	ctx.fillText(`Round ${gameState.round}/${gameState.maxRounds}`, canvas.width / 2, 50);

	// Score
	ctx.fillStyle = '#4444ff';
	ctx.fillText(`CT: ${gameState.ctScore}`, canvas.width / 2 - 60, 70);
	ctx.fillStyle = '#ffaa00';
	ctx.fillText(`T: ${gameState.tScore}`, canvas.width / 2 + 60, 70);

	// Killfeed
	ctx.textAlign = 'right';
	ctx.font = '12px Arial';
	for (let i = 0; i < Math.min(5, gameState.killfeed.length); i++) {
		const kill = gameState.killfeed[i];
		const yPos = 100 + (i * 15);
		ctx.fillStyle = '#ffffff';
		ctx.fillText(`${kill.killer} killed ${kill.victim}`, canvas.width - 20, yPos);
	}

	// Phase indicator
	ctx.textAlign = 'center';
	ctx.font = 'bold 16px Arial';
	if (gameState.phase === 'freeze') {
		ctx.fillStyle = '#ffaa00';
		ctx.fillText(`FREEZE TIME: ${Math.ceil(gameState.freezeTime)}`, canvas.width / 2, canvas.height - 25);
	} else if (gameState.phase === 'warmup') {
		ctx.fillStyle = '#00ff00';
		ctx.fillText('WARMUP', canvas.width / 2, canvas.height - 25);
	}

	// Bomb timer if planted
	if (gameState.bomb && gameState.bomb.planted) {
		ctx.fillStyle = '#ff0000';
		ctx.font = 'bold 24px Arial';
		const bombTime = Math.ceil(gameState.bomb.timeLeft);
		ctx.fillText(`BOMB: ${bombTime}s`, canvas.width / 2, 100);
	}
}

// Helper functions for UI updates
function updateRoundTimer(seconds) {
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	const display = document.getElementById('round-timer');
	if (display) {
		display.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
	}
}

function updateFreezeTimeDisplay(seconds) {
	const indicator = document.getElementById('freeze-time-indicator');
	const timeLeft = document.getElementById('freeze-time-left');
	if (indicator && timeLeft) {
		indicator.style.display = seconds > 0 ? 'block' : 'none';
		timeLeft.textContent = seconds;
	}
}

function updateBuyTimeDisplay(seconds) {
	const indicator = document.getElementById('buy-time-indicator');
	const timeLeft = document.getElementById('buy-time-left');
	if (indicator && timeLeft) {
		indicator.style.display = 'block';
		timeLeft.textContent = seconds;
	}
}

function hideBuyTimeDisplay() {
	const indicator = document.getElementById('buy-time-indicator');
	if (indicator) {
		indicator.style.display = 'none';
	}
}

function updateC4Timer(seconds) {
	const timerDiv = document.getElementById('c4-timer');
	const countdown = document.getElementById('c4-countdown');
	if (timerDiv && countdown) {
		timerDiv.style.display = 'block';
		countdown.textContent = seconds;
		// Add urgency color
		if (seconds <= 10) {
			countdown.style.color = '#ff0000';
		} else if (seconds <= 20) {
			countdown.style.color = '#ffaa00';
		} else {
			countdown.style.color = '#ffff00';
		}
	}
}

function updatePlayerMovement(deltaTime) {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	let speed = CLASSIC_CONFIG.MOVEMENT_SPEEDS.base;
	
	// Apply weapon speed modifier
	if (player.currentWeapon === 'knife') {
		speed *= CLASSIC_CONFIG.MOVEMENT_SPEEDS.weapon_modifiers.knife;
	} else if (player.currentWeapon === 'awp' || player.currentWeapon === 'scout') {
		speed *= CLASSIC_CONFIG.MOVEMENT_SPEEDS.weapon_modifiers.sniper;
	}
	
	// Apply movement modifiers
	if (input.keys['ShiftLeft'] || input.keys['ShiftRight']) { // Walking
		speed = CLASSIC_CONFIG.MOVEMENT_SPEEDS.walk;
	}
	if (input.keys['ControlLeft'] || input.keys['ControlRight']) { // Crouching
		speed = CLASSIC_CONFIG.MOVEMENT_SPEEDS.crouch;
	}
	
	// Calculate movement using proper key codes
	let dx = 0, dy = 0;
	if (input.keys['KeyW']) dy -= 1;
	if (input.keys['KeyS']) dy += 1;
	if (input.keys['KeyA']) dx -= 1;
	if (input.keys['KeyD']) dx += 1;
	
	// Normalize diagonal movement
	if (dx !== 0 && dy !== 0) {
		dx *= 0.707;
		dy *= 0.707;
	}
	
	// Apply movement with collision detection
	const newX = player.x + dx * speed * deltaTime;
	const newY = player.y + dy * speed * deltaTime;
	
	// Check wall collisions
	if (!checkWallCollision(newX, player.y)) {
		player.x = newX;
	}
	if (!checkWallCollision(player.x, newY)) {
		player.y = newY;
	}
	
	// Update viewport to follow player
	gameState.viewportX = player.x - canvas.width / 2;
	gameState.viewportY = player.y - canvas.height / 2;
	
	// Clamp viewport to map bounds
	gameState.viewportX = Math.max(0, Math.min(CLASSIC_CONFIG.MAP_WIDTH - canvas.width, gameState.viewportX));
	gameState.viewportY = Math.max(0, Math.min(CLASSIC_CONFIG.MAP_HEIGHT - canvas.height, gameState.viewportY));
}

// Collision detection function
function checkWallCollision(x, y) {
	const playerRadius = 16;
	
	// Map boundaries (matching the strokeRect from renderMap)
	const mapBounds = {
		left: 50,
		top: 50,
		right: CLASSIC_CONFIG.MAP_WIDTH - 50,
		bottom: CLASSIC_CONFIG.MAP_HEIGHT - 50
	};
	
	// Check map boundary collisions
	if (x - playerRadius <= mapBounds.left ||
			x + playerRadius >= mapBounds.right ||
			y - playerRadius <= mapBounds.top ||
			y + playerRadius >= mapBounds.bottom) {
		return true;
	}
	
	// Wall segments matching the rendered map exactly
	const walls = [
		// Mid walls - vertical line at x=640 (matching renderMap)
		{ x1: 640, y1: 50, x2: 640, y2: 300 },   // Top section
		{ x1: 640, y1: 420, x2: 640, y2: 670 }   // Bottom section
	];
	
	// Boxes matching the rendered positions exactly
	const boxes = [
		// A site boxes (matching renderMap positions)
		{ x: 200, y: 150, w: 60, h: 60 },
		{ x: 300, y: 200, w: 40, h: 40 },
		// B site boxes (matching renderMap positions)
		{ x: 900, y: 500, w: 60, h: 60 },
		{ x: 1000, y: 450, w: 40, h: 40 }
	];
	
	// Check wall collisions (for line walls, need special handling)
	for (const wall of walls) {
		// For vertical walls (x1 === x2)
		if (wall.x1 === wall.x2) {
			if (Math.abs(x - wall.x1) <= playerRadius &&
					y + playerRadius >= wall.y1 && y - playerRadius <= wall.y2) {
				return true;
			}
		}
		// For horizontal walls (y1 === y2)  
		else if (wall.y1 === wall.y2) {
			if (Math.abs(y - wall.y1) <= playerRadius &&
					x + playerRadius >= wall.x1 && x - playerRadius <= wall.x2) {
				return true;
			}
		}
	}
	
	// Check box collisions
	for (const box of boxes) {
		if (x + playerRadius > box.x && x - playerRadius < box.x + box.w &&
				y + playerRadius > box.y && y - playerRadius < box.y + box.h) {
			return true;
		}
	}
	
	return false;
}

// Bot AI System
function updateBotAI(deltaTime) {
	for (const player of Object.values(gameState.players)) {
		if (!player.id.includes('bot_') || !player.alive) continue;
		
		updateBotBehavior(player, deltaTime);
	}
}

function updateBotBehavior(bot, deltaTime) {
	// Initialize bot AI state if not exists
	if (!bot.ai) {
		bot.ai = {
			state: 'patrol', // patrol, combat, rush_bombsite, defuse_bomb, plant_bomb
			target: null,
			lastSeen: null,
			patrolIndex: Math.floor(Math.random() * 5), // Random starting patrol point
			stateTimer: Math.random() * -2, // Random negative timer to stagger movement
			rushTarget: bot.team === 't' ? getBombSite('A') : null,
			combatRange: 300,
			patrolSpeed: 120,
			combatSpeed: 180
		};
		
		// Set patrol points based on team and spawn
		if (bot.team === 'ct') {
			bot.ai.patrolPoints = [
				{ x: 200, y: 360 }, // CT spawn
				{ x: 400, y: 300 }, // Mid approach
				{ x: 640, y: 200 }, // Mid control
				{ x: 500, y: 400 }, // Lower tunnels
				{ x: 300, y: 200 }  // Upper area
			];
		} else {
			bot.ai.patrolPoints = [
				{ x: 1080, y: 360 }, // T spawn  
				{ x: 900, y: 300 },  // T approach
				{ x: 700, y: 250 },  // Mid approach
				{ x: 800, y: 450 },  // Lower route
				{ x: 950, y: 200 }   // Upper route
			];
		}
	}
	
	bot.ai.stateTimer += deltaTime;
	
	// Check for nearby enemies
	const nearbyEnemy = findNearbyEnemy(bot);
	if (nearbyEnemy && bot.ai.state !== 'combat') {
		bot.ai.state = 'combat';
		bot.ai.target = nearbyEnemy;
		bot.ai.stateTimer = 0;
	}
	
	// Execute behavior based on current state
	switch (bot.ai.state) {
		case 'patrol':
			updateBotPatrol(bot, deltaTime);
			break;
		case 'combat':
			updateBotCombat(bot, deltaTime);
			break;
		case 'rush_bombsite':
			updateBotRush(bot, deltaTime);
			break;
		case 'plant_bomb':
			updateBotPlantBomb(bot, deltaTime);
			break;
		case 'defuse_bomb':
			updateBotDefuseBomb(bot, deltaTime);
			break;
	}
	
	// Check for bomb objectives - higher priority
	if (gameState.bomb && gameState.bomb.planted && bot.team === 'ct') {
		// CTs should prioritize defusing over everything except direct combat
		if (bot.ai.state !== 'combat') {
			bot.ai.state = 'defuse_bomb';
			bot.ai.target = { x: gameState.bomb.x, y: gameState.bomb.y };
		}
	} else if (bot.team === 't' && bot.bomb && bot.ai.state !== 'combat') {
		bot.ai.state = 'plant_bomb';
		bot.ai.target = getBombSite('A'); // Prefer A site
	} else if (bot.team === 't' && gameState.phase === 'playing' && gameState.roundTime < 30) {
		// T side should rush bomb sites when time is running low
		if (bot.ai.state === 'patrol' && Math.random() < 0.7) {
			bot.ai.state = 'rush_bombsite';
			bot.ai.rushTarget = Math.random() < 0.5 ? getBombSite('A') : getBombSite('B');
			bot.ai.stateTimer = 0;
		}
	}
	
	// Periodic state changes for variety - make bots more active
	if (bot.ai.stateTimer > 5 && bot.ai.state === 'patrol' && Math.random() < 0.3) {
		bot.ai.state = bot.team === 't' ? 'rush_bombsite' : 'patrol';
		bot.ai.rushTarget = Math.random() < 0.6 ? getBombSite('A') : getBombSite('B');
		bot.ai.stateTimer = 0;
	}
}

function updateBotPatrol(bot, deltaTime) {
	if (!bot.ai.patrolPoints || bot.ai.patrolPoints.length === 0) return;
	
	const target = bot.ai.patrolPoints[bot.ai.patrolIndex];
	const distance = Math.sqrt(
		(target.x - bot.x) ** 2 + (target.y - bot.y) ** 2
	);
	
	if (distance < 50) {
		// Reached patrol point, move to next
		bot.ai.patrolIndex = (bot.ai.patrolIndex + 1) % bot.ai.patrolPoints.length;
		// Add small random delay to make movement less predictable
		bot.ai.stateTimer = -Math.random() * 1;
	} else {
		// Move towards patrol point
		moveBotTowards(bot, target, bot.ai.patrolSpeed, deltaTime);
	}
}

function updateBotCombat(bot, deltaTime) {
	if (!bot.ai.target || !bot.ai.target.alive) {
		// Target lost, return to patrol
		bot.ai.state = 'patrol';
		bot.ai.target = null;
		return;
	}
	
	const distance = Math.sqrt(
		(bot.ai.target.x - bot.x) ** 2 + (bot.ai.target.y - bot.y) ** 2
	);
	
	if (distance > bot.ai.combatRange * 2) {
		// Target too far, return to patrol
		bot.ai.state = 'patrol';
		bot.ai.target = null;
		return;
	}
	
	// Aim at target
	bot.angle = Math.atan2(bot.ai.target.y - bot.y, bot.ai.target.x - bot.x);
	
	// Move to optimal range
	if (distance > bot.ai.combatRange) {
		moveBotTowards(bot, bot.ai.target, bot.ai.combatSpeed, deltaTime);
	} else if (distance < bot.ai.combatRange * 0.6) {
		// Too close, back away
		const dx = bot.x - bot.ai.target.x;
		const dy = bot.y - bot.ai.target.y;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len > 0) {
			moveBotTowards(bot, { 
				x: bot.x + (dx / len) * 50,
				y: bot.y + (dy / len) * 50
			}, bot.ai.combatSpeed * 0.7, deltaTime);
		}
	}
	
	// Shoot at target - more frequent shooting
	if (distance <= bot.ai.combatRange && bot.ai.stateTimer > 0.2) {
		botShoot(bot);
		bot.ai.stateTimer = Math.random() * 0.15 + 0.1; // Faster random firing rate (0.1-0.25s)
	}
}

function updateBotRush(bot, deltaTime) {
	if (!bot.ai.rushTarget) {
		bot.ai.state = 'patrol';
		return;
	}
	
	const distance = Math.sqrt(
		(bot.ai.rushTarget.x - bot.x) ** 2 + (bot.ai.rushTarget.y - bot.y) ** 2
	);
	
	if (distance < 100) {
		// Reached bombsite area
		if (bot.team === 't' && bot.bomb) {
			bot.ai.state = 'plant_bomb';
		} else {
			bot.ai.state = 'patrol';
		}
	} else {
		// Rush towards bombsite
		moveBotTowards(bot, bot.ai.rushTarget, bot.ai.combatSpeed * 1.2, deltaTime);
	}
}

function updateBotPlantBomb(bot, deltaTime) {
	const bombSite = bot.ai.target || getBombSite('A');
	const distance = Math.sqrt(
		(bombSite.x - bot.x) ** 2 + (bombSite.y - bot.y) ** 2
	);
	
	if (distance < 100) {
		// In planting range
		if (bot.bomb && bot.ai.stateTimer > 3) { // 3 second plant time
			// Determine which bomb site based on position
			const aSiteDistance = Math.sqrt((bot.x - 250) ** 2 + (bot.y - 200) ** 2);
			const bSiteDistance = Math.sqrt((bot.x - 1000) ** 2 + (bot.y - 500) ** 2);
			const plantSite = aSiteDistance < bSiteDistance ? 'A' : 'B';
			
			// Plant bomb
			gameState.bomb = {
				planted: true,
				x: bot.x,
				y: bot.y,
				timeLeft: CLASSIC_CONFIG.C4_TIMER,
				planter: bot.id,
				site: plantSite
			};
			bot.bomb = false;
			console.log(`${bot.name} planted the bomb at site ${plantSite}!`);
			
			// Add plant bonus money
			bot.money += CLASSIC_CONFIG.PLANT_BONUS;
			
			bot.ai.state = 'patrol';
		}
	} else {
		moveBotTowards(bot, bombSite, bot.ai.combatSpeed, deltaTime);
	}
}

function updateBotDefuseBomb(bot, deltaTime) {
	if (!gameState.bomb || !gameState.bomb.planted) {
		bot.ai.state = 'patrol';
		return;
	}
	
	const distance = Math.sqrt(
		(gameState.bomb.x - bot.x) ** 2 + (gameState.bomb.y - bot.y) ** 2
	);
	
	if (distance < 50) {
		// In defusing range
		const defuseTime = bot.hasDefuseKit ? CLASSIC_CONFIG.DEFUSE_TIME_KIT : CLASSIC_CONFIG.DEFUSE_TIME;
		if (bot.ai.stateTimer > defuseTime) {
			// Successfully defused bomb
			gameState.bomb = null;
			console.log(`${bot.name} defused the bomb!`);
			
			// End round - CT wins
			endRound('ct', 'bomb_defused');
			return;
		}
	} else {
		moveBotTowards(bot, { x: gameState.bomb.x, y: gameState.bomb.y }, bot.ai.combatSpeed, deltaTime);
	}
}

function moveBotTowards(bot, target, speed, deltaTime) {
	const dx = target.x - bot.x;
	const dy = target.y - bot.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	
	if (distance > 0) {
		const moveX = (dx / distance) * speed * deltaTime;
		const moveY = (dy / distance) * speed * deltaTime;
		
		// Check collisions before moving
		const newX = bot.x + moveX;
		const newY = bot.y + moveY;
		
		if (!checkWallCollision(newX, bot.y)) {
			bot.x = newX;
		}
		if (!checkWallCollision(bot.x, newY)) {
			bot.y = newY;
		}
	}
}

function findNearbyEnemy(bot) {
	let closestEnemy = null;
	let closestDistance = Infinity;
	
	for (const player of Object.values(gameState.players)) {
		if (player.team === bot.team || !player.alive) continue;
		
		const distance = Math.sqrt(
			(player.x - bot.x) ** 2 + (player.y - bot.y) ** 2
		);
		
		// Prioritize closer enemies and the local player
		if (distance <= bot.ai.combatRange) {
			if (distance < closestDistance || player.id === gameState.localPlayerId) {
				closestEnemy = player;
				closestDistance = distance;
				// If we found the local player, prioritize them
				if (player.id === gameState.localPlayerId) break;
			}
		}
	}
	return closestEnemy;
}

function botShoot(bot) {
	const speed = 1000;
	
	// Add some aim inaccuracy for realism
	const aimSpread = 0.1; // radians of spread
	const actualAngle = bot.angle + (Math.random() - 0.5) * aimSpread;
	
	// Determine damage based on weapon
	let damage = 30; // default
	if (bot.currentWeapon === 'ak47') damage = 36;
	else if (bot.currentWeapon === 'm4a1') damage = 33;
	else if (bot.currentWeapon === 'awp') damage = 115;
	else if (bot.currentWeapon === 'deagle') damage = 48;
	
	gameState.bullets.push({
		x: bot.x,
		y: bot.y,
		vx: Math.cos(actualAngle) * speed,
		vy: Math.sin(actualAngle) * speed,
		damage: damage,
		playerId: bot.id,
		distance: 0
	});
}

function getBombSite(site) {
	if (site === 'A') {
		return { x: 250, y: 200 }; // A site location
	} else {
		return { x: 1000, y: 500 }; // B site location
	}
}

function updateBullets(deltaTime) {
	for (let i = gameState.bullets.length - 1; i >= 0; i--) {
		const bullet = gameState.bullets[i];
		bullet.x += bullet.vx * deltaTime;
		bullet.y += bullet.vy * deltaTime;
		bullet.distance += Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) * deltaTime;
		
		// Check collision with players
		let bulletHit = false;
		for (const player of Object.values(gameState.players)) {
			if (!player.alive || player.id === bullet.playerId) {
				continue; // Skip dead players and bullet owner
			}
			
			const distance = Math.sqrt(
				Math.pow(player.x - bullet.x, 2) +
				Math.pow(player.y - bullet.y, 2)
			);
			
			// Player hit radius (16 pixels)
			if (distance < 16) {
				// Apply damage
				player.health -= bullet.damage;
				player.damage_taken += bullet.damage;
				
				// Update damage stats for shooter
				if (gameState.players[bullet.playerId]) {
					gameState.players[bullet.playerId].damage_given += bullet.damage;
				}
				
				// Check if player died
				if (player.health <= 0) {
					player.alive = false;
					player.health = 0;
					
					// Add kill to killfeed
					if (gameState.players[bullet.playerId]) {
						gameState.players[bullet.playerId].kills++;
						player.deaths++;
						
						gameState.killfeed.unshift({
							killer: gameState.players[bullet.playerId].name,
							victim: player.name,
							weapon: gameState.players[bullet.playerId].currentWeapon,
							headshot: false,
							timestamp: Date.now()
						});
						
						// Keep only last 5 kills in feed
						if (gameState.killfeed.length > 5) {
							gameState.killfeed.pop();
						}
					}
				}
				
				bulletHit = true;
				break; // Bullet can only hit one player
			}
		}
		
		// Check for wall collisions
		if (!bulletHit && checkWallCollision(bullet.x, bullet.y)) {
			bulletHit = true;
		}
		
		// Remove bullets that hit something or are out of bounds/traveled too far
		if (bulletHit || bullet.x < 0 || bullet.x > CLASSIC_CONFIG.MAP_WIDTH ||
				bullet.y < 0 || bullet.y > CLASSIC_CONFIG.MAP_HEIGHT ||
				bullet.distance > 1000) {
			gameState.bullets.splice(i, 1);
		}
	}
}

function updateGrenades(deltaTime) {
	for (let i = gameState.grenades.length - 1; i >= 0; i--) {
		const grenade = gameState.grenades[i];
		grenade.timer -= deltaTime;
		
		if (grenade.timer <= 0) {
			// Grenade explodes
			if (grenade.type === 'smoke') {
				gameState.smokeAreas.push({
					x: grenade.x,
					y: grenade.y,
					radius: 150,
					duration: 18
				});
			} else if (grenade.type === 'flashbang') {
				// Check line of sight to players
				for (const player of Object.values(gameState.players)) {
					const distance = Math.sqrt(
						Math.pow(player.x - grenade.x, 2) +
						Math.pow(player.y - grenade.y, 2)
					);
					if (distance < 200) {
						gameState.flashEffects.push({
							playerId: player.id,
							duration: 5 - (distance / 200) * 3
						});
					}
				}
			} else if (grenade.type === 'he') {
				// Damage nearby players
				for (const player of Object.values(gameState.players)) {
					const distance = Math.sqrt(
						Math.pow(player.x - grenade.x, 2) +
						Math.pow(player.y - grenade.y, 2)
					);
					if (distance < 300) {
						const damage = Math.max(0, 100 - distance / 3);
						player.health -= damage;
						if (player.health <= 0) {
							player.alive = false;
						}
					}
				}
			}
			gameState.grenades.splice(i, 1);
		} else {
			// Update grenade physics
			grenade.x += grenade.vx * deltaTime;
			grenade.y += grenade.vy * deltaTime;
			grenade.vx *= 0.98; // Friction
			grenade.vy *= 0.98;
		}
	}
}

function updateSmokeAreas(deltaTime) {
	for (let i = gameState.smokeAreas.length - 1; i >= 0; i--) {
		gameState.smokeAreas[i].duration -= deltaTime;
		if (gameState.smokeAreas[i].duration <= 0) {
			gameState.smokeAreas.splice(i, 1);
		}
	}
}

function updateFlashEffects(deltaTime) {
	for (let i = gameState.flashEffects.length - 1; i >= 0; i--) {
		gameState.flashEffects[i].duration -= deltaTime;
		if (gameState.flashEffects[i].duration <= 0) {
			gameState.flashEffects.splice(i, 1);
		}
	}
}

function checkRoundEndConditions() {
	if (gameState.phase !== 'playing') return;
	
	const alivePlayers = Object.values(gameState.players).filter(p => p.alive);
	const aliveCTs = alivePlayers.filter(p => p.team === 'ct');
	const aliveTs = alivePlayers.filter(p => p.team === 't');
	
	// Check if all CTs are eliminated
	if (aliveCTs.length === 0) {
		endRound('t', 'elimination');
		return;
	}
	
	// Check if all Ts are eliminated
	if (aliveTs.length === 0) {
		endRound('ct', 'elimination');
		return;
	}
}

function endRound(winningTeam, reason) {
	gameState.phase = 'round_end';
	console.log(`Round ended: ${winningTeam} wins - ${reason}`);
	
	// Update scores
	if (winningTeam === 'ct') {
		gameState.ctScore++;
		gameState.consecutiveLosses.ct = 0;
		gameState.consecutiveLosses.t++;
	} else {
		gameState.tScore++;
		gameState.consecutiveLosses.t = 0;
		gameState.consecutiveLosses.ct++;
	}
	
	// Calculate money rewards
	calculateRoundEndMoney(winningTeam, reason);
	
	// Check for half time or game end
	if (gameState.round === 15) {
		swapTeams();
	} else if (gameState.ctScore >= 16 || gameState.tScore >= 16 || gameState.round >= 30) {
		endGame();
	} else {
		// Start new round after delay
		setTimeout(startNewRound, 5000);
	}
}

function calculateRoundEndMoney(winningTeam, reason) {
	for (const player of Object.values(gameState.players)) {
		if (player.team === winningTeam) {
			// Winner bonus
			let bonus = CLASSIC_CONFIG.WIN_ELIMINATION;
			if (reason === 'bomb_defused') bonus = CLASSIC_CONFIG.WIN_BOMB_DEFUSED;
			if (reason === 'bomb_exploded') bonus = CLASSIC_CONFIG.WIN_BOMB_EXPLODED;
			player.money = Math.min(player.money + bonus, CLASSIC_CONFIG.MAX_MONEY);
		} else {
			// Loser bonus (increases with consecutive losses)
			const losses = player.team === 'ct' ? gameState.consecutiveLosses.ct : gameState.consecutiveLosses.t;
			const bonus = Math.min(
				CLASSIC_CONFIG.LOSS_BASE + (losses * CLASSIC_CONFIG.LOSS_INCREMENT),
				CLASSIC_CONFIG.LOSS_MAX
			);
			player.money = Math.min(player.money + bonus, CLASSIC_CONFIG.MAX_MONEY);
		}
	}
}

function startNewRound() {
	gameState.round++;
	gameState.phase = 'freeze';
	gameState.freezeTime = CLASSIC_CONFIG.FREEZE_TIME;
	gameState.roundTime = CLASSIC_CONFIG.ROUND_TIME;
	gameState.bomb = null;
	
	// Reset players
	for (const player of Object.values(gameState.players)) {
		player.alive = true;
		player.health = 100;
		// Spawn at team spawn points with more spread
		if (player.team === 'ct') {
			player.x = 200 + Math.random() * 150;
			player.y = 300 + Math.random() * 150;
		} else {
			player.x = 950 + Math.random() * 150;
			player.y = 300 + Math.random() * 150;
		}
	}
	
	// Give bomb to random T player
	const tPlayers = Object.values(gameState.players).filter(p => p.team === 't');
	if (tPlayers.length > 0) {
		const bombCarrier = tPlayers[Math.floor(Math.random() * tPlayers.length)];
		bombCarrier.bomb = true;
	}
	
	console.log(`Round ${gameState.round} starting...`);
}

function swapTeams() {
	console.log('Halftime! Swapping teams...');
	for (const player of Object.values(gameState.players)) {
		player.team = player.team === 'ct' ? 't' : 'ct';
	}
	// Swap scores
	const temp = gameState.ctScore;
	gameState.ctScore = gameState.tScore;
	gameState.tScore = temp;
}

function bombExploded() {
	endRound('t', 'bomb_exploded');
	// Apply explosion damage
	if (gameState.bomb) {
		for (const player of Object.values(gameState.players)) {
			const distance = Math.sqrt(
				Math.pow(player.x - gameState.bomb.x, 2) +
				Math.pow(player.y - gameState.bomb.y, 2)
			);
			if (distance < 500) {
				const damage = Math.max(0, 200 - distance / 2.5);
				player.health -= damage;
				if (player.health <= 0) {
					player.alive = false;
				}
			}
		}
	}
}

function endGame() {
	gameState.phase = 'game_over';
	const winner = gameState.ctScore > gameState.tScore ? 'Counter-Terrorists' : 'Terrorists';
	console.log(`Game Over! ${winner} win ${gameState.ctScore}-${gameState.tScore}`);
	// Show game over screen
	alert(`Game Over! ${winner} win ${gameState.ctScore}-${gameState.tScore}`);
}

// Input handlers - use document for reliable keyboard events
function initializeInputHandlers() {
	console.log('Initializing input handlers...');
	
	// Try multiple levels of event capture to ensure we get keyboard events
	const captureKeyDown = (e) => {
		console.log('Key pressed:', e.code, 'Key:', e.key);
		input.keys[e.code] = true;
		
		// Buy menu (both B and b)
		if (e.code === 'KeyB' || e.key.toLowerCase() === 'b') {
			console.log('B key pressed - attempting to toggle buy menu');
			const buyMenu = document.getElementById('buy-menu');
			if (buyMenu) {
				const currentDisplay = window.getComputedStyle(buyMenu).display;
				console.log('Current buy menu display:', currentDisplay);
				buyMenu.style.display = currentDisplay === 'none' ? 'block' : 'none';
				console.log('New buy menu display:', buyMenu.style.display);
				
				// Update money display when opening
				if (buyMenu.style.display === 'block') {
					updateMoneyDisplay();
				}
			} else {
				console.error('Buy menu element not found!');
			}
		}
		
		// ESC to close menus
		if (e.code === 'Escape') {
			const buyMenu = document.getElementById('buy-menu');
			if (buyMenu && buyMenu.style.display === 'block') {
				buyMenu.style.display = 'none';
				console.log('Buy menu closed with ESC');
			}
		}
		
		// Scoreboard
		if (e.code === 'Tab') {
			e.preventDefault();
			const scoreboard = document.getElementById('scoreboard');
			if (scoreboard) {
				scoreboard.style.display = 'block';
			}
		}
	};
	
	// Attach to multiple targets to ensure we capture events
	document.addEventListener('keydown', captureKeyDown, true);
	window.addEventListener('keydown', captureKeyDown, true);
	
	document.addEventListener('keyup', (e) => {
		input.keys[e.code] = false;
		
		if (e.code === 'Tab') {
			const scoreboard = document.getElementById('scoreboard');
			if (scoreboard) {
				scoreboard.style.display = 'none';
			}
		}
	});
	
	if (canvas) {
		canvas.addEventListener('mousemove', (e) => {
			const rect = canvas.getBoundingClientRect();
			input.mouse.x = e.clientX - rect.left;
			input.mouse.y = e.clientY - rect.top;
			
			// Calculate aim angle
			const player = gameState.players[gameState.localPlayerId];
			if (player) {
				const centerX = canvas.width / 2;
				const centerY = canvas.height / 2;
				player.angle = Math.atan2(
					input.mouse.y - centerY,
					input.mouse.x - centerX
				);
			}
		});
		
		canvas.addEventListener('mousedown', (e) => {
			if (e.button === 0) { // Left click
				input.mouse.down = true;
				shoot();
			}
		});
		
		canvas.addEventListener('mouseup', (e) => {
			if (e.button === 0) {
				input.mouse.down = false;
			}
		});
	}
}

// Shop System
function initializeShopSystem() {
	// Add click listeners to weapon items
	const weaponItems = document.querySelectorAll('.weapon-item');
	weaponItems.forEach(item => {
		item.addEventListener('click', (e) => {
			const weaponId = item.getAttribute('data-weapon');
			if (weaponId) {
				purchaseWeapon(weaponId);
			}
		});
		
		// Add hover effects
		item.addEventListener('mouseenter', (e) => {
			item.style.border = '1px solid #ff6b00';
			item.style.backgroundColor = 'rgba(255, 107, 0, 0.1)';
		});
		
		item.addEventListener('mouseleave', (e) => {
			item.style.border = '1px solid transparent';
			item.style.backgroundColor = 'transparent';
		});
	});
	
	// Add click listeners to equipment items
	const equipmentItems = document.querySelectorAll('.equipment-item');
	equipmentItems.forEach(item => {
		item.addEventListener('click', (e) => {
			const equipmentId = item.getAttribute('data-equipment');
			if (equipmentId) {
				purchaseWeapon(equipmentId);
			}
		});
		
		// Add hover effects
		item.addEventListener('mouseenter', (e) => {
			item.style.border = '1px solid #ff6b00';
			item.style.backgroundColor = 'rgba(255, 107, 0, 0.1)';
		});
		
		item.addEventListener('mouseleave', (e) => {
			item.style.border = '1px solid transparent';
			item.style.backgroundColor = 'transparent';
		});
	});
	
	// Add click listeners to grenade items
	const grenadeItems = document.querySelectorAll('.grenade-item');
	grenadeItems.forEach(item => {
		item.addEventListener('click', (e) => {
			const grenadeId = item.getAttribute('data-grenade');
			if (grenadeId) {
				purchaseWeapon(grenadeId);
			}
		});
		
		// Add hover effects
		item.addEventListener('mouseenter', (e) => {
			item.style.border = '1px solid #ff6b00';
			item.style.backgroundColor = 'rgba(255, 107, 0, 0.1)';
		});
		
		item.addEventListener('mouseleave', (e) => {
			item.style.border = '1px solid transparent';
			item.style.backgroundColor = 'transparent';
		});
	});
	
	// Add keyboard shortcuts for buying
	document.addEventListener('keydown', (e) => {
		const buyMenu = document.getElementById('buy-menu');
		if (!buyMenu || buyMenu.style.display === 'none') return;
		
		// Handle number key shortcuts when buy menu is open
		if (e.code >= 'Digit1' && e.code <= 'Digit9') {
			const keyNum = e.code.replace('Digit', '');
			handleBuyShortcut(keyNum);
			e.preventDefault();
		}
	});
	
	console.log('Shop system initialized');
}

function purchaseWeapon(weaponId) {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	const weaponData = getWeaponData(weaponId);
	if (!weaponData) {
		console.log(`Unknown weapon: ${weaponId}`);
		return;
	}
	
	// Check team restrictions
	if (weaponData.team && weaponData.team !== player.team) {
		const message = `${weaponData.name} is not available for ${player.team.toUpperCase()}`;
		console.log(message);
		showPurchaseError(message);
		return;
	}
	
	// Check if player has enough money
	if (player.money < weaponData.price) {
		const message = `Not enough money for ${weaponData.name}. Need $${weaponData.price}, have $${player.money}`;
		console.log(message);
		showPurchaseError(message);
		return;
	}
	
	// Check buy time
	const buyTimeLeft = CLASSIC_CONFIG.BUY_TIME - (CLASSIC_CONFIG.ROUND_TIME - gameState.roundTime);
	if (buyTimeLeft <= 0 && gameState.phase === 'playing') {
		const message = 'Buy time expired';
		console.log(message);
		showPurchaseError(message);
		return;
	}
	
	// Process purchase
	player.money -= weaponData.price;
	
	// Assign weapon based on type
	if (['usp', 'glock', 'p228', 'deagle', 'fiveseven', 'elite'].includes(weaponId)) {
		player.secondaryWeapon = weaponId;
		// Only switch to secondary if player doesn't have a primary weapon
		if (!player.primaryWeapon) {
			player.currentWeapon = 'secondary';
		}
	} else if (['kevlar', 'kevlar_helmet'].includes(weaponId)) {
		if (weaponId === 'kevlar') {
			player.armor = 100;
		} else if (weaponId === 'kevlar_helmet') {
			player.armor = 100;
			player.helmet = true;
		}
	} else if (weaponId === 'defuse') {
		player.defuseKit = true;
	} else if (['hegrenade', 'flashbang', 'smokegrenade'].includes(weaponId)) {
		const grenadeType = weaponId.replace('grenade', '');
		const maxGrenades = grenadeType === 'flashbang' ? 2 : 1;
		
		if (player.grenades[grenadeType] < maxGrenades) {
			player.grenades[grenadeType]++;
		}
	} else {
		// Primary weapons
		player.primaryWeapon = weaponId;
		player.currentWeapon = 'primary';
	}
	
	console.log(`Purchased ${weaponData.name} for $${weaponData.price}`);
	updateMoneyDisplay();
	updateHudMoney();
	
	// Provide visual feedback
	showPurchaseNotification(`${weaponData.name} purchased for $${weaponData.price}`);
}

function getWeaponData(weaponId) {
	const weapons = {
		// Pistols
		usp: { name: 'USP', price: 0, team: 'ct' },
		glock: { name: 'Glock-18', price: 0, team: 't' },
		p228: { name: 'P228', price: 600 },
		deagle: { name: 'Desert Eagle', price: 650 },
		fiveseven: { name: 'Five-SeveN', price: 750, team: 'ct' },
		elite: { name: 'Dual Berettas', price: 800 },
		
		// SMGs
		mac10: { name: 'MAC-10', price: 1400, team: 't' },
		tmp: { name: 'TMP', price: 1250, team: 'ct' },
		mp5: { name: 'MP5-Navy', price: 1500 },
		ump45: { name: 'UMP45', price: 1700 },
		p90: { name: 'P90', price: 2350 },
		
		// Shotguns
		m3: { name: 'M3 Super 90', price: 1700 },
		xm1014: { name: 'XM1014', price: 3000 },
		
		// Rifles
		galil: { name: 'Galil', price: 2000, team: 't' },
		famas: { name: 'FAMAS', price: 2250, team: 'ct' },
		ak47: { name: 'AK-47', price: 2500, team: 't' },
		m4a1: { name: 'M4A1', price: 3100, team: 'ct' },
		sg552: { name: 'SG 552', price: 3500, team: 't' },
		aug: { name: 'AUG', price: 3500, team: 'ct' },
		
		// Snipers
		scout: { name: 'Scout', price: 2750 },
		awp: { name: 'AWP', price: 4750 },
		g3sg1: { name: 'G3SG1', price: 5000, team: 't' },
		sg550: { name: 'SG550', price: 4200, team: 'ct' },
		
		// Machine Gun
		m249: { name: 'M249', price: 5750 },
		
		// Equipment
		kevlar: { name: 'Kevlar Vest', price: 650 },
		kevlar_helmet: { name: 'Kevlar + Helmet', price: 1000 },
		defuse: { name: 'Defuse Kit', price: 200 },
		nvg: { name: 'NightVision', price: 1250 },
		
		// Grenades
		hegrenade: { name: 'HE Grenade', price: 300 },
		flashbang: { name: 'Flashbang', price: 200 },
		smokegrenade: { name: 'Smoke Grenade', price: 300 }
	};
	
	return weapons[weaponId];
}

function handleBuyShortcut(keyNum) {
	const player = gameState.players[gameState.localPlayerId];
	if (!player) return;
	
	// Define shortcut mappings based on current focus
	// This is a simplified implementation - real CS 1.6 has context-sensitive shortcuts
	const shortcuts = {
		'1': 'usp', // Pistol slot 1 (CT default)
		'2': 'p228', // Pistol slot 2  
		'3': 'deagle', // Pistol slot 3
		'4': 'm4a1', // Rifle slot 1 (CT)
		'5': 'ak47', // Rifle slot 2 (T)
		'6': 'awp', // Sniper
		'7': 'kevlar', // Armor
		'8': 'kevlar_helmet', // Armor + Helmet
		'9': 'hegrenade' // HE Grenade
	};
	
	// Adjust shortcuts based on team
	if (player.team === 't') {
		shortcuts['1'] = 'glock'; // T default pistol
		shortcuts['4'] = 'ak47'; // T primary rifle
		shortcuts['5'] = 'm4a1'; // Just in case
	}
	
	const weaponId = shortcuts[keyNum];
	if (weaponId) {
		purchaseWeapon(weaponId);
	} else {
		console.log(`No weapon mapped to shortcut ${keyNum}`);
	}
}

function updateMoneyDisplay() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player) return;
	
	const moneyDisplay = document.getElementById('buy-menu-money');
	if (moneyDisplay) {
		moneyDisplay.textContent = player.money.toString();
	}
	
	// Update HUD money display as well
	const hudMoney = document.getElementById('money-display');
	if (hudMoney) {
		hudMoney.textContent = player.money.toString();
	}
}

function updateHudMoney() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player) return;
	
	const hudMoney = document.getElementById('money-display');
	if (hudMoney) {
		hudMoney.textContent = player.money.toString();
	}
}

function showPurchaseNotification(message) {
	// Create or update notification element
	let notification = document.getElementById('purchase-notification');
	if (!notification) {
		notification = document.createElement('div');
		notification.id = 'purchase-notification';
		notification.style.cssText = `
			position: absolute;
			top: 120px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(0, 200, 0, 0.8);
			color: white;
			padding: 10px 20px;
			border-radius: 5px;
			font-size: 16px;
			font-weight: bold;
			z-index: 2000;
			display: none;
			text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
		`;
		document.body.appendChild(notification);
	}
	
	notification.textContent = message;
	notification.style.display = 'block';
	
	// Hide after 2 seconds
	setTimeout(() => {
		notification.style.display = 'none';
	}, 2000);
}

function showPurchaseError(message) {
	// Create or update error notification element
	let errorNotification = document.getElementById('purchase-error-notification');
	if (!errorNotification) {
		errorNotification = document.createElement('div');
		errorNotification.id = 'purchase-error-notification';
		errorNotification.style.cssText = `
			position: absolute;
			top: 120px;
			left: 50%;
			transform: translateX(-50%);
			background: rgba(200, 0, 0, 0.8);
			color: white;
			padding: 10px 20px;
			border-radius: 5px;
			font-size: 16px;
			font-weight: bold;
			z-index: 2000;
			display: none;
			text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
		`;
		document.body.appendChild(errorNotification);
	}
	
	errorNotification.textContent = message;
	errorNotification.style.display = 'block';
	
	// Hide after 3 seconds
	setTimeout(() => {
		errorNotification.style.display = 'none';
	}, 3000);
}

function shoot() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	// Create bullet
	const speed = 1000; // Bullet speed
	gameState.bullets.push({
		x: player.x,
		y: player.y,
		vx: Math.cos(player.angle) * speed,
		vy: Math.sin(player.angle) * speed,
		damage: 30,
		playerId: player.id,
		distance: 0
	});
}

// Global debug functions for buy menu - Enhanced for Lively Framework
window.toggleBuyMenu = function() {
	let buyMenu = document.getElementById('buy-menu');
	
	// Retry mechanism for dynamic DOM
	if (!buyMenu) {
		console.warn('Buy menu not found, attempting recovery...');
		
		// Wait for next animation frame and retry
		requestAnimationFrame(() => {
			buyMenu = document.getElementById('buy-menu');
			if (buyMenu) {
				console.log('Buy menu found after retry');
				performToggle(buyMenu);
			} else {
				// Create buy menu dynamically if it doesn't exist
				console.warn('Buy menu still not found, checking DOM state...');
				console.log('Current DOM body children:', document.body.children.length);
				console.log('All elements with buy in ID:', document.querySelectorAll('[id*="buy"]'));
			}
		});
		return null;
	}
	
	return performToggle(buyMenu);
};

function performToggle(buyMenu) {
	// Ensure menu is properly styled even after DOM updates
	const currentDisplay = window.getComputedStyle(buyMenu).display;
	const newDisplay = currentDisplay === 'none' ? 'block' : 'none';
	
	// Force all necessary styles to ensure visibility
	buyMenu.style.display = newDisplay;
	buyMenu.style.pointerEvents = 'auto';
	buyMenu.style.zIndex = '9999';  // Higher z-index to ensure it's on top
	buyMenu.style.position = 'absolute';  // Ensure positioning is correct
	
	console.log('Buy menu toggled. New state:', newDisplay);
	
	if (newDisplay === 'block') {
		// Ensure menu is centered
		buyMenu.style.top = '50%';
		buyMenu.style.left = '50%';
		buyMenu.style.transform = 'translate(-50%, -50%)';
		
		// Update money display
		if (typeof updateMoneyDisplay === 'function') {
			updateMoneyDisplay();
		}
		
		// Focus trap for better UX
		buyMenu.focus();
	}
	
	return newDisplay;
}

window.openBuyMenu = function() {
	let buyMenu = document.getElementById('buy-menu');
	
	if (!buyMenu) {
		console.warn('Buy menu not found for opening, retrying...');
		requestAnimationFrame(() => {
			buyMenu = document.getElementById('buy-menu');
			if (buyMenu) {
				showBuyMenu(buyMenu);
			}
		});
		return false;
	}
	
	return showBuyMenu(buyMenu);
};

function showBuyMenu(buyMenu) {
	buyMenu.style.display = 'block';
	buyMenu.style.pointerEvents = 'auto';
	buyMenu.style.zIndex = '9999';
	buyMenu.style.position = 'absolute';
	buyMenu.style.top = '50%';
	buyMenu.style.left = '50%';
	buyMenu.style.transform = 'translate(-50%, -50%)';
	
	if (typeof updateMoneyDisplay === 'function') {
		updateMoneyDisplay();
	}
	
	console.log('Buy menu opened');
	return true;
}

window.closeBuyMenu = function() {
	let buyMenu = document.getElementById('buy-menu');
	
	if (!buyMenu) {
		// Try again after a frame
		requestAnimationFrame(() => {
			buyMenu = document.getElementById('buy-menu');
			if (buyMenu) {
				buyMenu.style.display = 'none';
				console.log('Buy menu closed (after retry)');
			}
		});
		return false;
	}
	
	buyMenu.style.display = 'none';
	console.log('Buy menu closed');
	return true;
};

// Export functions for Ruby integration
window.CS16Classic = {
	initializeGame,
	gameState: () => gameState,
	CLASSIC_CONFIG,
	toggleBuyMenu: window.toggleBuyMenu,
	openBuyMenu: window.openBuyMenu,
	closeBuyMenu: window.closeBuyMenu
};