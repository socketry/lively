import { Vector2D, Rectangle } from '../physics/PhysicsEngine';

export interface MapTile {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'water' | 'glass' | 'metal' | 'wood';
  walkable: boolean;
  bulletPenetrable: boolean;
  destructible: boolean;
  health?: number;
  texture: string;
}

export interface SpawnPoint {
  id: string;
  position: Vector2D;
  team: 'ct' | 't' | 'dm';
  angle: number;
}

export interface BombSite {
  id: string;
  name: 'A' | 'B';
  bounds: Rectangle;
  color: string;
}

export interface MapObject {
  id: string;
  type: 'crate' | 'barrel' | 'car' | 'door' | 'window';
  position: Vector2D;
  size: Vector2D;
  rotation: number;
  health: number;
  destructible: boolean;
  provides_cover: boolean;
  bullet_penetration: number;
}

export interface MapData {
  name: string;
  author: string;
  version: string;
  size: { width: number; height: number };
  tileSize: number;
  tiles: MapTile[][];
  spawnPoints: SpawnPoint[];
  bombSites: BombSite[];
  objects: MapObject[];
  lighting: LightingData;
  ambientSound?: string;
  skybox?: string;
}

export interface LightingData {
  ambient: string;
  intensity: number;
  shadows: boolean;
  lights: LightSource[];
}

export interface LightSource {
  id: string;
  position: Vector2D;
  color: string;
  intensity: number;
  radius: number;
  type: 'point' | 'spot' | 'directional';
}

export class MapSystem {
  private currentMap: MapData | null = null;
  private tileGrid: MapTile[][] = [];
  private collisionGrid: boolean[][] = [];
  private visibilityGrid: number[][] = [];
  private pathfindingGrid: number[][] = [];
  
  constructor() {
    this.loadDefaultMaps();
  }
  
  private loadDefaultMaps(): void {
    // Load CS2D classic maps
    const dustMap = this.createDustMap();
    this.loadMap(dustMap);
  }
  
  private createDustMap(): MapData {
    const mapData: MapData = {
      name: 'de_dust2',
      author: 'CS2D',
      version: '1.0',
      size: { width: 2048, height: 2048 },
      tileSize: 32,
      tiles: [],
      spawnPoints: [
        // CT Spawn points
        { id: 'ct_1', position: { x: 256, y: 256 }, team: 'ct', angle: 0 },
        { id: 'ct_2', position: { x: 288, y: 256 }, team: 'ct', angle: 0 },
        { id: 'ct_3', position: { x: 320, y: 256 }, team: 'ct', angle: 0 },
        { id: 'ct_4', position: { x: 256, y: 288 }, team: 'ct', angle: 0 },
        { id: 'ct_5', position: { x: 288, y: 288 }, team: 'ct', angle: 0 },
        // T Spawn points
        { id: 't_1', position: { x: 1792, y: 1792 }, team: 't', angle: Math.PI },
        { id: 't_2', position: { x: 1760, y: 1792 }, team: 't', angle: Math.PI },
        { id: 't_3', position: { x: 1728, y: 1792 }, team: 't', angle: Math.PI },
        { id: 't_4', position: { x: 1792, y: 1760 }, team: 't', angle: Math.PI },
        { id: 't_5', position: { x: 1760, y: 1760 }, team: 't', angle: Math.PI }
      ],
      bombSites: [
        {
          id: 'site_a',
          name: 'A',
          bounds: { x: 512, y: 512, width: 256, height: 256 },
          color: '#ffaa00'
        },
        {
          id: 'site_b',
          name: 'B',
          bounds: { x: 1280, y: 1280, width: 256, height: 256 },
          color: '#00aaff'
        }
      ],
      objects: [
        // Crates for cover
        { id: 'crate_1', type: 'crate', position: { x: 400, y: 400 }, size: { x: 64, y: 64 }, rotation: 0, health: 200, destructible: true, provides_cover: true, bullet_penetration: 0.5 },
        { id: 'crate_2', type: 'crate', position: { x: 600, y: 600 }, size: { x: 64, y: 64 }, rotation: 0.785, health: 200, destructible: true, provides_cover: true, bullet_penetration: 0.5 },
        { id: 'crate_3', type: 'crate', position: { x: 1400, y: 600 }, size: { x: 64, y: 64 }, rotation: 0, health: 200, destructible: true, provides_cover: true, bullet_penetration: 0.5 },
        // Barrels
        { id: 'barrel_1', type: 'barrel', position: { x: 800, y: 400 }, size: { x: 32, y: 32 }, rotation: 0, health: 100, destructible: true, provides_cover: true, bullet_penetration: 0.3 },
        { id: 'barrel_2', type: 'barrel', position: { x: 1200, y: 800 }, size: { x: 32, y: 32 }, rotation: 0, health: 100, destructible: true, provides_cover: true, bullet_penetration: 0.3 },
        // Cars for larger cover
        { id: 'car_1', type: 'car', position: { x: 1000, y: 1000 }, size: { x: 128, y: 64 }, rotation: 1.57, health: 500, destructible: false, provides_cover: true, bullet_penetration: 0.1 }
      ],
      lighting: {
        ambient: '#444444',
        intensity: 0.7,
        shadows: true,
        lights: [
          { id: 'light_1', position: { x: 512, y: 512 }, color: '#ffff00', intensity: 0.8, radius: 200, type: 'point' },
          { id: 'light_2', position: { x: 1536, y: 1536 }, color: '#ffffff', intensity: 0.6, radius: 150, type: 'point' }
        ]
      },
      ambientSound: 'ambient_dust',
      skybox: 'desert_sky'
    };
    
    // Generate tile grid
    const width = Math.floor(mapData.size.width / mapData.tileSize);
    const height = Math.floor(mapData.size.height / mapData.tileSize);
    
    for (let y = 0; y < height; y++) {
      mapData.tiles[y] = [];
      for (let x = 0; x < width; x++) {
        // Create border walls
        const isWall = x === 0 || x === width - 1 || y === 0 || y === height - 1 ||
                      (x > 10 && x < 15 && y > 10 && y < 40) || // Long wall
                      (x > 30 && x < 35 && y > 20 && y < 25) || // Small wall
                      (x > 45 && x < 50 && y > 10 && y < 15); // Another wall
        
        mapData.tiles[y][x] = {
          x: x * mapData.tileSize,
          y: y * mapData.tileSize,
          type: isWall ? 'wall' : 'floor',
          walkable: !isWall,
          bulletPenetrable: false,
          destructible: false,
          texture: isWall ? 'wall_dust' : 'floor_dust'
        };
      }
    }
    
    return mapData;
  }
  
