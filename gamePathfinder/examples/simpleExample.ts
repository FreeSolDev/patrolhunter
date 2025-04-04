import { createPathfinder, Grid } from '../src';

/**
 * Basic example showing how to use the pathfinder
 */

// Create a new grid
const width = 10;
const height = 10;
const grid = new Grid(width, height);

// Add some obstacles to the grid
grid.setWalkable(2, 2, false);
grid.setWalkable(2, 3, false);
grid.setWalkable(2, 4, false);
grid.setWalkable(2, 5, false);
grid.setWalkable(2, 6, false);
grid.setWalkable(3, 6, false);
grid.setWalkable(4, 6, false);
grid.setWalkable(5, 6, false);
grid.setWalkable(6, 6, false);
grid.setWalkable(7, 6, false);
grid.setWalkable(7, 5, false);
grid.setWalkable(7, 4, false);
grid.setWalkable(7, 3, false);
grid.setWalkable(7, 2, false);

// Create a pathfinder with default options
const { findPath } = createPathfinder(grid);

// Find a path from (1,1) to (8,8)
const result = findPath(1, 1, 8, 8);

// Display the result
console.log('Path found:', result.found);
console.log('Path length:', result.length);
console.log('Nodes explored:', result.explored);
console.log('Time taken:', result.time, 'ms');

// Display the path
if (result.found) {
  console.log('Path:');
  for (const point of result.path) {
    console.log(`  (${point.x}, ${point.y})`);
  }
}

// Helper function to visualize the grid with the path
function displayGridWithPath(grid: Grid, path: Array<{x: number, y: number}>) {
  const symbols = {
    walkable: '.',   // Walkable cell
    obstacle: '█',   // Obstacle
    path: '●',       // Path cell
    start: 'S',      // Start position
    goal: 'G'        // Goal position
  };
  
  let output = '';
  
  for (let y = 0; y < grid.getHeight(); y++) {
    let row = '';
    for (let x = 0; x < grid.getWidth(); x++) {
      // Check if this is the start or goal position
      if (path.length > 0 && x === path[0].x && y === path[0].y) {
        row += symbols.start;
      } else if (path.length > 0 && x === path[path.length - 1].x && y === path[path.length - 1].y) {
        row += symbols.goal;
      } 
      // Check if this position is part of the path
      else if (path.some(p => p.x === x && p.y === y)) {
        row += symbols.path;
      } 
      // Otherwise show walkable or obstacle
      else if (grid.isWalkable(x, y)) {
        row += symbols.walkable;
      } else {
        row += symbols.obstacle;
      }
    }
    output += row + '\n';
  }
  
  console.log(output);
}

// Display the grid with the path
console.log('\nGrid visualization:');
displayGridWithPath(grid, result.path);

// Example of finding a path with obstacles in the way
console.log('\nExample with no path available:');
// Block the only passage
grid.setWalkable(5, 0, false);
grid.setWalkable(5, 1, false);
grid.setWalkable(5, 2, false);
grid.setWalkable(5, 3, false);
grid.setWalkable(5, 4, false);
grid.setWalkable(5, 5, false);
grid.setWalkable(5, 7, false);
grid.setWalkable(5, 8, false);
grid.setWalkable(5, 9, false);

// Try to find a path again
const blockedResult = findPath(1, 1, 8, 8);
console.log('Path found:', blockedResult.found);
console.log('Nodes explored:', blockedResult.explored);

// Display the grid with no path
displayGridWithPath(grid, blockedResult.path);