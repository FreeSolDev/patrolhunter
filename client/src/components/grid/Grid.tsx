import { useGridStore } from "../../lib/stores/useGridStore";
import Tile from "./Tile";

const Grid = () => {
  const { grid, obstacles } = useGridStore();
  
  if (!grid || grid.length === 0) {
    return null;
  }
  
  return (
    <group>
      {/* Base ground plane */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[grid[0].length / 2 - 0.5, -0.1, grid.length / 2 - 0.5]} 
        receiveShadow
      >
        <planeGeometry args={[grid[0].length, grid.length]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Render each tile in the grid */}
      {grid.map((row, z) => 
        row.map((walkable, x) => (
          <Tile 
            key={`${x}-${z}`} 
            position={[x, 0, z]} 
            walkable={walkable}
            isObstacle={obstacles.some(obs => obs.x === x && obs.y === z)}
          />
        ))
      )}
      
      {/* Outer walls */}
      <group>
        {/* North wall */}
        <mesh position={[grid[0].length / 2 - 0.5, 0.5, -0.5]} castShadow receiveShadow>
          <boxGeometry args={[grid[0].length, 1, 0.1]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        
        {/* South wall */}
        <mesh position={[grid[0].length / 2 - 0.5, 0.5, grid.length - 0.5]} castShadow receiveShadow>
          <boxGeometry args={[grid[0].length, 1, 0.1]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        
        {/* East wall */}
        <mesh position={[grid[0].length - 0.5, 0.5, grid.length / 2 - 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1, grid.length]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
        
        {/* West wall */}
        <mesh position={[-0.5, 0.5, grid.length / 2 - 0.5]} castShadow receiveShadow>
          <boxGeometry args={[0.1, 1, grid.length]} />
          <meshStandardMaterial color="#555555" />
        </mesh>
      </group>
      
      {/* Obstacles */}
      {obstacles.map((obstacle, index) => (
        <mesh 
          key={`obstacle-${index}`} 
          position={[obstacle.x, 0.5, obstacle.y]} 
          castShadow 
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#444466" />
        </mesh>
      ))}
    </group>
  );
};

export default Grid;
