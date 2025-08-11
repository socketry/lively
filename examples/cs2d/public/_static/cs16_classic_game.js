// CS 1.6 Classic Rules JavaScript Implementation
// Extracted from cs16_classic_rules.rb for better maintainability

console.log('🔧 CS 1.6 Classic v3.0: Ammo + Dead Players + Slot Switching');

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
				// Preserve buy menu state across DOM updates - be more aggressive
				if (lastBuyMenuState === 'block') {
					console.log('DOM Update detected: Forcing buy menu to stay open');
					buyMenu.style.display = 'block';
					buyMenu.style.pointerEvents = 'auto';
					buyMenu.style.zIndex = '9999';
					buyMenu.style.position = 'absolute';
					buyMenu.style.top = '50%';
					buyMenu.style.left = '50%';
					buyMenu.style.transform = 'translate(-50%, -50%)';
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
	
	// Track buy menu state - more comprehensive tracking
	function updateBuyMenuState() {
		const buyMenu = document.getElementById('buy-menu');
		if (buyMenu) {
			const newState = window.getComputedStyle(buyMenu).display;
			if (newState !== lastBuyMenuState) {
				console.log(`Buy menu state changed: ${lastBuyMenuState} -> ${newState}`);
				lastBuyMenuState = newState;
			}
		}
	}
	
	// Track state changes from multiple sources
	window.addEventListener('click', updateBuyMenuState);
	window.addEventListener('keydown', updateBuyMenuState);
	setInterval(updateBuyMenuState, 100); // Poll for changes
	
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
	BUY_TIME: 15, // Can buy for 15 seconds (competitive standard)
	C4_TIMER: 35, // 35 second bomb timer
	PLANT_TIME: 3, // 3 seconds to plant
	DEFUSE_TIME: 10, // 10 seconds without kit
	DEFUSE_TIME_KIT: 5, // 5 seconds with kit
	
	// Buy Zone Configuration
	BUY_ZONE_RADIUS: 200, // Radius around spawn points for buy zones
	CT_SPAWN: { x: 200, y: 360 },
	T_SPAWN: { x: 1080, y: 360 },
	
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
		kevlar: 650, kevlar_helmet: 1000, defusekit: 400, defuse: 200, nvg: 1250,
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
		m4a1: { base: 30, headshot: 131, armor_pen: 0.9 },
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
	UPDATE_RATE: 30,
	
	// Round System
	MAX_ROUNDS: 30,
	HALFTIME_ROUND: 15,
	ROUNDS_TO_WIN: 16,
	
	// Additional Economy
	KILL_REWARD: 300,  // Default kill reward
	BOMB_PLANT_REWARD: 800,  // Bomb plant reward for team
	
	// Loss bonuses for consecutive losses
	LOSS_BONUSES: [1400, 1900, 2400, 2900, 3400]
};

