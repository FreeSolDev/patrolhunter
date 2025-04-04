// Priority queue implementation for A* pathfinding

import { GridPosition } from "../types";

export class PriorityQueue<T = GridPosition> {
  private items: { value: T; priority: number }[];
  private keyMap: Map<string, number>;

  constructor() {
    this.items = [];
    this.keyMap = new Map();
  }

  // Add an item to the queue with a given priority
  enqueue(value: T, priority: number): void {
    const key = this.getKey(value);
    const index = this.items.findIndex(item => item.priority > priority);
    
    if (index === -1) {
      // Add to the end if no higher priority found
      this.items.push({ value, priority });
      this.keyMap.set(key, this.items.length - 1);
    } else {
      // Insert at the correct position
      this.items.splice(index, 0, { value, priority });
      
      // Update key indices for all affected items
      for (let i = index; i < this.items.length; i++) {
        const itemKey = this.getKey(this.items[i].value);
        this.keyMap.set(itemKey, i);
      }
    }
  }

  // Remove and return the highest priority item
  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    
    const item = this.items.shift();
    
    // Update indices in the key map
    this.keyMap.delete(this.getKey(item!.value));
    for (let i = 0; i < this.items.length; i++) {
      const key = this.getKey(this.items[i].value);
      this.keyMap.set(key, i);
    }
    
    return item!.value;
  }

  // Check if an item with the given key exists in the queue
  contains(key: string): boolean {
    return this.keyMap.has(key);
  }

  // Check if the queue is empty
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // Get the size of the queue
  size(): number {
    return this.items.length;
  }

  // Convert a value to its string key representation
  private getKey(value: T): string {
    if (this.isGridPosition(value)) {
      return `${value.x},${value.y}`;
    }
    return String(value);
  }

  // Type guard to check if value is a GridPosition
  private isGridPosition(value: any): value is GridPosition {
    return value && typeof value.x === 'number' && typeof value.y === 'number';
  }
}
