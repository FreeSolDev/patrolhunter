import { useFrame } from "@react-three/fiber";
import { usePathfinding } from "../../lib/stores/usePathfinding";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const PathfindingDebug = () => {
  const { currentPaths } = usePathfinding();
  const pathLinesRef = useRef<THREE.Group>(null);
  
  // Create debug line geometries for all current paths
  const pathLines = useMemo(() => {
    return currentPaths.map((pathData, index) => {
      if (pathData.path.length < 2) return null;
      
      // Create points for the line
      const points = pathData.path.map(point => 
        new THREE.Vector3(point.x, 0.15, point.y)
      );
      
      // Create line geometry
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Return the line with its material
      return (
        <line key={`path-${index}`} geometry={lineGeometry}>
          <lineBasicMaterial 
            attach="material" 
            color={pathData.color} 
            linewidth={3}
          />
        </line>
      );
    }).filter(Boolean);
  }, [currentPaths]);
  
  // Update the visualization every frame
  useFrame(() => {
    if (!pathLinesRef.current) return;
    
    // Make the lines pulse slightly
    const time = Date.now() * 0.001;
    pathLinesRef.current.position.y = Math.sin(time * 2) * 0.05 + 0.1;
  });
  
  return (
    <group ref={pathLinesRef}>
      {pathLines}
      
      {/* Add endpoint markers */}
      {currentPaths.map((pathData, index) => {
        if (pathData.path.length === 0) return null;
        
        // End point is the last point in the path
        const lastPoint = pathData.path[pathData.path.length - 1];
        
        return (
          <mesh 
            key={`endpoint-${index}`}
            position={[lastPoint.x, 0.3, lastPoint.y]}
          >
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial 
              color={pathData.color} 
              transparent={true}
              opacity={0.7}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default PathfindingDebug;
