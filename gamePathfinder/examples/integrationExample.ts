import { 
  createPathfinder, 
  Grid, 
  GridPosition, 
  PathResult, 
  EntityType, 
  createEntityController 
} from '../src';

/**
 * This example shows how to integrate the pathfinding system with an existing game
 * by creating adapter classes that convert between game and pathfinder formats
 */

/**
 * Adapter that converts your game's grid representation to the pathfinder's Grid
 */
class GameGridAdapter {
  private gameGrid: any; // Your game's grid representation
  private width: number;
  private height: number;
  
  constructor(gameGrid: any) {
    this.gameGrid = gameGrid;
    this.width = gameGrid.width;
    this.height = gameGrid.height;
  }
  
  /**
   * Convert the game grid to a pathfinder Grid
   */
  toPathfinderGrid(): Grid {
    const grid = new Grid(this.width, this.height);
    
    // Iterate through the game grid and set walkable status in the pathfinder grid
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Example: Assuming your game has a isObstacle(x, y) method
        const isWalkable = !this.gameGrid.isObstacle(x, y);
        grid.setWalkable(x, y, isWalkable);
      }
    }
    
    return grid;
  }
}

/**
 * Service that handles pathfinding operations for your game
 */
class GamePathfindingService {
  private grid: Grid;
  private pathfinder: ReturnType<typeof createPathfinder>;
  private gameGridAdapter: GameGridAdapter;
  
  constructor(gameGrid: any) {
    this.gameGridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gameGridAdapter.toPathfinderGrid();
    
    // Create a pathfinder with custom options
    this.pathfinder = createPathfinder(this.grid, undefined, {
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan'
    });
  }
  
  /**
   * Find a path between two points on the grid
   */
  findPath(startX: number, startY: number, goalX: number, goalY: number): PathResult {
    return this.pathfinder.findPath(startX, startY, goalX, goalY, true); // Use path smoothing
  }
  
  /**
   * Update the internal grid when game grid changes
   */
  updateGrid(gameGrid: any): void {
    this.gameGridAdapter = new GameGridAdapter(gameGrid);
    this.grid = this.gameGridAdapter.toPathfinderGrid();
    this.pathfinder.setGrid(this.grid);
  }
  
