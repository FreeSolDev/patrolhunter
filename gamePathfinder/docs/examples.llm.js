/*
 * GamePathfinder Usage Examples
 * This file contains code examples in a format optimized for language models
 * No imports or runtime dependencies needed - pure example code
 */

// BASIC GRID AND PATHFINDER SETUP
// -----------------------------------------------------------------
function basicSetup() {
  // Create a grid
  const grid = new Grid(50, 50);
  
  // Set some obstacles
  grid.setWalkable(10, 15, false);
  grid.setWalkable(11, 15, false);
  grid.setWalkable(12, 15, false);
  
  // Create a pathfinder with options
  const { pathfinder, findPath } = createPathfinder(grid, null, {
    allowDiagonals: true,
    cutCorners: false,
    heuristic: 'manhattan' // or 'euclidean', 'chebyshev'
  });
  
  return { grid, pathfinder, findPath };
}

// FINDING AND USING PATHS
// -----------------------------------------------------------------
function findingPaths() {
  const { findPath } = basicSetup();
  
  // Simple path finding
  const result = findPath(5, 5, 25, 25);
  
  if (result.found) {
    console.log(`Path found with ${result.path.length} steps`);
    console.log(`Path calculation took ${result.time}ms`);
    console.log(`Explored ${result.explored} nodes`);
    
    // Path is an array of {x, y} positions
    for (const point of result.path) {
      console.log(`Move to (${point.x}, ${point.y})`);
    }
  } else {
    console.log('No path found');
  }
  
  // Finding a smoothed path
  const smoothedResult = findPath(5, 5, 25, 25, true);
}

// GUARD BEHAVIOR DEFINITION
// -----------------------------------------------------------------
function defineGuardBehavior() {
  return {
    initialState: 'patrolling',
    updateInterval: 0.5, // seconds
    sightDistance: 8,
    states: {
      patrolling: {
        onEnter: (entity) => {
          console.log(`Guard ${entity.id} starting patrol`);
          
          // Set up patrol points
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
          // Function to check if guard can see player
          const canSeePlayer = () => {
            const playerPos = getPlayerPosition(); // Game-specific function
            const distance = getDistance(entity.position, playerPos);
            
            return distance <= 8 && controller.hasLineOfSight(
              entity.position, 
              playerPos
            );
          };
          
          // Check if player is visible
          if (canSeePlayer()) {
            return 'chasing'; // Transition to chase state
          }
          
          // Continue patrol logic
          if (!entity.isMoving && !entity.currentPath) {
            controller.findPath(entity.id);
          }
          
          // If reached patrol point, move to next one
          if (!entity.isMoving && entity.currentPathIndex === undefined) {
            entity.data.currentPatrolIndex = 
              (entity.data.currentPatrolIndex + 1) % entity.data.patrolPoints.length;
            
            entity.targetPosition = entity.data.patrolPoints[entity.data.currentPatrolIndex];
            controller.findPath(entity.id);
          }
        },
        onExit: (entity) => {
          console.log(`Guard ${entity.id} ending patrol`);
        }
      },
      
      chasing: {
        onEnter: (entity) => {
          console.log(`Guard ${entity.id} is chasing player`);
        },
        update: (entity, deltaTime, controller) => {
          const playerPos = getPlayerPosition(); // Game-specific function
          const distance = getDistance(entity.position, playerPos);
          
          // Update target position to follow player
          entity.targetPosition = playerPos;
          
          // Recalculate path as player moves
          if (!entity.isMoving || !entity.currentPath) {
            controller.findPath(entity.id);
          }
          
          // If close enough to attack
          if (distance < 1.5) {
            return 'attacking';
          }
          
          // If lost sight of player
          if (distance > 10 || !controller.hasLineOfSight(entity.position, playerPos)) {
            return 'searching';
          }
        }
      },
      
      attacking: {
        onEnter: (entity) => {
          console.log(`Guard ${entity.id} is attacking player`);
          entity.data = entity.data || {};
          entity.data.attackTime = 0;
        },
        update: (entity, deltaTime, controller) => {
          const playerPos = getPlayerPosition(); // Game-specific function
          const distance = getDistance(entity.position, playerPos);
          
          // Track attack timing
          entity.data.attackTime += deltaTime;
          
          // Attack every second
          if (entity.data.attackTime >= 1.0) {
            console.log(`Guard ${entity.id} attacks!`);
            
            // Apply damage to player (game-specific)
            damagePlayer(1);
            
            entity.data.attackTime = 0;
          }
          
          // If player moved away, chase again
          if (distance > 1.5) {
            return 'chasing';
          }
        }
      },
      
      searching: {
        onEnter: (entity, controller) => {
          console.log(`Guard ${entity.id} is searching for player`);
          
          // Remember last known player position
          const playerPos = getPlayerPosition(); // Game-specific function
          
          entity.data = entity.data || {};
          entity.data.lastKnownPlayerPos = { ...playerPos };
          entity.targetPosition = entity.data.lastKnownPlayerPos;
          entity.data.searchTime = 0;
          
          controller.findPath(entity.id);
        },
        update: (entity, deltaTime, controller) => {
          const playerPos = getPlayerPosition(); // Game-specific function
          const distance = getDistance(entity.position, playerPos);
          
          // If found player again
          if (distance <= 8 && controller.hasLineOfSight(entity.position, playerPos)) {
            return 'chasing';
          }
          
          // Update search timer
          entity.data.searchTime += deltaTime;
          
          // If reached last known position and waited
          if (!entity.isMoving && !entity.currentPath) {
            if (entity.data.searchTime > 3) {
              // Give up and return to patrol
              return 'patrolling';
            }
          }
        }
      }
    }
  };
}

