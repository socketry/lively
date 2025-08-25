// CS2D Map Editor JavaScript
class MapEditor {
    constructor() {
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.tileSize = 32;
        this.mapWidth = 40;
        this.mapHeight = 30;
        this.currentTile = 'wall';
        this.currentTool = 'brush';
        this.tiles = [];
        this.isDrawing = false;
        this.isDragging = false;
        this.dragStart = null;
        this.lineStart = null;
        this.selection = null;
        
        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        
        // Tile colors matching the Ruby definitions
        this.tileColors = {
            empty: '#000000',
            floor: '#3a3a3a',
            wall: '#808080',
            wall_breakable: '#966432',
            box: '#654321',
            barrel: '#4a4a4a',
            water: '#0066cc',
            ladder: '#8b4513',
            glass: '#87ceeb',
            bombsite_a: '#ffaa00',
            bombsite_b: '#ff00aa',
            ct_spawn: '#0088ff',
            t_spawn: '#ff8800',
            buy_zone_ct: '#0044aa',
            buy_zone_t: '#aa4400',
            door: '#8b6914',
            door_rotating: '#6b4914',
            vent: '#4a4a4a'
        };
        
        // Tile labels for special tiles
        this.tileLabels = {
            ct_spawn: 'CT',
            t_spawn: 'T',
            bombsite_a: 'A',
            bombsite_b: 'B',
            buy_zone_ct: 'BUY',
            buy_zone_t: 'BUY',
            door: 'D',
            door_rotating: 'DR',
            ladder: 'L',
            vent: 'V'
        };
        
        this.init();
    }
    
    init() {
        // Initialize empty map
        this.clearMap();
        
        // Set canvas size
        this.updateCanvasSize();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initial render
        this.render();
        this.updateMinimap();
        
        // Save initial state
        this.saveHistory();
    }
    
    updateCanvasSize() {
        this.canvas.width = this.mapWidth * this.tileSize;
        this.canvas.height = this.mapHeight * this.tileSize;
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 150;
    }
    