  loadMap(mapData: MapData): void {
    this.currentMap = mapData;
    this.tileGrid = mapData.tiles;
    this.generateCollisionGrid();
    this.generateVisibilityGrid();
    this.generatePathfindingGrid();
  }
  
  private generateCollisionGrid(): void {
    if (!this.currentMap) return;
    
    const width = this.currentMap.tiles[0].length;
    const height = this.currentMap.tiles.length;
    
    this.collisionGrid = [];
    for (let y = 0; y < height; y++) {
      this.collisionGrid[y] = [];
      for (let x = 0; x < width; x++) {
        this.collisionGrid[y][x] = !this.currentMap.tiles[y][x].walkable;
      }
    }
  }
  
  private generateVisibilityGrid(): void {
    if (!this.currentMap) return;
    
    const width = this.currentMap.tiles[0].length;
    const height = this.currentMap.tiles.length;
    
    this.visibilityGrid = [];
    for (let y = 0; y < height; y++) {
      this.visibilityGrid[y] = [];
      for (let x = 0; x < width; x++) {
        const tile = this.currentMap.tiles[y][x];
        this.visibilityGrid[y][x] = tile.type === 'wall' ? 0 : 
                                    tile.type === 'glass' ? 0.5 : 1;
      }
    }
  }
  
  private generatePathfindingGrid(): void {
    if (!this.currentMap) return;
    
    const width = this.currentMap.tiles[0].length;
    const height = this.currentMap.tiles.length;
    
    this.pathfindingGrid = [];
    for (let y = 0; y < height; y++) {
      this.pathfindingGrid[y] = [];
      for (let x = 0; x < width; x++) {
        this.pathfindingGrid[y][x] = this.currentMap.tiles[y][x].walkable ? 1 : 0;
      }
    }
  }
  
  getTileAt(position: Vector2D): MapTile | null {
    if (!this.currentMap) return null;
    
    const tileX = Math.floor(position.x / this.currentMap.tileSize);
    const tileY = Math.floor(position.y / this.currentMap.tileSize);
    
    if (tileX < 0 || tileX >= this.tileGrid[0].length ||
        tileY < 0 || tileY >= this.tileGrid.length) {
      return null;
    }
    
    return this.tileGrid[tileY][tileX];
  }
  