// HUNTER BEHAVIOR DEFINITION
// -----------------------------------------------------------------
function defineHunterBehavior() {
  return {
    initialState: 'hunting',
    updateInterval: 0.4,
    states: {
      hunting: {
        onEnter: (entity) => {
          console.log(`Hunter ${entity.id} is now hunting`);
          entity.data = entity.data || {};
          entity.data.huntArea = {
            centerX: entity.position.x,
            centerY: entity.position.y,
            radius: 15
          };
        },
        update: (entity, deltaTime, controller) => {
          const playerPos = getPlayerPosition(); // Game-specific function
          const isPlayerMonster = isMonsterForm(); // Game-specific function
          const distance = getDistance(entity.position, playerPos);
          
          // If player is detected
          if (distance < 12 && controller.hasLineOfSight(entity.position, playerPos)) {
            if (isPlayerMonster) {
              // More cautious if player is monster
              return 'stalking';
            } else {
              // Direct approach if player is human
              return 'pursuing';
            }
          }
          
          // Roam around hunting area
          if (!entity.isMoving && !entity.currentPath) {
            // Find random position in hunt area
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * entity.data.huntArea.radius;
            const targetX = Math.round(entity.data.huntArea.centerX + Math.cos(angle) * radius);
            const targetY = Math.round(entity.data.huntArea.centerY + Math.sin(angle) * radius);
            
            const newTarget = controller.findWalkablePositionNear({ x: targetX, y: targetY });
            if (newTarget) {
              entity.targetPosition = newTarget;
              controller.findPath(entity.id);
            }
          }
        }
      },
      // Additional hunter states would be defined here
      // (stalking, pursuing, attacking)
    }
  };
}

