import React, { useEffect, useRef, useState } from 'react';
import { Grid, createPathfinder, EntityController, EntityType, createEntityController } from '../../../gamePathfinder/dist';

// Example component that integrates the GamePathfinder library
const PathfinderIntegration: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [controllers, setControllers] = useState<Map<string, EntityController>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const TILE_SIZE = 30;
  const GRID_WIDTH = 20;
  const GRID_HEIGHT = 15;

  // Initialize the pathfinder and grid
  useEffect(() => {
    // Create a grid using the Grid class directly
    const newGrid = new Grid(GRID_WIDTH, GRID_HEIGHT);

    // Add some random obstacles
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      
      // Skip center area for player spawn
      if (Math.abs(x - GRID_WIDTH/2) < 3 && Math.abs(y - GRID_HEIGHT/2) < 3) {
        continue;
      }
      
      newGrid.setWalkable(x, y, false);
    }

    setGrid(newGrid);

    // Create entities
    const newEntities = [
      {
        id: 'player',
        type: 'player',
        position: { x: GRID_WIDTH/2, y: GRID_HEIGHT/2 },
        pixelPosition: { x: (GRID_WIDTH/2) * TILE_SIZE, y: (GRID_HEIGHT/2) * TILE_SIZE },
        speed: 5,
        isMonster: false
      },
      {
        id: 'guard1',
        type: EntityType.GUARD,
        position: { x: 2, y: 2 },
        pixelPosition: { x: 2 * TILE_SIZE, y: 2 * TILE_SIZE },
        speed: 3,
        groupId: 1
      },
      {
        id: 'hunter1',
        type: EntityType.HUNTER,
        position: { x: GRID_WIDTH-3, y: GRID_HEIGHT-3 },
        pixelPosition: { x: (GRID_WIDTH-3) * TILE_SIZE, y: (GRID_HEIGHT-3) * TILE_SIZE },
        speed: 4,
      },
      {
        id: 'merchant1',
        type: EntityType.MERCHANT,
        position: { x: 5, y: GRID_HEIGHT-3 },
        pixelPosition: { x: 5 * TILE_SIZE, y: (GRID_HEIGHT-3) * TILE_SIZE },
        speed: 2
      }
    ];

    setEntities(newEntities);

    // Create entity controllers
    const newControllers = new Map<string, EntityController>();
    
    // We only create controllers for non-player entities
    for (let i = 1; i < newEntities.length; i++) {
      const entity = newEntities[i];
      
      // Create the entity controller
      const controller = createEntityController({
        entity: entity,
        grid: newGrid,
        pathfinderOptions: {
          allowDiagonals: true,
          heuristic: 'manhattan'
        }
      });
      
      newControllers.set(entity.id, controller);
    }
    
    setControllers(newControllers);

    // Start the game loop
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Game loop
  const gameLoop = (currentTime: number) => {
    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;
    
    // Update entities
    updateEntities(deltaTime);
    
    // Render
    renderGame();
    
    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // Update entities
  const updateEntities = (deltaTime: number) => {
    if (!grid) return;
    
    setEntities(prevEntities => {
      const updatedEntities = [...prevEntities];
      
      // Update player
      const playerIndex = updatedEntities.findIndex(e => e.id === 'player');
      if (playerIndex !== -1) {
        // Player logic would go here - for now just random movement
        const player = updatedEntities[playerIndex];
        if (Math.random() < 0.01) { // Occasionally change monster form
          player.isMonster = !player.isMonster;
        }
      }
      
      // Update all AI entities using controllers
      for (let i = 0; i < updatedEntities.length; i++) {
        if (updatedEntities[i].id === 'player') continue;
        
        const entity = updatedEntities[i];
        const controller = controllers.get(entity.id);
        
        if (controller) {
          // Update AI state
          controller.update(deltaTime);
          
          // Get player position for context
          const player = updatedEntities.find(e => e.id === 'player');
          
          // Set behavior based on player state and position
          if (player) {
            controller.setPlayerContext({
              position: player.position,
              isMonsterForm: player.isMonster
            });
            
            // Random chance to set new target if no current target
            if (Math.random() < 0.01 && !controller.hasTarget()) {
              const randomX = Math.floor(Math.random() * GRID_WIDTH);
              const randomY = Math.floor(Math.random() * GRID_HEIGHT);
              controller.setTarget({ x: randomX, y: randomY });
            }
            
            // Apply controller state to entity
            entity.currentState = controller.getCurrentState();
            
            // Update pixel position based on current path
            const nextPosition = controller.getNextPosition();
            if (nextPosition) {
              // Move toward the next position at the entity's speed
              const dx = nextPosition.x * TILE_SIZE - entity.pixelPosition.x;
              const dy = nextPosition.y * TILE_SIZE - entity.pixelPosition.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance > 0.1) {
                const moveAmount = entity.speed * deltaTime;
                const ratio = Math.min(moveAmount / distance, 1);
                
                entity.pixelPosition.x += dx * ratio;
                entity.pixelPosition.y += dy * ratio;
                
                // Update grid position
                entity.position.x = entity.pixelPosition.x / TILE_SIZE;
                entity.position.y = entity.pixelPosition.y / TILE_SIZE;
              } else {
                // Exactly at next point in path
                entity.pixelPosition.x = nextPosition.x * TILE_SIZE;
                entity.pixelPosition.y = nextPosition.y * TILE_SIZE;
                entity.position = { ...nextPosition };
                
                // Advance to next point in path
                controller.advancePathIndex();
              }
            }
          }
        }
      }
      
      return updatedEntities;
    });
  };

  // Render the game
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!grid.isWalkable(x, y)) {
          // Obstacle
          ctx.fillStyle = '#333';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else {
          // Walkable
          ctx.fillStyle = '#eee';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#ccc';
          ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    
    // Draw paths
    controllers.forEach(controller => {
      const path = controller.getCurrentPath();
      if (path && path.length > 0) {
        ctx.strokeStyle = '#00f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        ctx.moveTo(
          path[0].x * TILE_SIZE + TILE_SIZE / 2,
          path[0].y * TILE_SIZE + TILE_SIZE / 2
        );
        
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(
            path[i].x * TILE_SIZE + TILE_SIZE / 2,
            path[i].y * TILE_SIZE + TILE_SIZE / 2
          );
        }
        ctx.stroke();
      }
    });
    
    // Draw entities
    entities.forEach(entity => {
      // Different colors for different entity types
      if (entity.id === 'player') {
        ctx.fillStyle = entity.isMonster ? '#f00' : '#00f';
      } else {
        switch(entity.type) {
          case EntityType.GUARD:
            ctx.fillStyle = '#f00'; // Red
            break;
          case EntityType.HUNTER:
            ctx.fillStyle = '#0f0'; // Green
            break;
          case EntityType.SURVIVOR:
            ctx.fillStyle = '#ff0'; // Yellow
            break;
          case EntityType.PRESERVER:
            ctx.fillStyle = '#f0f'; // Purple
            break;
          case EntityType.MERCHANT:
            ctx.fillStyle = '#0ff'; // Cyan
            break;
          default:
            ctx.fillStyle = '#888'; // Gray fallback
        }
      }
      
      ctx.beginPath();
      ctx.arc(
        entity.pixelPosition.x + TILE_SIZE / 2,
        entity.pixelPosition.y + TILE_SIZE / 2,
        TILE_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw state text above the entity
      if (entity.id !== 'player' && entity.currentState) {
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          entity.currentState,
          entity.pixelPosition.x + TILE_SIZE / 2,
          entity.pixelPosition.y - 5
        );
      }
    });
  };

  // Handle canvas click to set an entity's target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !grid) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    
    // Check if the position is valid and walkable
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || !grid.isWalkable(x, y)) {
      console.log('Invalid target position');
      return;
    }
    
    // Find the nearest non-player entity to set target
    const nonPlayerEntities = entities.filter(e => e.id !== 'player');
    if (nonPlayerEntities.length === 0) return;
    
    // Find the closest entity
    let closestEntity = nonPlayerEntities[0];
    let minDistance = Infinity;
    
    for (const entity of nonPlayerEntities) {
      const distance = Math.sqrt(
        Math.pow(entity.position.x - x, 2) + Math.pow(entity.position.y - y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestEntity = entity;
      }
    }
    
    // Set the target for the closest entity
    const controller = controllers.get(closestEntity.id);
    if (controller) {
      controller.setTarget({ x, y });
      console.log(`Set target for ${closestEntity.type} to (${x}, ${y})`);
    }
  };

  return (
    <div className="relative">
      <h2 className="text-xl font-bold mb-4">GamePathfinder Integration Demo</h2>
      <canvas
        ref={canvasRef}
        width={GRID_WIDTH * TILE_SIZE}
        height={GRID_HEIGHT * TILE_SIZE}
        onClick={handleCanvasClick}
        className="border border-gray-400"
      />
      <div className="mt-4 p-4 bg-gray-100 rounded-md">
        <h3 className="font-bold">Instructions:</h3>
        <p className="mb-2">Click on the grid to set a target for the nearest entity.</p>
        <p className="mb-2">• Blue circle: Player (occasionally changes to monster form)</p>
        <p className="mb-2">• Red: Guard - patrols and defends territory</p>
        <p className="mb-2">• Green: Hunter - specifically targets the player in monster form</p>
        <p className="mb-2">• Cyan: Merchant - moves between market spots</p>
        <p className="italic text-sm text-gray-600 mt-4">
          This demo implements the GamePathfinder library, showing entity behavior, 
          pathfinding, and smooth movement between grid cells.
        </p>
      </div>
    </div>
  );
};

export default PathfinderIntegration;