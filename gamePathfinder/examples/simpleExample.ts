import { createPathfinder, Grid } from '../src';

// Create a simple grid
const gridWidth = 10;
const gridHeight = 10;
const grid = new Grid(gridWidth, gridHeight);

// Set up some walls as obstacles
for (let x = 3; x <= 6; x++) {
  grid.setWalkable(x, 4, false);
}

for (let y = 5; y <= 7; y++) {
  grid.setWalkable(3, y, false);
}

// Create a pathfinder
const { pathfinder, findPath, smoother } = createPathfinder(grid, {
  allowDiagonals: true,
  cutCorners: false,
  heuristic: 'manhattan'
});

// Find a path
const startX = 1;
const startY = 1;
const goalX = 8;
const goalY = 8;

console.log(`Finding path from (${startX}, ${startY}) to (${goalX}, ${goalY})...`);

const result = findPath(startX, startY, goalX, goalY, true);

if (result.found) {
  console.log('Path found!');
  console.log('Path:', result.path);
  console.log('Path length:', result.length);
  console.log('Calculation time:', result.time, 'ms');
  
  // Display the grid with the path
  displayGridWithPath(grid, result.path);
} else {
  console.log('No path found.');
  console.log('Nodes explored:', result.explored);
  console.log('Calculation time:', result.time, 'ms');
}

// Helper function to display the grid with the path
function displayGridWithPath(grid: Grid, path: Array<{x: number, y: number}>) {
  const gridData = Array(grid.getHeight()).fill(0)
    .map(() => Array(grid.getWidth()).fill('.'));
  
  // Mark obstacles
  for (let y = 0; y < grid.getHeight(); y++) {
    for (let x = 0; x < grid.getWidth(); x++) {
      if (!grid.isWalkable(x, y)) {
        gridData[y][x] = '#';
      }
    }
  }
  
  // Mark path
  for (let i = 0; i < path.length; i++) {
    const { x, y } = path[i];
    
    if (i === 0) {
      gridData[y][x] = 'S'; // Start
    } else if (i === path.length - 1) {
      gridData[y][x] = 'G'; // Goal
    } else {
      gridData[y][x] = '*'; // Path
    }
  }
  
  // Display the grid
  console.log(gridData.map(row => row.join(' ')).join('\n'));
}