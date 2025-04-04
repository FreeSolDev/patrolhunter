// Simple state machine interface for AI behaviors
export interface StateMachine {
  // Update the state machine
  update(deltaTime: number): void;
  
  // Get the current state name for display purposes
  getCurrentState(): string;
}
