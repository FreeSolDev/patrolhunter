# GamePathfinder: LLM Reference Documentation

## Project Overview

`gamePathfinder` is a comprehensive pathfinding library designed for 2D grid-based games, providing robust A* pathfinding, entity behavior management, and path optimization. This document is structured to help language models understand how to use the library effectively in code.

## Core Components

The library consists of these primary components:

1. **Grid** - Represents the 2D world with walkable/unwalkable cells
2. **AStar** - The A* pathfinding algorithm implementation
3. **PathSmoother** - Smooths paths for more natural movement
4. **EntityController** - Manages AI entities with state machines
5. **Utilities** - Helper functions for debugging and optimization

## Installation and Setup

```typescript
// Import core components
import { 
  createPathfinder, 
  Grid, 
  EntityController, 
  createEntityController,
  EntityType
} from 'game-pathfinder';

// Create a grid (either directly or from your game data)
const grid = new Grid(50, 50); // width, height

// Set obstacles
grid.setWalkable(10, 15, false);
grid.setWalkable(11, 15, false);
grid.setWalkable(12, 15, false);

// Create a pathfinder with options
const { pathfinder, findPath } = createPathfinder(grid, undefined, {
  allowDiagonals: true,
  cutCorners: false,
  heuristic: 'manhattan'
});
```

## Finding Paths

```typescript
// Basic path finding
const result = findPath(startX, startY, goalX, goalY);

if (result.found) {
  // Path found - use result.path
  // result.path is an array of {x, y} positions
  const path = result.path;
  
  // Access other metadata
  console.log(`Path length: ${result.length}`);
  console.log(`Calculation time: ${result.time}ms`);
  console.log(`Nodes explored: ${result.explored}`);
} else {
  // No path found
  console.log('No valid path to destination');
}

// Path smoothing
const smoothedResult = findPath(startX, startY, goalX, goalY, true);
```

## Entity Behavior System

The EntityController enables advanced AI with state machines for different entity types:

```typescript
// Create an entity controller
const entityController = createEntityController({
  grid,
  pathfinder,
  behaviors: {
    // Define behaviors for different entity types
    [EntityType.GUARD]: {
      initialState: 'patrolling',
      updateInterval: 0.5, // Seconds between state updates
      sightDistance: 8,    // Units entity can "see"
      states: {
        patrolling: {
          onEnter: (entity) => {
            // Setup when entering state
            entity.data = entity.data || {};
            entity.data.patrolPoints = [
              { x: 5, y: 5 },
              { x: 15, y: 5 },
              { x: 15, y: 10 },
              { x: 5, y: 10 }
            ];
            entity.data.currentPatrolIndex = 0;
            entity.targetPosition = entity.data.patrolPoints[0];
          },
          update: (entity, deltaTime, controller) => {
            // State logic runs each update
            // Can return new state name to transition
            
            // Check for player
            if (canSeePlayer(entity)) {
              return 'chasing'; // Transition to chase state
            }
            
            // Continue patrol
            if (!entity.isMoving) {
              controller.findPath(entity.id);
            }
            
            // No return = stay in current state
          },
          onExit: (entity) => {
            // Cleanup when leaving state
          }
        },
        // Other states...
      }
    },
    // Other entity type behaviors...
  }
});
```

## Entity Types and States

The library provides five built-in entity types, each with specific behavior patterns:

### 1. GUARD (Patrol and Attack)
- **States**: patrolling, chasing, attacking, searching
- **Behavior**: Guards follow preset patrol routes and attack intruders
- **Use case**: Base security, territory defense, perimeter monitoring

### 2. HUNTER (Actively Seeks Targets)
- **States**: hunting, stalking, pursuing, attacking
- **Behavior**: Hunters actively search for targets and adapt to target behavior
- **Use case**: Predator enemies, pursuit-focused adversaries

### 3. SURVIVOR (Self-Preservation)
- **States**: wandering, cautious, relaxed, fleeing, hiding
- **Behavior**: Survivors prioritize staying alive and avoiding threats
- **Use case**: Civilian NPCs, non-combat entities, escort mission characters

### 4. PRESERVER (Attack-Retreat Tactics)
- **States**: patrolling, charging, attacking, retreating, regrouping
- **Behavior**: Preservers use hit-and-run tactics with coordinated attacks
- **Use case**: Tactical enemies, ranged attackers, swarm enemies

### 5. MERCHANT (Travels Between Hotspots)
- **States**: traveling, trading, fleeing, returning, waiting
- **Behavior**: Merchants move between defined locations and interact with players
- **Use case**: Vendors, quest-givers, traveling NPCs

## Entity Management

