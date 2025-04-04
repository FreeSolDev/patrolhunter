import { useTexture } from "@react-three/drei";
import { usePathfinding } from "../../lib/stores/usePathfinding";
import { Vector3 } from "three";

interface TileProps {
  position: [number, number, number];
  walkable: boolean;
  isObstacle: boolean;
}

const Tile = ({ position, walkable, isObstacle }: TileProps) => {
  const { 
    openSet, 
    closedSet, 
    currentPaths 
  } = usePathfinding();
  
  // Load texture based on walkable status
  const texture = walkable ? 
    useTexture("/textures/grass.png") : 
    useTexture("/textures/sand.jpg");
  
  // Scale and repeat the texture
  texture.repeat.set(1, 1);
  texture.wrapS = texture.wrapT = 1000; // THREE.RepeatWrapping

  const x = position[0];
  const z = position[2];
  
  // Determine if this tile is in any debug visualization set
  const isInOpenSet = openSet.some(pos => pos.x === x && pos.y === z);
  const isInClosedSet = closedSet.some(pos => pos.x === x && pos.y === z);
  
  // Check if this tile is part of any current path
  const isInPath = currentPaths.some(path => 
    path.path.some(pos => pos.x === x && pos.y === z)
  );
  
  // Determine which path this tile belongs to (for coloring)
  const pathInfo = currentPaths.find(path => 
    path.path.some(pos => pos.x === x && pos.y === z)
  );
  
  // Calculate color based on tile state for debugging visualization
  let debugColor = null;
  
  if (isInPath) {
    // Use the color defined for the entity's path
    debugColor = pathInfo?.color || "#FFFFFF";
  } else if (isInOpenSet) {
    debugColor = "#00FF00"; // Green for open set
  } else if (isInClosedSet) {
    debugColor = "#FF0000"; // Red for closed set
  }
  
  return (
    <mesh 
      position={position} 
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <meshStandardMaterial 
        map={texture}
        color={debugColor || (walkable ? "#FFFFFF" : "#888888")}
        transparent={!!debugColor}
        opacity={debugColor ? 0.7 : 1}
      />
      
      {/* If this is part of a path, show a small indicator */}
      {isInPath && (
        <mesh position={new Vector3(0, 0.01, 0)}>
          <circleGeometry args={[0.2, 16]} />
          <meshBasicMaterial color={pathInfo?.color || "#FFFFFF"} />
        </mesh>
      )}
    </mesh>
  );
};

export default Tile;
