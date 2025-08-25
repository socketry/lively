// Tile Map Renderer for CS2D Game
class TileMapRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.tileSize = 32;
        this.mapData = null;
        this.tileImages = {};
        this.collisionGrid = null;
        this.visibilityGrid = null;
        this.minimapCanvas = null;
        this.minimapCtx = null;
        
        // Tile colors for rendering (matching Ruby definitions)
        this.tileColors = {
            empty: '#000000',
            floor: '#2a2a2a',
            wall: '#606060',
            wall_breakable: '#8b6432',
            box: '#654321',
            barrel: '#4a4a4a',
            water: '#0066cc',
            ladder: '#8b4513',
            glass: '#87ceeb',
            bombsite_a: 'rgba(255, 170, 0, 0.3)',
            bombsite_b: 'rgba(255, 0, 170, 0.3)',
            ct_spawn: 'rgba(0, 136, 255, 0.2)',
            t_spawn: 'rgba(255, 136, 0, 0.2)',
            buy_zone_ct: 'rgba(0, 68, 170, 0.2)',
            buy_zone_t: 'rgba(170, 68, 0, 0.2)',
            door: '#6b4914',
            door_rotating: '#5b3914',
            vent: '#3a3a3a'
        };
        
        // Texture patterns for tiles
        this.tilePatterns = {};
        this.initializePatterns();
    }
    
    initializePatterns() {
        // Create texture patterns for different tile types
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = this.tileSize;
        patternCanvas.height = this.tileSize;
        const patternCtx = patternCanvas.getContext('2d');
        
        // Wall pattern (brick-like)
        this.createWallPattern(patternCtx);
        this.tilePatterns.wall = this.ctx.createPattern(patternCanvas, 'repeat');
        
        // Floor pattern (tiled)
        this.createFloorPattern(patternCtx);
        this.tilePatterns.floor = this.ctx.createPattern(patternCanvas, 'repeat');
        
        // Box pattern (wood crate)
        this.createBoxPattern(patternCtx);
        this.tilePatterns.box = this.ctx.createPattern(patternCanvas, 'repeat');
    }
    
    createWallPattern(ctx) {
        ctx.fillStyle = '#606060';
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        
        // Add brick lines
        ctx.strokeStyle = '#505050';
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let y = 0; y < this.tileSize; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.tileSize, y);
            ctx.stroke();
        }
        
        // Vertical lines (offset pattern)
        for (let y = 0; y < this.tileSize; y += 16) {
            for (let x = 0; x < this.tileSize; x += 16) {
                ctx.beginPath();
                ctx.moveTo(x + (y % 32 === 0 ? 0 : 8), y);
                ctx.lineTo(x + (y % 32 === 0 ? 0 : 8), y + 8);
                ctx.stroke();
            }
        }
    }
    
    createFloorPattern(ctx) {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        
        // Add tile lines
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, this.tileSize, this.tileSize);
        
        // Add some texture
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * this.tileSize;
            const y = Math.random() * this.tileSize;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(x, y, 2, 2);
        }
    }
    
    createBoxPattern(ctx) {
        ctx.fillStyle = '#654321';
        ctx.fillRect(0, 0, this.tileSize, this.tileSize);
        
        // Wood grain effect
        ctx.strokeStyle = '#543210';
        ctx.lineWidth = 1;
        for (let y = 0; y < this.tileSize; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.tileSize, y + Math.random() * 2);
            ctx.stroke();
        }
        
        // Box edges
        ctx.strokeStyle = '#432100';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, this.tileSize - 2, this.tileSize - 2);
    }
    
    loadMap(mapData) {
        this.mapData = mapData;
        this.buildCollisionGrid();
        this.createMinimap();
        return true;
    }
    
    loadMapFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return this.loadMap(data);
        } catch (error) {
            console.error('Failed to load map:', error);
            return false;
        }
    }
    
    buildCollisionGrid() {
        if (!this.mapData) return;
        
        const width = this.mapData.dimensions.width;
        const height = this.mapData.dimensions.height;
        
        this.collisionGrid = [];
        for (let y = 0; y < height; y++) {
            this.collisionGrid[y] = [];
            for (let x = 0; x < width; x++) {
                const tile = this.mapData.tiles[y][x];
                this.collisionGrid[y][x] = this.isSolid(tile) ? 1 : 0;
            }
        }
    }
    
    isSolid(tileType) {
        const solidTiles = ['wall', 'wall_breakable', 'box', 'barrel', 'glass', 'door', 'door_rotating'];
        return solidTiles.includes(tileType);
    }
    
    isPenetrable(tileType) {
        const penetrableTiles = ['wall_breakable', 'box', 'barrel', 'glass'];
        return penetrableTiles.includes(tileType);
    }
    
    render(camera) {
        if (!this.mapData) return;
        
        const tiles = this.mapData.tiles;
        const tileSize = this.tileSize;
        
        // Calculate visible tile range
        const startX = Math.floor(camera.x / tileSize);
        const startY = Math.floor(camera.y / tileSize);
        const endX = Math.ceil((camera.x + this.canvas.width) / tileSize);
        const endY = Math.ceil((camera.y + this.canvas.height) / tileSize);
        
        // Clamp to map bounds
        const minX = Math.max(0, startX);
        const minY = Math.max(0, startY);
        const maxX = Math.min(this.mapData.dimensions.width, endX);
        const maxY = Math.min(this.mapData.dimensions.height, endY);
        
        // Render visible tiles
        for (let y = minY; y < maxY; y++) {
            for (let x = minX; x < maxX; x++) {
                const tile = tiles[y][x];
                this.renderTile(x, y, tile, camera);
            }
        }
        
        // Render zone overlays
        this.renderZones(camera);
    }
    
    renderTile(x, y, tileType, camera) {
        const screenX = x * this.tileSize - camera.x;
        const screenY = y * this.tileSize - camera.y;
        
        // Skip tiles outside screen
        if (screenX + this.tileSize < 0 || screenX > this.canvas.width ||
            screenY + this.tileSize < 0 || screenY > this.canvas.height) {
            return;
        }
        
        // Use pattern if available, otherwise solid color
        if (this.tilePatterns[tileType]) {
            this.ctx.fillStyle = this.tilePatterns[tileType];
        } else {
            this.ctx.fillStyle = this.tileColors[tileType] || '#000000';
        }
        
        this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
        
        // Add special rendering for certain tiles
        this.renderTileDetails(screenX, screenY, tileType);
    }
    
    renderTileDetails(x, y, tileType) {
        const size = this.tileSize;
        
        switch (tileType) {
            case 'glass':
                // Glass reflection effect
                this.ctx.fillStyle = 'rgba(200, 230, 255, 0.3)';
                this.ctx.fillRect(x, y, size, size / 3);
                break;
                
            case 'water':
                // Water animation (simple wave effect)
                const time = Date.now() / 1000;
                const waveOffset = Math.sin(time * 2) * 2;
                this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + size / 2 + waveOffset);
                this.ctx.lineTo(x + size, y + size / 2 - waveOffset);
                this.ctx.stroke();
                break;
                
            case 'barrel':
                // Barrel shadow
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                this.ctx.beginPath();
                this.ctx.ellipse(x + size / 2, y + size - 2, size / 3, size / 6, 0, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Barrel body
                this.ctx.fillStyle = '#5a5a5a';
                this.ctx.beginPath();
                this.ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Barrel bands
                this.ctx.strokeStyle = '#3a3a3a';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x + size / 2, y + size / 2, size / 3, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
                
            case 'ladder':
                // Ladder rungs
                this.ctx.strokeStyle = '#6b3513';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 4; i++) {
                    const rungY = y + (i + 1) * (size / 5);
                    this.ctx.beginPath();
                    this.ctx.moveTo(x + size * 0.2, rungY);
                    this.ctx.lineTo(x + size * 0.8, rungY);
                    this.ctx.stroke();
                }
                
                // Ladder sides
                this.ctx.beginPath();
                this.ctx.moveTo(x + size * 0.2, y);
                this.ctx.lineTo(x + size * 0.2, y + size);
                this.ctx.moveTo(x + size * 0.8, y);
                this.ctx.lineTo(x + size * 0.8, y + size);
                this.ctx.stroke();
                break;
                
            case 'door':
            case 'door_rotating':
                // Door handle
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.fillRect(x + size * 0.7, y + size * 0.45, 4, 8);
                
                // Door frame
                this.ctx.strokeStyle = '#4b2914';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);
                break;
        }
    }
    
    renderZones(camera) {
        if (!this.mapData) return;
        
        const tiles = this.mapData.tiles;
        const tileSize = this.tileSize;
        
        // Render semi-transparent zone overlays
        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                const tile = tiles[y][x];
                
                if (this.isZoneTile(tile)) {
                    const screenX = x * tileSize - camera.x;
                    const screenY = y * tileSize - camera.y;
                    
                    // Zone overlay with animated border
                    const time = Date.now() / 1000;
                    const pulse = Math.sin(time * 2) * 0.1 + 0.3;
                    
                    switch (tile) {
                        case 'bombsite_a':
                            this.ctx.fillStyle = `rgba(255, 170, 0, ${pulse})`;
                            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
                            this.renderZoneLabel(screenX, screenY, 'A', '#ffaa00');
                            break;
                            
                        case 'bombsite_b':
                            this.ctx.fillStyle = `rgba(255, 0, 170, ${pulse})`;
                            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
                            this.renderZoneLabel(screenX, screenY, 'B', '#ff00aa');
                            break;
                            
                        case 'buy_zone_ct':
                            this.ctx.fillStyle = `rgba(0, 68, 170, ${pulse * 0.5})`;
                            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
                            break;
                            
                        case 'buy_zone_t':
                            this.ctx.fillStyle = `rgba(170, 68, 0, ${pulse * 0.5})`;
                            this.ctx.fillRect(screenX, screenY, tileSize, tileSize);
                            break;
                    }
                }
            }
        }
    }
    
    renderZoneLabel(x, y, label, color) {
        this.ctx.save();
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(label, x + this.tileSize / 2, y + this.tileSize / 2);
        this.ctx.fillText(label, x + this.tileSize / 2, y + this.tileSize / 2);
        this.ctx.restore();
    }
    
    isZoneTile(tileType) {
        const zoneTiles = ['bombsite_a', 'bombsite_b', 'buy_zone_ct', 'buy_zone_t', 'ct_spawn', 't_spawn'];
        return zoneTiles.includes(tileType);
    }
    
    // Collision detection
    checkCollision(x, y, width, height) {
        if (!this.collisionGrid) return false;
        
        // Convert world coordinates to tile coordinates
        const leftTile = Math.floor(x / this.tileSize);
        const rightTile = Math.floor((x + width) / this.tileSize);
        const topTile = Math.floor(y / this.tileSize);
        const bottomTile = Math.floor((y + height) / this.tileSize);
        
        // Check bounds
        if (leftTile < 0 || rightTile >= this.mapData.dimensions.width ||
            topTile < 0 || bottomTile >= this.mapData.dimensions.height) {
            return true; // Out of bounds
        }
        
        // Check all tiles the entity overlaps
        for (let ty = topTile; ty <= bottomTile; ty++) {
            for (let tx = leftTile; tx <= rightTile; tx++) {
                if (this.collisionGrid[ty] && this.collisionGrid[ty][tx] === 1) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Get tile at world position
    getTileAt(worldX, worldY) {
        const tileX = Math.floor(worldX / this.tileSize);
        const tileY = Math.floor(worldY / this.tileSize);
        
        if (tileX < 0 || tileX >= this.mapData.dimensions.width ||
            tileY < 0 || tileY >= this.mapData.dimensions.height) {
            return 'empty';
        }
        
        return this.mapData.tiles[tileY][tileX];
    }
    
    // Check if position is in a specific zone
    isInZone(x, y, zoneType) {
        const tile = this.getTileAt(x, y);
        return tile === zoneType;
    }
    
    // Line of sight check
    hasLineOfSight(x1, y1, x2, y2) {
        // Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let currentX = x1;
        let currentY = y1;
        
        while (currentX !== x2 || currentY !== y2) {
            const tile = this.getTileAt(currentX, currentY);
            
            // Check if tile blocks vision (not glass)
            if (this.isSolid(tile) && tile !== 'glass') {
                return false;
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                currentX += sx;
            }
            if (e2 < dx) {
                err += dx;
                currentY += sy;
            }
        }
        
        return true;
    }
    
    // Get spawn points
    getSpawnPoints(team) {
        const spawns = [];
        if (!this.mapData) return spawns;
        
        const spawnTile = team === 'ct' ? 'ct_spawn' : 't_spawn';
        const tiles = this.mapData.tiles;
        
        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                if (tiles[y][x] === spawnTile) {
                    spawns.push({
                        x: x * this.tileSize + this.tileSize / 2,
                        y: y * this.tileSize + this.tileSize / 2
                    });
                }
            }
        }
        
        return spawns;
    }
    
    // Get bombsite positions
    getBombsites() {
        const bombsites = { a: [], b: [] };
        if (!this.mapData) return bombsites;
        
        const tiles = this.mapData.tiles;
        
        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                if (tiles[y][x] === 'bombsite_a') {
                    bombsites.a.push({ x: x * this.tileSize, y: y * this.tileSize });
                } else if (tiles[y][x] === 'bombsite_b') {
                    bombsites.b.push({ x: x * this.tileSize, y: y * this.tileSize });
                }
            }
        }
        
        return bombsites;
    }
    
    // Create minimap
    createMinimap() {
        if (!this.mapData) return;
        
        const scale = 4; // 4 pixels per tile
        const width = this.mapData.dimensions.width * scale;
        const height = this.mapData.dimensions.height * scale;
        
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.width = width;
        this.minimapCanvas.height = height;
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        const tiles = this.mapData.tiles;
        
        for (let y = 0; y < tiles.length; y++) {
            for (let x = 0; x < tiles[y].length; x++) {
                const tile = tiles[y][x];
                
                // Simplified colors for minimap
                if (this.isSolid(tile)) {
                    this.minimapCtx.fillStyle = '#ffffff';
                } else if (tile === 'bombsite_a') {
                    this.minimapCtx.fillStyle = '#ffaa00';
                } else if (tile === 'bombsite_b') {
                    this.minimapCtx.fillStyle = '#ff00aa';
                } else {
                    this.minimapCtx.fillStyle = '#222222';
                }
                
                this.minimapCtx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
    
    // Render minimap
    renderMinimap(targetCtx, x, y, width, height, playerPositions) {
        if (!this.minimapCanvas) return;
        
        // Draw minimap background
        targetCtx.save();
        targetCtx.globalAlpha = 0.8;
        targetCtx.fillStyle = '#000000';
        targetCtx.fillRect(x, y, width, height);
        
        // Draw map
        targetCtx.drawImage(this.minimapCanvas, 0, 0, this.minimapCanvas.width, this.minimapCanvas.height,
                          x, y, width, height);
        
        // Draw player positions
        if (playerPositions) {
            const scaleX = width / (this.mapData.dimensions.width * this.tileSize);
            const scaleY = height / (this.mapData.dimensions.height * this.tileSize);
            
            playerPositions.forEach(player => {
                const dotX = x + player.x * scaleX;
                const dotY = y + player.y * scaleY;
                
                // Player dot
                targetCtx.fillStyle = player.team === 'ct' ? '#0088ff' : '#ff8800';
                targetCtx.beginPath();
                targetCtx.arc(dotX, dotY, 3, 0, Math.PI * 2);
                targetCtx.fill();
                
                // Direction indicator
                if (player.angle !== undefined) {
                    targetCtx.strokeStyle = targetCtx.fillStyle;
                    targetCtx.lineWidth = 2;
                    targetCtx.beginPath();
                    targetCtx.moveTo(dotX, dotY);
                    targetCtx.lineTo(
                        dotX + Math.cos(player.angle) * 8,
                        dotY + Math.sin(player.angle) * 8
                    );
                    targetCtx.stroke();
                }
            });
        }
        
        targetCtx.restore();
    }
    
    // Get map dimensions in pixels
    getMapDimensions() {
        if (!this.mapData) return { width: 0, height: 0 };
        
        return {
            width: this.mapData.dimensions.width * this.tileSize,
            height: this.mapData.dimensions.height * this.tileSize
        };
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TileMapRenderer;
}