```typescript
// Create a new entity
const guard = entityController.createEntity({
  id: 'guard-1',
  type: EntityType.GUARD,
  position: { x: 10, y: 10 },
  targetPosition: { x: 10, y: 10 },
  speed: 2.0
});

// Update all entities (call in your game loop)
entityController.update(deltaTime);

// Get an entity's current state
const guardState = entityController.getEntityState('guard-1');
console.log(`Guard is in ${guardState.currentState} state`);

// Check if entity is in a specific state
if (entityController.isInState('guard-1', 'attacking')) {
  console.log('Guard is attacking!');
}

// Get all entity states at once
const allStates = entityController.getEntityStates();

// Change an entity's state manually
entityController.changeEntityState(entity, 'fleeing');

// Subscribe to state changes
const unsubscribe = entityController.onStateChange((entityId, oldState, newState) => {
  console.log(`Entity ${entityId} changed state from ${oldState} to ${newState}`);
});

// Find entities near a position
const nearbyEntities = entityController.findEntitiesNear(
  { x: 20, y: 20 },
  5, // Radius
  EntityType.GUARD // Optional type filter
);

// Find nearest entity
const nearest = entityController.findNearestEntity(
  { x: 20, y: 20 },
  EntityType.MERCHANT
);

// Set a new target for an entity
entityController.setEntityTarget('guard-1', { x: 30, y: 30 });

// Check line of sight between positions
const canSee = entityController.hasLineOfSight(
  { x: 5, y: 5 },
  { x: 10, y: 10 }
);

// Find a random walkable position
const randomPos = entityController.findRandomWalkablePosition();

// Find walkable position near unwalkable coordinates
const nearbyWalkable = entityController.findWalkablePositionNear(
  { x: 50, y: 50 },
  3 // Search radius
);
```

## Integration with Existing Games

The library can be integrated with existing games using adapter patterns:

```typescript
// Create an adapter that converts your game's grid to the pathfinder grid
class GameGridAdapter {
  toPathfinderGrid() {
    const grid = new Grid(this.gameGrid.width, this.gameGrid.height);
    
    // Copy walkable status from your game grid
    for (let y = 0; y < this.gameGrid.height; y++) {
      for (let x = 0; x < this.gameGrid.width; x++) {
        grid.setWalkable(x, y, !this.gameGrid.isObstacle(x, y));
      }
    }
    
    return grid;
  }
}

// Create a service that handles pathfinding for your game
class GamePathfindingService {
  constructor(gameGrid) {
    this.gridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gridAdapter.toPathfinderGrid();
    this.pathfinder = createPathfinder(this.grid);
    
    // Subscribe to grid changes in your game
    gameGrid.onChanged(() => {
      this.grid = this.gridAdapter.toPathfinderGrid();
      this.pathfinder.setGrid(this.grid);
    });
  }
  
  findPath(startX, startY, goalX, goalY) {
    return this.pathfinder.findPath(startX, startY, goalX, goalY);
  }
}
```

## Performance Optimization

The library includes several optimization features:

1. **Path caching** - Recent paths are cached for faster retrieval
2. **Smart recalculation** - Paths are only recalculated when necessary
3. **Configurable heuristics** - Different heuristics for different scenarios:
   - `manhattan` - Best for grid movement without diagonals
   - `euclidean` - Best for free movement in any direction
   - `chebyshev` - Best for grid movement with diagonals
4. **Path smoothing** - Reduces unnecessary zigzagging
5. **Update intervals** - Entity states update at configurable intervals

## Common Patterns and Best Practices

1. **Entity Data Storage**
   ```typescript
   // Store entity-specific data in entity.data
   entity.data = entity.data || {};
   entity.data.customValue = 42;
   entity.data.targetPoints = [{x: 10, y: 10}, {x: 20, y: 20}];
   ```

2. **State Transitions**
   ```typescript
   // From within state.update, return a state name to transition
   update: (entity, deltaTime, controller) => {
     if (condition) {
       return 'newState'; // Transition to this state
     }
     // No return = stay in current state
   }
   ```

3. **Path Following**
   ```typescript
   // Pathfinding and following happens automatically
   // Just set the target and the system handles movement
   entity.targetPosition = {x: 50, y: 50};
   controller.findPath(entity.id);
   ```

4. **Grid Updates**
   ```typescript
   // When your game world changes, update the grid
   grid.setWalkable(x, y, false); // Make cell unwalkable
   pathfinder.setGrid(grid); // Update pathfinder with new grid
   ```

5. **Finding Alternate Paths**
   ```typescript
   // When destination is unwalkable, find nearest valid position
   if (!grid.isWalkable(goalX, goalY)) {
     const alternate = findNearestWalkable(goalX, goalY, 5);
     if (alternate) {
       // Use alternate as new goal
     }
   }
   ```

## Error Handling

