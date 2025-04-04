import { useEffect, useRef, RefObject } from "react";
import { useGridStore } from "../lib/stores/useGridStore";
import { useEntityStore } from "../lib/stores/useEntityStore";
import { usePathfinding } from "../lib/stores/usePathfinding";
import { AIType } from "../lib/ai/AITypes";
import { useGame } from "../lib/stores/useGame";
import { usePerformanceStore } from "../lib/stores/usePerformanceStore";
import { GridPosition, Player, NPC, Controls, PathData } from "../lib/types";

// Define tile size in pixels
const TILE_SIZE = 30;
// Define colors
const COLORS = {
  GRID_LINE: "#555555",
  WALKABLE_TILE: "#8ed18e", // Light green for grass
  UNWALKABLE_TILE: "#a5785b", // Brown for obstacles
  PLAYER_HUMAN: "#0000CD", // Blue 
  PLAYER_MONSTER: "#8B0000", // Dark red
  NPC_GUARD: "#00AA55", // Green
  NPC_HUNTER: "#FF5500", // Orange
  NPC_SURVIVOR: "#AAF", // Light blue
  NPC_PRESERVER: "#FF00FF", // Magenta for Life Preserver Ring attackers
  NPC_MERCHANT: "#FFDD00", // Gold/Yellow for Merchants
  PATH: "#FFFFFF", // White
  OPEN_SET: "#00FF00", // Green
  CLOSED_SET: "#FF0000", // Red
  TEXT: "#FFFFFF" // White
};

interface GameProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  controls: Controls;
}

