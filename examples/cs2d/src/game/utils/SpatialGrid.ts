/**
 * Spatial Grid for Efficient Collision Detection
 * Reduces collision checks from O(n²) to O(n × m) where m is objects per cell
 */

import { Vector2D } from '../physics/PhysicsEngine';

export interface SpatialEntity {
  id: string;
  position: Vector2D;
  radius?: number; // For circular entities
  width?: number;  // For rectangular entities
  height?: number; // For rectangular entities
}

export class SpatialGrid<T extends SpatialEntity> {
  private grid: Map<string, Set<T>> = new Map();
  private entities: Map<string, T> = new Map();
  private entityCells: Map<string, Set<string>> = new Map();
  private cellSize: number;
  private worldWidth: number;
  private worldHeight: number;
  
  // Performance metrics
  private stats = {
    entities: 0,
    cells: 0,
    averageEntitiesPerCell: 0,
    maxEntitiesPerCell: 0,
    queryCount: 0,
    totalChecks: 0
  };
  
  constructor(
    cellSize: number = 100,
    worldWidth: number = 2000,
    worldHeight: number = 2000
  ) {
    this.cellSize = cellSize;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    console.log(`🏁 Spatial grid initialized: ${cellSize}px cells, ${worldWidth}x${worldHeight} world`);
  }
  
  /**
   * Hash a position to a cell key
   */
  private hashPosition(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
  
  /**
   * Get all cell keys that an entity occupies
   */
  private getEntityCells(entity: T): Set<string> {
    const cells = new Set<string>();
    
    if (entity.radius !== undefined) {
      // Circular entity - check all cells it might overlap
      const minX = entity.position.x - entity.radius;
      const maxX = entity.position.x + entity.radius;
      const minY = entity.position.y - entity.radius;
      const maxY = entity.position.y + entity.radius;
      
      const startCellX = Math.floor(minX / this.cellSize);
      const endCellX = Math.floor(maxX / this.cellSize);
      const startCellY = Math.floor(minY / this.cellSize);
      const endCellY = Math.floor(maxY / this.cellSize);
      
      for (let x = startCellX; x <= endCellX; x++) {
        for (let y = startCellY; y <= endCellY; y++) {
          cells.add(`${x},${y}`);
        }
      }
    } else if (entity.width !== undefined && entity.height !== undefined) {
      // Rectangular entity
      const halfWidth = entity.width / 2;
      const halfHeight = entity.height / 2;
      const minX = entity.position.x - halfWidth;
      const maxX = entity.position.x + halfWidth;
      const minY = entity.position.y - halfHeight;
      const maxY = entity.position.y + halfHeight;
      
      const startCellX = Math.floor(minX / this.cellSize);
      const endCellX = Math.floor(maxX / this.cellSize);
      const startCellY = Math.floor(minY / this.cellSize);
      const endCellY = Math.floor(maxY / this.cellSize);
      
      for (let x = startCellX; x <= endCellX; x++) {
        for (let y = startCellY; y <= endCellY; y++) {
          cells.add(`${x},${y}`);
        }
      }
    } else {
      // Point entity
      cells.add(this.hashPosition(entity.position.x, entity.position.y));
    }
    
    return cells;
  }
  
  /**
   * Insert an entity into the grid
   */
  insert(entity: T): void {
    // Remove if already exists (for updates)
    if (this.entities.has(entity.id)) {
      this.remove(entity.id);
    }
    
    // Store entity
    this.entities.set(entity.id, entity);
    
    // Add to all relevant cells
    const cells = this.getEntityCells(entity);
    this.entityCells.set(entity.id, cells);
    
    cells.forEach(cellKey => {
      if (!this.grid.has(cellKey)) {
        this.grid.set(cellKey, new Set());
      }
      this.grid.get(cellKey)!.add(entity);
    });
    
    this.updateStats();
  }
  
  /**
   * Remove an entity from the grid
   */
  remove(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;
    
    // Remove from all cells
    const cells = this.entityCells.get(entityId);
    if (cells) {
      cells.forEach(cellKey => {
        const cell = this.grid.get(cellKey);
        if (cell) {
          cell.delete(entity);
          if (cell.size === 0) {
            this.grid.delete(cellKey);
          }
        }
      });
    }
    
    // Clean up
    this.entities.delete(entityId);
    this.entityCells.delete(entityId);
    
    this.updateStats();
    return true;
  }
  
  /**
   * Update an entity's position
   */
  update(entityId: string, newPosition: Vector2D): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    
    // Check if entity moved to different cells
    const oldCells = this.entityCells.get(entityId) || new Set();
    entity.position = newPosition;
    const newCells = this.getEntityCells(entity);
    
    // Only update if cells changed
    if (!this.areSetsEqual(oldCells, newCells)) {
      // Remove from old cells
      oldCells.forEach(cellKey => {
        if (!newCells.has(cellKey)) {
          const cell = this.grid.get(cellKey);
          if (cell) {
            cell.delete(entity);
            if (cell.size === 0) {
              this.grid.delete(cellKey);
            }
          }
        }
      });
      
      // Add to new cells
      newCells.forEach(cellKey => {
        if (!oldCells.has(cellKey)) {
          if (!this.grid.has(cellKey)) {
            this.grid.set(cellKey, new Set());
          }
          this.grid.get(cellKey)!.add(entity);
        }
      });
      
      this.entityCells.set(entityId, newCells);
    }
  }
  
