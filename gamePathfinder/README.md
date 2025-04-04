# Game Pathfinder

A robust and efficient pathfinding library for 2D grid-based games, with support for A* algorithm, path smoothing, and debugging tools.

## Features

- Fast and reliable A* pathfinding algorithm
- Support for different heuristics (Manhattan, Euclidean, Chebyshev)
- Path smoothing and optimization
- Funnel algorithm for path refinement
- Debug visualizer for development
- Path caching to improve performance
- Comprehensive statistics and monitoring
- Built with TypeScript for type safety

## Basic Usage

```typescript
import { createPathfinder, Grid } from 'game-pathfinder';

// Create a 20x15 grid
const grid = new Grid(20, 15);

// Set some obstacles
grid.setWalkable(5, 5, false);
grid.setWalkable(5, 6, false);
grid.setWalkable(5, 7, false);
grid.setWalkable(6, 7, false);
grid.setWalkable(7, 7, false);

// Create a pathfinder
const { pathfinder, findPath } = createPathfinder(grid);

// Find a path
const result = findPath(2, 3, 15, 10);

if (result.found) {
  console.log('Path found!', result.path);
  console.log('Path length:', result.length);
  console.log('Calculation time:', result.time, 'ms');
} else {
  console.log('No path found');
}
```

## API Reference

### Grid

The `Grid` class represents a 2D grid of walkable and non-walkable cells.

```typescript
// Create a new grid
const grid = new Grid(width, height);

// Check if a position is walkable
const walkable = grid.isWalkable(x, y);

// Set whether a position is walkable
grid.setWalkable(x, y, walkable);
```

### AStar

The `AStar` class implements the A* pathfinding algorithm.

```typescript
// Create a new pathfinder
const pathfinder = new AStar(grid, options);

// Find a path
const result = pathfinder.findPath(startPos, goalPos);
```

### PathSmoother

The `PathSmoother` class provides methods for smoothing and optimizing paths.

```typescript
// Create a new smoother
const smoother = new PathSmoother(grid);

// Smooth a path
const smoothPath = smoother.smoothPath(path);
```

## License

MIT
