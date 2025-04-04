import { AStar, Grid, PathSmoother, createPathManager } from '../src';

// This example demonstrates how to benchmark pathfinding performance
// with different configurations and grid sizes

// Configuration options for benchmarks
interface BenchmarkConfig {
  gridWidth: number;
  gridHeight: number;
  obstaclePercentage: number;
  numPaths: number;
  allowDiagonals: boolean;
  cutCorners: boolean;
  heuristic: 'manhattan' | 'euclidean' | 'chebyshev';
  caching: boolean;
}

// Benchmark results
interface BenchmarkResult {
  config: BenchmarkConfig;
  averageTime: number;
  totalTime: number;
  successPaths: number;
  failedPaths: number;
  totalNodes: number;
  averagePathLength: number;
}

// Create a random grid with obstacles
function createRandomGrid(width: number, height: number, obstaclePercentage: number): Grid {
  const grid = new Grid(width, height);
  
  // Add random obstacles
  const totalCells = width * height;
  const obstacleCells = Math.floor(totalCells * (obstaclePercentage / 100));
  
  let placedObstacles = 0;
  while (placedObstacles < obstacleCells) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    
    if (grid.isWalkable(x, y)) {
      grid.setWalkable(x, y, false);
      placedObstacles++;
    }
  }
  
  return grid;
}

// Run a benchmark with the given configuration
async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
  const {
    gridWidth,
    gridHeight,
    obstaclePercentage,
    numPaths,
    allowDiagonals,
    cutCorners,
    heuristic,
    caching
  } = config;
  
  // Create a grid
  const grid = createRandomGrid(gridWidth, gridHeight, obstaclePercentage);
  
  // Create pathfinder
  const pathfinder = new AStar(grid, {
    allowDiagonals,
    cutCorners,
    heuristic
  });
  
  const smoother = new PathSmoother(grid);
  
  // Create path manager if caching is enabled
  const pathManager = caching
    ? createPathManager(pathfinder, grid, smoother, {
        enableCache: true,
        maxCacheSize: numPaths,
        cacheExpiryTime: 10000
      })
    : null;
  
  // Generate random start and goal positions
  const testPaths: Array<{
    start: { x: number, y: number },
    goal: { x: number, y: number }
  }> = [];
  
  for (let i = 0; i < numPaths; i++) {
    // Keep trying until we find valid start and goal positions
    let attempts = 0;
    let validPair = false;
    
    let start = { x: 0, y: 0 };
    let goal = { x: 0, y: 0 };
    
    while (!validPair && attempts < 100) {
      start = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight)
      };
      
      goal = {
        x: Math.floor(Math.random() * gridWidth),
        y: Math.floor(Math.random() * gridHeight)
      };
      
      // Check if both positions are walkable and different
      if (
        grid.isWalkable(start.x, start.y) &&
        grid.isWalkable(goal.x, goal.y) &&
        (start.x !== goal.x || start.y !== goal.y)
      ) {
        validPair = true;
      }
      
      attempts++;
    }
    
    if (validPair) {
      testPaths.push({ start, goal });
    }
  }
  
  // Run the benchmark
  const results = {
    config,
    averageTime: 0,
    totalTime: 0,
    successPaths: 0,
    failedPaths: 0,
    totalNodes: 0,
    averagePathLength: 0
  };
  
  for (const { start, goal } of testPaths) {
    const startTime = performance.now();
    
    let pathResult;
    
    if (pathManager) {
      // Use path manager with caching
      pathResult = await pathManager.findPath(start, goal);
    } else {
      // Use pathfinder directly
      pathResult = pathfinder.findPath(start, goal);
    }
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    // Update results
    results.totalTime += executionTime;
    
    if (pathResult.found) {
      results.successPaths++;
      results.totalNodes += pathResult.explored;
      results.averagePathLength += pathResult.path.length;
    } else {
      results.failedPaths++;
    }
  }
  
  // Calculate averages
  if (results.successPaths > 0) {
    results.averagePathLength = results.averagePathLength / results.successPaths;
  }
  
  results.averageTime = results.totalTime / testPaths.length;
  
  return results;
}

// Run multiple benchmarks with different configurations
async function runMultipleBenchmarks() {
  const configurations: BenchmarkConfig[] = [
    // Small grid, no caching, different heuristics
    {
      gridWidth: 20,
      gridHeight: 20,
      obstaclePercentage: 20,
      numPaths: 100,
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan',
      caching: false
    },
    {
      gridWidth: 20,
      gridHeight: 20,
      obstaclePercentage: 20,
      numPaths: 100,
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'euclidean',
      caching: false
    },
    {
      gridWidth: 20,
      gridHeight: 20,
      obstaclePercentage: 20,
      numPaths: 100,
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'chebyshev',
      caching: false
    },
    
    // Medium grid, with and without caching
    {
      gridWidth: 50,
      gridHeight: 50,
      obstaclePercentage: 30,
      numPaths: 100,
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan',
      caching: false
    },
    {
      gridWidth: 50,
      gridHeight: 50,
      obstaclePercentage: 30,
      numPaths: 100,
      allowDiagonals: true,
      cutCorners: false,
      heuristic: 'manhattan',
      caching: true
    },
    
    // Different diagonal settings
    {
      gridWidth: 50,
      gridHeight: 50,
      obstaclePercentage: 30,
      numPaths: 100,
      allowDiagonals: false,
      cutCorners: false,
      heuristic: 'manhattan',
      caching: false
    },
    {
      gridWidth: 50,
      gridHeight: 50,
      obstaclePercentage: 30,
      numPaths: 100,
      allowDiagonals: true,
      cutCorners: true,
      heuristic: 'manhattan',
      caching: false
    }
  ];
  
  // Run all benchmarks
  console.log('Running benchmarks...');
  const results: BenchmarkResult[] = [];
  
  for (const config of configurations) {
    console.log(`\nRunning benchmark: ${gridConfigToString(config)}...`);
    const result = await runBenchmark(config);
    results.push(result);
    
    // Print individual result
    console.log(`  Success/Failed: ${result.successPaths}/${result.failedPaths}`);
    console.log(`  Average time: ${result.averageTime.toFixed(2)} ms`);
    console.log(`  Average path length: ${result.averagePathLength.toFixed(2)}`);
  }
  
  // Print summary
  console.log('\n==== BENCHMARK SUMMARY ====');
  console.log('Grid Size | Obstacles | Heuristic | Diagonals | Caching | Avg Time (ms) | Success Rate');
  console.log('---------|-----------|-----------|-----------|---------|---------------|-------------');
  
  for (const result of results) {
    const { config } = result;
    console.log(
      `${config.gridWidth}x${config.gridHeight} | ` +
      `${config.obstaclePercentage}% | ` +
      `${config.heuristic} | ` +
      `${config.allowDiagonals ? (config.cutCorners ? 'With cut' : 'No cut') : 'No'} | ` +
      `${config.caching ? 'Yes' : 'No'} | ` +
      `${result.averageTime.toFixed(2)} | ` +
      `${((result.successPaths / config.numPaths) * 100).toFixed(1)}%`
    );
  }
}

// Helper to generate a string description of a benchmark configuration
function gridConfigToString(config: BenchmarkConfig): string {
  return (
    `${config.gridWidth}x${config.gridHeight} grid, ` +
    `${config.obstaclePercentage}% obstacles, ` +
    `${config.heuristic} heuristic, ` +
    `diagonals: ${config.allowDiagonals}, ` +
    `caching: ${config.caching}`
  );
}

// Run the benchmarks
runMultipleBenchmarks();