  /**
   * Query entities near a position
   */
  queryNearby(position: Vector2D, radius: number): T[] {
    this.stats.queryCount++;
    const nearby: Set<T> = new Set();
    
    // Calculate which cells to check
    const minX = position.x - radius;
    const maxX = position.x + radius;
    const minY = position.y - radius;
    const maxY = position.y + radius;
    
    const startCellX = Math.floor(minX / this.cellSize);
    const endCellX = Math.floor(maxX / this.cellSize);
    const startCellY = Math.floor(minY / this.cellSize);
    const endCellY = Math.floor(maxY / this.cellSize);
    
    // Check all relevant cells
    for (let x = startCellX; x <= endCellX; x++) {
      for (let y = startCellY; y <= endCellY; y++) {
        const cellKey = `${x},${y}`;
        const cell = this.grid.get(cellKey);
        if (cell) {
          cell.forEach(entity => {
            // Distance check for actual proximity
            const dx = entity.position.x - position.x;
            const dy = entity.position.y - position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= radius) {
              nearby.add(entity);
            }
            this.stats.totalChecks++;
          });
        }
      }
    }
    
    return Array.from(nearby);
  }
  
  /**
   * Query entities in a rectangular area
   */
  queryRect(x: number, y: number, width: number, height: number): T[] {
    this.stats.queryCount++;
    const nearby: Set<T> = new Set();
    
    const startCellX = Math.floor(x / this.cellSize);
    const endCellX = Math.floor((x + width) / this.cellSize);
    const startCellY = Math.floor(y / this.cellSize);
    const endCellY = Math.floor((y + height) / this.cellSize);
    
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const cellKey = `${cx},${cy}`;
        const cell = this.grid.get(cellKey);
        if (cell) {
          cell.forEach(entity => {
            // Check if entity is actually in the rectangle
            if (entity.position.x >= x && 
                entity.position.x <= x + width &&
                entity.position.y >= y && 
                entity.position.y <= y + height) {
              nearby.add(entity);
            }
            this.stats.totalChecks++;
          });
        }
      }
    }
    
    return Array.from(nearby);
  }
  
  /**
   * Get potential collisions for an entity
   */
  getPotentialCollisions(entityId: string): T[] {
    const entity = this.entities.get(entityId);
    if (!entity) return [];
    
    const potential: Set<T> = new Set();
    const cells = this.entityCells.get(entityId);
    
    if (cells) {
      cells.forEach(cellKey => {
        const cell = this.grid.get(cellKey);
        if (cell) {
          cell.forEach(other => {
            if (other.id !== entityId) {
              potential.add(other);
            }
          });
        }
      });
    }
    
    return Array.from(potential);
  }
  
  /**
   * Clear all entities from the grid
   */
  clear(): void {
    this.grid.clear();
    this.entities.clear();
    this.entityCells.clear();
    this.updateStats();
  }
  
  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.entities = this.entities.size;
    this.stats.cells = this.grid.size;
    
    if (this.grid.size > 0) {
      let totalEntities = 0;
      let maxEntities = 0;
      
      this.grid.forEach(cell => {
        totalEntities += cell.size;
        maxEntities = Math.max(maxEntities, cell.size);
      });
      
      this.stats.averageEntitiesPerCell = totalEntities / this.grid.size;
      this.stats.maxEntitiesPerCell = maxEntities;
    } else {
      this.stats.averageEntitiesPerCell = 0;
      this.stats.maxEntitiesPerCell = 0;
    }
  }
  
  /**
   * Get grid statistics
   */
  getStats(): Readonly<typeof this.stats> {
    return { ...this.stats };
  }
  
  /**
   * Get efficiency metrics
   */
  getEfficiency(): {
    gridUtilization: number;
    averageDensity: number;
    queryEfficiency: number;
  } {
    const gridUtilization = this.stats.cells > 0 
      ? (this.stats.entities / (this.stats.cells * this.stats.averageEntitiesPerCell)) * 100
      : 0;
    
    const averageDensity = this.stats.averageEntitiesPerCell;
    
    const queryEfficiency = this.stats.queryCount > 0
      ? ((this.stats.entities * this.stats.queryCount) / Math.max(1, this.stats.totalChecks)) * 100
      : 100;
    
    return {
      gridUtilization: Math.round(gridUtilization),
      averageDensity: Math.round(averageDensity * 10) / 10,
      queryEfficiency: Math.round(queryEfficiency)
    };
  }
  
  /**
   * Optimize cell size based on current entity distribution
   */
  suggestOptimalCellSize(): number {
    if (this.stats.entities === 0) return this.cellSize;
    
    // Calculate average entity size
    let totalSize = 0;
    let count = 0;
    
    this.entities.forEach(entity => {
      if (entity.radius) {
        totalSize += entity.radius * 2;
        count++;
      } else if (entity.width && entity.height) {
        totalSize += Math.max(entity.width, entity.height);
        count++;
      }
    });
    
    if (count === 0) return this.cellSize;
    
    const avgSize = totalSize / count;
    
    // Optimal cell size is typically 2-3x average entity size
    const optimalSize = Math.round(avgSize * 2.5);
    
    // Clamp to reasonable range
    return Math.max(50, Math.min(500, optimalSize));
  }
  
  /**
   * Check if two sets are equal
   */
  private areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
      if (!b.has(item)) return false;
    }
    return true;
  }
  
  /**
   * Debug visualization data
   */
  getDebugData(): {
    cells: Array<{ x: number; y: number; width: number; height: number; count: number }>;
    entities: Array<{ x: number; y: number; id: string }>;
  } {
    const cells: Array<{ x: number; y: number; width: number; height: number; count: number }> = [];
    const entities: Array<{ x: number; y: number; id: string }> = [];
    
    this.grid.forEach((cell, key) => {
      const [x, y] = key.split(',').map(Number);
      cells.push({
        x: x * this.cellSize,
        y: y * this.cellSize,
        width: this.cellSize,
        height: this.cellSize,
        count: cell.size
      });
    });
    
    this.entities.forEach(entity => {
      entities.push({
        x: entity.position.x,
        y: entity.position.y,
        id: entity.id
      });
    });
    
    return { cells, entities };
  }
}