  /**
   * Find a valid position near a potentially invalid one
   */
  findValidPositionNear(x: number, y: number, radius: number = 5): GridPosition | null {
    // Check the original position first
    if (this.grid.isWalkable(x, y)) {
      return { x, y };
    }
    
    // Search in expanding squares
    for (let r = 1; r <= radius; r++) {
      // Check all positions at the current radius
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          // Only check positions at the current radius (not inside it)
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
}

/**
 * Setup function - shows how to set up pathfinding in your game's initialization
 */
function setupGamePathfinding(gameState: any) {
  // Create the pathfinding service
  const pathfindingService = new GamePathfindingService(gameState.grid);
  
  // Setup entity controller with complete behavior implementations for all entity types
  const entityController = createEntityController({
    grid: pathfindingService.findPath(0, 0, 0, 0).grid, // Get grid reference
    pathfinder: pathfindingService.findPath(0, 0, 0, 0).pathfinder, // Get pathfinder reference
    behaviors: {
      // 1. GUARD - Patrols an area and attacks intruders
      [EntityType.GUARD]: {
        initialState: 'patrolling',
        updateInterval: 0.5,
        sightDistance: 8,
        states: {
          patrolling: {
            onEnter: (entity) => {
              console.log(`Guard ${entity.id} starting patrol`);
              
              // Define patrol points from level data
              entity.data = entity.data || {};
              entity.data.patrolPoints = entity.data.patrolPoints || [
                { x: entity.position.x - 5, y: entity.position.y - 5 },
                { x: entity.position.x + 5, y: entity.position.y - 5 },
                { x: entity.position.x + 5, y: entity.position.y + 5 },
                { x: entity.position.x - 5, y: entity.position.y + 5 }
              ];
              entity.data.currentPatrolIndex = 0;
              
              // Set first patrol point as target
              entity.targetPosition = entity.data.patrolPoints[0];
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Check if guard can see player
              if (distance <= 8 && controller.hasLineOfSight(entity.position, playerPos)) {
                return 'chasing';
              }
              
              // Continue patrol
              if (!entity.isMoving && !entity.currentPath) {
                controller.findPath(entity.id);
              }
              
              // If reached current patrol point, move to next one
              if (!entity.isMoving && entity.currentPathIndex === undefined) {
                entity.data = entity.data || {};
                entity.data.patrolPoints = entity.data.patrolPoints || [];
                entity.data.currentPatrolIndex = 
                  ((entity.data.currentPatrolIndex || 0) + 1) % entity.data.patrolPoints.length;
                
                entity.targetPosition = entity.data.patrolPoints[entity.data.currentPatrolIndex];
                controller.findPath(entity.id);
              }
            }
          },
          chasing: {
            onEnter: (entity) => {
              console.log(`Guard ${entity.id} spotted the player, chasing!`);
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update target to follow player
              entity.targetPosition = playerPos;
              
              // Recalculate path regularly as player moves
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
              console.log(`Guard ${entity.id} is attacking!`);
              entity.data = entity.data || {};
              entity.data.attackTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Track attack timing
              entity.data = entity.data || {};
              entity.data.attackTime = (entity.data.attackTime || 0) + deltaTime;
              
              // Perform attack every second
              if ((entity.data.attackTime || 0) >= 1.0) {
                console.log(`Guard ${entity.id} attacks the player!`);
                
                // In your game, apply damage here
                if (gameState?.player?.takeDamage) {
                  gameState.player.takeDamage(1);
                }
                
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
              console.log(`Guard ${entity.id} is searching for the player`);
              
              // Remember player's last known position
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              entity.data = entity.data || {};
              entity.data.lastKnownPlayerPos = { x: playerPos.x, y: playerPos.y };
              entity.targetPosition = entity.data.lastKnownPlayerPos;
              
              // Set search timeout
              entity.data.searchTime = 0;
              
              controller.findPath(entity.id);
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If found player again
              if (distance <= 8 && controller.hasLineOfSight(entity.position, playerPos)) {
                return 'chasing';
              }
              
              // Update search timer
              entity.data = entity.data || {};
              entity.data.searchTime = (entity.data.searchTime || 0) + deltaTime;
              
              // If reached last known position, wait a bit
              if (!entity.isMoving && entity.currentPathIndex === undefined) {
                if ((entity.data.searchTime || 0) > 3) {
                  // Give up and return to patrol
                  return 'patrolling';
                }
              }
            }
          }
        }
      },
      
      // 2. HUNTER - Actively seeks targets and adjusts to player form
      [EntityType.HUNTER]: {
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
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player is detected
              if (distance < 12 && controller.hasLineOfSight(entity.position, playerPos)) {
                // Check if player is in monster form
                if (isPlayerMonster) {
                  // More cautious approach if player is in monster form
                  return 'stalking';
                } else {
                  // Direct approach if player is in human form
                  return 'pursuing';
                }
              }
              
              // Roam around hunting area
              if (!entity.isMoving && !entity.currentPath) {
                // Find a random position within hunt area
                entity.data = entity.data || {};
                const huntArea = entity.data.huntArea || { centerX: entity.position.x, centerY: entity.position.y, radius: 15 };
                
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * huntArea.radius;
                const targetX = Math.round(huntArea.centerX + Math.cos(angle) * radius);
                const targetY = Math.round(huntArea.centerY + Math.sin(angle) * radius);
                
                // Find a valid position near the random point
                const newTarget = controller.findWalkablePositionNear({ x: targetX, y: targetY });
                
                if (newTarget) {
                  entity.targetPosition = newTarget;
                  controller.findPath(entity.id);
                }
              }
            }
          },
          stalking: {
            onEnter: (entity) => {
              console.log(`Hunter ${entity.id} is stalking the monster`);
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player is no longer in monster form, pursue directly
              if (!isPlayerMonster) {
                return 'pursuing';
              }
              
              // If lost sight of player
              if (distance > 15 || !controller.hasLineOfSight(entity.position, playerPos)) {
                return 'hunting';
              }
              
              // Maintain a safer distance from the monster
              if (distance < 6) {
                // Back away
                const dx = entity.position.x - playerPos.x;
                const dy = entity.position.y - playerPos.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                const retreatX = Math.round(entity.position.x + (dx / length) * 5);
                const retreatY = Math.round(entity.position.y + (dy / length) * 5);
                
                const safePos = controller.findWalkablePositionNear({ x: retreatX, y: retreatY });
                if (safePos) {
                  entity.targetPosition = safePos;
                  controller.findPath(entity.id);
                }
              } else if (distance > 10) {
                // Get a bit closer, but maintain distance
                entity.targetPosition = playerPos;
                controller.findPath(entity.id);
              }
            }
          },
          pursuing: {
            onEnter: (entity) => {
              console.log(`Hunter ${entity.id} is pursuing the player`);
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player transforms to monster
              if (isPlayerMonster) {
                return 'stalking';
              }
              
              // Update target to follow player
              entity.targetPosition = playerPos;
              
              // Recalculate path regularly
              if (!entity.isMoving || !entity.currentPath) {
                controller.findPath(entity.id);
              }
              
              // If close enough to attack
              if (distance < 1.5) {
                return 'attacking';
              }
              
              // If lost sight of player
              if (distance > 12 || !controller.hasLineOfSight(entity.position, playerPos)) {
                return 'hunting';
              }
            }
          },
          attacking: {
            onEnter: (entity) => {
              console.log(`Hunter ${entity.id} is attacking!`);
              entity.data = entity.data || {};
              entity.data.attackTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player transformed to monster during attack, retreat
              if (isPlayerMonster) {
                return 'stalking';
              }
              
              // Perform attack every second
              entity.data = entity.data || {};
              entity.data.attackTime = (entity.data.attackTime || 0) + deltaTime;
              
              if ((entity.data.attackTime || 0) >= 1.0) {
                console.log(`Hunter ${entity.id} attacks the player!`);
                
                // In your game, apply damage here
                if (gameState?.player?.takeDamage) {
                  gameState.player.takeDamage(1.5); // Hunters deal more damage
                }
                
                entity.data.attackTime = 0;
              }
              
              // If player moved away, pursue again
              if (distance > 1.5) {
                return 'pursuing';
              }
            }
          }
        }
      },
      
      // 3. SURVIVOR - Self-preservation focused entity
      [EntityType.SURVIVOR]: {
        initialState: 'wandering',
        updateInterval: 0.5,
        states: {
          wandering: {
            onEnter: (entity, controller) => {
              console.log(`Survivor ${entity.id} is wandering`);
              
              // Find a random position to wander to
              const randomPos = controller.findRandomWalkablePosition();
              if (randomPos) {
                entity.targetPosition = randomPos;
                controller.findPath(entity.id);
              }
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player is close and in monster form, flee
              if (distance < 10 && isPlayerMonster) {
                return 'fleeing';
              }
              
              // If player is close but human, become cautious
              if (distance < 5 && !isPlayerMonster) {
                return 'cautious';
              }
              
              // Find a new wander target when current movement is complete
              if (!entity.isMoving && !entity.currentPath) {
                const randomPos = controller.findRandomWalkablePosition();
                if (randomPos) {
                  entity.targetPosition = randomPos;
                  controller.findPath(entity.id);
                }
              }
            }
          },
          cautious: {
            onEnter: (entity) => {
              console.log(`Survivor ${entity.id} is cautious`);
              entity.data = entity.data || {};
              entity.data.cautiousTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Increase cautious time
              entity.data = entity.data || {};
              entity.data.cautiousTime = (entity.data.cautiousTime || 0) + deltaTime;
              
              // If player transforms to monster, flee immediately
              if (isPlayerMonster) {
                return 'fleeing';
              }
              
              // If player gets too close, become more nervous
              if (distance < 2) {
                // Back away slightly
                const dx = entity.position.x - playerPos.x;
                const dy = entity.position.y - playerPos.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                const backupX = Math.round(entity.position.x + (dx / length) * 3);
                const backupY = Math.round(entity.position.y + (dy / length) * 3);
                
                const safePos = controller.findWalkablePositionNear({ x: backupX, y: backupY });
                if (safePos) {
                  entity.targetPosition = safePos;
                  controller.findPath(entity.id);
                }
              }
              
              // If player is far away or enough time has passed, relax
              if (distance > 8 || (entity.data.cautiousTime || 0) > 5) {
                return 'relaxed';
              }
            }
          },
          relaxed: {
            onEnter: (entity) => {
              console.log(`Survivor ${entity.id} is relaxed`);
              entity.data = entity.data || {};
              entity.data.relaxTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update relax timer
              entity.data = entity.data || {};
              entity.data.relaxTime = (entity.data.relaxTime || 0) + deltaTime;
              
              // If player gets too close or transforms, react
              if (isPlayerMonster && distance < 10) {
                return 'fleeing';
              } else if (distance < 3) {
                return 'cautious';
              }
              
              // After being relaxed for a while, go back to wandering
              if ((entity.data.relaxTime || 0) > 3) {
                return 'wandering';
              }
            }
          },
          fleeing: {
            onEnter: (entity, controller) => {
              console.log(`Survivor ${entity.id} is fleeing!`);
              
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              // Find direction away from player
              const dx = entity.position.x - playerPos.x;
              const dy = entity.position.y - playerPos.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate flee destination (run away from player)
              const fleeDistance = 15;
              const fleeX = Math.round(entity.position.x + (dx / length) * fleeDistance);
              const fleeY = Math.round(entity.position.y + (dy / length) * fleeDistance);
              
              // Find a valid position near the flee point
              const safePos = controller.findWalkablePositionNear({ x: fleeX, y: fleeY });
              if (safePos) {
                entity.targetPosition = safePos;
                controller.findPath(entity.id);
              }
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If reached safe distance and player is not monster, calm down
              if (distance > 15 && !isPlayerMonster) {
                return 'cautious';
              }
              
              // If player is getting closer, find a new escape route
              if (distance < 10 && isPlayerMonster) {
                // Find a new direction to flee
                const dx = entity.position.x - playerPos.x;
                const dy = entity.position.y - playerPos.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                const fleeDistance = 15;
                const fleeX = Math.round(entity.position.x + (dx / length) * fleeDistance);
                const fleeY = Math.round(entity.position.y + (dy / length) * fleeDistance);
                
                const safePos = controller.findWalkablePositionNear({ x: fleeX, y: fleeY });
                if (safePos) {
                  entity.targetPosition = safePos;
                  controller.findPath(entity.id);
                }
              }
              
              // If safe distance reached, check for hiding spot
              if (!entity.isMoving && !entity.currentPath) {
                return 'hiding';
              }
            }
          },
          hiding: {
            onEnter: (entity, controller) => {
              console.log(`Survivor ${entity.id} is hiding`);
              entity.data = entity.data || {};
              entity.data.hideTime = 0;
              
              // Find a hiding spot near obstacles
              // This would use more complex logic in a real game
              const randomPos = controller.findRandomWalkablePosition();
              if (randomPos) {
                entity.targetPosition = randomPos;
                controller.findPath(entity.id);
              }
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update hiding time
              entity.data = entity.data || {};
              entity.data.hideTime = (entity.data.hideTime || 0) + deltaTime;
              
              // If player is not a monster and it's been a while, return to normal
              if (!isPlayerMonster && (entity.data.hideTime || 0) > 5) {
                return 'cautious';
              }
              
              // If player is a monster and gets too close, flee again
              if (isPlayerMonster && distance < 8) {
                return 'fleeing';
              }
            }
          }
        }
      },
      
      // 4. PRESERVER - Uses attack-retreat tactics
      [EntityType.PRESERVER]: {
        initialState: 'patrolling',
        updateInterval: 0.4,
        states: {
          patrolling: {
            onEnter: (entity, controller) => {
              console.log(`Preserver ${entity.id} is patrolling`);
              
              // Find a patrol area
              entity.data = entity.data || {};
              entity.data.patrolCenter = { x: entity.position.x, y: entity.position.y };
              entity.data.patrolRadius = 10;
              
              // Find a random position within patrol area
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * (entity.data.patrolRadius || 10);
              const targetX = Math.round((entity.data.patrolCenter?.x || entity.position.x) + Math.cos(angle) * radius);
              const targetY = Math.round((entity.data.patrolCenter?.y || entity.position.y) + Math.sin(angle) * radius);
              
              const patrolPos = controller.findWalkablePositionNear({ x: targetX, y: targetY });
              if (patrolPos) {
                entity.targetPosition = patrolPos;
                controller.findPath(entity.id);
              }
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player is detected
              if (distance < 8 && controller.hasLineOfSight(entity.position, playerPos)) {
                return 'charging';
              }
              
              // Find a new patrol position when current movement is complete
              if (!entity.isMoving && !entity.currentPath) {
                entity.data = entity.data || {};
                const patrolCenter = entity.data.patrolCenter || { x: entity.position.x, y: entity.position.y };
                const patrolRadius = entity.data.patrolRadius || 10;
                
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * patrolRadius;
                const targetX = Math.round(patrolCenter.x + Math.cos(angle) * radius);
                const targetY = Math.round(patrolCenter.y + Math.sin(angle) * radius);
                
                const patrolPos = controller.findWalkablePositionNear({ x: targetX, y: targetY });
                if (patrolPos) {
                  entity.targetPosition = patrolPos;
                  controller.findPath(entity.id);
                }
              }
            }
          },
          charging: {
            onEnter: (entity) => {
              console.log(`Preserver ${entity.id} is charging at the player!`);
              
              // Increase speed during charge
              entity.data = entity.data || {};
              entity.data.normalSpeed = entity.speed;
              entity.speed = entity.data.normalSpeed * 1.5;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update target to charge at player
              entity.targetPosition = playerPos;
              
              // Recalculate path regularly
              if (!entity.isMoving || !entity.currentPath) {
                controller.findPath(entity.id);
              }
              
              // If close enough to attack
              if (distance < 1.5) {
                return 'attacking';
              }
              
              // If lost sight of player
              if (distance > 10 || !controller.hasLineOfSight(entity.position, playerPos)) {
                // Restore normal speed
                entity.data = entity.data || {};
                entity.speed = entity.data.normalSpeed || entity.speed;
                return 'patrolling';
              }
            }
          },
          attacking: {
            onEnter: (entity) => {
              console.log(`Preserver ${entity.id} is attacking player!`);
              entity.data = entity.data || {};
              entity.data.attackTime = 0;
              entity.data.attackCount = 0;
              
              // Restore normal speed
              entity.speed = entity.data.normalSpeed || entity.speed;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Perform attack logic
              entity.data = entity.data || {};
              entity.data.attackTime = (entity.data.attackTime || 0) + deltaTime;
              
              if ((entity.data.attackTime || 0) >= 0.5) {
                console.log(`Preserver ${entity.id} is attacking player!`);
                
                // In your game, apply damage here
                if (gameState?.player?.takeDamage) {
                  gameState.player.takeDamage(0.7); // Preservers deal less damage but attack faster
                }
                
                entity.data.attackTime = 0;
                entity.data.attackCount = (entity.data.attackCount || 0) + 1;
              }
              
              // After 3 quick attacks, retreat
              if ((entity.data.attackCount || 0) >= 3) {
                return 'retreating';
              }
              
              // If player moved away, charge again
              if (distance > 1.5) {
                return 'charging';
              }
            }
          },
          retreating: {
            onEnter: (entity, controller) => {
              console.log(`Preserver ${entity.id} is retreating`);
              
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              // Find direction away from player
              const dx = entity.position.x - playerPos.x;
              const dy = entity.position.y - playerPos.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate retreat destination
              const retreatDistance = 8;
              const retreatX = Math.round(entity.position.x + (dx / length) * retreatDistance);
              const retreatY = Math.round(entity.position.y + (dy / length) * retreatDistance);
              
              // Find a valid position near the retreat point
              const retreatPos = controller.findWalkablePositionNear({ x: retreatX, y: retreatY });
              if (retreatPos) {
                entity.targetPosition = retreatPos;
                controller.findPath(entity.id);
              }
              
              // Increase speed during retreat
              entity.data = entity.data || {};
              entity.data.normalSpeed = entity.speed;
              entity.speed = entity.data.normalSpeed * 1.2;
            },
            update: (entity, deltaTime, controller) => {
              // If reached retreat position, regroup
              if (!entity.isMoving && !entity.currentPath) {
                // Restore normal speed
                entity.data = entity.data || {};
                entity.speed = entity.data.normalSpeed || entity.speed;
                return 'regrouping';
              }
            }
          },
          regrouping: {
            onEnter: (entity) => {
              console.log(`Preserver ${entity.id} is regrouping`);
              entity.data = entity.data || {};
              entity.data.regroupTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update regroup timer
              entity.data = entity.data || {};
              entity.data.regroupTime = (entity.data.regroupTime || 0) + deltaTime;
              
              // If player gets too close during regrouping
              if (distance < 3 && controller.hasLineOfSight(entity.position, playerPos)) {
                return 'charging';
              }
              
              // After regrouping for a few seconds, start patrolling again
              if ((entity.data.regroupTime || 0) > 3) {
                return 'patrolling';
              }
            }
          }
        }
      },
      
      // 5. MERCHANT - Travels between hotspots
      [EntityType.MERCHANT]: {
        initialState: 'traveling',
        updateInterval: 0.5,
        states: {
          traveling: {
            onEnter: (entity, controller) => {
              console.log(`Merchant ${entity.id} is traveling`);
              
              // Define hotspots if not already defined
              entity.data = entity.data || {};
              if (!entity.data.hotspots) {
                // In a real game, these might be predefined trading locations
                entity.data.hotspots = [
                  { x: entity.position.x - 20, y: entity.position.y - 20 },
                  { x: entity.position.x + 20, y: entity.position.y - 20 },
                  { x: entity.position.x + 20, y: entity.position.y + 20 },
                  { x: entity.position.x - 20, y: entity.position.y + 20 },
                  { x: entity.position.x, y: entity.position.y }
                ];
                entity.data.currentHotspot = 0;
              }
              
              // Set next hotspot as target
              const hotspot = entity.data.hotspots[entity.data.currentHotspot];
              entity.targetPosition = hotspot;
              controller.findPath(entity.id);
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player is in monster form and close, flee
              if (isPlayerMonster && distance < 10) {
                return 'fleeing';
              }
              
              // If reached hotspot
              if (!entity.isMoving && !entity.currentPath) {
                return 'trading';
              }
              
              // If merchant gets stuck, try next hotspot
              if (!entity.isMoving || (entity.currentPath && entity.currentPath.length === 0)) {
                console.log(`Merchant ${entity.id} is stuck, trying next hotspot`);
                entity.data = entity.data || {};
                entity.data.hotspots = entity.data.hotspots || [{ x: entity.position.x, y: entity.position.y }];
                entity.data.currentHotspot = 
                  ((entity.data.currentHotspot || 0) + 1) % entity.data.hotspots.length;
                
                const hotspot = entity.data.hotspots[entity.data.currentHotspot];
                entity.targetPosition = hotspot;
                controller.findPath(entity.id);
              }
            }
          },
          trading: {
            onEnter: (entity) => {
              console.log(`Merchant ${entity.id} is trading at hotspot`);
              entity.data = entity.data || {};
              entity.data.tradeTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update trade timer
              entity.data = entity.data || {};
              entity.data.tradeTime = (entity.data.tradeTime || 0) + deltaTime;
              
              // If player is in monster form and close, flee
              if (isPlayerMonster && distance < 10) {
                return 'fleeing';
              }
              
              // If player is nearby in human form, interact
              if (!isPlayerMonster && distance < 2) {
                // This would trigger trade dialog in a real game
                console.log(`Merchant ${entity.id} is interacting with the player`);
                
                // In your game, open trade menu here
                if (gameState?.openTradeMenu) {
                  gameState.openTradeMenu(entity.id);
                }
              }
              
              // After trading for a while, move to next hotspot
              if ((entity.data.tradeTime || 0) > 10) {
                entity.data.currentHotspot = 
                  ((entity.data.currentHotspot || 0) + 1) % (entity.data.hotspots?.length || 1);
                return 'traveling';
              }
            }
          },
          fleeing: {
            onEnter: (entity, controller) => {
              console.log(`Merchant ${entity.id} is fleeing from monster!`);
              
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              
              // Find direction away from player
              const dx = entity.position.x - playerPos.x;
              const dy = entity.position.y - playerPos.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              
              // Calculate flee destination
              const fleeDistance = 15;
              const fleeX = Math.round(entity.position.x + (dx / length) * fleeDistance);
              const fleeY = Math.round(entity.position.y + (dy / length) * fleeDistance);
              
              // Find a valid position near the flee point
              const safePos = controller.findWalkablePositionNear({ x: fleeX, y: fleeY });
              if (safePos) {
                entity.targetPosition = safePos;
                controller.findPath(entity.id);
              }
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If reached safe distance or player is no longer monster
              if (distance > 15 || !isPlayerMonster) {
                return 'returning';
              }
              
              // If monster is getting closer, find new escape route
              if (distance < 8 && isPlayerMonster) {
                // Find direction away from player
                const dx = entity.position.x - playerPos.x;
                const dy = entity.position.y - playerPos.y;
                const length = Math.sqrt(dx * dx + dy * dy);
                
                const fleeDistance = 15;
                const fleeX = Math.round(entity.position.x + (dx / length) * fleeDistance);
                const fleeY = Math.round(entity.position.y + (dy / length) * fleeDistance);
                
                const safePos = controller.findWalkablePositionNear({ x: fleeX, y: fleeY });
                if (safePos) {
                  entity.targetPosition = safePos;
                  controller.findPath(entity.id);
                }
              }
            }
          },
          returning: {
            onEnter: (entity, controller) => {
              console.log(`Merchant ${entity.id} is returning to hotspot`);
              
              // Return to current hotspot
              entity.data = entity.data || {};
              entity.data.hotspots = entity.data.hotspots || [{ x: entity.position.x, y: entity.position.y }];
              const hotspot = entity.data.hotspots[entity.data.currentHotspot || 0];
              entity.targetPosition = hotspot;
              
              // Check path to hotspot
              controller.findPath(entity.id);
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // If player is monster again and close, flee
              if (isPlayerMonster && distance < 10) {
                return 'fleeing';
              }
              
              // If reached hotspot
              if (!entity.isMoving && !entity.currentPath) {
                return 'trading';
              }
            }
          },
          waiting: {
            onEnter: (entity) => {
              console.log(`Merchant ${entity.id} is waiting`);
              entity.data = entity.data || {};
              entity.data.waitTime = 0;
            },
            update: (entity, deltaTime, controller) => {
              const gameState = window.gameState; // Access your game state
              const playerPos = gameState?.player?.position || { x: 25, y: 25 };
              const isPlayerMonster = gameState?.player?.isMonsterForm || false;
              
              const distance = Math.sqrt(
                Math.pow(entity.position.x - playerPos.x, 2) + 
                Math.pow(entity.position.y - playerPos.y, 2)
              );
              
              // Update wait timer
              entity.data = entity.data || {};
              entity.data.waitTime = (entity.data.waitTime || 0) + deltaTime;
              
              // If player is monster and close, flee
              if (isPlayerMonster && distance < 10) {
                return 'fleeing';
              }
              
              // After waiting for a while, resume traveling
              if ((entity.data.waitTime || 0) > 5) {
                return 'traveling';
              }
            }
          }
        }
      }
    }
  });
  
