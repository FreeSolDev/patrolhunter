import { create } from "zustand";

interface AudioState {
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  isMuted: boolean;
  
  // Setter functions
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  playHit: () => void;
  playSuccess: () => void;
}

export const useAudio = create<AudioState>((set, get) => ({
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  isMuted: true, // Start muted by default
  
  setBackgroundMusic: (music) => set({ backgroundMusic: music }),
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  
  toggleMute: () => {
    const { isMuted } = get();
    const newMutedState = !isMuted;
    
    // Just update the muted state
    set({ isMuted: newMutedState });
    
    // Log the change
    console.log(`Sound ${newMutedState ? 'muted' : 'unmuted'}`);
  },
  
  playHit: () => {
    const { hitSound, isMuted } = get();
    if (!hitSound) {
      console.warn("Hit sound not loaded or initialized");
      return;
    }
    
    // If sound is muted, don't play anything
    if (isMuted) {
      console.log("Hit sound skipped (muted)");
      return;
    }
    
    try {
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = 0.3;
      
      // Add event listeners for better error handling
      soundClone.addEventListener('error', (e) => {
        console.error("Error playing hit sound:", e);
      });
      
      // Play the sound with error handling
      const playPromise = soundClone.play();
      
      // Handle the promise returned by play()
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // This will often happen due to browser autoplay policies
          // Most browsers require user interaction before playing audio
          console.log("Hit sound play prevented:", error);
          
          // We could add a retry mechanism here if needed
          // For now, we'll just log the error
        });
      }
    } catch (error) {
      console.error("Exception while trying to play hit sound:", error);
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted } = get();
    if (!successSound) {
      console.warn("Success sound not loaded or initialized");
      return;
    }
    
    // If sound is muted, don't play anything
    if (isMuted) {
      console.log("Success sound skipped (muted)");
      return;
    }
    
    try {
      // Reset playback position to start
      successSound.currentTime = 0;
      
      // Add event listeners for better error handling
      const errorHandler = (e: Event) => {
        console.error("Error playing success sound:", e);
        // Clean up the event listener to prevent memory leaks
        successSound.removeEventListener('error', errorHandler);
      };
      
      successSound.addEventListener('error', errorHandler);
      
      // Play the sound with error handling
      const playPromise = successSound.play();
      
      // Handle the promise returned by play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Success - remove the error handler
          successSound.removeEventListener('error', errorHandler);
        }).catch(error => {
          // This will often happen due to browser autoplay policies
          console.log("Success sound play prevented:", error);
          // Remove the error handler
          successSound.removeEventListener('error', errorHandler);
        });
      }
    } catch (error) {
      console.error("Exception while trying to play success sound:", error);
    }
  }
}));
