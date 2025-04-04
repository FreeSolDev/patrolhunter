import { useEffect, useRef, RefObject } from "react";
import { useGridStore } from "../lib/stores/useGridStore";
import { useEntityStore } from "../lib/stores/useEntityStore";
import { usePathfinding } from "../lib/stores/usePathfinding";
import { AIType } from "../lib/ai/AITypes";
import { useGame } from "../lib/stores/useGame";
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
    
    // Set grid size and initialize
    const gridSize = { width: 20, height: 20 };
    initializeGrid(gridSize);
    
    // Create player at position [10, 10]
    createPlayer({ 
      position: { x: 10, y: 10 }, 
      isMonster: false 
    });
    
    // Create various NPCs with different AI types and positions
    initializeNPCs([
      // Create some guards (Type 1)
      { position: { x: 2, y: 2 }, type: AIType.GUARD, groupId: 1 },
      { position: { x: 3, y: 2 }, type: AIType.GUARD, groupId: 1 },
      { position: { x: 2, y: 3 }, type: AIType.GUARD, groupId: 1 },
      
      // Create some hunters (Type 2)
      { position: { x: 17, y: 17 }, type: AIType.HUNTER },
      { position: { x: 17, y: 2 }, type: AIType.HUNTER },
      
      // Create some survivors (Type 3)
      { position: { x: 5, y: 15 }, type: AIType.SURVIVOR },
      { position: { x: 15, y: 5 }, type: AIType.SURVIVOR },
      { position: { x: 10, y: 15 }, type: AIType.SURVIVOR },
      
      // Create some life preserver ring attackers (Type 4)
      { position: { x: 18, y: 10 }, type: AIType.PRESERVER },
      { position: { x: 7, y: 18 }, type: AIType.PRESERVER },
      
      // Create merchants (Type 5) at various locations
      { position: { x: 5, y: 5 }, type: AIType.MERCHANT },
      { position: { x: 15, y: 15 }, type: AIType.MERCHANT },
    ]);
    
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
    
    // Calculate camera/viewport for centering
    const viewportWidth = ctx.canvas.width;
    const viewportHeight = ctx.canvas.height;
    const gridWidthPx = gridSize.width * TILE_SIZE;
    const gridHeightPx = gridSize.height * TILE_SIZE;
    
    // Center the grid in the viewport
    const offsetX = Math.max(0, (viewportWidth - gridWidthPx) / 2);
    const offsetY = Math.max(0, (viewportHeight - gridHeightPx) / 2);
    
    // Helper function to convert grid coordinates to screen coordinates
    const gridToScreen = (pos: GridPosition): [number, number] => {
      return [
        offsetX + pos.x * TILE_SIZE,
        offsetY + pos.y * TILE_SIZE
      ];
    };
    
    // Render grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.GRID_LINE;
    
    // Draw grid cells
    for (let y = 0; y < gridSize.height; y++) {
      for (let x = 0; x < gridSize.width; x++) {
        const [screenX, screenY] = gridToScreen({ x, y });
        
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
    
    // Draw obstacles
    if (obstacles && obstacles.length > 0) {
      obstacles.forEach(obstaclePos => {
        const [obstacleX, obstacleY] = gridToScreen(obstaclePos);
        
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
        playerX = offsetX + player.pixelPosition.x;
        playerY = offsetY + player.pixelPosition.y;
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
    
    // Draw NPCs
    npcs.forEach(npc => {
      // Use pixel position for smooth movement instead of grid position
      let screenX, screenY;
      
      if (npc.pixelPosition) {
        // Convert pixel position to screen coordinates
        screenX = offsetX + npc.pixelPosition.x;
        screenY = offsetY + npc.pixelPosition.y;
      } else {
        // Fallback to grid position if pixel position isn't available
        const [gridX, gridY] = gridToScreen(npc.position);
        screenX = gridX;
        screenY = gridY;
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

  // Game loop
  const gameLoop = (timestamp: number) => {
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
      
      // Render the game
      renderGame();
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
  }, [player, npcs, grid, gridSize, obstacles, openSet, closedSet, currentPaths, controls]);

  return null; // No JSX needed as we're rendering directly to canvas
};

export default Game;
