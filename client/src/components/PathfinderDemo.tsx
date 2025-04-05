import React, { useEffect, useRef, useState } from 'react';
import { useGridStore } from '../lib/stores/useGridStore';
import { useEntityStore } from '../lib/stores/useEntityStore';
import { usePathfinding } from '../lib/stores/usePathfinding';
import { AIType } from '../lib/ai/AITypes';
import { GridPosition } from '../lib/types';

// This component would demonstrate how to use the GamePathfinder library 
// in a React application with Zustand state management

const PathfinderDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const gridStore = useGridStore();
  const entityStore = useEntityStore();
  const pathfindingStore = usePathfinding();
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const TILE_SIZE = 30;

  // Initialize the game
  useEffect(() => {
    // Only initialize once
    if (isInitialized) return;
    
    // Initialize the grid
    gridStore.initializeGrid({ width: 20, height: 15 });
    
    // Initialize player
    entityStore.createPlayer({
      position: { x: 10, y: 7 },
      isMonster: false
    });
    
    // Initialize NPCs - one of each type
    entityStore.initializeNPCs([
      { position: { x: 2, y: 2 }, type: AIType.GUARD, groupId: 1 },
      { position: { x: 17, y: 12 }, type: AIType.HUNTER },
      { position: { x: 5, y: 12 }, type: AIType.SURVIVOR },
      { position: { x: 15, y: 3 }, type: AIType.PRESERVER },
      { position: { x: 7, y: 7 }, type: AIType.MERCHANT }
    ]);
    
    // Mark initialization complete
    setIsInitialized(true);
    
    // Start the game loop
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    // Cleanup function
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isInitialized, gridStore, entityStore]);

  // Game loop function
  const gameLoop = (currentTime: number) => {
    const deltaTime = (currentTime - lastTimeRef.current) / 1000;
    lastTimeRef.current = currentTime;
    
    // Update entities
    entityStore.updateNPCs(deltaTime);
    
    // Render
    renderGame();
    
    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // Render function
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { grid, obstacles } = gridStore;
    const { player, npcs } = entityStore;
    const { currentPaths } = pathfindingStore;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    if (grid.length > 0) {
      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          if (!grid[y][x]) {
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
    }
    
    // Draw paths
    currentPaths.forEach(pathData => {
      ctx.strokeStyle = '#00f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      if (pathData.path.length > 0) {
        ctx.moveTo(
          pathData.path[0].x * TILE_SIZE + TILE_SIZE / 2,
          pathData.path[0].y * TILE_SIZE + TILE_SIZE / 2
        );
        
        for (let i = 1; i < pathData.path.length; i++) {
          ctx.lineTo(
            pathData.path[i].x * TILE_SIZE + TILE_SIZE / 2,
            pathData.path[i].y * TILE_SIZE + TILE_SIZE / 2
          );
        }
        ctx.stroke();
      }
    });
    
    // Draw player
    if (player) {
      ctx.fillStyle = player.isMonster ? '#f00' : '#00f';
      ctx.beginPath();
      ctx.arc(
        player.pixelPosition.x + TILE_SIZE / 2,
        player.pixelPosition.y + TILE_SIZE / 2,
        TILE_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    // Draw NPCs
    npcs.forEach(npc => {
      // Different colors for different AI types
      switch(npc.type) {
        case AIType.GUARD:
          ctx.fillStyle = '#f00'; // Red
          break;
        case AIType.HUNTER:
          ctx.fillStyle = '#0f0'; // Green
          break;
        case AIType.SURVIVOR:
          ctx.fillStyle = '#ff0'; // Yellow
          break;
        case AIType.PRESERVER:
          ctx.fillStyle = '#f0f'; // Purple
          break;
        case AIType.MERCHANT:
          ctx.fillStyle = '#0ff'; // Cyan
          break;
        default:
          ctx.fillStyle = '#888'; // Gray fallback
      }
      
      ctx.beginPath();
      ctx.arc(
        npc.pixelPosition.x + TILE_SIZE / 2,
        npc.pixelPosition.y + TILE_SIZE / 2,
        TILE_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw state text above the NPC
      ctx.fillStyle = '#000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        npc.currentState,
        npc.pixelPosition.x + TILE_SIZE / 2,
        npc.pixelPosition.y - 5
      );
    });
  };

  // Handle canvas click to set an NPC's target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    
    // Check if the position is valid and walkable
    const { grid } = gridStore;
    if (x < 0 || x >= grid[0].length || y < 0 || y >= grid.length || !grid[y][x]) {
      console.log('Invalid target position');
      return;
    }
    
    // Find the nearest NPC to set target
    const { npcs } = entityStore;
    if (npcs.length === 0) return;
    
    // Find the closest NPC
    let closestNpc = npcs[0];
    let minDistance = Infinity;
    
    for (const npc of npcs) {
      const distance = Math.sqrt(
        Math.pow(npc.position.x - x, 2) + Math.pow(npc.position.y - y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestNpc = npc;
      }
    }
    
    // Set the target for the closest NPC
    const targetPosition: GridPosition = { x, y };
    entityStore.updateNPCTarget(closestNpc.id, targetPosition);
    
    console.log(`Set target for ${closestNpc.type} to (${x}, ${y})`);
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={600}
        height={450}
        onClick={handleCanvasClick}
        className="border border-gray-400"
      />
      <div className="mt-4 text-sm text-gray-700">
        <p>Click on the grid to set a target for the nearest NPC.</p>
        <p>Red = Guard, Green = Hunter, Yellow = Survivor, Purple = Preserver, Cyan = Merchant</p>
        <p>Each NPC type has different behavior patterns when responding to player presence.</p>
      </div>
    </div>
  );
};

export default PathfinderDemo;