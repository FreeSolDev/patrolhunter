import { AStar } from './astar';
import { GridPosition, IGrid, PathResult, PathfinderOptions } from './types';
import { PathSmoother } from './pathSmoother';

/**
 * Path cache key
 */
type PathCacheKey = `${number},${number}-${number},${number}`;

/**
 * Options for the path manager
 */
export interface PathManagerOptions {
  /**
   * Whether to cache paths
   * @default true
   */
  enableCache?: boolean;
  
  /**
   * Maximum number of paths to cache
   * @default 100
   */
  maxCacheSize?: number;
  
  /**
   * Maximum age of cached paths in milliseconds
   * @default 5000 (5 seconds)
   */
  cacheExpiryTime?: number;
  
  /**
   * Whether to smooth paths automatically
   * @default false
   */
  autoSmoothPaths?: boolean;
}

/**
 * Cache entry interface
 */
interface CacheEntry {
  result: PathResult;
  timestamp: number;
}

/**
 * Path statistics
 */
export interface PathStatistics {
  pathsRequested: number;
  pathsCalculated: number;
  cacheHits: number;
  cacheMisses: number;
  failedPaths: number;
  avgCalculationTime: number;
  recentCalculations: Array<{
    from: GridPosition;
    to: GridPosition;
    success: boolean;
    time: number;
  }>;
}

/**
 * Create a path manager for handling multiple pathfinding requests
 * with caching, statistics, and batch processing
 */
