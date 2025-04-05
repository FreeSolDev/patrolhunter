# Game Pathfinder

A robust and efficient pathfinding library for 2D grid-based games, with support for A* algorithm, path smoothing, and debugging tools.

## Features

- Fast and reliable A* pathfinding algorithm
- Support for different heuristics (Manhattan, Euclidean, Chebyshev)
- Path smoothing and optimization algorithms
- Grid management with walkable/obstacle detection
- Path caching and performance optimization
- Entity behavior modes with state management
- Debug visualization tools

## Basic Usage

```typescript
import { createPathfinder, Grid } from 'game-pathfinder';

// Create a 20x15 grid
const grid = new Grid(20, 15);

// Set some obstacles
grid.setWalkable(5, 5, false);
grid.setWalkable(5, 6, false);
grid.setWalkable(5, 7, false);
grid.setWalkable(6, 7, false);
grid.setWalkable(7, 7, false);

// Create a pathfinder
const { pathfinder, findPath } = createPathfinder(grid);

// Find a path
const result = findPath(2, 3, 15, 10);

if (result.found) {
  console.log('Path found!', result.path);
  console.log('Path length:', result.length);
  console.log('Calculation time:', result.time, 'ms');
} else {
  console.log('No path found');
}
```

## Entity Behavior Modes

The library supports different AI behavior modes for entities in your game. Here's how to set them up:

```typescript
import { createEntityController, EntityType, EntityState } from 'game-pathfinder';

// Create an entity controller with behaviors
const entityController = createEntityController({
  grid,
  pathfinder,
  behaviors: {
    // Guard behavior (patrolling + aggressive)
    guard: {
      initialState: 'patrolling',
      updateInterval: 0.5,
      sightDistance: 8,
      states: {
        // Define state transitions and behaviors
        patrolling: {
          onEnter: (entity) => {
            // Set up patrol route
            entity.targetPosition = findPatrolTarget(entity);
          },
          update: (entity, deltaTime) => {
            // Check for player or follow patrol route
            if (canSeePlayer(entity)) {
              return 'chasing';
            }
            
            // Move to patrol point
            followPath(entity, deltaTime);
          }
        },
        chasing: {
          onEnter: (entity) => {
            // Alert nearby guards
            alertNearbyGuards(entity);
          },
          update: (entity, deltaTime) => {
            // Chase the player
            entity.targetPosition = getPlayerPosition();
            followPath(entity, deltaTime);
            
            if (!canSeePlayer(entity)) {
              return 'searching';
            }
          }
        },
        searching: {
          // ... search behavior implementation
        }
      }
    },
    
    // Merchant behavior (trading + self-preservation)
    merchant: {
      initialState: 'traveling',
      // ... merchant behavior configuration
    },
    
    // Other behaviors...
  }
});

// Creating entities with specific behaviors
const guard = entityController.createEntity({
  id: 'guard-1',
  type: EntityType.GUARD,
  position: { x: 10, y: 10 },
  speed: 2.0
});

// Updating all entities
entityController.update(deltaTime);

// Get current entity states
const entityStates = entityController.getEntityStates();
console.log(`Guard state: ${entityStates['guard-1'].currentState}`);
```

## Entity State API

The library provides a comprehensive API for managing entity states:

### Getting Entity States

```typescript
// Get all entity states
const allStates = entityController.getEntityStates();

// Get a specific entity's state
const guardState = entityController.getEntityState('guard-1');

// Check if an entity is in a specific state
const isChasing = entityController.isInState('guard-1', 'chasing');

// Subscribe to state changes
entityController.onStateChange('guard-1', (oldState, newState) => {
  console.log(`Guard changed from ${oldState} to ${newState}`);
});
```

### Available Entity Types

The library supports these built-in entity types:

- `EntityType.GUARD` - Patrols areas and attacks intruders
- `EntityType.HUNTER` - Actively seeks targets, adapts to target behavior
- `EntityType.SURVIVOR` - Focuses on self-preservation, avoids threats
- `EntityType.PRESERVER` - Uses attack-retreat tactics
- `EntityType.MERCHANT` - Travels between hotspots, avoids confrontation

### Entity States

Each entity type has its own set of states:

#### Guard States
- `patrolling` - Moving between patrol points
- `chasing` - Actively pursuing a target
- `searching` - Looking for a lost target
- `attacking` - Engaging a target
- `returning` - Returning to patrol route

#### Hunter States
- `hunting` - Searching for targets
- `stalking` - Following target from a distance
- `pursuing` - Actively chasing target
- `attacking` - Engaging a target
- `resting` - Recovering after an engagement

#### Survivor States
- `wandering` - Moving around normally
- `fleeing` - Running away from threats
- `hiding` - Staying in a safe location
- `cautious` - Moving carefully after detecting threats
- `relaxed` - Normal state when no threats detected

#### Preserver States
- `patrolling` - Moving around a territory
- `charging` - Moving towards a target to attack
- `attacking` - Engaging a target
- `retreating` - Moving away after an attack
- `regrouping` - Preparing for next attack

#### Merchant States
- `traveling` - Moving between hotspots
- `trading` - Stationary at a trading hotspot
- `fleeing` - Running from threats
- `waiting` - Paused at a location
- `returning` - Going back to a safe area

## API Reference

### Grid

The `Grid` class represents a 2D grid of walkable and non-walkable cells.

```typescript
// Create a new grid
const grid = new Grid(width, height);

// Check if a position is walkable
const walkable = grid.isWalkable(x, y);

// Set whether a position is walkable
grid.setWalkable(x, y, walkable);
```

### AStar

The `AStar` class implements the A* pathfinding algorithm.

```typescript
// Create a new pathfinder
const pathfinder = new AStar(grid, options);

// Find a path
const result = pathfinder.findPath(startPos, goalPos);
```

### PathSmoother

The `PathSmoother` class provides methods for smoothing and optimizing paths.

```typescript
// Create a new smoother
const smoother = new PathSmoother(grid);

// Smooth a path
const smoothPath = smoother.smoothPath(path);
```

## License

MIT
