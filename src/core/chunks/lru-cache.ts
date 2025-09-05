/**
 * LRU (Least Recently Used) Cache implementation for chunk management
 */
export class LRUCache<K, V> {
  private maxSize: number;
  private cache: Map<K, V>;
  private accessOrder: K[];
  private sizeCalculator?: (value: V) => number;
  private currentSize: number = 0;
  private evictionCallback?: (key: K, value: V) => void;

  constructor(options: {
    maxSize: number;
    sizeCalculator?: (value: V) => number;
    onEviction?: (key: K, value: V) => void;
  }) {
    this.maxSize = options.maxSize;
    this.cache = new Map();
    this.accessOrder = [];
    this.sizeCalculator = options.sizeCalculator;
    this.evictionCallback = options.onEviction;
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.updateAccessOrder(key);
    }
    return value;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    // If key exists, remove old size
    const existingValue = this.cache.get(key);
    if (existingValue !== undefined && this.sizeCalculator) {
      this.currentSize -= this.sizeCalculator(existingValue);
    }

    // Add new value
    this.cache.set(key, value);
    this.updateAccessOrder(key);

    // Update size
    if (this.sizeCalculator) {
      this.currentSize += this.sizeCalculator(value);
      
      // Evict if necessary
      while (this.currentSize > this.maxSize && this.accessOrder.length > 0) {
        this.evictLRU();
      }
    } else {
      // Simple count-based eviction
      while (this.cache.size > this.maxSize) {
        this.evictLRU();
      }
    }
  }

  /**
   * Check if key exists
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a specific key
   */
  delete(key: K): boolean {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      
      if (this.sizeCalculator) {
        this.currentSize -= this.sizeCalculator(value);
      }
      
      return true;
    }
    return false;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this.evictionCallback) {
      for (const [key, value] of this.cache.entries()) {
        this.evictionCallback(key, value);
      }
    }
    
    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
  }

  /**
   * Get current size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get current memory usage
   */
  memoryUsage(): number {
    return this.currentSize;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    memoryUsage: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.currentSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * Get all keys in LRU order
   */
  keys(): K[] {
    return [...this.accessOrder];
  }

  /**
   * Get all entries
   */
  entries(): Array<[K, V]> {
    return this.accessOrder.map(key => [key, this.cache.get(key)!]);
  }

  private updateAccessOrder(key: K): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    
    // Get least recently used key
    const lruKey = this.accessOrder.shift()!;
    const value = this.cache.get(lruKey);
    
    if (value !== undefined) {
      this.cache.delete(lruKey);
      
      if (this.sizeCalculator) {
        this.currentSize -= this.sizeCalculator(value);
      }
      
      if (this.evictionCallback) {
        this.evictionCallback(lruKey, value);
      }
    }
  }

  // Stats tracking
  private hits = 0;
  private misses = 0;

  private calculateHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }
}

/**
 * Size calculator for chunk data
 */
export function calculateChunkSize(chunk: any): number {
  // Estimate based on entity count and average entity size
  const avgEntitySize = 1024; // 1KB average per entity
  const entityCount = chunk.metadata?.entityCount || 0;
  const overhead = 1024; // 1KB overhead for metadata
  
  return entityCount * avgEntitySize + overhead;
}