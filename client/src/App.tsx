import { useState, useEffect, useRef } from "react";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";
import Game from "./components/Game";
import GameUI from "./components/GameUI";

// Main App component
function App() {
  const [showGame, setShowGame] = useState(false);
  const { setBackgroundMusic, toggleMute } = useAudio();
  const [controls, setControls] = useState({
    up: false,
    down: false,
    left: false,
    right: false,
    transform: false,
    debug: false
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          setControls(prev => ({ ...prev, up: true }));
          break;
        case "KeyS":
        case "ArrowDown":
          setControls(prev => ({ ...prev, down: true }));
          break;
        case "KeyA":
        case "ArrowLeft":
          setControls(prev => ({ ...prev, left: true }));
          break;
        case "KeyD":
        case "ArrowRight":
          setControls(prev => ({ ...prev, right: true }));
          break;
        case "KeyT":
          setControls(prev => ({ ...prev, transform: true }));
          break;
        case "KeyB":
          setControls(prev => ({ ...prev, debug: !prev.debug }));
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "KeyW":
        case "ArrowUp":
          setControls(prev => ({ ...prev, up: false }));
          break;
        case "KeyS":
        case "ArrowDown":
          setControls(prev => ({ ...prev, down: false }));
          break;
        case "KeyA":
        case "ArrowLeft":
          setControls(prev => ({ ...prev, left: false }));
          break;
        case "KeyD":
        case "ArrowRight":
          setControls(prev => ({ ...prev, right: false }));
          break;
        case "KeyT":
          setControls(prev => ({ ...prev, transform: false }));
          break;
      }
    };

    // Add touch controls for mobile
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (!gameContainerRef.current) return;
      
      const touch = e.touches[0];
      const rect = gameContainerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Create a simple virtual joystick
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      if (y < centerY - 50) setControls(prev => ({ ...prev, up: true }));
      if (y > centerY + 50) setControls(prev => ({ ...prev, down: true }));
      if (x < centerX - 50) setControls(prev => ({ ...prev, left: true }));
      if (x > centerX + 50) setControls(prev => ({ ...prev, right: true }));
    };
    
    const handleTouchEnd = () => {
      setControls(prev => ({ 
        ...prev, 
        up: false, 
        down: false, 
        left: false, 
        right: false 
      }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    
    if (gameContainerRef.current) {
      gameContainerRef.current.addEventListener("touchstart", handleTouchStart);
      gameContainerRef.current.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      
      if (gameContainerRef.current) {
        gameContainerRef.current.removeEventListener("touchstart", handleTouchStart);
        gameContainerRef.current.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, []);

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

    // Automatically show the game once loaded
    setShowGame(true);
  }, [setBackgroundMusic]);

  return (
    <div 
      ref={gameContainerRef}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        position: 'relative', 
        overflow: 'hidden',
        touchAction: 'none' // Prevent default touch behaviors like scrolling
      }}
    >
      {showGame && (
        <>
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#87CEEB',
              display: 'block'
            }}
          />
          
          <Game canvasRef={canvasRef} controls={controls} />
          <GameUI debugMode={controls.debug} />
          
          {/* Sound toggle button */}
          <button 
            onClick={toggleMute}
            className="absolute top-4 right-4 bg-gray-800 text-white p-2 rounded-full z-50"
          >
            Toggle Sound
          </button>
          
          {/* Mobile controls */}
          <div className="md:hidden fixed bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
            <button 
              className="bg-gray-800 text-white p-4 rounded-full opacity-70"
              onTouchStart={() => setControls(prev => ({ ...prev, transform: true }))}
              onTouchEnd={() => setControls(prev => ({ ...prev, transform: false }))}
            >
              Transform
            </button>
            
            <button 
              className="bg-gray-800 text-white p-4 rounded-full opacity-70"
              onClick={() => setControls(prev => ({ ...prev, debug: !prev.debug }))}
            >
              Toggle Debug
            </button>
          </div>
          
          {/* Virtual D-pad for mobile */}
          <div className="md:hidden fixed bottom-24 left-8 flex flex-col items-center">
            <button 
              className="bg-gray-800 text-white p-4 rounded-full mb-2 opacity-70"
              onTouchStart={() => setControls(prev => ({ ...prev, up: true }))}
              onTouchEnd={() => setControls(prev => ({ ...prev, up: false }))}
            >
              ↑
            </button>
            <div className="flex gap-2">
              <button 
                className="bg-gray-800 text-white p-4 rounded-full opacity-70"
                onTouchStart={() => setControls(prev => ({ ...prev, left: true }))}
                onTouchEnd={() => setControls(prev => ({ ...prev, left: false }))}
              >
                ←
              </button>
              <button 
                className="bg-gray-800 text-white p-4 rounded-full opacity-70"
                onTouchStart={() => setControls(prev => ({ ...prev, down: true }))}
                onTouchEnd={() => setControls(prev => ({ ...prev, down: false }))}
              >
                ↓
              </button>
              <button 
                className="bg-gray-800 text-white p-4 rounded-full opacity-70"
                onTouchStart={() => setControls(prev => ({ ...prev, right: true }))}
                onTouchEnd={() => setControls(prev => ({ ...prev, right: false }))}
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