  // Example: Register for game grid change events
  gameState.onGridChanged((newGrid: any) => {
    pathfindingService.updateGrid(newGrid);
  });
  
  // Return the services for use in the game
  return {
    pathfindingService,
    entityController
  };
}

/**
 * Example game update loop that uses the pathfinding system
 */
function gameUpdateLoop(deltaTime: number, gameState: any, pathfindingService: GamePathfindingService) {
  // Update all NPCs
  for (const npc of gameState.npcs) {
    if (npc.needsPath) {
      // Calculate path to target
      const path = pathfindingService.findPath(
        npc.position.x, npc.position.y,
        npc.targetPosition.x, npc.targetPosition.y
      );
      
      if (path.found) {
        npc.setPath(path.path);
      } else {
        // Target position is unreachable, find nearest valid position
        const alternateTarget = pathfindingService.findValidPositionNear(
          npc.targetPosition.x, npc.targetPosition.y
        );
        
        if (alternateTarget) {
          console.log(`Target position (${npc.targetPosition.x}, ${npc.targetPosition.y}) for NPC ${npc.id} is unwalkable! Finding alternate target.`);
          console.log(`Adjusted target to (${alternateTarget.x}, ${alternateTarget.y})`);
          
          npc.targetPosition = alternateTarget;
          const newPath = pathfindingService.findPath(
            npc.position.x, npc.position.y,
            alternateTarget.x, alternateTarget.y
          );
          
          if (newPath.found) {
            npc.setPath(newPath.path);
          }
        }
      }
    }
    
    // Update NPC movement along path
    npc.update(deltaTime);
  }
  
  // Update player
  if (gameState.player.isMoving) {
    // Check for obstacles in player's path
    const nextX = Math.floor(gameState.player.position.x + gameState.player.velocity.x * deltaTime);
    const nextY = Math.floor(gameState.player.position.y + gameState.player.velocity.y * deltaTime);
    
    if (!gameState.grid.isObstacle(nextX, nextY)) {
      gameState.player.position.x += gameState.player.velocity.x * deltaTime;
      gameState.player.position.y += gameState.player.velocity.y * deltaTime;
    } else {
      // Player hit an obstacle, stop movement
      gameState.player.velocity.x = 0;
      gameState.player.velocity.y = 0;
    }
  }
}