// SURVIVOR BEHAVIOR DEFINITION (PARTIAL)
// -----------------------------------------------------------------
function defineSurvivorBehavior() {
  return {
    initialState: 'wandering',
    updateInterval: 0.5,
    states: {
      wandering: {
        onEnter: (entity, controller) => {
          console.log(`Survivor ${entity.id} is wandering`);
          
          // Find random position to wander to
          const randomPos = controller.findRandomWalkablePosition();
          if (randomPos) {
            entity.targetPosition = randomPos;
            controller.findPath(entity.id);
          }
        },
        update: (entity, deltaTime, controller) => {
          const playerPos = getPlayerPosition(); // Game-specific function
          const isPlayerMonster = isMonsterForm(); // Game-specific function
          const distance = getDistance(entity.position, playerPos);
          
          // React to player
          if (distance < 10 && isPlayerMonster) {
            return 'fleeing';
          } else if (distance < 5 && !isPlayerMonster) {
            return 'cautious';
          }
          
          // Find new wander target when current movement is complete
          if (!entity.isMoving && !entity.currentPath) {
            const randomPos = controller.findRandomWalkablePosition();
            if (randomPos) {
              entity.targetPosition = randomPos;
              controller.findPath(entity.id);
            }
          }
        }
      },
      // Other states would be defined here
      // (cautious, relaxed, fleeing, hiding)
    }
  };
}

// COMPLETE ENTITY CONTROLLER SETUP
// -----------------------------------------------------------------
function setupEntityController() {
  const { grid, pathfinder } = basicSetup();
  
  // Create entity controller with all behavior types
  const entityController = createEntityController({
    grid,
    pathfinder,
    behaviors: {
      [EntityType.GUARD]: defineGuardBehavior(),
      [EntityType.HUNTER]: defineHunterBehavior(),
      [EntityType.SURVIVOR]: defineSurvivorBehavior(),
      // Additional behaviors would be defined here
      // [EntityType.PRESERVER]: definePreserverBehavior(),
      // [EntityType.MERCHANT]: defineMerchantBehavior()
    }
  });
  
  return entityController;
}

// ENTITY MANAGEMENT
// -----------------------------------------------------------------
function manageEntities() {
  const entityController = setupEntityController();
  
  // Create a guard entity
  const guard = entityController.createEntity({
    id: 'guard-1',
    type: EntityType.GUARD,
    position: { x: 10, y: 10 },
    targetPosition: { x: 10, y: 10 },
    speed: 2.0
  });
  
  // Create a hunter entity
  const hunter = entityController.createEntity({
    id: 'hunter-1',
    type: EntityType.HUNTER,
    position: { x: 30, y: 10 },
    targetPosition: { x: 30, y: 10 },
    speed: 2.5
  });
  
  // In game loop:
  function gameLoop(deltaTime) {
    // Update all entities
    entityController.update(deltaTime);
    
    // Check entity states
    const guardState = entityController.getEntityState('guard-1');
    console.log(`Guard is in ${guardState.currentState} state`);
    
    const hunterState = entityController.getEntityState('hunter-1');
    console.log(`Hunter is in ${hunterState.currentState} state`);
    
    // Find nearby entities
    const nearbyEntities = entityController.findEntitiesNear(
      { x: 20, y: 20 },
      8,
      EntityType.GUARD
    );
    
    console.log(`Found ${nearbyEntities.length} guards nearby`);
  }
  
  // Set a new target for an entity
  entityController.setEntityTarget('guard-1', { x: 20, y: 20 });
  
  // Subscribe to state changes
  const unsubscribe = entityController.onStateChange((entityId, oldState, newState) => {
    console.log(`Entity ${entityId} changed from ${oldState} to ${newState}`);
  });
  
  // Later, to unsubscribe:
  // unsubscribe();
}

// GAME INTEGRATION
// -----------------------------------------------------------------
class GameIntegration {
  constructor() {
    this.gameGrid = createGameGrid(); // Game-specific
    
    // Create adapter for game grid
    this.gridAdapter = new GameGridAdapter(this.gameGrid);
    
    // Create pathfinding service
    this.pathfindingService = new GamePathfindingService(this.gameGrid);
    
    // Create entity controller
    this.entityController = createEntityController({
      grid: this.pathfindingService.grid,
      pathfinder: this.pathfindingService.pathfinder,
      behaviors: {
        [EntityType.GUARD]: defineGuardBehavior(),
        [EntityType.HUNTER]: defineHunterBehavior(),
        // Other behaviors...
      }
    });
    
    // Subscribe to grid changes
    this.gameGrid.onChanged(() => {
      this.pathfindingService.updateGrid(this.gameGrid);
    });
  }
  
