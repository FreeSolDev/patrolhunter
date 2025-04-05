import { GridPosition, IGrid, PathfinderEvent, PathfinderEventListener } from './types';
import { AStar } from './astar';

/**
 * Options for the debug visualizer
 */
export interface DebugVisualizerOptions {
  /**
   * Width of the grid cell in pixels
   * @default 20
   */
  cellSize?: number;
  
  /**
   * Colors used for visualization
   */
  colors?: {
    /**
     * Color for walkable cells
     * @default '#ffffff'
     */
    walkable?: string;
    
    /**
     * Color for obstacles
     * @default '#333333'
     */
    obstacle?: string;
    
    /**
     * Color for the start position
     * @default '#00ff00'
     */
    start?: string;
    
    /**
     * Color for the goal position
     * @default '#ff0000'
     */
    goal?: string;
    
    /**
     * Color for the path
     * @default '#0000ff'
     */
    path?: string;
    
    /**
     * Color for visited nodes
     * @default 'rgba(255, 255, 0, 0.3)'
     */
    visited?: string;
    
    /**
     * Color for grid lines
     * @default '#cccccc'
     */
    grid?: string;
  };
  
  /**
   * Whether to show grid lines
   * @default true
   */
  showGrid?: boolean;
  
  /**
   * Whether to show visited nodes
   * @default true
   */
  showVisited?: boolean;
  
  /**
   * Delay between visualization updates in milliseconds
   * @default 50
   */
  delay?: number;
}

/**
 * Interface for the debug visualizer
 */
export interface DebugVisualizer {
  /**
   * Attach the visualizer to a DOM element
   * @param element The DOM element to attach to
   */
  attach(element: HTMLElement): void;
  
  /**
   * Detach the visualizer from the DOM
   */
  detach(): void;
  
  /**
   * Update the grid display
   */
  updateGrid(): void;
  
  /**
   * Visualize a pathfinding operation
   * @param start The start position
   * @param goal The goal position
   */
  visualizePath(start: GridPosition, goal: GridPosition): Promise<void>;
  
  /**
   * Set a new grid for the visualizer
   * @param grid The new grid
   */
  setGrid(grid: IGrid): void;
  
  /**
   * Set new options for the visualizer
   * @param options The new options
   */
  setOptions(options: DebugVisualizerOptions): void;
}

/**
 * Create a debug visualizer for the pathfinder
 * @param pathfinder The pathfinder to visualize
 * @param grid The grid to visualize
 * @param options Visualization options
 * @returns A debug visualizer
 */