    setupEventListeners() {
        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Tile palette
        document.querySelectorAll('.tile-button').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.tile-button').forEach(b => b.classList.remove('selected'));
                button.classList.add('selected');
                this.currentTile = button.dataset.tile;
                this.updateStatus(`Selected: ${this.currentTile}`);
            });
        });
        
        // Map property changes
        document.getElementById('map-width').addEventListener('change', (e) => {
            this.resizeMap(parseInt(e.target.value), this.mapHeight);
        });
        document.getElementById('map-height').addEventListener('change', (e) => {
            this.resizeMap(this.mapWidth, parseInt(e.target.value));
        });
    }
    
    handleMouseDown(e) {
        const coords = this.getMouseCoords(e);
        this.isDrawing = true;
        
        switch (this.currentTool) {
            case 'brush':
                this.placeTile(coords.tileX, coords.tileY);
                break;
            case 'line':
                this.lineStart = coords;
                break;
            case 'rect':
                this.dragStart = coords;
                break;
            case 'select':
                this.dragStart = coords;
                this.selection = null;
                break;
            case 'fill':
                this.fillArea(coords.tileX, coords.tileY);
                break;
        }
    }
    
    handleMouseMove(e) {
        const coords = this.getMouseCoords(e);
        
        // Update coordinates display
        document.getElementById('coordinates').textContent = `X: ${coords.tileX}, Y: ${coords.tileY}`;
        
        if (this.isDrawing) {
            switch (this.currentTool) {
                case 'brush':
                    this.placeTile(coords.tileX, coords.tileY);
                    break;
                case 'line':
                case 'rect':
                case 'select':
                    // Show preview
                    this.render();
                    this.drawPreview(coords);
                    break;
            }
        }
    }
    
    handleMouseUp(e) {
        const coords = this.getMouseCoords(e);
        
        if (this.isDrawing) {
            switch (this.currentTool) {
                case 'line':
                    if (this.lineStart) {
                        this.drawLine(this.lineStart.tileX, this.lineStart.tileY, coords.tileX, coords.tileY);
                    }
                    break;
                case 'rect':
                    if (this.dragStart) {
                        this.drawRectangle(this.dragStart.tileX, this.dragStart.tileY, coords.tileX, coords.tileY);
                    }
                    break;
                case 'select':
                    if (this.dragStart) {
                        this.selection = {
                            x1: Math.min(this.dragStart.tileX, coords.tileX),
                            y1: Math.min(this.dragStart.tileY, coords.tileY),
                            x2: Math.max(this.dragStart.tileX, coords.tileX),
                            y2: Math.max(this.dragStart.tileY, coords.tileY)
                        };
                    }
                    break;
            }
            
            this.saveHistory();
        }
        
        this.isDrawing = false;
        this.lineStart = null;
        this.dragStart = null;
        this.render();
    }
    
    handleMouseLeave(e) {
        this.isDrawing = false;
        this.render();
    }
    
    handleKeyPress(e) {
        // Prevent shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.key.toLowerCase()) {
            case '1': this.selectTile('floor'); break;
            case '2': this.selectTile('wall'); break;
            case '3': this.selectTile('box'); break;
            case '4': this.selectTile('barrel'); break;
            case 'g': this.selectTile('glass'); break;
            case 'w': this.selectTile('water'); break;
            case 'd': this.selectTile('door'); break;
            case 'l': this.selectTile('ladder'); break;
            case 'a': 
                if (e.shiftKey) this.selectTile('bombsite_a');
                break;
            case 'b': 
                if (e.shiftKey) this.selectTile('bombsite_b');
                break;
            case 't': this.selectTile('t_spawn'); break;
            case 'c': this.selectTile('ct_spawn'); break;
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (e.shiftKey) this.redo();
                    else this.undo();
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.exportMap();
                }
                break;
            case 'delete':
            case 'backspace':
                if (this.selection) {
                    this.deleteSelection();
                }
                break;
        }
    }
    
    getMouseCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const tileX = Math.floor(x / this.tileSize);
        const tileY = Math.floor(y / this.tileSize);
        
        return { x, y, tileX, tileY };
    }
    
    placeTile(x, y, tile = null) {
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
        
        this.tiles[y][x] = tile || this.currentTile;
        this.renderTile(x, y);
        this.updateMinimap();
    }
    
    drawLine(x1, y1, x2, y2) {
        // Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        while (true) {
            this.placeTile(x1, y1);
            
            if (x1 === x2 && y1 === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x1 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y1 += sy;
            }
        }
        
        this.render();
    }
    
    drawRectangle(x1, y1, x2, y2, filled = true) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        if (filled) {
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    this.placeTile(x, y);
                }
            }
        } else {
            // Draw outline only
            for (let x = minX; x <= maxX; x++) {
                this.placeTile(x, minY);
                this.placeTile(x, maxY);
            }
            for (let y = minY + 1; y < maxY; y++) {
                this.placeTile(minX, y);
                this.placeTile(maxX, y);
            }
        }
        
        this.render();
    }
    
    fillArea(startX, startY) {
        const targetTile = this.tiles[startY][startX];
        const fillTile = this.currentTile;
        
        if (targetTile === fillTile) return;
        
        const stack = [[startX, startY]];
        const visited = new Set();
        
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) continue;
            if (this.tiles[y][x] !== targetTile) continue;
            
            visited.add(key);
            this.tiles[y][x] = fillTile;
            
            stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
        }
        
        this.render();
        this.updateMinimap();
    }
    
    deleteSelection() {
        if (!this.selection) return;
        
        for (let y = this.selection.y1; y <= this.selection.y2; y++) {
            for (let x = this.selection.x1; x <= this.selection.x2; x++) {
                this.tiles[y][x] = 'floor';
            }
        }
        
        this.selection = null;
        this.render();
        this.updateMinimap();
        this.saveHistory();
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw tiles
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                this.renderTile(x, y);
            }
        }
        
        // Draw grid
        this.drawGrid();
        
        // Draw selection
        if (this.selection) {
            this.ctx.strokeStyle = '#0af';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.selection.x1 * this.tileSize,
                this.selection.y1 * this.tileSize,
                (this.selection.x2 - this.selection.x1 + 1) * this.tileSize,
                (this.selection.y2 - this.selection.y1 + 1) * this.tileSize
            );
        }
    }
    
    renderTile(x, y) {
        const tile = this.tiles[y][x];
        const color = this.tileColors[tile] || '#000000';
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        
        // Draw label for special tiles
        if (this.tileLabels[tile]) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(
                this.tileLabels[tile],
                x * this.tileSize + this.tileSize / 2,
                y * this.tileSize + this.tileSize / 2
            );
        }
        
        // Draw tile border
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.mapWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.tileSize, 0);
            this.ctx.lineTo(x * this.tileSize, this.mapHeight * this.tileSize);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.mapHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.tileSize);
            this.ctx.lineTo(this.mapWidth * this.tileSize, y * this.tileSize);
            this.ctx.stroke();
        }
    }
    
    drawPreview(coords) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        
        switch (this.currentTool) {
            case 'line':
                if (this.lineStart) {
                    this.ctx.strokeStyle = this.tileColors[this.currentTile];
                    this.ctx.lineWidth = this.tileSize;
                    this.ctx.beginPath();
                    this.ctx.moveTo(
                        this.lineStart.tileX * this.tileSize + this.tileSize / 2,
                        this.lineStart.tileY * this.tileSize + this.tileSize / 2
                    );
                    this.ctx.lineTo(
                        coords.tileX * this.tileSize + this.tileSize / 2,
                        coords.tileY * this.tileSize + this.tileSize / 2
                    );
                    this.ctx.stroke();
                }
                break;
            case 'rect':
                if (this.dragStart) {
                    const minX = Math.min(this.dragStart.tileX, coords.tileX);
                    const maxX = Math.max(this.dragStart.tileX, coords.tileX);
                    const minY = Math.min(this.dragStart.tileY, coords.tileY);
                    const maxY = Math.max(this.dragStart.tileY, coords.tileY);
                    
                    this.ctx.fillStyle = this.tileColors[this.currentTile];
                    this.ctx.fillRect(
                        minX * this.tileSize,
                        minY * this.tileSize,
                        (maxX - minX + 1) * this.tileSize,
                        (maxY - minY + 1) * this.tileSize
                    );
                }
                break;
            case 'select':
                if (this.dragStart) {
                    const minX = Math.min(this.dragStart.tileX, coords.tileX);
                    const maxX = Math.max(this.dragStart.tileX, coords.tileX);
                    const minY = Math.min(this.dragStart.tileY, coords.tileY);
                    const maxY = Math.max(this.dragStart.tileY, coords.tileY);
                    
                    this.ctx.strokeStyle = '#0af';
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.strokeRect(
                        minX * this.tileSize,
                        minY * this.tileSize,
                        (maxX - minX + 1) * this.tileSize,
                        (maxY - minY + 1) * this.tileSize
                    );
                    this.ctx.setLineDash([]);
                }
                break;
        }
        
        this.ctx.restore();
    }
    
    updateMinimap() {
        const scale = Math.min(
            this.minimapCanvas.width / this.mapWidth,
            this.minimapCanvas.height / this.mapHeight
        );
        
        this.minimapCtx.fillStyle = '#000';
        this.minimapCtx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.tiles[y][x];
                const color = this.tileColors[tile];
                
                // Simplify colors for minimap
                if (tile === 'wall' || tile === 'wall_breakable' || tile === 'box' || tile === 'barrel') {
                    this.minimapCtx.fillStyle = '#fff';
                } else if (tile.includes('spawn') || tile.includes('bombsite')) {
                    this.minimapCtx.fillStyle = color;
                } else {
                    this.minimapCtx.fillStyle = '#222';
                }
                
                this.minimapCtx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
    
    selectTile(tile) {
        this.currentTile = tile;
        document.querySelectorAll('.tile-button').forEach(b => b.classList.remove('selected'));
        const button = document.querySelector(`[data-tile="${tile}"]`);
        if (button) button.classList.add('selected');
        this.updateStatus(`Selected: ${tile}`);
    }
    
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('#toolbar .tool-button').forEach(b => b.classList.remove('active'));
        document.getElementById(`tool-${tool}`).classList.add('active');
        this.updateStatus(`Tool: ${tool}`);
    }
    
    clearMap() {
        this.tiles = [];
        for (let y = 0; y < this.mapHeight; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                this.tiles[y][x] = 'floor';
            }
        }
        this.render();
        this.updateMinimap();
        this.saveHistory();
    }
    
    resizeMap(newWidth, newHeight) {
        const oldTiles = this.tiles;
        this.mapWidth = newWidth;
        this.mapHeight = newHeight;
        
        this.tiles = [];
        for (let y = 0; y < newHeight; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < newWidth; x++) {
                if (y < oldTiles.length && x < oldTiles[y].length) {
                    this.tiles[y][x] = oldTiles[y][x];
                } else {
                    this.tiles[y][x] = 'floor';
                }
            }
        }
        
        this.updateCanvasSize();
        this.render();
        this.updateMinimap();
        this.saveHistory();
    }
    
    saveHistory() {
        // Remove any redo history
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add current state
        this.history.push(JSON.stringify(this.tiles));
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.tiles = JSON.parse(this.history[this.historyIndex]);
            this.render();
            this.updateMinimap();
            this.updateStatus('Undo');
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.tiles = JSON.parse(this.history[this.historyIndex]);
            this.render();
            this.updateMinimap();
            this.updateStatus('Redo');
        }
    }
    
    validateMap() {
        const errors = [];
        let ctSpawns = 0;
        let tSpawns = 0;
        let bombsiteA = false;
        let bombsiteB = false;
        
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.tiles[y][x];
                if (tile === 'ct_spawn') ctSpawns++;
                if (tile === 't_spawn') tSpawns++;
                if (tile === 'bombsite_a') bombsiteA = true;
                if (tile === 'bombsite_b') bombsiteB = true;
            }
        }
        
        if (ctSpawns < 5) errors.push('Need at least 5 CT spawn points');
        if (tSpawns < 5) errors.push('Need at least 5 T spawn points');
        
        const mode = document.getElementById('map-mode').value;
        if (mode === 'defuse') {
            if (!bombsiteA) errors.push('Missing Bombsite A');
            if (!bombsiteB) errors.push('Missing Bombsite B');
        }
        
        if (errors.length > 0) {
            alert('Map validation failed:\n' + errors.join('\n'));
            this.updateStatus('Validation failed');
        } else {
            alert('Map is valid!');
            this.updateStatus('Map validated successfully');
        }
        
        return errors.length === 0;
    }
    
    exportMap() {
        const mapData = {
            metadata: {
                name: document.getElementById('map-name').value,
                author: document.getElementById('map-author').value,
                version: '1.0',
                game_mode: document.getElementById('map-mode').value,
                created_at: Date.now()
            },
            dimensions: {
                width: this.mapWidth,
                height: this.mapHeight
            },
            tile_size: this.tileSize,
            tiles: this.tiles
        };
        
        const json = JSON.stringify(mapData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mapData.metadata.name || 'map'}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.updateStatus('Map exported');
    }
    
    importMap() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const mapData = JSON.parse(event.target.result);
                    this.loadMapData(mapData);
                    this.updateStatus('Map imported');
                } catch (error) {
                    alert('Failed to import map: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    loadMapData(mapData) {
        this.mapWidth = mapData.dimensions.width;
        this.mapHeight = mapData.dimensions.height;
        this.tiles = mapData.tiles;
        
        document.getElementById('map-name').value = mapData.metadata.name || '';
        document.getElementById('map-author').value = mapData.metadata.author || '';
        document.getElementById('map-mode').value = mapData.metadata.game_mode || 'defuse';
        document.getElementById('map-width').value = this.mapWidth;
        document.getElementById('map-height').value = this.mapHeight;
        
        this.updateCanvasSize();
        this.render();
        this.updateMinimap();
        this.saveHistory();
    }
    
    loadTemplate(templateName) {
        // Template data matching Ruby implementation
        const templates = {
            dust2: {
                name: 'de_dust2_simple',
                width: 40,
                height: 30,
                generator: () => this.generateDust2()
            },
            inferno: {
                name: 'de_inferno_simple',
                width: 40,
                height: 30,
                generator: () => this.generateInferno()
            },
            aim: {
                name: 'aim_map',
                width: 30,
                height: 20,
                generator: () => this.generateAimMap()
            },
            iceworld: {
                name: 'fy_iceworld',
                width: 25,
                height: 25,
                generator: () => this.generateIceworld()
            }
        };
        
        const template = templates[templateName];
        if (!template) {
            alert('Template not found');
            return;
        }
        
        this.mapWidth = template.width;
        this.mapHeight = template.height;
        document.getElementById('map-width').value = this.mapWidth;
        document.getElementById('map-height').value = this.mapHeight;
        document.getElementById('map-name').value = template.name;
        
        this.updateCanvasSize();
        template.generator();
        this.render();
        this.updateMinimap();
        this.saveHistory();
        this.updateStatus(`Loaded template: ${template.name}`);
    }
    
    generateDust2() {
        // Simplified dust2 layout
        this.clearMap();
        
        // Add walls
        for (let x = 0; x < 40; x++) {
            this.tiles[0][x] = 'wall';
            this.tiles[29][x] = 'wall';
        }
        for (let y = 0; y < 30; y++) {
            this.tiles[y][0] = 'wall';
            this.tiles[y][39] = 'wall';
        }
        
        // T Spawn
        for (let y = 24; y <= 28; y++) {
            for (let x = 2; x <= 7; x++) {
                if (y === 26 && x >= 3 && x <= 6) {
                    this.tiles[y][x] = 't_spawn';
                } else if (y >= 25 && y <= 27) {
                    this.tiles[y][x] = 'buy_zone_t';
                }
            }
        }
        
        // CT Spawn
        for (let y = 2; y <= 6; y++) {
            for (let x = 32; x <= 37; x++) {
                if (y === 4 && x >= 33 && x <= 36) {
                    this.tiles[y][x] = 'ct_spawn';
                } else if (y >= 3 && y <= 5) {
                    this.tiles[y][x] = 'buy_zone_ct';
                }
            }
        }
        
        // Bombsite A
        for (let y = 6; y <= 11; y++) {
            for (let x = 26; x <= 32; x++) {
                this.tiles[y][x] = 'bombsite_a';
            }
        }
        
        // Bombsite B
        for (let y = 19; y <= 24; y++) {
            for (let x = 10; x <= 16; x++) {
                this.tiles[y][x] = 'bombsite_b';
            }
        }
        
        // Add some boxes
        this.tiles[7][27] = 'box';
        this.tiles[9][31] = 'box';
        this.tiles[20][11] = 'box';
        this.tiles[22][15] = 'box';
        this.tiles[15][19] = 'box';
        this.tiles[15][21] = 'box';
    }
    
    generateInferno() {
        // Simplified inferno layout
        this.clearMap();
        
        // Add walls
        for (let x = 0; x < 40; x++) {
            this.tiles[0][x] = 'wall';
            this.tiles[29][x] = 'wall';
        }
        for (let y = 0; y < 30; y++) {
            this.tiles[y][0] = 'wall';
            this.tiles[y][39] = 'wall';
        }
        
        // T Spawn
        for (let y = 24; y <= 27; y++) {
            for (let x = 18; x <= 22; x++) {
                if (y === 25 && x >= 19 && x <= 21) {
                    this.tiles[y][x] = 't_spawn';
                } else {
                    this.tiles[y][x] = 'buy_zone_t';
                }
            }
        }
        
        // CT Spawn
        for (let y = 2; y <= 5; y++) {
            for (let x = 18; x <= 22; x++) {
                if (y === 3 && x >= 19 && x <= 21) {
                    this.tiles[y][x] = 'ct_spawn';
                } else {
                    this.tiles[y][x] = 'buy_zone_ct';
                }
            }
        }
        
        // Bombsite A
        for (let y = 6; y <= 11; y++) {
            for (let x = 5; x <= 11; x++) {
                this.tiles[y][x] = 'bombsite_a';
            }
        }
        
        // Bombsite B
        for (let y = 12; y <= 17; y++) {
            for (let x = 28; x <= 34; x++) {
                this.tiles[y][x] = 'bombsite_b';
            }
        }
        
        // Banana area
        this.tiles[20][25] = 'box';
        this.tiles[20][26] = 'box';
        
        // Fountain at B
        this.tiles[14][31] = 'water';
        this.tiles[15][31] = 'water';
    }
    
    generateAimMap() {
        // Simple aim map
        this.mapWidth = 30;
        this.mapHeight = 20;
        this.updateCanvasSize();
        this.clearMap();
        
        // Add walls
        for (let x = 0; x < 30; x++) {
            this.tiles[0][x] = 'wall';
            this.tiles[19][x] = 'wall';
        }
        for (let y = 0; y < 20; y++) {
            this.tiles[y][0] = 'wall';
            this.tiles[y][29] = 'wall';
        }
        
        // CT spawn area
        for (let y = 8; y <= 11; y++) {
            for (let x = 2; x <= 5; x++) {
                if (x === 3 && y === 10) {
                    this.tiles[y][x] = 'ct_spawn';
                } else {
                    this.tiles[y][x] = 'buy_zone_ct';
                }
            }
        }
        
        // T spawn area
        for (let y = 8; y <= 11; y++) {
            for (let x = 24; x <= 27; x++) {
                if (x === 26 && y === 10) {
                    this.tiles[y][x] = 't_spawn';
                } else {
                    this.tiles[y][x] = 'buy_zone_t';
                }
            }
        }
        
        // Central cover
        this.tiles[9][10] = 'box';
        this.tiles[10][10] = 'box';
        this.tiles[9][19] = 'box';
        this.tiles[10][19] = 'box';
        
        for (let y = 8; y <= 11; y++) {
            this.tiles[y][14] = 'wall';
            this.tiles[y][15] = 'wall';
        }
    }
    
    generateIceworld() {
        // fy_iceworld style map
        this.mapWidth = 25;
        this.mapHeight = 25;
        this.updateCanvasSize();
        this.clearMap();
        
        // Add walls
        for (let x = 0; x < 25; x++) {
            this.tiles[0][x] = 'wall';
            this.tiles[24][x] = 'wall';
        }
        for (let y = 0; y < 25; y++) {
            this.tiles[y][0] = 'wall';
            this.tiles[y][24] = 'wall';
        }
        
        // CT spawns (corners)
        this.tiles[2][2] = 'ct_spawn';
        this.tiles[2][22] = 'ct_spawn';
        this.tiles[22][2] = 'ct_spawn';
        this.tiles[22][22] = 'ct_spawn';
        
        // T spawns (middle sides)
        this.tiles[2][12] = 't_spawn';
        this.tiles[12][2] = 't_spawn';
        this.tiles[12][22] = 't_spawn';
        this.tiles[22][12] = 't_spawn';
        
        // Central pillars
        this.tiles[10][10] = 'wall';
        this.tiles[10][14] = 'wall';
        this.tiles[14][10] = 'wall';
        this.tiles[14][14] = 'wall';
        
        // Random boxes
        this.tiles[5][5] = 'box';
        this.tiles[5][19] = 'box';
        this.tiles[19][5] = 'box';
        this.tiles[19][19] = 'box';
        this.tiles[12][12] = 'box';
    }
    
    updateStatus(message) {
        document.getElementById('status').textContent = message;
        setTimeout(() => {
            document.getElementById('status').textContent = 'Ready';
        }, 2000);
    }
}

// Initialize editor when page loads
const editor = new MapEditor();