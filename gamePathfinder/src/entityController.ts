import { AStar } from './astar';
import { GridPosition, IGrid, PathResult } from './types';

/**
 * Possible entity types with different behavior patterns
 */
export enum EntityType {
  GUARD = 'guard',
  HUNTER = 'hunter', 
  SURVIVOR = 'survivor',
  PRESERVER = 'preserver',
  MERCHANT = 'merchant'
}

/**
 * Base entity interface
 */
export interface Entity {
  id: string;
  type: EntityType;
  position: GridPosition;
  targetPosition: GridPosition;
  speed: number;
  currentState: string;
  isMoving: boolean;
  currentPath?: GridPosition[];
  currentPathIndex?: number;
  pixelPosition?: {
    x: number;
    y: number;
  };
  groupId?: number;
  data?: Record<string, any>; // Custom entity data
}

/**
 * State update function signature
 */
export type StateUpdateFn = (
  entity: Entity,
  deltaTime: number,
  controller: EntityController
) => string | void;

/**
 * State entry/exit function signature
 */
export type StateEventFn = (
  entity: Entity,
  controller: EntityController
) => void;

/**
 * State definition
 */
export interface EntityState {
  onEnter?: StateEventFn;
  update: StateUpdateFn;
  onExit?: StateEventFn;
}

/**
 * Behavior configuration for an entity type
 */
export interface EntityBehavior {
  initialState: string;
  updateInterval?: number;
  sightDistance?: number;
  states: Record<string, EntityState>;
}

/**
 * Configuration for entity controller
 */
export interface EntityControllerConfig {
  grid: IGrid;
  pathfinder: AStar;
  behaviors: Record<string, EntityBehavior>;
}

/**
 * State change listener
 */
export type StateChangeListener = (
  entityId: string,
  oldState: string,
  newState: string
) => void;

/**
 * Entity controller for managing AI entities
 */
export class EntityController {
  private grid: IGrid;
  private pathfinder: AStar;
  private behaviors: Record<string, EntityBehavior>;
  private entities: Map<string, Entity> = new Map();
  private stateTimers: Map<string, number> = new Map();
  private stateChangeListeners: StateChangeListener[] = [];
  
  /**
   * Create a new entity controller
   */
  constructor(config: EntityControllerConfig) {
    this.grid = config.grid;
    this.pathfinder = config.pathfinder;
    this.behaviors = config.behaviors;
  }
  
  /**
   * Create a new entity
   */
  createEntity(data: Omit<Entity, 'currentState' | 'isMoving'>): Entity {
    const behavior = this.behaviors[data.type];
    
    if (!behavior) {
      throw new Error(`No behavior defined for entity type: ${data.type}`);
    }
    
    const entity: Entity = {
      ...data,
      currentState: behavior.initialState,
      isMoving: false
    };
    
    this.entities.set(entity.id, entity);
    
    // Call onEnter for initial state
    const state = behavior.states[behavior.initialState];
    if (state && state.onEnter) {
      state.onEnter(entity, this);
    }
    
    return entity;
  }
  