  isPositionWalkable(position: Vector2D): boolean {
    const tile = this.getTileAt(position);
    return tile ? tile.walkable : false;
  }
  
  checkLineOfSight(from: Vector2D, to: Vector2D): boolean {
    if (!this.currentMap) return true;
    
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / (this.currentMap.tileSize / 2));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const checkPos = {
        x: from.x + dx * t,
        y: from.y + dy * t
      };
      
      const tile = this.getTileAt(checkPos);
      if (tile && tile.type === 'wall') {
        return false;
      }
    }
    
    return true;
  }
  
  findPath(start: Vector2D, end: Vector2D): Vector2D[] {
    if (!this.currentMap) return [];
    
    const startTile = {
      x: Math.floor(start.x / this.currentMap.tileSize),
      y: Math.floor(start.y / this.currentMap.tileSize)
    };
    
    const endTile = {
      x: Math.floor(end.x / this.currentMap.tileSize),
      y: Math.floor(end.y / this.currentMap.tileSize)
    };
    
    return this.astar(startTile, endTile).map(tile => ({
      x: tile.x * this.currentMap!.tileSize + this.currentMap!.tileSize / 2,
      y: tile.y * this.currentMap!.tileSize + this.currentMap!.tileSize / 2
    }));
  }
  
  private astar(start: Vector2D, goal: Vector2D): Vector2D[] {
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, Vector2D>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    const key = (pos: Vector2D) => `${pos.x},${pos.y}`;
    const heuristic = (a: Vector2D, b: Vector2D) => 
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    
    openSet.add(key(start));
    gScore.set(key(start), 0);
    fScore.set(key(start), heuristic(start, goal));
    
    while (openSet.size > 0) {
      let current: Vector2D | null = null;
      let lowestF = Infinity;
      
      openSet.forEach(nodeKey => {
        const f = fScore.get(nodeKey) || Infinity;
        if (f < lowestF) {
          lowestF = f;
          const [x, y] = nodeKey.split(',').map(Number);
          current = { x, y };
        }
      });
      
      if (!current) break;
      
      if (current.x === goal.x && current.y === goal.y) {
        const path: Vector2D[] = [];
        let curr: Vector2D | undefined = current;
        
        while (curr) {
          path.unshift(curr);
          curr = cameFrom.get(key(curr));
        }
        
        return path;
      }
      
      openSet.delete(key(current));
      closedSet.add(key(current));
      
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 }
      ];
      
      for (const neighbor of neighbors) {
        if (neighbor.x < 0 || neighbor.x >= this.pathfindingGrid[0].length ||
            neighbor.y < 0 || neighbor.y >= this.pathfindingGrid.length ||
            this.pathfindingGrid[neighbor.y][neighbor.x] === 0) {
          continue;
        }
        
        if (closedSet.has(key(neighbor))) continue;
        
        const tentativeG = (gScore.get(key(current)) || 0) + 1;
        
        if (!openSet.has(key(neighbor))) {
          openSet.add(key(neighbor));
        } else if (tentativeG >= (gScore.get(key(neighbor)) || Infinity)) {
          continue;
        }
        
        cameFrom.set(key(neighbor), current);
        gScore.set(key(neighbor), tentativeG);
        fScore.set(key(neighbor), tentativeG + heuristic(neighbor, goal));
      }
    }
    
    return [];
  }
  
  getSpawnPoints(team?: 'ct' | 't' | 'dm'): SpawnPoint[] {
    if (!this.currentMap) return [];
    return team ? 
      this.currentMap.spawnPoints.filter(sp => sp.team === team) :
      this.currentMap.spawnPoints;
  }
  
  getBombSites(): BombSite[] {
    return this.currentMap?.bombSites || [];
  }
  
  getMapObjects(): MapObject[] {
    return this.currentMap?.objects || [];
  }
  
  damageObject(objectId: string, damage: number): boolean {
    if (!this.currentMap) return false;
    
    const object = this.currentMap.objects.find(obj => obj.id === objectId);
    if (!object || !object.destructible) return false;
    
    object.health -= damage;
    
    if (object.health <= 0) {
      const index = this.currentMap.objects.indexOf(object);
      this.currentMap.objects.splice(index, 1);
      return true;
    }
    
    return false;
  }
  
  getCurrentMap(): MapData | null {
    return this.currentMap;
  }
}