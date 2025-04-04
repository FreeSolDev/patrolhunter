import { 
  createPathfinder, 
  Grid, 
  EntityType, 
  createEntityController 
} from '../src';

/**
 * This example demonstrates how to set up and use different entity behaviors
 * that match the five AI types in your game: Guard, Hunter, Survivor, Preserver, and Merchant
 */

// First, create a grid and pathfinder
const gridWidth = 50;
const gridHeight = 50;
const grid = new Grid(gridWidth, gridHeight);

// Add some obstacles to the grid (like walls, water, etc.)
for (let x = 10; x < 20; x++) {
  grid.setWalkable(x, 15, false);
}

for (let y = 25; y < 35; y++) {
  grid.setWalkable(30, y, false);
}

// Create a pathfinder
const { pathfinder } = createPathfinder(grid);

// Helper functions (simulated game functions)
const getPlayerPosition = () => ({ x: 25, y: 25 });
const isPlayerMonster = () => false; // This would come from your game state
const getDistance = (a: {x: number, y: number}, b: {x: number, y: number}) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Set up entity controller with all five behavior types
const entityController = createEntityController({
  grid,
  pathfinder,
  behaviors: {
    // 1. GUARD behavior - patrols and attacks
    [EntityType.GUARD]: {
      initialState: 'patrolling',
      updateInterval: 0.5,
      sightDistance: 8,
      states: {
        patrolling: {
          onEnter: (entity) => {
            console.log(`Guard ${entity.id} starting patrol`);
            
            // Find patrol points (in real game, this might come from level data)
            const patrolPoints = [
              { x: 5, y: 5 },
              { x: 15, y: 5 },
              { x: 15, y: 10 },
              { x: 5, y: 10 }
            ];
            
            // Store patrol data in entity
            entity.data = entity.data || {};
            entity.data.patrolPoints = patrolPoints;
            entity.data.currentPatrolIndex = 0;
            
            // Set first patrol point as target
            entity.targetPosition = patrolPoints[0];
          },
          update: (entity, deltaTime, controller) => {
            // Check if player is within sight
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Check if guard can see player
            if (distance <= 8 && controller.hasLineOfSight(entity.position, playerPos)) {
              // Can see player, start chasing
              return 'chasing';
            }
            
            // Continue patrol
            if (!entity.isMoving && !entity.currentPath) {
              controller.findPath(entity.id);
            }
            
            // If reached current patrol point, move to next one
            if (!entity.isMoving && entity.currentPathIndex === undefined) {
              entity.data.currentPatrolIndex = 
                (entity.data.currentPatrolIndex + 1) % entity.data.patrolPoints.length;
              
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Track attack timing
            entity.data.attackTime += deltaTime;
            
            // Perform attack every second
            if (entity.data.attackTime >= 1.0) {
              console.log(`Guard ${entity.id} attacks the player!`);
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
            entity.data = entity.data || {};
            entity.data.lastKnownPlayerPos = { ...getPlayerPosition() };
            entity.targetPosition = entity.data.lastKnownPlayerPos;
            
            // Set search timeout
            entity.data.searchTime = 0;
            
            controller.findPath(entity.id);
          },
          update: (entity, deltaTime, controller) => {
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If found player again
            if (distance <= 8 && controller.hasLineOfSight(entity.position, playerPos)) {
              return 'chasing';
            }
            
            // Update search timer
            entity.data.searchTime += deltaTime;
            
            // If reached last known position, wait a bit
            if (!entity.isMoving && entity.currentPathIndex === undefined) {
              if (entity.data.searchTime > 3) {
                // Give up and return to patrol
                return 'patrolling';
              }
            }
          }
        }
      }
    },
    
    // 2. HUNTER behavior - actively seeks and adapts to player
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player is detected
            if (distance < 12 && controller.hasLineOfSight(entity.position, playerPos)) {
              // Check if player is in monster form
              if (isPlayerMonster()) {
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
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * entity.data.huntArea.radius;
              const targetX = Math.round(entity.data.huntArea.centerX + Math.cos(angle) * radius);
              const targetY = Math.round(entity.data.huntArea.centerY + Math.sin(angle) * radius);
              
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player is no longer in monster form, pursue directly
            if (!isPlayerMonster()) {
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player transforms to monster
            if (isPlayerMonster()) {
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player transformed to monster during attack, retreat
            if (isPlayerMonster()) {
              return 'stalking';
            }
            
            // Perform attack every second
            entity.data.attackTime += deltaTime;
            if (entity.data.attackTime >= 1.0) {
              console.log(`Hunter ${entity.id} attacks the player!`);
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
    
    // 3. SURVIVOR behavior - prioritizes self-preservation
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player is close and in monster form, flee
            if (distance < 10 && isPlayerMonster()) {
              return 'fleeing';
            }
            
            // If player is close but human, become cautious
            if (distance < 5 && !isPlayerMonster()) {
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Increase cautious time
            entity.data.cautiousTime += deltaTime;
            
            // If player transforms to monster, flee immediately
            if (isPlayerMonster()) {
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
            if (distance > 8 || entity.data.cautiousTime > 5) {
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Update relax timer
            entity.data.relaxTime += deltaTime;
            
            // If player gets too close or transforms, react
            if (isPlayerMonster() && distance < 10) {
              return 'fleeing';
            } else if (distance < 3) {
              return 'cautious';
            }
            
            // After being relaxed for a while, go back to wandering
            if (entity.data.relaxTime > 3) {
              return 'wandering';
            }
          }
        },
        fleeing: {
          onEnter: (entity, controller) => {
            console.log(`Survivor ${entity.id} is fleeing!`);
            
            // Find direction away from player
            const playerPos = getPlayerPosition();
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If reached safe distance and player is not monster, calm down
            if (distance > 15 && !isPlayerMonster()) {
              return 'cautious';
            }
            
            // If player is getting closer, find a new escape route
            if (distance < 10 && isPlayerMonster()) {
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Update hiding time
            entity.data.hideTime += deltaTime;
            
            // If player is not a monster and it's been a while, return to normal
            if (!isPlayerMonster() && entity.data.hideTime > 5) {
              return 'cautious';
            }
            
            // If player is a monster and gets too close, flee again
            if (isPlayerMonster() && distance < 8) {
              return 'fleeing';
            }
          }
        }
      }
    },
    
    // 4. PRESERVER behavior - attack-retreat tactics
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
            const radius = Math.random() * entity.data.patrolRadius;
            const targetX = Math.round(entity.data.patrolCenter.x + Math.cos(angle) * radius);
            const targetY = Math.round(entity.data.patrolCenter.y + Math.sin(angle) * radius);
            
            const patrolPos = controller.findWalkablePositionNear({ x: targetX, y: targetY });
            if (patrolPos) {
              entity.targetPosition = patrolPos;
              controller.findPath(entity.id);
            }
          },
          update: (entity, deltaTime, controller) => {
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player is detected
            if (distance < 8 && controller.hasLineOfSight(entity.position, playerPos)) {
              return 'charging';
            }
            
            // Find a new patrol position when current movement is complete
            if (!entity.isMoving && !entity.currentPath) {
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * entity.data.patrolRadius;
              const targetX = Math.round(entity.data.patrolCenter.x + Math.cos(angle) * radius);
              const targetY = Math.round(entity.data.patrolCenter.y + Math.sin(angle) * radius);
              
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
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
              entity.speed = entity.data.normalSpeed;
              return 'patrolling';
            }
          }
        },
        attacking: {
          onEnter: (entity) => {
            console.log(`Preserver ${entity.id} is attacking!`);
            entity.data = entity.data || {};
            entity.data.attackTime = 0;
            entity.data.attackCount = 0;
            
            // Restore normal speed
            entity.speed = entity.data.normalSpeed;
          },
          update: (entity, deltaTime, controller) => {
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Perform attack logic
            entity.data.attackTime += deltaTime;
            if (entity.data.attackTime >= 0.5) {
              console.log(`Preserver ${entity.id} attacks the player!`);
              entity.data.attackTime = 0;
              entity.data.attackCount += 1;
            }
            
            // After 3 quick attacks, retreat
            if (entity.data.attackCount >= 3) {
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
            
            // Find direction away from player
            const playerPos = getPlayerPosition();
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
              entity.speed = entity.data.normalSpeed;
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Update regroup timer
            entity.data.regroupTime += deltaTime;
            
            // If player gets too close during regrouping
            if (distance < 3 && controller.hasLineOfSight(entity.position, playerPos)) {
              return 'charging';
            }
            
            // After regrouping for a few seconds, start patrolling again
            if (entity.data.regroupTime > 3) {
              return 'patrolling';
            }
          }
        }
      }
    },
    
    // 5. MERCHANT behavior - moves between hotspots
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
                { x: 5, y: 5 },
                { x: 45, y: 5 },
                { x: 45, y: 45 },
                { x: 5, y: 45 },
                { x: 25, y: 25 }
              ];
              entity.data.currentHotspot = 0;
            }
            
            // Set next hotspot as target
            const hotspot = entity.data.hotspots[entity.data.currentHotspot];
            entity.targetPosition = hotspot;
            controller.findPath(entity.id);
          },
          update: (entity, deltaTime, controller) => {
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player is in monster form and close, flee
            if (isPlayerMonster() && distance < 10) {
              return 'fleeing';
            }
            
            // If reached hotspot
            if (!entity.isMoving && !entity.currentPath) {
              return 'trading';
            }
            
            // If merchant gets stuck, try next hotspot
            if (entity.currentPath && entity.currentPath.length === 0) {
              console.log(`Merchant ${entity.id} is stuck, trying next hotspot`);
              entity.data.currentHotspot = 
                (entity.data.currentHotspot + 1) % entity.data.hotspots.length;
              
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Update trade timer
            entity.data.tradeTime += deltaTime;
            
            // If player is in monster form and close, flee
            if (isPlayerMonster() && distance < 10) {
              return 'fleeing';
            }
            
            // If player is nearby in human form, interact
            if (!isPlayerMonster() && distance < 2) {
              // This would trigger trade dialog in a real game
              console.log(`Merchant ${entity.id} is interacting with the player`);
            }
            
            // After trading for a while, move to next hotspot
            if (entity.data.tradeTime > 10) {
              entity.data.currentHotspot = 
                (entity.data.currentHotspot + 1) % entity.data.hotspots.length;
              return 'traveling';
            }
          }
        },
        fleeing: {
          onEnter: (entity, controller) => {
            console.log(`Merchant ${entity.id} is fleeing from monster!`);
            
            // Find direction away from player
            const playerPos = getPlayerPosition();
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If reached safe distance or player is no longer monster
            if (distance > 15 || !isPlayerMonster()) {
              return 'returning';
            }
            
            // If monster is getting closer, find new escape route
            if (distance < 8 && isPlayerMonster()) {
              const playerPos = getPlayerPosition();
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
          onEnter: (entity) => {
            console.log(`Merchant ${entity.id} is returning to hotspot`);
            
            // Return to current hotspot
            const hotspot = entity.data.hotspots[entity.data.currentHotspot];
            entity.targetPosition = hotspot;
            
            // Check path to hotspot
            entityController.findPath(entity.id);
          },
          update: (entity, deltaTime, controller) => {
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // If player is monster again and close, flee
            if (isPlayerMonster() && distance < 10) {
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
            const playerPos = getPlayerPosition();
            const distance = getDistance(entity.position, playerPos);
            
            // Update wait timer
            entity.data.waitTime += deltaTime;
            
            // If player is monster and close, flee
            if (isPlayerMonster() && distance < 10) {
              return 'fleeing';
            }
            
            // After waiting for a while, resume traveling
            if (entity.data.waitTime > 5) {
              return 'traveling';
            }
          }
        }
      }
    }
  }
});

// Create entities for demonstration
const guard = entityController.createEntity({
  id: 'guard-1',
  type: EntityType.GUARD,
  position: { x: 10, y: 10 },
  targetPosition: { x: 10, y: 10 },
  speed: 2.0
});

const hunter = entityController.createEntity({
  id: 'hunter-1',
  type: EntityType.HUNTER,
  position: { x: 40, y: 10 },
  targetPosition: { x: 40, y: 10 },
  speed: 2.5
});

const survivor = entityController.createEntity({
  id: 'survivor-1', 
  type: EntityType.SURVIVOR,
  position: { x: 10, y: 40 },
  targetPosition: { x: 10, y: 40 },
  speed: 1.8
});

const preserver = entityController.createEntity({
  id: 'preserver-1',
  type: EntityType.PRESERVER, 
  position: { x: 40, y: 40 },
  targetPosition: { x: 40, y: 40 },
  speed: 2.2
});

const merchant = entityController.createEntity({
  id: 'merchant-1',
  type: EntityType.MERCHANT,
  position: { x: 25, y: 25 },
  targetPosition: { x: 25, y: 25 },
  speed: 1.5
});

// Subscribe to state changes
entityController.onStateChange((entityId, oldState, newState) => {
  console.log(`Entity ${entityId} changed state from ${oldState} to ${newState}`);
});

// Simulate game loop (in real game, this would be part of requestAnimationFrame)
let time = 0;
const simulateGameLoop = () => {
  const deltaTime = 0.1; // 100ms in seconds
  time += deltaTime;
  
  // Update entities
  entityController.update(deltaTime);
  
  // Print entity states every 2 seconds
  if (Math.floor(time) % 2 === 0 && Math.floor(time) !== Math.floor(time - deltaTime)) {
    console.log('\nEntity States:');
    const states = entityController.getEntityStates();
    for (const [id, state] of Object.entries(states)) {
      console.log(`${id} (${state.type}): ${state.currentState}`);
    }
  }
};

// Run simulation for a short time
console.log('Starting simulation...');
for (let i = 0; i < 100; i++) {
  simulateGameLoop();
}
console.log('Simulation complete.');