const Game = ({ canvasRef, controls }: GameProps) => {
  const { phase, start } = useGame();
  const { grid, gridSize, obstacles, initializeGrid } = useGridStore();
  const { 
    player, 
    npcs, 
    createPlayer, 
    initializeNPCs,
    updatePlayer,
    updateNPCs
  } = useEntityStore();
  const { 
    openSet, 
    closedSet, 
    currentPaths 
  } = usePathfinding();
  
  // Animation frame reference
  const animationFrameRef = useRef<number | null>(null);
  // Last timestamp for delta calculation
  const lastTimeRef = useRef<number>(0);
  // Debug mode
  const debugModeRef = useRef<boolean>(false);

  // Update debug mode when controls change
  useEffect(() => {
    debugModeRef.current = controls.debug;
  }, [controls.debug]);

  // Initialize the game on component mount
  useEffect(() => {
    console.log("Initializing game...");
    
    // Set grid size and initialize (expanded to an even larger size)
    const gridSize = { width: 120, height: 120 };
    initializeGrid(gridSize);
    
    // Generate random obstacles across the map to create an interesting environment
    const { addObstacle } = useGridStore.getState();
    
    // Create clusters of obstacles for more interesting terrain
    // Forest clusters
    for (let cluster = 0; cluster < 15; cluster++) {
      const clusterCenterX = 10 + Math.floor(Math.random() * (gridSize.width - 20));
      const clusterCenterY = 10 + Math.floor(Math.random() * (gridSize.height - 20));
      const clusterSize = 5 + Math.floor(Math.random() * 15); // 5-20 obstacles per cluster
      
      // Generate obstacles around the cluster center
      for (let i = 0; i < clusterSize; i++) {
        const offsetX = Math.floor(Math.random() * 7) - 3; // -3 to 3
        const offsetY = Math.floor(Math.random() * 7) - 3; // -3 to 3
        const obstacleX = Math.max(0, Math.min(gridSize.width - 1, clusterCenterX + offsetX));
        const obstacleY = Math.max(0, Math.min(gridSize.height - 1, clusterCenterY + offsetY));
        
        // Avoid placing obstacles at the player start position
        if (obstacleX !== 60 || obstacleY !== 60) {
          addObstacle({ x: obstacleX, y: obstacleY });
        }
      }
    }
    
    // Add some individual randomly scattered obstacles
    for (let i = 0; i < 200; i++) {
      const obstacleX = 5 + Math.floor(Math.random() * (gridSize.width - 10));
      const obstacleY = 5 + Math.floor(Math.random() * (gridSize.height - 10));
      
      // Avoid placing obstacles at the player start position
      if (obstacleX !== 60 || obstacleY !== 60) {
        // Add with a probability to create more sparse individual obstacles
        if (Math.random() < 0.7) {
          addObstacle({ x: obstacleX, y: obstacleY });
        }
      }
    }
    
    // Create player at the center of the map
    createPlayer({ 
      position: { x: 60, y: 60 }, 
      isMonster: false 
    });
    
    // Create 300 random NPCs of different AI types spread across the larger map
    const npcData: Partial<NPC>[] = [];
    
    // Define some specific group formations first
    // Guards Group 1 (North)
    for (let i = 0; i < 10; i++) {
      npcData.push({ 
        position: { 
          x: 15 + Math.floor(Math.random() * 10), 
          y: 15 + Math.floor(Math.random() * 10) 
        }, 
        type: AIType.GUARD, 
        groupId: 1 
      });
    }
    
    // Guards Group 2 (South)
    for (let i = 0; i < 10; i++) {
      npcData.push({ 
        position: { 
          x: 85 + Math.floor(Math.random() * 10), 
          y: 85 + Math.floor(Math.random() * 10) 
        }, 
        type: AIType.GUARD, 
        groupId: 2 
      });
    }
    
    // Guards Group 3 (East)
    for (let i = 0; i < 10; i++) {
      npcData.push({ 
        position: { 
          x: 85 + Math.floor(Math.random() * 10), 
          y: 15 + Math.floor(Math.random() * 10) 
        }, 
        type: AIType.GUARD, 
        groupId: 3 
      });
    }
    
    // Guards Group 4 (West)
    for (let i = 0; i < 10; i++) {
      npcData.push({ 
        position: { 
          x: 15 + Math.floor(Math.random() * 10), 
          y: 85 + Math.floor(Math.random() * 10) 
        }, 
        type: AIType.GUARD, 
        groupId: 4 
      });
    }
    
    // Add merchants at strategic locations
    const merchantLocations = [
      { x: 20, y: 20 },
      { x: 20, y: 100 },
      { x: 100, y: 20 },
      { x: 100, y: 100 },
      { x: 60, y: 20 },
      { x: 60, y: 100 },
      { x: 20, y: 60 },
      { x: 100, y: 60 },
      { x: 60, y: 60 },
      { x: 40, y: 40 },
      { x: 40, y: 80 },
      { x: 80, y: 40 },
      { x: 80, y: 80 },
    ];
    
    merchantLocations.forEach(pos => {
      npcData.push({ position: pos, type: AIType.MERCHANT });
    });
    
    // Fill the rest with random entities to reach 300 total
    const aiTypes = [AIType.HUNTER, AIType.SURVIVOR, AIType.PRESERVER];
    const remainingCount = 300 - npcData.length;
    
    for (let i = 0; i < remainingCount; i++) {
      const randomType = aiTypes[Math.floor(Math.random() * aiTypes.length)];
      const randomX = 5 + Math.floor(Math.random() * (gridSize.width - 10));
      const randomY = 5 + Math.floor(Math.random() * (gridSize.height - 10));
      
      npcData.push({
        position: { x: randomX, y: randomY },
        type: randomType
      });
    }
    
    // Initialize all NPCs
    initializeNPCs(npcData);
    
    // Start the game
    start();
    
    console.log("Game initialized successfully");
  }, [initializeGrid, createPlayer, initializeNPCs, start]);

  // Render function
  const renderGame = () => {
    if (!canvasRef.current || !grid || grid.length === 0) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Adjust canvas size to match window size
    const adjustCanvas = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };
    
    adjustCanvas();
    
    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Set background
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Calculate camera/viewport that follows the player
    const viewportWidth = ctx.canvas.width;
    const viewportHeight = ctx.canvas.height;
    const gridWidthPx = gridSize.width * TILE_SIZE;
    const gridHeightPx = gridSize.height * TILE_SIZE;
    
    // Calculate camera position centered on player
    let cameraX = 0;
    let cameraY = 0;
    
    if (player) {
      // Get player position (use pixel position if available)
      const playerPosX = player.pixelPosition ? player.pixelPosition.x : player.position.x * TILE_SIZE;
      const playerPosY = player.pixelPosition ? player.pixelPosition.y : player.position.y * TILE_SIZE;
      
      // Center camera on player
      cameraX = playerPosX - viewportWidth / 2 + TILE_SIZE / 2;
      cameraY = playerPosY - viewportHeight / 2 + TILE_SIZE / 2;
      
      // Clamp camera to grid boundaries
      cameraX = Math.max(0, Math.min(cameraX, gridWidthPx - viewportWidth));
      cameraY = Math.max(0, Math.min(cameraY, gridHeightPx - viewportHeight));
    }
    
    // Helper function to convert grid coordinates to screen coordinates
    const gridToScreen = (pos: GridPosition): [number, number] => {
      return [
        pos.x * TILE_SIZE - cameraX,
        pos.y * TILE_SIZE - cameraY
      ];
    };
    
    // Render grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.GRID_LINE;
    
    // Calculate visible tile range
    const visibleStartX = Math.floor(cameraX / TILE_SIZE);
    const visibleStartY = Math.floor(cameraY / TILE_SIZE);
    const visibleEndX = Math.min(gridSize.width - 1, Math.ceil((cameraX + viewportWidth) / TILE_SIZE));
    const visibleEndY = Math.min(gridSize.height - 1, Math.ceil((cameraY + viewportHeight) / TILE_SIZE));
    
    // Draw only visible grid cells (optimization)
    for (let y = visibleStartY; y <= visibleEndY; y++) {
      for (let x = visibleStartX; x <= visibleEndX; x++) {
        const [screenX, screenY] = gridToScreen({ x, y });
        
        // Skip tiles outside of viewport
        if (
          screenX + TILE_SIZE < 0 || 
          screenY + TILE_SIZE < 0 || 
          screenX > viewportWidth || 
          screenY > viewportHeight
        ) {
          continue;
        }
        
        // Determine if this position is walkable
        const walkable = grid[y][x];
        const isObstacle = obstacles.some(o => o.x === x && o.y === y);
        
        // Fill tile based on its type
        ctx.fillStyle = walkable ? COLORS.WALKABLE_TILE : COLORS.UNWALKABLE_TILE;
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        
        // Draw grid lines
        ctx.beginPath();
        ctx.rect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        ctx.stroke();
        
        // If debug mode is enabled, show pathfinding visualization
        if (debugModeRef.current) {
          // Check if this tile is in open or closed set
          const isInOpenSet = openSet.some(pos => pos.x === x && pos.y === y);
          const isInClosedSet = closedSet.some(pos => pos.x === x && pos.y === y);
          
          // Check if this tile is part of any current path
          const isInPath = currentPaths.some(path => 
            path.path.some(pos => pos.x === x && pos.y === y)
          );
          
          if (isInPath) {
            // Find which path it belongs to
            const pathInfo = currentPaths.find(path => 
              path.path.some(pos => pos.x === x && pos.y === y)
            );
            
            // Draw path indicator
            if (pathInfo) {
              ctx.fillStyle = pathInfo.color;
              ctx.globalAlpha = 0.7;
              ctx.beginPath();
              ctx.arc(
                screenX + TILE_SIZE / 2, 
                screenY + TILE_SIZE / 2, 
                TILE_SIZE / 4, 
                0, 
                Math.PI * 2
              );
              ctx.fill();
              ctx.globalAlpha = 1.0;
            }
          } else if (isInOpenSet) {
            // Draw open set indicator
            ctx.fillStyle = COLORS.OPEN_SET;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(screenX + 5, screenY + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            ctx.globalAlpha = 1.0;
          } else if (isInClosedSet) {
            // Draw closed set indicator
            ctx.fillStyle = COLORS.CLOSED_SET;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(screenX + 5, screenY + 5, TILE_SIZE - 10, TILE_SIZE - 10);
            ctx.globalAlpha = 1.0;
          }
        }
      }
    }
    
    // Draw paths if debug mode is on
    if (debugModeRef.current) {
      currentPaths.forEach((pathData: PathData) => {
        if (pathData.path.length < 2) return;
        
        ctx.strokeStyle = pathData.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const [startX, startY] = gridToScreen(pathData.path[0]);
        ctx.moveTo(startX + TILE_SIZE / 2, startY + TILE_SIZE / 2);
        
        for (let i = 1; i < pathData.path.length; i++) {
          const [x, y] = gridToScreen(pathData.path[i]);
          ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
        
        ctx.stroke();
        
        // Draw endpoint marker
        const endPoint = pathData.path[pathData.path.length - 1];
        const [endX, endY] = gridToScreen(endPoint);
        
        ctx.fillStyle = pathData.color;
        ctx.beginPath();
        ctx.arc(
          endX + TILE_SIZE / 2, 
          endY + TILE_SIZE / 2, 
          TILE_SIZE / 3, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
      });
    }
    
    // Draw obstacles (only those in viewport)
    if (obstacles && obstacles.length > 0) {
      // Filter obstacles to only those in the visible area
      const visibleObstacles = obstacles.filter(obstaclePos => {
        return (
          obstaclePos.x >= visibleStartX && 
          obstaclePos.x <= visibleEndX && 
          obstaclePos.y >= visibleStartY && 
          obstaclePos.y <= visibleEndY
        );
      });
      
      visibleObstacles.forEach(obstaclePos => {
        const [obstacleX, obstacleY] = gridToScreen(obstaclePos);
        
        // Skip obstacles outside of viewport
        if (
          obstacleX + TILE_SIZE < 0 || 
          obstacleY + TILE_SIZE < 0 || 
          obstacleX > viewportWidth || 
          obstacleY > viewportHeight
        ) {
          return;
        }
        
        ctx.fillStyle = COLORS.UNWALKABLE_TILE;
        ctx.fillRect(obstacleX, obstacleY, TILE_SIZE, TILE_SIZE);
        
        // Add some 3D effect to obstacles
        ctx.fillStyle = '#333333';
        ctx.fillRect(
          obstacleX, 
          obstacleY, 
          TILE_SIZE, 
          5
        );
        
        ctx.fillRect(
          obstacleX + TILE_SIZE - 5, 
          obstacleY, 
          5, 
          TILE_SIZE
        );
      });
    }
    
    // Draw player
    if (player) {
      let playerX, playerY;
      
      // Use pixel position for smooth movement if available
      if (player.pixelPosition) {
        // Convert pixel position to screen coordinates with camera offset
        playerX = player.pixelPosition.x - cameraX;
        playerY = player.pixelPosition.y - cameraY;
      } else {
        // Fallback to grid position if pixel position isn't available
        const [gridX, gridY] = gridToScreen(player.position);
        playerX = gridX;
        playerY = gridY;
      }
      
      // Draw player based on current form
      if (player.isMonster) {
        // Monster form (circle)
        ctx.fillStyle = COLORS.PLAYER_MONSTER;
        ctx.beginPath();
        ctx.arc(
          playerX + TILE_SIZE / 2, 
          playerY + TILE_SIZE / 2, 
          TILE_SIZE / 2 - 2, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
        
        // Add glow effect
        ctx.fillStyle = '#FF4500'; // Emissive color
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(
          playerX + TILE_SIZE / 2, 
          playerY + TILE_SIZE / 2, 
          TILE_SIZE / 2 + 3, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // Add a pulsing animation for monster form
        ctx.strokeStyle = "#FF6347";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 150) * 0.5;
        ctx.beginPath();
        ctx.arc(
          playerX + TILE_SIZE / 2, 
          playerY + TILE_SIZE / 2, 
          TILE_SIZE / 2 + 5, 
          0, 
          Math.PI * 2
        );
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      } else {
        // Human form (square)
        ctx.fillStyle = COLORS.PLAYER_HUMAN;
        ctx.fillRect(
          playerX + 2, 
          playerY + 2, 
          TILE_SIZE - 4, 
          TILE_SIZE - 4
        );
        
        // Add glow effect
        ctx.fillStyle = '#1E90FF'; // Emissive color
        ctx.globalAlpha = 0.3;
        ctx.fillRect(
          playerX - 2, 
          playerY - 2, 
          TILE_SIZE + 4, 
          TILE_SIZE + 4
        );
        ctx.globalAlpha = 1.0;
      }
      
      // Draw a trail effect behind the player for more fluid motion
      const keys = Object.entries(controls).filter(([key, value]) => value && ["up", "down", "left", "right"].includes(key));
      if (keys.length > 0) {
        ctx.fillStyle = player.isMonster ? COLORS.PLAYER_MONSTER : COLORS.PLAYER_HUMAN;
        ctx.globalAlpha = 0.3;
        const trailLength = 3;
        
        for (let i = 1; i <= trailLength; i++) {
          let trailX = playerX;
          let trailY = playerY;
          
          // Position the trail based on movement direction
          if (controls.up) trailY += i * 5;
          if (controls.down) trailY -= i * 5;
          if (controls.left) trailX += i * 5;
          if (controls.right) trailX -= i * 5;
          
          // Draw trail segment
          if (player.isMonster) {
            ctx.beginPath();
            ctx.arc(
              trailX + TILE_SIZE / 2, 
              trailY + TILE_SIZE / 2, 
              (TILE_SIZE / 2 - 2) * (1 - i / (trailLength + 1)), 
              0, 
              Math.PI * 2
            );
            ctx.fill();
          } else {
            const size = TILE_SIZE * (1 - i / (trailLength + 1));
            ctx.fillRect(
              trailX + (TILE_SIZE - size) / 2, 
              trailY + (TILE_SIZE - size) / 2, 
              size, 
              size
            );
          }
        }
        ctx.globalAlpha = 1.0;
      }
    }
    
    // Draw NPCs (only those within or near the viewport)
    const visibleNPCs = npcs.filter(npc => {
      // Get NPC position (grid or pixel)
      const npcX = npc.pixelPosition ? npc.pixelPosition.x / TILE_SIZE : npc.position.x;
      const npcY = npc.pixelPosition ? npc.pixelPosition.y / TILE_SIZE : npc.position.y;
      
      // Add a buffer zone around viewport for smoother experience
      const buffer = 3;
      return (
        npcX >= visibleStartX - buffer && 
        npcX <= visibleEndX + buffer && 
        npcY >= visibleStartY - buffer && 
        npcY <= visibleEndY + buffer
      );
    });
    
    visibleNPCs.forEach(npc => {
      // Use pixel position for smooth movement instead of grid position
      let screenX, screenY;
      
      if (npc.pixelPosition) {
        // Convert pixel position to screen coordinates with camera offset
        screenX = npc.pixelPosition.x - cameraX;
        screenY = npc.pixelPosition.y - cameraY;
      } else {
        // Fallback to grid position if pixel position isn't available
        const [gridX, gridY] = gridToScreen(npc.position);
        screenX = gridX;
        screenY = gridY;
      }
      
      // Skip NPCs outside of viewport
      if (
        screenX + TILE_SIZE < 0 || 
        screenY + TILE_SIZE < 0 || 
        screenX > viewportWidth || 
        screenY > viewportHeight
      ) {
        return;
      }
      
      // Determine color based on NPC type
      let color: string;
      switch (npc.type) {
        case AIType.GUARD:
          color = COLORS.NPC_GUARD;
          break;
        case AIType.HUNTER:
          color = COLORS.NPC_HUNTER;
          break;
        case AIType.SURVIVOR:
          color = COLORS.NPC_SURVIVOR;
          break;
        case AIType.PRESERVER:
          color = COLORS.NPC_PRESERVER;
          break;
        case AIType.MERCHANT:
          color = COLORS.NPC_MERCHANT;
          break;
        default:
          color = "#888888";
      }
      
      // Draw NPC body
      ctx.fillStyle = color;
      ctx.fillRect(
        screenX + 3, 
        screenY + 3, 
        TILE_SIZE - 6, 
        TILE_SIZE - 6
      );
      
      // Add an animation effect if the NPC is moving
      if (npc.isMoving) {
        // Add a subtle pulsing effect
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 200) * 0.3; // Pulsing opacity
        ctx.strokeRect(
          screenX + 1,
          screenY + 1,
          TILE_SIZE - 2,
          TILE_SIZE - 2
        );
        ctx.globalAlpha = 1.0;
      }
      
      // Add state text above NPC
      ctx.fillStyle = COLORS.TEXT;
      ctx.textAlign = "center";
      ctx.font = "10px Arial";
      ctx.fillText(
        npc.currentState,
        screenX + TILE_SIZE / 2,
        screenY - 5
      );
    });
  };

  // Get performance metrics functions
  const { 
    addPerformanceMetric, 
    updateEntityMetric,
    visualizationOptions
  } = usePerformanceStore();

  // Game loop
  const gameLoop = (timestamp: number) => {
    // Start performance measurement
    const frameStartTime = performance.now();
    
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }
    
    // Calculate delta time in seconds
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    
    if (phase === "playing") {
      // Update player
      if (player) {
        updatePlayer(controls, delta);
      }
      
      // Update NPCs
      updateNPCs(delta);
      
      // Update performance metrics for entities
      if (debugModeRef.current && visualizationOptions.showMetrics) {
        npcs.forEach(npc => {
          const playerDistance = player ? 
            Math.sqrt(
              Math.pow(player.position.x - npc.position.x, 2) + 
              Math.pow(player.position.y - npc.position.y, 2)
            ) : null;
            
          // Get the target distance
          const targetDistance = Math.sqrt(
            Math.pow(npc.targetPosition.x - npc.position.x, 2) + 
            Math.pow(npc.targetPosition.y - npc.position.y, 2)
          );
          
          // Find path data for this entity
          const entityPath = currentPaths.find(p => p.entityId === npc.id);
          const pathLength = entityPath ? entityPath.path.length : 0;
          
          // Update entity metrics
          updateEntityMetric(npc.id, {
            entityId: npc.id,
            entityType: npc.type,
            currentState: npc.currentState,
            targetDistance: targetDistance,
            playerDistance: playerDistance,
            pathLength: pathLength
          });
        });
      }
      
      // Render the game
      renderGame();
      
      // Calculate and record performance metrics
      if (debugModeRef.current && visualizationOptions.showMetrics) {
        const frameEndTime = performance.now();
        const frameTime = frameEndTime - frameStartTime;
        const fps = delta > 0 ? 1 / delta : 0;
        
        addPerformanceMetric({
          frameTime,
          fps,
          entityCount: npcs.length + 1, // NPCs + player
          pathsRecalculated: currentPaths.length,
          visibleEntities: npcs.length + 1 // Simplified; all entities are considered visible
        });
      }
    }
    
    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // Start and clean up game loop
  useEffect(() => {
    // Start the game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    // Clean up on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    player, 
    npcs, 
    grid, 
    gridSize, 
    obstacles, 
    openSet, 
    closedSet, 
    currentPaths, 
    controls,
    updatePlayer,
    updateNPCs,
    addPerformanceMetric,
    updateEntityMetric,
    visualizationOptions,
    phase
  ]);

  return null; // No JSX needed as we're rendering directly to canvas
};

export default Game;