  /**
   * Remove an entity
   */
  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }
  
  /**
   * Get an entity by ID
   */
  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }
  
  /**
   * Get all entities
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
  
  /**
   * Get entities by type
   */
  getEntitiesByType(type: EntityType): Entity[] {
    return this.getAllEntities().filter(entity => entity.type === type);
  }
  
  /**
   * Update all entities
   */
  update(deltaTime: number): void {
    for (const entity of this.entities.values()) {
      this.updateEntity(entity, deltaTime);
    }
  }
  
  /**
   * Update a specific entity
   */
  private updateEntity(entity: Entity, deltaTime: number): void {
    const behavior = this.behaviors[entity.type];
    
    if (!behavior) {
      return;
    }
    
    // Check if it's time to update this entity's state
    const updateInterval = behavior.updateInterval || 0;
    let timer = this.stateTimers.get(entity.id) || 0;
    
    timer += deltaTime;
    if (timer >= updateInterval) {
      timer = 0;
      this.stateTimers.set(entity.id, timer);
      
      // Update entity state
      const state = behavior.states[entity.currentState];
      
      if (state) {
        const newState = state.update(entity, deltaTime, this);
        
        if (newState && newState !== entity.currentState) {
          this.changeEntityState(entity, newState);
        }
      }
    } else {
      this.stateTimers.set(entity.id, timer);
    }
    
    // Update movement along path
    this.updateEntityMovement(entity, deltaTime);
  }
  
  /**
   * Change an entity's state
   */
  changeEntityState(entity: Entity, newState: string): void {
    const behavior = this.behaviors[entity.type];
    
    if (!behavior || !behavior.states[newState]) {
      return;
    }
    
    const oldState = entity.currentState;
    
    // Call onExit for the old state
    const oldStateObj = behavior.states[oldState];
    if (oldStateObj && oldStateObj.onExit) {
      oldStateObj.onExit(entity, this);
    }
    
    // Update the state
    entity.currentState = newState;
    
    // Call onEnter for the new state
    const newStateObj = behavior.states[newState];
    if (newStateObj && newStateObj.onEnter) {
      newStateObj.onEnter(entity, this);
    }
    
    // Notify listeners
    for (const listener of this.stateChangeListeners) {
      listener(entity.id, oldState, newState);
    }
  }
  
  /**
   * Subscribe to entity state changes
   */
  onStateChange(listener: StateChangeListener): () => void {
    this.stateChangeListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.stateChangeListeners.indexOf(listener);
      if (index !== -1) {
        this.stateChangeListeners.splice(index, 1);
      }
    };
  }
  
  /**
   * Check if an entity is in a specific state
   */
  isInState(entityId: string, state: string): boolean {
    const entity = this.entities.get(entityId);
    return entity ? entity.currentState === state : false;
  }
  
  /**
   * Get entity states
   */
  getEntityStates(): Record<string, { type: EntityType; currentState: string }> {
    const states: Record<string, { type: EntityType; currentState: string }> = {};
    
    for (const [id, entity] of this.entities.entries()) {
      states[id] = {
        type: entity.type,
        currentState: entity.currentState
      };
    }
    
    return states;
  }
  
  /**
   * Get a specific entity's state
   */
  getEntityState(entityId: string): { type: EntityType; currentState: string } | undefined {
    const entity = this.entities.get(entityId);
    
    return entity
      ? { type: entity.type, currentState: entity.currentState }
      : undefined;
  }
  
  /**
   * Set a new target position for an entity
   */
  setEntityTarget(entityId: string, targetPosition: GridPosition): boolean {
    const entity = this.entities.get(entityId);
    
    if (!entity) {
      return false;
    }
    
    entity.targetPosition = targetPosition;
    
    // Clear current path to force recalculation
    entity.currentPath = undefined;
    entity.currentPathIndex = undefined;
    
    return true;
  }
  
  /**
   * Find a path for an entity to its target
   */
  findPath(entityId: string): PathResult {
    const entity = this.entities.get(entityId);
    
    if (!entity) {
      return {
        path: [],
        found: false,
        explored: 0,
        time: 0,
        length: 0
      };
    }
    
    const result = this.pathfinder.findPath(
      entity.position,
      entity.targetPosition
    );
    
    if (result.found) {
      entity.currentPath = result.path;
      entity.currentPathIndex = 0;
    }
    
    return result;
  }
  
  /**
   * Update entity movement along its path
   */
  private updateEntityMovement(entity: Entity, deltaTime: number): void {
    if (!entity.currentPath || entity.currentPathIndex === undefined || 
        entity.currentPathIndex >= entity.currentPath.length) {
      entity.isMoving = false;
      return;
    }
    
    entity.isMoving = true;
    const nextPoint = entity.currentPath[entity.currentPathIndex];
    
    // Calculate distance to next point
    const dx = nextPoint.x - entity.position.x;
    const dy = nextPoint.y - entity.position.y;
    const distanceToNext = Math.sqrt(dx * dx + dy * dy);
    
    // If close enough to the next point, move to the next one
    if (distanceToNext < 0.1) {
      entity.currentPathIndex++;
      
      // If reached the end of the path
      if (entity.currentPathIndex >= entity.currentPath.length) {
        entity.isMoving = false;
      }
      
      return;
    }
    
    // Move towards the next point
    const speed = entity.speed * deltaTime;
    const moveRatio = Math.min(speed / distanceToNext, 1);
    
    const newX = entity.position.x + dx * moveRatio;
    const newY = entity.position.y + dy * moveRatio;
    
    // Validate the new position is walkable
    if (this.grid.isWalkable(Math.round(newX), Math.round(newY))) {
      entity.position.x = newX;
      entity.position.y = newY;
      
      // Update pixel position if used
      if (entity.pixelPosition) {
        entity.pixelPosition.x = newX * 32; // Assuming 32px tile size
        entity.pixelPosition.y = newY * 32;
      }
    } else {
      // Path is blocked, recalculate
      entity.currentPath = undefined;
      entity.currentPathIndex = undefined;
      entity.isMoving = false;
    }
  }
  
  /**
   * Find entities near a position
   */
  findEntitiesNear(
    position: GridPosition,
    radius: number,
    typeFilter?: EntityType
  ): Entity[] {
    return this.getAllEntities().filter(entity => {
      // Apply type filter if specified
      if (typeFilter && entity.type !== typeFilter) {
        return false;
      }
      
      // Calculate distance
      const dx = entity.position.x - position.x;
      const dy = entity.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance <= radius;
    });
  }
  
  /**
   * Find the nearest entity of a specific type
   */
  findNearestEntity(
    position: GridPosition,
    typeFilter?: EntityType
  ): Entity | undefined {
    let nearest: Entity | undefined;
    let minDistance = Infinity;
    
    for (const entity of this.getAllEntities()) {
      // Apply type filter if specified
      if (typeFilter && entity.type !== typeFilter) {
        continue;
      }
      
      // Calculate distance
      const dx = entity.position.x - position.x;
      const dy = entity.position.y - position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = entity;
      }
    }
    
    return nearest;
  }
  
  /**
   * Check if there's a clear line of sight between two positions
   */
  hasLineOfSight(from: GridPosition, to: GridPosition): boolean {
    // Use Bresenham's line algorithm to check visibility
    const { x: x0, y: y0 } = from;
    const { x: x1, y: y1 } = to;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    
    while (!(x === x1 && y === y1)) {
      // Skip the start point
      if (!(x === x0 && y === y0)) {
        // If any point in the line is not walkable, there is no line of sight
        if (!this.grid.isWalkable(x, y)) {
          return false;
        }
      }
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return true;
  }
  
  /**
   * Find a random walkable position
   */
  findRandomWalkablePosition(): GridPosition | null {
    const width = this.grid.getWidth();
    const height = this.grid.getHeight();
    
    // Try a limited number of times to find a walkable position
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      
      if (this.grid.isWalkable(x, y)) {
        return { x, y };
      }
    }
    
    return null;
  }
  
  /**
   * Find a valid walkable position near a point
   */
  findWalkablePositionNear(
    position: GridPosition,
    maxRadius: number = 5
  ): GridPosition | null {
    // Check the original position first
    if (this.grid.isWalkable(position.x, position.y)) {
      return { x: position.x, y: position.y };
    }
    
    // Search in expanding radius
    for (let radius = 1; radius <= maxRadius; radius++) {
      // Check all positions at the current radius
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Only check positions at the current radius (not inside it)
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const x = position.x + dx;
            const y = position.y + dy;
            
            if (this.grid.isWalkable(x, y)) {
              return { x, y };
            }
          }
        }
      }
    }
    
    return null;
  }
}

/**
 * Create a new entity controller
 */
export function createEntityController(
  config: EntityControllerConfig
): EntityController {
  return new EntityController(config);
}