export function createPathManager(
  pathfinder: AStar,
  grid: IGrid,
  smoother: PathSmoother,
  options?: PathManagerOptions
) {
  // Default options
  const defaultOptions: Required<PathManagerOptions> = {
    enableCache: true,
    maxCacheSize: 100,
    cacheExpiryTime: 5000,
    autoSmoothPaths: false
  };
  
  // Merge options
  const opts: Required<PathManagerOptions> = {
    ...defaultOptions,
    ...options
  };
  
  // Path cache
  const pathCache = new Map<PathCacheKey, CacheEntry>();
  
  // Statistics
  const stats: PathStatistics = {
    pathsRequested: 0,
    pathsCalculated: 0,
    cacheHits: 0,
    cacheMisses: 0,
    failedPaths: 0,
    avgCalculationTime: 0,
    recentCalculations: []
  };
  
  // Queue for batch processing
  const pathQueue: Array<{
    start: GridPosition;
    goal: GridPosition;
    resolve: (result: PathResult) => void;
  }> = [];
  
  /**
   * Generate a cache key for a path
   * @param start The start position
   * @param goal The goal position
   * @returns The cache key
   */
  function getCacheKey(start: GridPosition, goal: GridPosition): PathCacheKey {
    return `${start.x},${start.y}-${goal.x},${goal.y}`;
  }
  
  /**
   * Clear expired cache entries
   */
  function clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of pathCache.entries()) {
      if (now - entry.timestamp > opts.cacheExpiryTime) {
        pathCache.delete(key);
      }
    }
  }
  
  /**
   * Get a cached path if available
   * @param start The start position
   * @param goal The goal position
   * @returns The cached path result or null if not found
   */
  function getCachedPath(start: GridPosition, goal: GridPosition): PathResult | null {
    if (!opts.enableCache) {
      return null;
    }
    
    const key = getCacheKey(start, goal);
    const entry = pathCache.get(key);
    
    if (entry && Date.now() - entry.timestamp <= opts.cacheExpiryTime) {
      return entry.result;
    }
    
    return null;
  }
  
  /**
   * Cache a path result
   * @param start The start position
   * @param goal The goal position
   * @param result The path result
   */
  function cachePath(start: GridPosition, goal: GridPosition, result: PathResult): void {
    if (!opts.enableCache) {
      return;
    }
    
    // Clear expired entries first
    clearExpiredCache();
    
    // If cache is full, remove oldest entry
    if (pathCache.size >= opts.maxCacheSize) {
      let oldestKey: PathCacheKey | null = null;
      let oldestTime = Infinity;
      
      for (const [key, entry] of pathCache.entries()) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        pathCache.delete(oldestKey);
      }
    }
    
    // Add to cache
    const key = getCacheKey(start, goal);
    pathCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * Update statistics with a new calculation
   * @param from The start position
   * @param to The goal position
   * @param success Whether the path was found
   * @param time The calculation time
   */
  function updateStats(
    from: GridPosition,
    to: GridPosition,
    success: boolean,
    time: number
  ): void {
    stats.pathsRequested++;
    
    if (success) {
      // Update average calculation time
      stats.avgCalculationTime = 
        (stats.avgCalculationTime * stats.pathsCalculated + time) / 
        (stats.pathsCalculated + 1);
      
      stats.pathsCalculated++;
    } else {
      stats.failedPaths++;
    }
    
    // Add to recent calculations
    stats.recentCalculations.unshift({
      from,
      to,
      success,
      time
    });
    
    // Keep only the 10 most recent calculations
    if (stats.recentCalculations.length > 10) {
      stats.recentCalculations.pop();
    }
  }
  
  /**
   * Find a path from start to goal
   * @param start The start position
   * @param goal The goal position
   * @param smoothPath Whether to smooth the path
   * @returns A promise that resolves to the path result
   */
  async function findPath(
    start: GridPosition,
    goal: GridPosition,
    smoothPath: boolean = opts.autoSmoothPaths
  ): Promise<PathResult> {
    // Try to get from cache first
    const cachedResult = getCachedPath(start, goal);
    
    if (cachedResult) {
      stats.cacheHits++;
      return { ...cachedResult };
    }
    
    stats.cacheMisses++;
    
    // Calculate new path
    const result = pathfinder.findPath(start, goal);
    
    // Smooth path if requested and path exists
    if (smoothPath && result.found && result.path.length > 2) {
      result.path = smoother.smoothPath(result.path);
    }
    
    // Cache the result
    cachePath(start, goal, result);
    
    // Update statistics
    updateStats(start, goal, result.found, result.time);
    
    return result;
  }
  
  /**
   * Request a path to be processed in a batch
   * @param start The start position
   * @param goal The goal position
   * @returns A promise that resolves to the path result
   */
  function requestPath(
    start: GridPosition,
    goal: GridPosition
  ): Promise<PathResult> {
    return new Promise<PathResult>(resolve => {
      pathQueue.push({ start, goal, resolve });
    });
  }
  
  /**
   * Process all queued paths
   * @param smoothPaths Whether to smooth the paths
   * @returns A promise that resolves when all paths are processed
   */
  async function processBatch(
    smoothPaths: boolean = opts.autoSmoothPaths
  ): Promise<void> {
    const batch = [...pathQueue];
    pathQueue.length = 0;
    
    for (const { start, goal, resolve } of batch) {
      const result = await findPath(start, goal, smoothPaths);
      resolve(result);
    }
  }
  
  /**
   * Clear the path cache
   */
  function clearCache(): void {
    pathCache.clear();
  }
  
  /**
   * Get path statistics
   */
  function getStatistics(): PathStatistics {
    return { ...stats };
  }
  
  /**
   * Set a new grid for all components
   * @param newGrid The new grid
   */
  function setGrid(newGrid: IGrid): void {
    grid = newGrid;
    pathfinder.setGrid(newGrid);
    smoother.setGrid(newGrid);
    
    // Clear cache as grid has changed
    clearCache();
  }
  
  /**
   * Set new pathfinder options
   * @param pathfinderOptions The new pathfinder options
   */
  function setPathfinderOptions(pathfinderOptions: PathfinderOptions): void {
    pathfinder.setOptions(pathfinderOptions);
    
    // Clear cache as options have changed
    clearCache();
  }
  
  /**
   * Set new path manager options
   * @param managerOptions The new path manager options
   */
  function setOptions(managerOptions: PathManagerOptions): void {
    Object.assign(opts, managerOptions);
    
    // If cache was disabled, clear it
    if (!opts.enableCache) {
      clearCache();
    }
  }
  
  return {
    findPath,
    requestPath,
    processBatch,
    clearCache,
    getStatistics,
    setGrid,
    setPathfinderOptions,
    setOptions
  };
}