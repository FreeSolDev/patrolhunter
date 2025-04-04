import { Canvas } from "@react-three/fiber";
import { Suspense, useState, useEffect } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";
import Game from "./components/Game";
import GameUI from "./components/GameUI";

// Define control keys for the game
const controls = [
  { name: "up", keys: ["KeyW", "ArrowUp"] },
  { name: "down", keys: ["KeyS", "ArrowDown"] },
  { name: "left", keys: ["KeyA", "ArrowLeft"] },
  { name: "right", keys: ["KeyD", "ArrowRight"] },
  { name: "transform", keys: ["KeyT"] },
  { name: "debug", keys: ["KeyB"] }
];

// Main App component
function App() {
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic, toggleMute } = useAudio();

  // Initialize audio
  useEffect(() => {
    const bgMusic = new Audio("/sounds/background.mp3");
    bgMusic.loop = true;
    bgMusic.volume = 0.3;
    setBackgroundMusic(bgMusic);

    const hitSound = new Audio("/sounds/hit.mp3");
    const successSound = new Audio("/sounds/success.mp3");
    useAudio.getState().setHitSound(hitSound);
    useAudio.getState().setSuccessSound(successSound);

    // Automatically show the canvas once loaded
    setShowCanvas(true);
  }, [setBackgroundMusic]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={controls}>
          <Canvas
            shadows
            camera={{
              position: [0, 16, 16],
              fov: 50,
              near: 0.1,
              far: 1000,
              rotation: [-Math.PI / 4, 0, 0]
            }}
            gl={{
              antialias: true,
              powerPreference: "default"
            }}
          >
            <color attach="background" args={["#87CEEB"]} />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={1} 
              castShadow 
              shadow-mapSize-width={1024} 
              shadow-mapSize-height={1024}
            />

            <Suspense fallback={null}>
              <Game />
            </Suspense>
          </Canvas>
          
          <GameUI />
          
          {/* Sound toggle button */}
          <button 
            onClick={toggleMute}
            className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full z-50"
          >
            Toggle Sound
          </button>
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
