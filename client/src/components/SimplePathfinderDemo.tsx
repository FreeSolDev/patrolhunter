import React, { useEffect, useRef, useState } from 'react';
import { createPathfinder, GridPosition } from '../../../gamePathfinder/dist';
import { Grid } from '../../../gamePathfinder/dist/grid';

// A simple demo of the GamePathfinder library core functionality
const SimplePathfinderDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [grid, setGrid] = useState<Grid | null>(null);
  const [startPos, setStartPos] = useState<GridPosition>({ x: 5, y: 5 });
  const [goalPos, setGoalPos] = useState<GridPosition>({ x: 15, y: 10 });
  // Define a custom type for our local path result that includes visited nodes
  type ExtendedPathResult = {
    path: GridPosition[];
    visitedNodes: GridPosition[];
  };
  
  const [pathResult, setPathResult] = useState<ExtendedPathResult>({
    path: [],
    visitedNodes: []
  });
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [isSettingGoal, setIsSettingGoal] = useState(false);
  const [isPlacingObstacle, setIsPlacingObstacle] = useState(false);

  const TILE_SIZE = 30;
  const GRID_WIDTH = 20;
  const GRID_HEIGHT = 15;

  // Initialize grid on component mount
  useEffect(() => {
    // Create a new grid
    const newGrid = new Grid(GRID_WIDTH, GRID_HEIGHT);
    
    // Set some random obstacles
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * GRID_WIDTH);
      const y = Math.floor(Math.random() * GRID_HEIGHT);
      
      // Skip start and goal areas
      if (
        (Math.abs(x - startPos.x) < 2 && Math.abs(y - startPos.y) < 2) ||
        (Math.abs(x - goalPos.x) < 2 && Math.abs(y - goalPos.y) < 2)
      ) {
        continue;
      }
      
      newGrid.setWalkable(x, y, false);
    }
    
    setGrid(newGrid);
    
    // Find initial path
    if (newGrid) {
      findPath(newGrid, startPos, goalPos);
    }
  }, []);

  // Find path using the pathfinder
  const findPath = (grid: Grid, start: GridPosition, goal: GridPosition) => {
    if (!grid) return;
    
    // Create pathfinder with the grid
    const pathfinder = createPathfinder(grid);
    
    // Find path
    const result = pathfinder.findPath(
      start.x,
      start.y,
      goal.x,
      goal.y,
      true // smooth the path
    );
    
    // Store results - note: visitedNodes might be exposed differently in the library
    // or might require listening to events, but we'll use a simpler approach
    // for this demo by using an empty array if not available
    setPathResult({
      path: result.path,
      visitedNodes: (result as any).visitedNodes || []
    });
  };

  // Handle canvas click for setting start/goal or placing obstacles
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !grid) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    
    // Ensure valid click position
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return;
    }
    
    // Set start position
    if (isSettingStart) {
      if (grid.isWalkable(x, y)) {
        setStartPos({ x, y });
        setIsSettingStart(false);
        findPath(grid, { x, y }, goalPos);
      }
    }
    // Set goal position
    else if (isSettingGoal) {
      if (grid.isWalkable(x, y)) {
        setGoalPos({ x, y });
        setIsSettingGoal(false);
        findPath(grid, startPos, { x, y });
      }
    }
    // Place/remove obstacle
    else if (isPlacingObstacle) {
      // Don't allow obstacles at start/goal
      if (
        (x === startPos.x && y === startPos.y) ||
        (x === goalPos.x && y === goalPos.y)
      ) {
        return;
      }
      
      // Toggle walkable state
      const newWalkable = !grid.isWalkable(x, y);
      grid.setWalkable(x, y, newWalkable);
      
      // Update grid and recalculate path
      setGrid(new Grid(GRID_WIDTH, GRID_HEIGHT, grid.getData()));
      findPath(grid, startPos, goalPos);
    }
  };

  // Render the grid, path and controls
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Background color based on cell type
        if (!grid.isWalkable(x, y)) {
          // Obstacle
          ctx.fillStyle = '#333';
        } else {
          // Normal cell
          ctx.fillStyle = '#eee';
        }
        
        // Draw cell
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        // Grid lines
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
    
    // Draw visited nodes
    pathResult.visitedNodes.forEach(node => {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.fillRect(
        node.x * TILE_SIZE,
        node.y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
    });
    
    // Draw path
    if (pathResult.path.length > 0) {
      ctx.strokeStyle = '#00f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      ctx.moveTo(
        pathResult.path[0].x * TILE_SIZE + TILE_SIZE / 2,
        pathResult.path[0].y * TILE_SIZE + TILE_SIZE / 2
      );
      
      for (let i = 1; i < pathResult.path.length; i++) {
        ctx.lineTo(
          pathResult.path[i].x * TILE_SIZE + TILE_SIZE / 2,
          pathResult.path[i].y * TILE_SIZE + TILE_SIZE / 2
        );
      }
      
      ctx.stroke();
    }
    
    // Draw start position
    ctx.fillStyle = '#0a0';
    ctx.beginPath();
    ctx.arc(
      startPos.x * TILE_SIZE + TILE_SIZE / 2,
      startPos.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE / 2 - 5,
      0,
      Math.PI * 2
    );
    ctx.fill();
    
    // Draw goal position
    ctx.fillStyle = '#f00';
    ctx.beginPath();
    ctx.arc(
      goalPos.x * TILE_SIZE + TILE_SIZE / 2,
      goalPos.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE / 2 - 5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  };

  // Render the component
  useEffect(() => {
    renderCanvas();
  }, [grid, pathResult, startPos, goalPos]);

  return (
    <div className="relative">
      <h2 className="text-xl font-bold mb-4">GamePathfinder Core Demo</h2>
      
      <canvas
        ref={canvasRef}
        width={GRID_WIDTH * TILE_SIZE}
        height={GRID_HEIGHT * TILE_SIZE}
        onClick={handleCanvasClick}
        className="border border-gray-400 mb-4"
      />
      
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${isSettingStart ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setIsSettingStart(true);
            setIsSettingGoal(false);
            setIsPlacingObstacle(false);
          }}
        >
          Set Start
        </button>
        
        <button
          className={`px-4 py-2 rounded ${isSettingGoal ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setIsSettingStart(false);
            setIsSettingGoal(true);
            setIsPlacingObstacle(false);
          }}
        >
          Set Goal
        </button>
        
        <button
          className={`px-4 py-2 rounded ${isPlacingObstacle ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => {
            setIsSettingStart(false);
            setIsSettingGoal(false);
            setIsPlacingObstacle(!isPlacingObstacle);
          }}
        >
          Toggle Obstacles
        </button>
        
        <button
          className="px-4 py-2 rounded bg-gray-200"
          onClick={() => {
            if (grid) {
              // Reset the grid
              const newGrid = new Grid(GRID_WIDTH, GRID_HEIGHT);
              setGrid(newGrid);
              findPath(newGrid, startPos, goalPos);
            }
          }}
        >
          Clear Obstacles
        </button>
      </div>
      
      <div className="p-4 bg-gray-100 rounded-md">
        <h3 className="font-bold mb-2">Instructions:</h3>
        <p className="mb-2">• Click "Set Start" then click on the grid to set the starting point</p>
        <p className="mb-2">• Click "Set Goal" then click on the grid to set the goal point</p>
        <p className="mb-2">• Click "Toggle Obstacles" then click on the grid to add/remove walls</p>
        <p className="mb-2">• Green circle: Start position, Red circle: Goal position</p>
        <p className="mb-2">• Yellow: Explored nodes, Blue line: Optimal path</p>
        <p className="mt-4 text-sm text-gray-600 italic">
          This demo showcases the core A* pathfinding algorithm with path smoothing.
        </p>
      </div>
    </div>
  );
};

export default SimplePathfinderDemo;