export function createDebugVisualizer(
  pathfinder: AStar,
  grid: IGrid,
  options?: DebugVisualizerOptions
): DebugVisualizer {
  // Default options
  const defaultOptions: Required<DebugVisualizerOptions> = {
    cellSize: 20,
    colors: {
      walkable: '#ffffff',
      obstacle: '#333333',
      start: '#00ff00',
      goal: '#ff0000',
      path: '#0000ff',
      visited: 'rgba(255, 255, 0, 0.3)',
      grid: '#cccccc'
    },
    showGrid: true,
    showVisited: true,
    delay: 50
  };
  
  // Merge options
  const opts: Required<DebugVisualizerOptions> = {
    ...defaultOptions,
    ...options,
    colors: {
      ...defaultOptions.colors,
      ...(options?.colors || {})
    }
  };
  
  // Canvas and context
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let container: HTMLElement | null = null;
  
  // Pathfinding state
  let start: GridPosition | null = null;
  let goal: GridPosition | null = null;
  let path: GridPosition[] = [];
  let visitedNodes: GridPosition[] = [];
  let pathfindingInProgress = false;
  
  // Create canvas
  const createCanvas = (width: number, height: number): HTMLCanvasElement => {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = width;
    newCanvas.height = height;
    return newCanvas;
  };
  
  // Draw grid
  const drawGrid = () => {
    if (!ctx || !canvas) return;
    
    const width = grid.getWidth();
    const height = grid.getHeight();
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cells
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isWalkable = grid.isWalkable(x, y);
        ctx.fillStyle = isWalkable ? (opts.colors.walkable || '#ffffff') : (opts.colors.obstacle || '#333333');
        ctx.fillRect(
          x * opts.cellSize,
          y * opts.cellSize,
          opts.cellSize,
          opts.cellSize
        );
      }
    }
    
    // Draw grid lines
    if (opts.showGrid) {
      ctx.strokeStyle = opts.colors.grid || '#cccccc';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * opts.cellSize, 0);
        ctx.lineTo(x * opts.cellSize, height * opts.cellSize);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * opts.cellSize);
        ctx.lineTo(width * opts.cellSize, y * opts.cellSize);
        ctx.stroke();
      }
    }
  };
  
  // Draw pathfinding state
  const drawPathfinding = () => {
    if (!ctx) return;
    
    // Draw visited nodes
    if (opts.showVisited) {
      for (const node of visitedNodes) {
        ctx.fillStyle = opts.colors.visited || 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(
          node.x * opts.cellSize,
          node.y * opts.cellSize,
          opts.cellSize,
          opts.cellSize
        );
      }
    }
    
    // Draw path
    if (path.length > 0) {
      ctx.strokeStyle = opts.colors.path;
      ctx.lineWidth = opts.cellSize / 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(
        path[0].x * opts.cellSize + opts.cellSize / 2,
        path[0].y * opts.cellSize + opts.cellSize / 2
      );
      
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(
          path[i].x * opts.cellSize + opts.cellSize / 2,
          path[i].y * opts.cellSize + opts.cellSize / 2
        );
      }
      
      ctx.stroke();
    }
    
    // Draw start and goal
    if (start) {
      ctx.fillStyle = opts.colors.start;
      ctx.beginPath();
      ctx.arc(
        start.x * opts.cellSize + opts.cellSize / 2,
        start.y * opts.cellSize + opts.cellSize / 2,
        opts.cellSize / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    
    if (goal) {
      ctx.fillStyle = opts.colors.goal;
      ctx.beginPath();
      ctx.arc(
        goal.x * opts.cellSize + opts.cellSize / 2,
        goal.y * opts.cellSize + opts.cellSize / 2,
        opts.cellSize / 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  };
  
  // Redraw everything
  const redraw = () => {
    drawGrid();
    drawPathfinding();
  };
  
  // Event handler
  const handleEvent: PathfinderEventListener = (event: PathfinderEvent) => {
    switch (event.type) {
      case 'pathStart':
        start = event.start;
        goal = event.goal;
        path = [];
        visitedNodes = [];
        redraw();
        break;
        
      case 'nodeVisited':
        visitedNodes.push(event.node);
        redraw();
        break;
        
      case 'pathFound':
        path = event.path;
        redraw();
        break;
        
      case 'pathNotFound':
        path = [];
        redraw();
        break;
    }
  };
  
  // Helper to pause execution
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  return {
    attach(element: HTMLElement) {
      container = element;
      
      // Create canvas
      canvas = createCanvas(
        grid.getWidth() * opts.cellSize,
        grid.getHeight() * opts.cellSize
      );
      ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Add canvas to container
      container.appendChild(canvas);
      
      // Initial draw
      redraw();
      
      // Add event listener
      pathfinder.addEventListener(handleEvent);
    },
    
    detach() {
      if (canvas && container) {
        container.removeChild(canvas);
        canvas = null;
        ctx = null;
        container = null;
      }
      
      pathfinder.removeEventListener(handleEvent);
    },
    
    updateGrid() {
      if (canvas) {
        canvas.width = grid.getWidth() * opts.cellSize;
        canvas.height = grid.getHeight() * opts.cellSize;
      }
      
      redraw();
    },
    
    async visualizePath(startPos: GridPosition, goalPos: GridPosition) {
      if (pathfindingInProgress) {
        return;
      }
      
      pathfindingInProgress = true;
      
      // Clear previous data
      start = startPos;
      goal = goalPos;
      path = [];
      visitedNodes = [];
      
      redraw();
      
      // Start pathfinding
      const result = pathfinder.findPath(startPos, goalPos);
      
      // Wait a bit to show the final result
      await sleep(opts.delay * 2);
      
      pathfindingInProgress = false;
    },
    
    setGrid(newGrid: IGrid) {
      grid = newGrid;
      this.updateGrid();
    },
    
    setOptions(newOptions: DebugVisualizerOptions) {
      Object.assign(opts, newOptions);
      Object.assign(opts.colors, newOptions.colors || {});
      this.updateGrid();
    }
  };
}