```typescript
// Handle path not found
const result = findPath(startX, startY, goalX, goalY);
if (!result.found) {
  // Try finding a valid position nearby
  const alternateGoal = findWalkablePositionNear({x: goalX, y: goalY}, 5);
  if (alternateGoal) {
    const newResult = findPath(startX, startY, alternateGoal.x, alternateGoal.y);
    // Use new result
  } else {
    // No valid path possible
    console.log('No path possible to destination or nearby');
  }
}

// Validate grid positions
function isValidPosition(x, y, grid) {
  return x >= 0 && y >= 0 && x < grid.getWidth() && y < grid.getHeight();
}

// Entity creation error handling
try {
  const entity = entityController.createEntity({
    id: 'entity-1',
    type: EntityType.GUARD,
    // ...
  });
} catch (error) {
  console.error('Failed to create entity:', error.message);
}
```

## Advanced Features

### Custom Heuristics

```typescript
// Create a custom heuristic function
function customHeuristic(dx, dy) {
  // Your custom calculation
  return Math.sqrt(dx * dx + dy * dy) * 1.1; // weighted euclidean
}

// Use the custom heuristic
const customOptions = {
  allowDiagonals: true,
  cutCorners: false,
  heuristic: customHeuristic
};

const { pathfinder } = createPathfinder(grid, undefined, customOptions);
```

### Custom Entity Types

```typescript
// Add a custom entity type
enum CustomEntityType {
  SCOUT = 'scout',
  HEALER = 'healer'
}

// Use the custom type
const entityController = createEntityController({
  grid,
  pathfinder,
  behaviors: {
    [CustomEntityType.SCOUT]: {
      initialState: 'scouting',
      // Define states...
    }
  }
});
```

### Debugging

```typescript
// Visualize paths (when using Canvas rendering)
function renderPaths(context, paths, tileSize) {
  context.strokeStyle = 'rgba(0, 255, 0, 0.5)';
  context.lineWidth = 2;
  
  for (const path of paths) {
    if (path.length > 1) {
      context.beginPath();
      context.moveTo(path[0].x * tileSize, path[0].y * tileSize);
      
      for (let i = 1; i < path.length; i++) {
        context.lineTo(path[i].x * tileSize, path[i].y * tileSize);
      }
      
      context.stroke();
    }
  }
}
```

## Interface Definitions

Here are the key interfaces used in the library:

```typescript
// Grid position
interface GridPosition {
  x: number;
  y: number;
}

// Path finding result
interface PathResult {
  path: GridPosition[];  // The found path (empty if no path)
  found: boolean;        // Whether a path was found
  explored: number;      // Number of nodes explored
  time: number;          // Time taken in milliseconds
  length: number;        // Path length
}

// Entity interface
interface Entity {
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

// State functions
type StateUpdateFn = (
  entity: Entity,
  deltaTime: number,
  controller: EntityController
) => string | void;

type StateEventFn = (
  entity: Entity,
  controller: EntityController
) => void;

// State definition
interface EntityState {
  onEnter?: StateEventFn;
  update: StateUpdateFn;
  onExit?: StateEventFn;
}

// Behavior configuration
interface EntityBehavior {
  initialState: string;
  updateInterval?: number;
  sightDistance?: number;
  states: Record<string, EntityState>;
}
```

## Troubleshooting Common Issues

1. **Entities Not Following Paths**
   - Check if `entity.targetPosition` is set correctly
   - Ensure `controller.findPath(entity.id)` is called
   - Verify the target position is walkable

2. **No Path Found to Valid Destinations**
   - Check if obstacles are properly marked on the grid
   - Verify start and goal positions are valid and walkable
   - Check if the destination is surrounded by obstacles
   - Try using `findWalkablePositionNear` to find alternate destinations

3. **Entities Stuck in Current State**
   - Make sure state's `update` function returns the new state name
   - Check transition conditions are being met
   - Verify the target state exists in the behavior definition

4. **Entities Moving Through Obstacles**
   - Ensure grid is properly synchronized with your game
   - Check that obstacles are marked as unwalkable
   - Verify collision detection is working correctly

5. **Poor Performance**
   - Increase `updateInterval` for entities that don't need frequent updates
   - Use path caching for frequently traveled routes
   - Limit path length or exploration for very large grids
   - Consider using a smaller grid scale for large game worlds

## Quick Reference

```typescript
// Create grid and pathfinder
const grid = new Grid(width, height);
const { pathfinder, findPath } = createPathfinder(grid);

// Find path
const result = findPath(startX, startY, goalX, goalY);

// Entity controller
const entityController = createEntityController({
  grid,
  pathfinder,
  behaviors: { /* ... */ }
});

// Entity creation
const entity = entityController.createEntity({
  id: 'entity-1',
  type: EntityType.GUARD,
  position: { x: 10, y: 10 },
  targetPosition: { x: 10, y: 10 },
  speed: 2.0
});

// Update entities (in game loop)
entityController.update(deltaTime);

// Check states
const state = entityController.getEntityState('entity-1');
```

## License

This library is distributed under the MIT license.