  update(deltaTime) {
    // Update entities
    this.entityController.update(deltaTime);
    
    // Update other game systems...
  }
  
  render(context) {
    // Render game...
    
    // Optionally render paths for debugging
    this.renderPaths(context);
  }
  
  renderPaths(context) {
    // Get all active paths
    const activePaths = this.pathfindingService.getActivePaths();
    
    // Render each path
    context.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    context.lineWidth = 2;
    
    for (const [entityId, pathData] of activePaths.entries()) {
      const { path } = pathData;
      
      if (path.length > 1) {
        context.beginPath();
        context.moveTo(path[0].x * this.tileSize, path[0].y * this.tileSize);
        
        for (let i = 1; i < path.length; i++) {
          context.lineTo(path[i].x * this.tileSize, path[i].y * this.tileSize);
        }
        
        context.stroke();
      }
    }
  }
}

// HELPER CLASSES
// -----------------------------------------------------------------
// Game grid adapter
class GameGridAdapter {
  constructor(gameGrid) {
    this.gameGrid = gameGrid;
  }
  
  toPathfinderGrid() {
    const grid = new Grid(this.gameGrid.width, this.gameGrid.height);
    
    // Copy walkable status
    for (let y = 0; y < this.gameGrid.height; y++) {
      for (let x = 0; x < this.gameGrid.width; x++) {
        grid.setWalkable(x, y, !this.gameGrid.isObstacle(x, y));
      }
    }
    
    return grid;
  }
}

// Game pathfinding service
class GamePathfindingService {
  constructor(gameGrid) {
    this.gameGrid = gameGrid;
    this.gridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gridAdapter.toPathfinderGrid();
    this.pathfinder = createPathfinder(this.grid, null, {
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan'
    });
    
    // Store active paths
    this.activePaths = new Map();
  }
  
  updateGrid() {
    this.grid = this.gridAdapter.toPathfinderGrid();
    this.pathfinder.setGrid(this.grid);
    
    // Recalculate active paths
    this.recalculateActivePaths();
  }
  
  findPath(startX, startY, goalX, goalY, entityId) {
    // Check if goal is walkable
    if (!this.grid.isWalkable(goalX, goalY)) {
      // Find nearby walkable position
      const alternate = this.findNearestWalkable(goalX, goalY, 5);
      if (alternate) {
        goalX = alternate.x;
        goalY = alternate.y;
      }
    }
    
    // Find path
    const result = this.pathfinder.findPath(
      { x: startX, y: startY },
      { x: goalX, y: goalY }
    );
    
    // Store path if entity ID provided
    if (entityId && result.found) {
      this.activePaths.set(entityId, {
        path: result.path,
        targetPosition: { x: goalX, y: goalY }
      });
    }
    
    return result;
  }
  
  findNearestWalkable(x, y, radius = 5) {
    // Check original position
    if (this.grid.isWalkable(x, y)) {
      return { x, y };
    }
    
    // Search in expanding radius
    for (let r = 1; r <= radius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (this.grid.isWalkable(newX, newY)) {
              return { x: newX, y: newY };
            }
          }
        }
      }
    }
    
    return null;
  }
  
  recalculateActivePaths() {
    for (const [entityId, pathData] of this.activePaths.entries()) {
      const entity = this.gameGrid.getEntity(entityId);
      if (entity) {
        this.findPath(
          entity.position.x,
          entity.position.y,
          pathData.targetPosition.x,
          pathData.targetPosition.y,
          entityId
        );
      }
    }
  }
  
  getActivePaths() {
    return this.activePaths;
  }
}

// Helper functions
function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// These would be implemented by the game
function getPlayerPosition() { return { x: 25, y: 25 }; }
function isMonsterForm() { return false; }
function damagePlayer(amount) { /* ... */ }
function createGameGrid() { /* ... */ }