// Weapon Ammunition Configuration (Classic CS 1.6)
const WEAPON_AMMO_CONFIG = {
	// Pistols
	glock: { clipSize: 20, maxAmmo: 120 },
	usp: { clipSize: 12, maxAmmo: 100 },
	p228: { clipSize: 13, maxAmmo: 52 },
	deagle: { clipSize: 7, maxAmmo: 35 },
	fiveseven: { clipSize: 20, maxAmmo: 100 },
	elite: { clipSize: 30, maxAmmo: 120 },
	
	// SMGs
	mac10: { clipSize: 30, maxAmmo: 120 },
	tmp: { clipSize: 30, maxAmmo: 120 },
	mp5: { clipSize: 30, maxAmmo: 120 },
	ump45: { clipSize: 25, maxAmmo: 100 },
	p90: { clipSize: 50, maxAmmo: 100 },
	
	// Shotguns
	m3: { clipSize: 8, maxAmmo: 32 },
	xm1014: { clipSize: 7, maxAmmo: 32 },
	
	// Rifles
	galil: { clipSize: 35, maxAmmo: 90 },
	famas: { clipSize: 25, maxAmmo: 90 },
	ak47: { clipSize: 30, maxAmmo: 90 },
	m4a1: { clipSize: 30, maxAmmo: 90 },
	sg552: { clipSize: 30, maxAmmo: 90 },
	aug: { clipSize: 30, maxAmmo: 90 },
	
	// Snipers
	scout: { clipSize: 10, maxAmmo: 90 },
	awp: { clipSize: 10, maxAmmo: 30 },
	g3sg1: { clipSize: 20, maxAmmo: 90 },
	sg550: { clipSize: 30, maxAmmo: 90 },
	
	// Machine Gun
	m249: { clipSize: 100, maxAmmo: 200 },
	
	// Knife has no ammo
	knife: { clipSize: 0, maxAmmo: 0 }
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
		currentWeapon: 'secondary', // Start with secondary weapon
		primaryWeapon: null,
		secondaryWeapon: 'usp',
		// Ammunition system
		ammo: {
			primary: { clip: 0, reserve: 0 },
			secondary: { clip: 12, reserve: 88 } // USP starts with full clip and reserve
		},
		isReloading: false,
		reloadStartTime: 0,
		grenades: { he: 0, flash: 2, smoke: 1 },
		hasDefuseKit: false,
		kills: 0,
		deaths: 0,
		assists: 0,
		score: 0,
		damage_taken: 0,
		damage_given: 0,
		// Equipment slots
		slots: {
			1: 'knife',
			2: 'usp',  // Secondary weapon
			3: null,   // Primary weapon
			4: 'he',   // Grenade slot 1
			5: 'flash' // Grenade slot 2
		}
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
	
	console.log('✅ Game ready with new features!');
	
	// Start the actual game loop after a delay
	setTimeout(() => {
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
			currentWeapon: 'secondary',
			primaryWeapon: null,
			secondaryWeapon: 'usp',
			// Ammunition system
			ammo: {
				primary: { clip: 0, reserve: 0 },
				secondary: { clip: 12, reserve: 88 } // USP starts with full clip and reserve
			},
			isReloading: false,
			reloadStartTime: 0,
			grenades: { he: 0, flash: 1, smoke: 0 },
			hasDefuseKit: false,
			kills: 0,
			deaths: 0,
			assists: 0,
			score: 0,
			damage_taken: 0,
			damage_given: 0,
			// Equipment slots for bots
			slots: {
				1: 'knife',
				2: 'usp',
				3: null,
				4: null,
				5: 'flash'
			}
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
			currentWeapon: 'secondary',
			primaryWeapon: null,
			secondaryWeapon: 'glock',
			// Ammunition system
			ammo: {
				primary: { clip: 0, reserve: 0 },
				secondary: { clip: 20, reserve: 100 } // Glock starts with full clip and reserve
			},
			isReloading: false,
			reloadStartTime: 0,
			grenades: { he: 0, flash: 1, smoke: 0 },
			hasDefuseKit: false,
			kills: 0,
			deaths: 0,
			assists: 0,
			score: 0,
			damage_taken: 0,
			damage_given: 0,
			// Equipment slots for bots
			slots: {
				1: 'knife',
				2: 'glock',
				3: null,
				4: null,
				5: 'flash'
			}
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
	
	// Handle automatic weapon firing
	if (input.mouse.down) {
		const player = gameState.players[gameState.localPlayerId];
		if (player && player.alive) {
			// Check if weapon is automatic
			let currentWeaponId = null;
			if (player.currentWeapon === 'primary' && player.primaryWeapon) {
				currentWeaponId = player.primaryWeapon;
			} else if (player.currentWeapon === 'secondary' && player.secondaryWeapon) {
				currentWeaponId = player.secondaryWeapon;
			}
			
			// List of automatic weapons
			const automaticWeapons = [
				'ak47', 'm4a1', 'galil', 'famas', 'sg552', 'aug',
				'mp5', 'p90', 'mac10', 'tmp', 'ump45', 'm249'
			];
			
			if (currentWeaponId && automaticWeapons.includes(currentWeaponId)) {
				shoot(); // Continuous firing for automatic weapons
			}
		}
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
	if (!ctx) {
		console.warn('CS 1.6 Classic: No rendering context available');
		return;
	}
	
	// Clear canvas with a visible color to confirm rendering
	ctx.fillStyle = '#1a3d1a'; // Dark green background for visibility
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// Add a debug text to confirm rendering is working
	ctx.fillStyle = '#00FF00';
	ctx.font = 'bold 24px Arial';
	ctx.textAlign = 'center';
	ctx.fillText('CS 1.6 Classic - Loading...', canvas.width/2, 50);
	
	// Apply viewport transform
	ctx.save();
	ctx.translate(-gameState.viewportX, -gameState.viewportY);
	
	// Render map
	renderMap();
	
	// Render bomb sites
	renderBombSites();
	
	// Render buy zones
	renderBuyZones();
	
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
	
	// Render scoreboard if Tab is held
	if (gameState.showScoreboard) {
		renderScoreboard();
	}
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

function renderBuyZones() {
	// Draw buy zones with subtle visual indicators
	
	// CT Buy Zone
	ctx.strokeStyle = 'rgba(0, 100, 255, 0.3)';
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.arc(CLASSIC_CONFIG.CT_SPAWN.x, CLASSIC_CONFIG.CT_SPAWN.y, CLASSIC_CONFIG.BUY_ZONE_RADIUS, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);
	
	// CT Buy Zone label
	ctx.fillStyle = 'rgba(0, 100, 255, 0.2)';
	ctx.beginPath();
	ctx.arc(CLASSIC_CONFIG.CT_SPAWN.x, CLASSIC_CONFIG.CT_SPAWN.y, CLASSIC_CONFIG.BUY_ZONE_RADIUS, 0, Math.PI * 2);
	ctx.fill();
	
	// T Buy Zone
	ctx.strokeStyle = 'rgba(255, 170, 0, 0.3)';
	ctx.lineWidth = 2;
	ctx.setLineDash([5, 5]);
	ctx.beginPath();
	ctx.arc(CLASSIC_CONFIG.T_SPAWN.x, CLASSIC_CONFIG.T_SPAWN.y, CLASSIC_CONFIG.BUY_ZONE_RADIUS, 0, Math.PI * 2);
	ctx.stroke();
	ctx.setLineDash([]);
	
	// T Buy Zone label
	ctx.fillStyle = 'rgba(255, 170, 0, 0.2)';
	ctx.beginPath();
	ctx.arc(CLASSIC_CONFIG.T_SPAWN.x, CLASSIC_CONFIG.T_SPAWN.y, CLASSIC_CONFIG.BUY_ZONE_RADIUS, 0, Math.PI * 2);
	ctx.fill();
}

function renderPlayers() {
	for (const player of Object.values(gameState.players)) {
		if (player.alive) {
			// Render alive players normally
			
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
			
			// Player name (moved higher for better spacing)
			ctx.fillStyle = '#fff';
			ctx.font = '12px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(player.name, player.x, player.y - 45);
			
			// Health bar (with better spacing from name)
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
		} else {
			// Render dead players with gray body and cross
			
			// Dead player body (gray)
			ctx.fillStyle = '#555555';
			ctx.beginPath();
			ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
			ctx.fill();
			
			// Draw red cross over dead player
			ctx.strokeStyle = '#ff0000';
			ctx.lineWidth = 4;
			
			// Cross line 1
			ctx.beginPath();
			ctx.moveTo(player.x - 10, player.y - 10);
			ctx.lineTo(player.x + 10, player.y + 10);
			ctx.stroke();
			
			// Cross line 2
			ctx.beginPath();
			ctx.moveTo(player.x + 10, player.y - 10);
			ctx.lineTo(player.x - 10, player.y + 10);
			ctx.stroke();
			
			// Dead player name (gray)
			ctx.fillStyle = '#888888';
			ctx.font = '12px Arial';
			ctx.textAlign = 'center';
			ctx.fillText(player.name + ' (DEAD)', player.x, player.y - 45);
			
			// Dead indicator text
			ctx.fillStyle = '#ff4444';
			ctx.font = 'bold 10px Arial';
			ctx.fillText('✞ R.I.P ✞', player.x, player.y + 35);
		}
	}
}

function renderBullets() {
	ctx.strokeStyle = '#ffff00';
	ctx.lineWidth = 3;  // Make bullets more visible
	
	for (const bullet of gameState.bullets) {
		ctx.beginPath();
		// Draw a longer, more visible bullet trail
		const trailLength = 20;
		const startX = bullet.x - (bullet.vx / Math.abs(bullet.vx + bullet.vy)) * trailLength;
		const startY = bullet.y - (bullet.vy / Math.abs(bullet.vx + bullet.vy)) * trailLength;
		
		ctx.moveTo(startX, startY);
		ctx.lineTo(bullet.x, bullet.y);
		ctx.stroke();
		
		// Add a bright dot at bullet position for debugging
		ctx.fillStyle = '#ff0000';
		ctx.beginPath();
		ctx.arc(bullet.x, bullet.y, 3, 0, 2 * Math.PI);
		ctx.fill();
	}
	
	// Debug: Show bullet count and positions
	if (gameState.bullets.length > 0) {
		console.log(`Rendering ${gameState.bullets.length} bullets:`, gameState.bullets.map(b => `(${Math.round(b.x)}, ${Math.round(b.y)})`));
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
	
	// Center dot (disabled - not needed for this game)
	if (false) { // Disabled crosshair center dot
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
		if (player.alive) {
			// Draw alive players normally
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
		} else {
			// Draw dead players with gray color and cross
			minimapCtx.fillStyle = '#666666';
			minimapCtx.beginPath();
			minimapCtx.arc(player.x * scale, player.y * scale, 3, 0, Math.PI * 2);
			minimapCtx.fill();
			
			// Draw small red cross for dead player on minimap
			minimapCtx.strokeStyle = '#ff4444';
			minimapCtx.lineWidth = 1;
			const miniX = player.x * scale;
			const miniY = player.y * scale;
			
			// Cross line 1
			minimapCtx.beginPath();
			minimapCtx.moveTo(miniX - 2, miniY - 2);
			minimapCtx.lineTo(miniX + 2, miniY + 2);
			minimapCtx.stroke();
			
			// Cross line 2
			minimapCtx.beginPath();
			minimapCtx.moveTo(miniX + 2, miniY - 2);
			minimapCtx.lineTo(miniX - 2, miniY + 2);
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
	if (!gameState) {
		console.error('gameState is null in renderHUD!');
		return;
	}
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
	let weaponDisplayName = 'NONE';
	if (player.currentWeapon === 'primary' && player.primaryWeapon) {
		weaponDisplayName = player.primaryWeapon.toUpperCase();
	} else if (player.currentWeapon === 'secondary' && player.secondaryWeapon) {
		weaponDisplayName = player.secondaryWeapon.toUpperCase();
	} else if (player.currentWeapon === 'knife') {
		weaponDisplayName = 'KNIFE';
	}
	ctx.fillText(`Weapon: ${weaponDisplayName}`, 240, canvas.height - 55);
	
	// Ammunition display
	if (player.currentWeapon === 'primary' || player.currentWeapon === 'secondary') {
		const weaponSlot = player.currentWeapon;
		const currentAmmo = player.ammo[weaponSlot];
		
		// Show reload status
		if (player.isReloading) {
			ctx.fillStyle = '#ffaa00';
			ctx.fillText('RELOADING...', 400, canvas.height - 80);
		} else {
			// Show ammo count
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 18px Arial';
			ctx.fillText(`${currentAmmo.clip}`, 400, canvas.height - 80);
			
			ctx.font = '14px Arial';
			ctx.fillStyle = '#aaaaaa';
			ctx.fillText(`/ ${currentAmmo.reserve}`, 430, canvas.height - 80);
		}
		
		// Low ammo warning
		if (currentAmmo.clip <= 3 && !player.isReloading) {
			ctx.fillStyle = '#ff4444';
			ctx.font = '12px Arial';
			ctx.fillText('LOW AMMO', 400, canvas.height - 60);
		}
	}
	
	// Equipment slots display
	ctx.fillStyle = '#ffffff';
	ctx.font = '12px Arial';
	ctx.textAlign = 'left';
	ctx.fillText('Slots:', 20, canvas.height - 20);
	
	for (let slotNum = 1; slotNum <= 5; slotNum++) {
		const slotItem = player.slots[slotNum];
		const slotX = 80 + (slotNum - 1) * 60;
		const slotY = canvas.height - 35;
		
		// Draw slot background
		if (
			(slotNum === 1 && player.currentWeapon === 'knife') ||
			(slotNum === 2 && player.currentWeapon === 'secondary') ||
			(slotNum === 3 && player.currentWeapon === 'primary') ||
			(slotNum === 4 && player.currentWeapon === 'grenade1') ||
			(slotNum === 5 && player.currentWeapon === 'grenade2')
		) {
			// Active slot - highlighted background
			ctx.fillStyle = 'rgba(255, 107, 0, 0.7)';
		} else {
			// Inactive slot - dark background
			ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
		}
		ctx.fillRect(slotX - 2, slotY - 2, 56, 16);
		
		// Draw slot border
		ctx.strokeStyle = '#666666';
		ctx.lineWidth = 1;
		ctx.strokeRect(slotX - 2, slotY - 2, 56, 16);
		
		// Draw slot number and item
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 10px Arial';
		ctx.textAlign = 'left';
		ctx.fillText(`[${slotNum}]`, slotX, slotY + 10);
		
		if (slotItem) {
			ctx.font = '9px Arial';
			ctx.fillText(slotItem.toUpperCase(), slotX + 22, slotY + 10);
		} else {
			ctx.fillStyle = '#666666';
			ctx.font = '9px Arial';
			ctx.fillText('EMPTY', slotX + 22, slotY + 10);
		}
	}

	// Round info
	ctx.textAlign = 'center';
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 18px Arial';
	ctx.fillText(formatTime(gameState.roundTime), canvas.width / 2, 30);
	
	ctx.font = '14px Arial';
	ctx.fillText(`Round ${gameState.round}/${gameState.maxRounds}`, canvas.width / 2, 50);

	// Score
	ctx.fillStyle = '#4444ff';
	ctx.fillText(`CT: ${gameState.ctScore}`, canvas.width / 2 - 60, 70);
	ctx.fillStyle = '#ffaa00';
	ctx.fillText(`T: ${gameState.tScore}`, canvas.width / 2 + 60, 70);
	
	// Buy Zone & Buy Time Indicator
	const buyTimeLeft = CLASSIC_CONFIG.BUY_TIME - (CLASSIC_CONFIG.ROUND_TIME - gameState.roundTime);
	const inBuyZone = isInBuyZone(player);
	const canBuy = (gameState.phase === 'freeze') || (buyTimeLeft > 0 && gameState.phase === 'playing');
	
	// Debug logging
	if (gameState.phase === 'freeze' && !canBuy) {
		console.error('BUG: canBuy is false during freeze time!', {
			phase: gameState.phase,
			canBuy: canBuy,
			buyTimeLeft: buyTimeLeft,
			inBuyZone: inBuyZone
		});
	}
	
	if (inBuyZone && canBuy) {
		// Can buy - show green indicator
		ctx.fillStyle = '#00ff00';
		ctx.font = 'bold 16px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('BUY ZONE', canvas.width / 2, 95);
		ctx.font = '14px Arial';
		if (gameState.phase === 'freeze') {
			ctx.fillText(`Freeze Time - Can Buy`, canvas.width / 2, 110);
		} else {
			ctx.fillText(`Buy Time: ${Math.ceil(buyTimeLeft)}s`, canvas.width / 2, 110);
		}
		ctx.fillText('Press B to buy', canvas.width / 2, 125);
	} else if (inBuyZone && !canBuy) {
		// In buy zone but can't buy - show yellow indicator
		ctx.fillStyle = '#ffaa00';
		ctx.font = '14px Arial';
		ctx.textAlign = 'center';
		ctx.fillText('Buy Zone (Buy time expired)', canvas.width / 2, 95);
	} else if (!inBuyZone && canBuy) {
		// Can still buy but not in zone - show hint
		ctx.fillStyle = '#aaaaaa';
		ctx.font = '14px Arial';
		ctx.textAlign = 'center';
		ctx.fillText(`Buy Time: ${Math.ceil(buyTimeLeft)}s (Return to buy zone)`, canvas.width / 2, 95);
	}

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
	
	// DEBUG: Log player position periodically
	if (Date.now() % 1000 < 16) { // Log roughly once per second
		console.log(`👤 PLAYER POSITION: (${Math.round(player.x)}, ${Math.round(player.y)}) viewport: (${Math.round(gameState.viewportX)}, ${Math.round(gameState.viewportY)})`);
	}
	
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
		
		// Check collision with players using the new function
		let bulletHit = checkBulletHit(bullet);
		
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

// Format time helper function
function formatTime(seconds) {
	const minutes = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Bomb plant function
function plantBomb(playerId, x, y) {
	const player = gameState.players[playerId];
	if (!player || player.team !== 't' || !player.alive) return false;
	
	// Check if at bomb site
	const site = getBombSiteAt(x, y);
	if (!site) return false;
	
	// Plant the bomb
	gameState.bomb = {
		planted: true,
		x: x,
		y: y,
		site: site,
		planterId: playerId,
		timeLeft: CLASSIC_CONFIG.C4_TIMER,
		plantTime: Date.now()
	};
	
	// Give money reward to planter
	if (gameState.players[playerId]) {
		gameState.players[playerId].money += CLASSIC_CONFIG.BOMB_PLANT_REWARD;
	}
	
	console.log(`Bomb planted at site ${site} by ${player.name}`);
	return true;
}

// Bomb defuse function
function defuseBomb(playerId) {
	const player = gameState.players[playerId];
	if (!player || player.team !== 'ct' || !player.alive) return false;
	
	if (!gameState.bomb || !gameState.bomb.planted) return false;
	
	// Check if player is near bomb
	const distance = Math.sqrt(
		Math.pow(player.x - gameState.bomb.x, 2) + 
		Math.pow(player.y - gameState.bomb.y, 2)
	);
	
	if (distance > 50) return false; // Too far from bomb
	
	// Start or continue defusing
	const defuseTime = player.hasDefuseKit ? 
		CLASSIC_CONFIG.DEFUSE_TIME_KIT : 
		CLASSIC_CONFIG.DEFUSE_TIME;
	
	// For simplicity, instant defuse (should be timed in real implementation)
	gameState.bomb.planted = false;
	gameState.bomb = null;
	
	// End round with CT win
	endRound('ct', 'bomb_defused');
	
	console.log(`Bomb defused by ${player.name}`);
	return true;
}

// Check bullet hit detection
function checkBulletHit(bullet) {
	for (const player of Object.values(gameState.players)) {
		if (!player.alive || player.id === bullet.playerId) continue;
		
		const distance = Math.sqrt(
			Math.pow(bullet.x - player.x, 2) + 
			Math.pow(bullet.y - player.y, 2)
		);
		
		if (distance < 20) { // Hit radius
			// Apply damage
			const damage = bullet.damage || 30;
			player.health -= damage;
			player.damage_taken = (player.damage_taken || 0) + damage;
			
			// Update shooter's damage given
			const shooter = gameState.players[bullet.playerId];
			if (shooter) {
				shooter.damage_given = (shooter.damage_given || 0) + damage;
			}
			
			if (player.health <= 0) {
				player.health = 0;
				player.alive = false;
				player.deaths = (player.deaths || 0) + 1;
				
				// Give kill credit and update killfeed
				if (shooter) {
					shooter.kills = (shooter.kills || 0) + 1;
					shooter.money = (shooter.money || 0) + CLASSIC_CONFIG.KILL_REWARD;
					
					// Add to killfeed
					if (!gameState.killfeed) gameState.killfeed = [];
					gameState.killfeed.unshift({
						killer: shooter.name,
						victim: player.name,
						weapon: shooter.currentWeapon || 'unknown',
						headshot: false,
						timestamp: Date.now()
					});
					
					// Keep only last 5 kills
					if (gameState.killfeed.length > 5) {
						gameState.killfeed.pop();
					}
				}
			}
			
			return true; // Bullet hit
		}
	}
	
	return false; // No hit
}

// Render scoreboard function
function renderScoreboard() {
	if (!ctx) return;
	
	// Background
	ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
	ctx.fillRect(200, 100, canvas.width - 400, canvas.height - 200);
	
	// Title
	ctx.fillStyle = '#ffffff';
	ctx.font = 'bold 24px Arial';
	ctx.textAlign = 'center';
	ctx.fillText('SCOREBOARD', canvas.width / 2, 140);
	
	// Team scores
	ctx.font = 'bold 20px Arial';
	ctx.fillStyle = '#4444ff';
	ctx.fillText(`CT: ${gameState.ctScore}`, canvas.width / 2 - 100, 170);
	ctx.fillStyle = '#ffaa00';
	ctx.fillText(`T: ${gameState.tScore}`, canvas.width / 2 + 100, 170);
	
	// Player list headers
	ctx.font = '16px Arial';
	ctx.fillStyle = '#ffffff';
	ctx.textAlign = 'left';
	ctx.fillText('Name', 250, 200);
	ctx.fillText('K', 450, 200);
	ctx.fillText('D', 500, 200);
	ctx.fillText('Money', 550, 200);
	
	// Player stats
	let yPos = 230;
	for (const player of Object.values(gameState.players)) {
		ctx.fillStyle = player.team === 'ct' ? '#6666ff' : '#ffcc66';
		ctx.fillText(player.name.substring(0, 15), 250, yPos);
		ctx.fillText(player.kills.toString(), 450, yPos);
		ctx.fillText(player.deaths.toString(), 500, yPos);
		ctx.fillText(`$${player.money}`, 550, yPos);
		yPos += 25;
	}
	
	// Round info
	ctx.fillStyle = '#ffffff';
	ctx.font = '14px Arial';
	ctx.textAlign = 'center';
	ctx.fillText(`Round ${gameState.round} / ${CLASSIC_CONFIG.MAX_ROUNDS}`, canvas.width / 2, canvas.height - 120);
}

// Helper function to get bomb site at position
function getBombSiteAt(x, y) {
	// A site bounds
	if (x >= 150 && x <= 350 && y >= 100 && y <= 300) {
		return 'A';
	}
	// B site bounds
	if (x >= 930 && x <= 1130 && y >= 420 && y <= 620) {
		return 'B';
	}
	return null;
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
		
		// Buy menu (both B and b) - DIRECT CREATION APPROACH
		if (e.code === 'KeyB' || e.key.toLowerCase() === 'b') {
			console.log('🚀 B key pressed - CREATING FRESH BUY MENU!');
			
			// Remove any existing buy menus
			const existingMenus = document.querySelectorAll('[id*="buy"]');
			existingMenus.forEach(menu => menu.remove());
			console.log('Removed existing buy menus:', existingMenus.length);
			
			// Create completely new buy menu from scratch
			const newBuyMenu = document.createElement('div');
			newBuyMenu.id = 'claude-buy-menu';
			newBuyMenu.style.cssText = `
				position: fixed !important;
				top: 50% !important;
				left: 50% !important;
				transform: translate(-50%, -50%) !important;
				width: 600px !important;
				height: auto !important;
				max-height: 80vh !important;
				background: rgba(20, 20, 20, 0.95) !important;
				border: 3px solid #ff6b00 !important;
				border-radius: 10px !important;
				z-index: 999999 !important;
				display: block !important;
				color: white !important;
				font-family: Arial, sans-serif !important;
				overflow-y: auto !important;
				box-shadow: 0 0 50px rgba(0,0,0,0.8) !important;
			`;
			
			newBuyMenu.innerHTML = `
				<div style="padding: 20px;">
					<div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px;">
						<h2 style="color: #ff6b00; margin: 0; font-size: 24px;">🛒 Buy Menu</h2>
						<div style="color: #00ff00; font-size: 18px; margin-top: 5px;">Money: $800</div>
					</div>
					
					<div style="margin-bottom: 15px;">
						<div style="text-align: center; color: #ffaa00; font-size: 12px; margin-bottom: 10px; padding: 5px; background: rgba(255,170,0,0.1); border-radius: 3px;">
							💡 Use number keys to buy: 1-3 for rifles, 4-5 for pistols, 0 for Glock
						</div>
						
						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
							<div>
								<h3 style="color: #ffaa00; font-size: 16px; margin: 0 0 10px 0; text-align: center; border-bottom: 1px solid #ffaa00; padding-bottom: 3px;">🔫 Rifles</h3>
								<button onclick="buyWeapon('ak47', 2500);" style="
									display: block; width: 100%; margin: 5px 0; padding: 8px; 
									font-size: 14px; background: #333; color: white; 
									border: 1px solid #666; cursor: pointer; border-radius: 3px;
								" onmouseover="this.style.background='#555';" onmouseout="this.style.background='#333';">
									<strong style="color: #ffaa00;">[1]</strong> AK-47 - $2500
								</button>
								<button onclick="buyWeapon('m4a1', 3100);" style="
									display: block; width: 100%; margin: 5px 0; padding: 8px; 
									font-size: 14px; background: #333; color: white; 
									border: 1px solid #666; cursor: pointer; border-radius: 3px;
								" onmouseover="this.style.background='#555';" onmouseout="this.style.background='#333';">
									<strong style="color: #ffaa00;">[2]</strong> M4A1 - $3100
								</button>
								<button onclick="buyWeapon('awp', 4750);" style="
									display: block; width: 100%; margin: 5px 0; padding: 8px; 
									font-size: 14px; background: #333; color: white; 
									border: 1px solid #666; cursor: pointer; border-radius: 3px;
								" onmouseover="this.style.background='#555';" onmouseout="this.style.background='#333';">
									<strong style="color: #ffaa00;">[3]</strong> AWP - $4750
								</button>
							</div>
							
							<div>
								<h3 style="color: #ffaa00; font-size: 16px; margin: 0 0 10px 0; text-align: center; border-bottom: 1px solid #ffaa00; padding-bottom: 3px;">🔫 Pistols</h3>
								<button onclick="buyWeapon('deagle', 650);" style="
									display: block; width: 100%; margin: 5px 0; padding: 8px; 
									font-size: 14px; background: #333; color: white; 
									border: 1px solid #666; cursor: pointer; border-radius: 3px;
								" onmouseover="this.style.background='#555';" onmouseout="this.style.background='#333';">
									<strong style="color: #ffaa00;">[4]</strong> Desert Eagle - $650
								</button>
								<button onclick="buyWeapon('usp', 500);" style="
									display: block; width: 100%; margin: 5px 0; padding: 8px; 
									font-size: 14px; background: #333; color: white; 
									border: 1px solid #666; cursor: pointer; border-radius: 3px;
								" onmouseover="this.style.background='#555';" onmouseout="this.style.background='#333';">
									<strong style="color: #ffaa00;">[5]</strong> USP - $500
								</button>
								<button onclick="buyWeapon('glock', 0);" style="
									display: block; width: 100%; margin: 5px 0; padding: 8px; 
									font-size: 14px; background: #333; color: white; 
									border: 1px solid #666; cursor: pointer; border-radius: 3px;
								" onmouseover="this.style.background='#555';" onmouseout="this.style.background='#333';">
									<strong style="color: #ffaa00;">[0]</strong> Glock - Free
								</button>
							</div>
						</div>
					</div>
					
					<div style="text-align: center;">
						<button onclick="this.parentElement.parentElement.parentElement.remove(); console.log('Buy menu closed!');" style="
							background: #cc0000; color: white; padding: 8px 20px; font-size: 14px; 
							border: 1px solid #990000; cursor: pointer; border-radius: 5px;
						" onmouseover="this.style.background='#990000';" onmouseout="this.style.background='#cc0000';">
							Close Menu (ESC)
						</button>
					</div>
				</div>
			`;
			
			// Add to body (not inside the game container)
			document.body.appendChild(newBuyMenu);
			console.log('✅ Fresh buy menu created and added to body!');
			
			// Update money display in the menu
			updateBuyMenuMoney();
			
			// Prevent event propagation
			e.preventDefault();
			e.stopPropagation();
		}
		
		// Buy menu number key shortcuts
		let buyMenuElement = document.getElementById('claude-buy-menu');
		if (buyMenuElement) {
			// Number key purchases when buy menu is open
			if (e.code === 'Digit1') {
				buyWeapon('ak47', 2500);  // [1] AK-47 in rifles or [1] Desert Eagle in pistols
			} else if (e.code === 'Digit2') {
				buyWeapon('m4a1', 3100);  // [2] M4A1 in rifles or [2] USP in pistols
			} else if (e.code === 'Digit3') {
				buyWeapon('awp', 4750);   // [3] AWP in rifles or [3] Glock in pistols
			} else if (e.code === 'Digit4') {
				buyWeapon('deagle', 650); // [4] Desert Eagle
			} else if (e.code === 'Digit5') {
				buyWeapon('usp', 500);    // [5] USP
			} else if (e.code === 'Digit0') {
				buyWeapon('glock', 0);    // [0] Glock (free)
			}
		}
		
		// Reload weapon with R key
		if (e.code === 'KeyR') {
			const player = gameState.players[gameState.localPlayerId];
			if (player && player.alive && !player.isReloading) {
				startReload(player);
			}
		}
		
		// Weapon/slot switching with number keys (when buy menu is not open)
		let buyMenuCheck = document.getElementById('claude-buy-menu');
		if (!buyMenuCheck) {
			if (e.code === 'Digit1') {
				switchToSlot(1); // Knife
			} else if (e.code === 'Digit2') {
				switchToSlot(2); // Secondary weapon (pistol)
			} else if (e.code === 'Digit3') {
				switchToSlot(3); // Primary weapon (rifle)
			} else if (e.code === 'Digit4') {
				switchToSlot(4); // Grenade slot 1
			} else if (e.code === 'Digit5') {
				switchToSlot(5); // Grenade slot 2
			}
		}
		
		// ESC to close menus
		if (e.code === 'Escape') {
			const buyMenu = document.getElementById('buy-menu');
			if (buyMenu && buyMenu.style.display === 'block') {
				buyMenu.style.display = 'none';
				console.log('Buy menu closed with ESC');
			}
			
			// Also close Claude buy menu
			const claudeBuyMenu = document.getElementById('claude-buy-menu');
			if (claudeBuyMenu) {
				claudeBuyMenu.remove();
				console.log('Claude buy menu closed with ESC');
			}
		}
		
		// Scoreboard
		if (e.code === 'Tab') {
			e.preventDefault();
			gameState.showScoreboard = true;
		}
	};
	
	// Attach to multiple targets to ensure we capture events
	document.addEventListener('keydown', captureKeyDown, true);
	window.addEventListener('keydown', captureKeyDown, true);
	
	document.addEventListener('keyup', (e) => {
		input.keys[e.code] = false;
		
		if (e.code === 'Tab') {
			gameState.showScoreboard = false;
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

// Ammunition and Reload System
function startReload(player) {
	// Determine which weapon is currently being used
	let weaponSlot = null;
	let weaponId = null;
	
	if (player.currentWeapon === 'primary' && player.primaryWeapon) {
		weaponSlot = 'primary';
		weaponId = player.primaryWeapon;
	} else if (player.currentWeapon === 'secondary' && player.secondaryWeapon) {
		weaponSlot = 'secondary';
		weaponId = player.secondaryWeapon;
	}
	
	if (!weaponSlot || !weaponId || weaponId === 'knife') {
		console.log('Cannot reload: no weapon or knife selected');
		return;
	}
	
	const ammoConfig = WEAPON_AMMO_CONFIG[weaponId];
	if (!ammoConfig) {
		console.log('Cannot reload: weapon config not found for', weaponId);
		return;
	}
	
	const currentAmmo = player.ammo[weaponSlot];
	
	// Check if reload is needed
	if (currentAmmo.clip >= ammoConfig.clipSize) {
		console.log('Cannot reload: clip already full');
		return;
	}
	
	if (currentAmmo.reserve <= 0) {
		console.log('Cannot reload: no reserve ammo');
		return;
	}
	
	// Start reload process
	player.isReloading = true;
	player.reloadStartTime = Date.now();
	
	// Reload time varies by weapon type (in milliseconds)
	const reloadTimes = {
		pistol: 1500,
		smg: 2000,
		rifle: 2500,
		sniper: 3000,
		shotgun: 2800
	};
	
	let reloadTime = 2000; // Default
	if (['glock', 'usp', 'p228', 'deagle', 'fiveseven', 'elite'].includes(weaponId)) {
		reloadTime = reloadTimes.pistol;
	} else if (['ak47', 'm4a1', 'galil', 'famas', 'sg552', 'aug'].includes(weaponId)) {
		reloadTime = reloadTimes.rifle;
	} else if (['awp', 'scout', 'g3sg1', 'sg550'].includes(weaponId)) {
		reloadTime = reloadTimes.sniper;
	} else if (['mac10', 'tmp', 'mp5', 'ump45', 'p90'].includes(weaponId)) {
		reloadTime = reloadTimes.smg;
	} else if (['m3', 'xm1014'].includes(weaponId)) {
		reloadTime = reloadTimes.shotgun;
	}
	
	console.log(`🔄 Reloading ${weaponId} (${reloadTime}ms)`);
	
	// Complete reload after delay
	setTimeout(() => {
		if (player.isReloading) { // Check if reload wasn't cancelled
			completeReload(player, weaponSlot, weaponId);
		}
	}, reloadTime);
}

function completeReload(player, weaponSlot, weaponId) {
	const ammoConfig = WEAPON_AMMO_CONFIG[weaponId];
	const currentAmmo = player.ammo[weaponSlot];
	
	// Calculate how many bullets to reload
	const ammoNeeded = ammoConfig.clipSize - currentAmmo.clip;
	const ammoToReload = Math.min(ammoNeeded, currentAmmo.reserve);
	
	// Reload ammunition
	currentAmmo.clip += ammoToReload;
	currentAmmo.reserve -= ammoToReload;
	
	player.isReloading = false;
	player.reloadStartTime = 0;
	
	console.log(`✅ Reload complete: ${currentAmmo.clip}/${currentAmmo.reserve} (${weaponId})`);
}

// Slot Switching System
function switchToSlot(slotNumber) {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	const slotItem = player.slots[slotNumber];
	if (!slotItem) {
		console.log(`Slot ${slotNumber} is empty`);
		return;
	}
	
	// Switch to the appropriate weapon/item
	switch (slotNumber) {
		case 1: // Knife
			if (slotItem === 'knife') {
				player.currentWeapon = 'knife';
				console.log('🔪 Switched to knife');
			}
			break;
			
		case 2: // Secondary weapon (pistol)
			if (player.secondaryWeapon && slotItem === player.secondaryWeapon) {
				player.currentWeapon = 'secondary';
				console.log(`🔫 Switched to secondary: ${player.secondaryWeapon}`);
			}
			break;
			
		case 3: // Primary weapon (rifle)
			if (player.primaryWeapon && slotItem === player.primaryWeapon) {
				player.currentWeapon = 'primary';
				console.log(`🔫 Switched to primary: ${player.primaryWeapon}`);
			}
			break;
			
		case 4: // Grenade slot 1
		case 5: // Grenade slot 2
			// TODO: Implement grenade switching
			console.log(`💣 Selected grenade slot ${slotNumber}: ${slotItem}`);
			break;
	}
}

function updateAmmo(player, weaponSlot, bulletsUsed = 1) {
	const currentAmmo = player.ammo[weaponSlot];
	currentAmmo.clip = Math.max(0, currentAmmo.clip - bulletsUsed);
	
	// Auto-reload when clip is empty and there's reserve ammo
	if (currentAmmo.clip === 0 && currentAmmo.reserve > 0 && !player.isReloading) {
		console.log('🔄 Auto-reload triggered (clip empty)');
		startReload(player);
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

// Check if player is in their team's buy zone
function isInBuyZone(player) {
	if (!player) return false;
	
	// Get the spawn point for player's team
	const spawnPoint = player.team === 'ct' ? CLASSIC_CONFIG.CT_SPAWN : CLASSIC_CONFIG.T_SPAWN;
	
	// Calculate distance from spawn point
	const dx = player.x - spawnPoint.x;
	const dy = player.y - spawnPoint.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	
	// Check if within buy zone radius
	return distance <= CLASSIC_CONFIG.BUY_ZONE_RADIUS;
}

function purchaseWeapon(weaponId) {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	// Check if player is in buy zone
	if (!isInBuyZone(player)) {
		const message = 'You must be in the buy zone to purchase weapons';
		console.log(message);
		showPurchaseError(message);
		return;
	}
	
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
	
	// Check buy time (allow during freeze time or within buy time during playing phase)
	const buyTimeLeft = CLASSIC_CONFIG.BUY_TIME - (CLASSIC_CONFIG.ROUND_TIME - gameState.roundTime);
	const canBuyTime = (gameState.phase === 'freeze') || (buyTimeLeft > 0 && gameState.phase === 'playing');
	
	if (!canBuyTime) {
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
		
		// Initialize ammunition for secondary weapon
		const ammoConfig = WEAPON_AMMO_CONFIG[weaponId];
		if (ammoConfig) {
			player.ammo.secondary.clip = ammoConfig.clipSize;
			player.ammo.secondary.reserve = ammoConfig.maxAmmo - ammoConfig.clipSize;
		}
		
		// Update slot
		player.slots[2] = weaponId;
		
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
		
		// Initialize ammunition for primary weapon
		const ammoConfig = WEAPON_AMMO_CONFIG[weaponId];
		if (ammoConfig) {
			player.ammo.primary.clip = ammoConfig.clipSize;
			player.ammo.primary.reserve = ammoConfig.maxAmmo - ammoConfig.clipSize;
		}
		
		// Update slot
		player.slots[3] = weaponId;
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

// Auto-fire configuration for weapons
const WEAPON_FIRE_RATES = {
	// Automatic weapons (shots per second)
	ak47: 10, m4a1: 10, galil: 10, famas: 10, sg552: 10, aug: 10,
	mp5: 10, p90: 11, mac10: 11, tmp: 11, ump45: 9,
	m249: 8, 
	// Semi-auto/single shot
	awp: 0.8, scout: 1.2, g3sg1: 2, sg550: 2,
	deagle: 2, usp: 3, glock: 3, p228: 3, fiveseven: 3, elite: 3,
	m3: 1, xm1014: 3
};

// Track last shot time for fire rate limiting
let lastShotTime = 0;

function shoot() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player || !player.alive) return;
	
	// Check if player is reloading
	if (player.isReloading) {
		console.log('Cannot shoot: currently reloading');
		return;
	}
	
	// Determine current weapon and slot
	let currentWeaponId = null;
	let weaponSlot = null;
	
	if (player.currentWeapon === 'primary' && player.primaryWeapon) {
		currentWeaponId = player.primaryWeapon;
		weaponSlot = 'primary';
	} else if (player.currentWeapon === 'secondary' && player.secondaryWeapon) {
		currentWeaponId = player.secondaryWeapon;
		weaponSlot = 'secondary';
	} else if (player.currentWeapon === 'knife') {
		console.log('Cannot shoot: knife selected');
		return;
	}
	
	// Check ammunition
	if (weaponSlot && player.ammo[weaponSlot].clip <= 0) {
		console.log(`Cannot shoot: no ammo in clip (${player.ammo[weaponSlot].clip}/${player.ammo[weaponSlot].reserve})`);
		// Try to auto-reload if there's reserve ammo
		if (player.ammo[weaponSlot].reserve > 0 && !player.isReloading) {
			console.log('🔄 Auto-reload triggered (empty clip)');
			startReload(player);
		}
		return;
	}
	
	console.log(`🔥 Shooting ${currentWeaponId} (${player.ammo[weaponSlot].clip}/${player.ammo[weaponSlot].reserve})`);
	
	// Consume ammunition
	if (weaponSlot) {
		updateAmmo(player, weaponSlot, 1);
	}
	
	// Check fire rate limit
	const now = Date.now();
	const fireRate = currentWeaponId ? WEAPON_FIRE_RATES[currentWeaponId] : 3;
	const minTimeBetweenShots = 1000 / fireRate;
	
	if (now - lastShotTime < minTimeBetweenShots) {
		return; // Too soon to shoot again
	}
	
	lastShotTime = now;
	
	// Create bullet
	const speed = 1000; // Bullet speed
	
	// Determine damage based on weapon
	let damage = 30; // default
	if (currentWeaponId) {
		const weaponDamages = {
			ak47: 36, m4a1: 33, galil: 30, famas: 30, sg552: 33, aug: 32,
			awp: 115, scout: 75, g3sg1: 80, sg550: 70,
			deagle: 48, usp: 34, glock: 28, p228: 32, fiveseven: 32, elite: 36,
			mp5: 26, p90: 26, mac10: 29, tmp: 26, ump45: 30,
			m249: 32, m3: 20, xm1014: 22
		};
		damage = weaponDamages[currentWeaponId] || 30;
	}
	
	// BEFORE creating bullet, verify we're using the right player
	console.log('🚨 BULLET SPAWN VERIFICATION:');
	console.log('  Using player ID:', player.id);
	console.log('  Expected local player ID:', gameState.localPlayerId);
	console.log('  Player ID match:', player.id === gameState.localPlayerId);
	console.log('  Bullet will spawn at:', player.x, player.y);
	console.log('  Expected spawn (your position):', gameState.players[gameState.localPlayerId]?.x, gameState.players[gameState.localPlayerId]?.y);
	
	gameState.bullets.push({
		x: gameState.players[gameState.localPlayerId].x,  // FORCE use local player position
		y: gameState.players[gameState.localPlayerId].y,  // FORCE use local player position
		vx: Math.cos(gameState.players[gameState.localPlayerId].angle) * speed,
		vy: Math.sin(gameState.players[gameState.localPlayerId].angle) * speed,
		damage: damage,
		playerId: gameState.localPlayerId,  // Use the correct ID
		distance: 0
	});
	
	console.log(`✅ Bullet created: FORCED to spawn at local player (${gameState.players[gameState.localPlayerId].x}, ${gameState.players[gameState.localPlayerId].y})`);
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
	buyMenu.style.position = 'fixed';  // Use fixed instead of absolute
	buyMenu.style.visibility = 'visible';  // Force visibility
	
	console.log('Buy menu toggled. New state:', newDisplay);
	
	if (newDisplay === 'block') {
		// Ensure menu is centered and persists
		buyMenu.style.top = '50%';
		buyMenu.style.left = '50%';
		buyMenu.style.transform = 'translate(-50%, -50%)';
		buyMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';  // Ensure it's visible
		
		// Set a persistent flag
		buyMenu.setAttribute('data-force-open', 'true');
		
		// Update money display
		if (typeof updateMoneyDisplay === 'function') {
			updateMoneyDisplay();
		}
		
		// Focus trap for better UX
		buyMenu.focus();
		
		// Continuously enforce open state for next 5 seconds with !important styles
		const enforceInterval = setInterval(() => {
			if (buyMenu.getAttribute('data-force-open') === 'true') {
				// Use cssText to force !important styles with ULTRA high z-index
				buyMenu.style.cssText = `
					display: block !important;
					visibility: visible !important;
					position: fixed !important;
					top: 0 !important;
					left: 0 !important;
					right: 0 !important;
					bottom: 0 !important;
					transform: none !important;
					z-index: 999999999 !important;
					pointer-events: auto !important;
					background-color: rgba(255, 107, 0, 0.98) !important;
					border: 10px solid red !important;
					border-radius: 0 !important;
					padding: 50px !important;
					min-width: 100vw !important;
					min-height: 100vh !important;
					max-width: none !important;
					max-height: none !important;
					overflow-y: auto !important;
					box-sizing: border-box !important;
					margin: 0 !important;
					width: 100% !important;
					height: 100% !important;
				`;
				console.log('Forcing buy menu with !important styles');
				
				// Debug: Log the actual HTML content
				console.log('Buy menu HTML content length:', buyMenu.innerHTML.length);
				console.log('Buy menu children count:', buyMenu.children.length);
				console.log('Buy menu computed styles:', window.getComputedStyle(buyMenu));
				console.log('Buy menu bounding rect:', buyMenu.getBoundingClientRect());
				
				// Force the menu to be mega-visible regardless of content
				console.log('🚀 NUCLEAR OPTION: Making buy menu ultra-visible...');
				buyMenu.innerHTML = `
					<div style="color: white; padding: 40px; background: rgba(255, 107, 0, 0.95) !important; border: 5px solid red !important;">
						<h1 style="color: white; font-size: 48px; text-shadow: 2px 2px 4px black;">🛒 CS 1.6 BUY MENU</h1>
						<h2 style="color: yellow; font-size: 32px;">Money: $800</h2>
						
						<div style="display: flex; gap: 20px; margin: 20px 0;">
							<div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; min-width: 200px;">
								<h3 style="color: #ff6b00; font-size: 24px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px;">RIFLES</h3>
								<button onclick="console.log('AK-47 purchased!')" style="display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 18px; background: #333; color: white; border: 2px solid #666; cursor: pointer;">
									[1] AK-47 - $2500
								</button>
								<button onclick="console.log('M4A1 purchased!')" style="display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 18px; background: #333; color: white; border: 2px solid #666; cursor: pointer;">
									[2] M4A1 - $3100
								</button>
								<button onclick="console.log('AWP purchased!')" style="display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 18px; background: #333; color: white; border: 2px solid #666; cursor: pointer;">
									[3] AWP - $4750
								</button>
							</div>
							
							<div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; min-width: 200px;">
								<h3 style="color: #ff6b00; font-size: 24px; border-bottom: 2px solid #ff6b00; padding-bottom: 10px;">PISTOLS</h3>
								<button onclick="console.log('Desert Eagle purchased!')" style="display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 18px; background: #333; color: white; border: 2px solid #666; cursor: pointer;">
									[1] Desert Eagle - $650
								</button>
								<button onclick="console.log('USP purchased!')" style="display: block; width: 100%; margin: 10px 0; padding: 15px; font-size: 18px; background: #333; color: white; border: 2px solid #666; cursor: pointer;">
									[2] USP - $500
								</button>
							</div>
						</div>
						
						<button onclick="window.closeBuyMenu(); console.log('Buy menu closed!');" style="background: red; color: white; padding: 20px 40px; font-size: 24px; border: 3px solid darkred; cursor: pointer; border-radius: 10px; margin-top: 20px;">
							❌ CLOSE MENU
						</button>
					</div>
				`;
			} else {
				clearInterval(enforceInterval);
			}
		}, 50);
		
		// Stop enforcing after 5 seconds
		setTimeout(() => {
			clearInterval(enforceInterval);
		}, 5000);
		
	} else {
		buyMenu.removeAttribute('data-force-open');
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

// Weapon Purchase System
function buyWeapon(weaponId, price) {
	const player = gameState.players[gameState.localPlayerId];
	if (!player) {
		console.log('❌ Player not found!');
		return;
	}
	
	// Check if player has enough money
	if (player.money < price) {
		console.log(`❌ Not enough money! Need $${price}, have $${player.money}`);
		return;
	}
	
	// Deduct money
	player.money -= price;
	console.log(`💰 Purchased ${weaponId} for $${price}. Money remaining: $${player.money}`);
	
	// Give weapon to player based on type
	if (['ak47', 'm4a1', 'awp', 'galil', 'famas'].includes(weaponId)) {
		// Primary weapon
		player.primaryWeapon = weaponId;
		player.currentWeapon = 'primary';
		
		// Initialize ammunition for primary weapon
		const ammoConfig = WEAPON_AMMO_CONFIG[weaponId];
		if (ammoConfig) {
			player.ammo.primary.clip = ammoConfig.clipSize;
			player.ammo.primary.reserve = ammoConfig.maxAmmo - ammoConfig.clipSize;
		}
		
		// Update slot
		player.slots[3] = weaponId;
		
		console.log(`🔫 Equipped primary weapon: ${weaponId}`);
	} else if (['deagle', 'usp', 'glock', 'p228'].includes(weaponId)) {
		// Secondary weapon  
		player.secondaryWeapon = weaponId;
		
		// Initialize ammunition for secondary weapon
		const ammoConfig = WEAPON_AMMO_CONFIG[weaponId];
		if (ammoConfig) {
			player.ammo.secondary.clip = ammoConfig.clipSize;
			player.ammo.secondary.reserve = ammoConfig.maxAmmo - ammoConfig.clipSize;
		}
		
		// Update slot
		player.slots[2] = weaponId;
		
		if (!player.primaryWeapon) {
			player.currentWeapon = 'secondary';
		}
		console.log(`🔫 Equipped secondary weapon: ${weaponId}`);
	}
	
	// Update buy menu money display
	updateBuyMenuMoney();
	
	// Close buy menu after purchase
	setTimeout(() => {
		let buyMenuToClose = document.getElementById('claude-buy-menu');
		if (buyMenuToClose) {
			buyMenuToClose.remove();
		}
	}, 500);
}

function updateBuyMenuMoney() {
	const player = gameState.players[gameState.localPlayerId];
	if (!player) return;
	
	// Update money display in buy menu
	const moneyElements = document.querySelectorAll('#claude-buy-menu .money-display');
	moneyElements.forEach(element => {
		if (element) {
			element.textContent = `Money: $${player.money}`;
		}
	});
	
	// Also update any money display in the buy menu content
	let currentBuyMenu = document.getElementById('claude-buy-menu');
	if (currentBuyMenu) {
		const moneyDiv = currentBuyMenu.querySelector('div:nth-child(1) div:nth-child(2)');
		if (moneyDiv) {
			moneyDiv.textContent = `Money: $${player.money}`;
		}
	}
}

// Make buyWeapon available globally
window.buyWeapon = buyWeapon;
window.updateBuyMenuMoney = updateBuyMenuMoney;

// Export functions for Ruby integration
window.CS16Classic = {
	initializeGame,
	gameState: () => gameState,
	CLASSIC_CONFIG,
	toggleBuyMenu: window.toggleBuyMenu,
	openBuyMenu: window.openBuyMenu,
	closeBuyMenu: window.closeBuyMenu,
	buyWeapon: buyWeapon,
	updateBuyMenuMoney: updateBuyMenuMoney,
	// Newly added functions
	formatTime,
	plantBomb,
	defuseBomb,
	checkBulletHit,
	renderScoreboard,
	getBombSiteAt,
	// WebSocket state sync helpers
	broadcast: (type, data) => {
		console.log(`[WebSocket] Broadcast ${type}:`, data);
		// This would be connected to actual WebSocket in production
	}
};
