import { useState, useEffect, useRef } from "react";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";
import Game from "./components/Game";
import GameUI from "./components/GameUI";
import { useIsMobile } from "./hooks/use-is-mobile";

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
  const isMobile = useIsMobile(); // Use the mobile detection hook
  const [forceMobileControls, setForceMobileControls] = useState(false);
  
  // Show controls either when device is detected as mobile or when forced through the toggle
  const showMobileControls = isMobile || forceMobileControls;
  
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

    // Add touch controls for mobile - these handle general screen touches
    // Our on-screen buttons use specific onTouchStart/onTouchEnd handlers
    const handleTouchStart = (e: TouchEvent) => {
      // We no longer want to prevent default here to allow on-screen buttons to work
      // e.preventDefault(); 
      
      // This handler will only be used for screen swipes or touches outside of the UI buttons
      if (!gameContainerRef.current) return;
      
      // Check if the touch is on a UI element (button)
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON') {
        return; // Let the button's own handlers deal with it
      }
      
      const touch = e.touches[0];
      const rect = gameContainerRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Create a better swipe detection
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const swipeThreshold = Math.min(rect.width, rect.height) * 0.1; // 10% of screen size
      
      if (y < centerY - swipeThreshold) setControls(prev => ({ ...prev, up: true }));
      if (y > centerY + swipeThreshold) setControls(prev => ({ ...prev, down: true }));
      if (x < centerX - swipeThreshold) setControls(prev => ({ ...prev, left: true }));
      if (x > centerX + swipeThreshold) setControls(prev => ({ ...prev, right: true }));
      
      // Store the touch position for potential swipe detection
      (window as any).lastTouchX = x;
      (window as any).lastTouchY = y;
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      // Check if the touch ended on a UI element (button)
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON') {
        return; // Let the button's own handlers deal with it
      }
      
      // Reset movement controls, but don't reset action buttons like transform
      // which have their own handlers
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
          
          {/* Sound toggle button - debugs isMobile state */}
          <button 
            onClick={toggleMute}
            className="absolute top-4 right-4 bg-gray-800 text-white p-2 md:p-3 rounded-full z-50 shadow-lg flex items-center justify-center"
            aria-label="Toggle Sound"
          >
            {!isMobile ? <span>Toggle Sound</span> : <span className="text-lg">🔊</span>}
          </button>
          
          {/* Mobile controls toggle button - always visible to help users on tablets/iPad */}
          <button
            onClick={() => setForceMobileControls(prev => !prev)}
            className="fixed bottom-3 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded-full text-sm z-50 opacity-70 hover:opacity-100 transition-opacity"
          >
            {showMobileControls ? 'Hide' : 'Show'} Touch Controls
          </button>
          
          {/* Mobile controls - rendered if isMobile is true OR forceMobileControls is true */}
          {showMobileControls && (
            <>
              {/* Left side: D-pad */}
              <div className="fixed bottom-10 left-8 flex flex-col items-center z-50">
                <button 
                  className="bg-gray-800 text-white p-4 w-20 h-20 rounded-full mb-2 opacity-90 text-2xl font-bold shadow-lg active:bg-gray-700 active:scale-95 transition-all touch-none"
                  onTouchStart={(e) => {
                    e.preventDefault(); // Prevent double-firing of events
                    setControls(prev => ({ ...prev, up: true }));
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setControls(prev => ({ ...prev, up: false }));
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    setControls(prev => ({ ...prev, up: false }));
                  }}
                  onMouseDown={() => setControls(prev => ({ ...prev, up: true }))}
                  onMouseUp={() => setControls(prev => ({ ...prev, up: false }))}
                  onMouseLeave={() => setControls(prev => ({ ...prev, up: false }))}
                >
                  ↑
                </button>
                <div className="flex gap-2">
                  <button 
                    className="bg-gray-800 text-white p-4 w-20 h-20 rounded-full opacity-90 text-2xl font-bold shadow-lg active:bg-gray-700 active:scale-95 transition-all touch-none"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, left: true }));
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, left: false }));
                    }}
                    onTouchCancel={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, left: false }));
                    }}
                    onMouseDown={() => setControls(prev => ({ ...prev, left: true }))}
                    onMouseUp={() => setControls(prev => ({ ...prev, left: false }))}
                    onMouseLeave={() => setControls(prev => ({ ...prev, left: false }))}
                  >
                    ←
                  </button>
                  <button 
                    className="bg-gray-800 text-white p-4 w-20 h-20 rounded-full opacity-90 text-2xl font-bold shadow-lg active:bg-gray-700 active:scale-95 transition-all touch-none"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, down: true }));
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, down: false }));
                    }}
                    onTouchCancel={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, down: false }));
                    }}
                    onMouseDown={() => setControls(prev => ({ ...prev, down: true }))}
                    onMouseUp={() => setControls(prev => ({ ...prev, down: false }))}
                    onMouseLeave={() => setControls(prev => ({ ...prev, down: false }))}
                  >
                    ↓
                  </button>
                  <button 
                    className="bg-gray-800 text-white p-4 w-20 h-20 rounded-full opacity-90 text-2xl font-bold shadow-lg active:bg-gray-700 active:scale-95 transition-all touch-none"
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, right: true }));
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, right: false }));
                    }}
                    onTouchCancel={(e) => {
                      e.preventDefault();
                      setControls(prev => ({ ...prev, right: false }));
                    }}
                    onMouseDown={() => setControls(prev => ({ ...prev, right: true }))}
                    onMouseUp={() => setControls(prev => ({ ...prev, right: false }))}
                    onMouseLeave={() => setControls(prev => ({ ...prev, right: false }))}
                  >
                    →
                  </button>
                </div>
              </div>
              
              {/* Right side: Action buttons */}
              <div className="fixed bottom-10 right-8 flex flex-col items-center z-50">
                <button 
                  className="bg-purple-700 text-white p-4 w-20 h-20 rounded-full mb-4 opacity-90 shadow-lg text-2xl font-bold active:bg-purple-600 active:scale-95 transition-all touch-none"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setControls(prev => ({ ...prev, transform: true }));
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    setControls(prev => ({ ...prev, transform: false }));
                  }}
                  onTouchCancel={(e) => {
                    e.preventDefault();
                    setControls(prev => ({ ...prev, transform: false }));
                  }}
                  onMouseDown={() => setControls(prev => ({ ...prev, transform: true }))}
                  onMouseUp={() => setControls(prev => ({ ...prev, transform: false }))}
                  onMouseLeave={() => setControls(prev => ({ ...prev, transform: false }))}
                >
                  T
                </button>
                
                <button 
                  className="bg-blue-700 text-white p-4 w-20 h-20 rounded-full opacity-90 shadow-lg text-2xl font-bold active:bg-blue-600 active:scale-95 transition-all touch-none"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    setControls(prev => ({ ...prev, debug: !prev.debug }));
                  }}
                  onMouseDown={() => setControls(prev => ({ ...prev, debug: !prev.debug }))}
                >
                  B
                </button>
              </div>
              
              {/* Info overlay for mobile */}
              <div className="fixed top-16 left-0 right-0 flex justify-center pointer-events-none">
                <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-xs">
                  T = Transform | B = Debug Mode
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;
