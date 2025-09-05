/**
 * Advanced in-memory cache with query result caching
 */

import { createHash } from 'crypto';
import { QueryCache } from '@/types/utils';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  size?: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private queryCache = new Map<string, QueryCache>();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds
  private maxMemory: number; // Max memory usage in bytes
  private currentMemory: number = 0;
  
  constructor(
    maxSize = 100, 
    ttl = 5 * 60 * 1000, // 5 minutes default
    maxMemoryMB = 50 // 50MB default
  ) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.maxMemory = maxMemoryMB * 1024 * 1024;
  }
  
  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Update hit count
    entry.hits++;
    
    return entry.data as T;
  }
  
  /**
   * Set item in cache with size tracking
   */
  set<T>(key: string, data: T, size?: number): void {
    const dataSize = size || this.estimateSize(data);
    
    // Check memory limit
    if (this.currentMemory + dataSize > this.maxMemory) {
      this.evictByMemory(dataSize);
    }
    
    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }
    
    // Remove old entry memory if updating
    const oldEntry = this.cache.get(key);
    if (oldEntry && oldEntry.size) {
      this.currentMemory -= oldEntry.size;
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
      size: dataSize
    });
    
    this.currentMemory += dataSize;
  }
  
  /**
   * Remove item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    avgAge: number;
  } {
    let totalHits = 0;
    let totalAge = 0;
    const now = Date.now();
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      totalAge += now - entry.timestamp;
    }
    
    const size = this.cache.size;
    const avgAge = size > 0 ? totalAge / size : 0;
    const hitRate = size > 0 ? totalHits / size : 0;
    
    return {
      size,
      maxSize: this.maxSize,
      hitRate,
      avgAge,
    };
  }
  
  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Create cache key for different operations
   */
  static createKey(...parts: (string | number)[]): string {
    return parts.join(':');
  }
  
  /**
   * Cache query results
   */
  async cacheQuery<T>(
    projectId: string,
    query: string,
    executor: () => Promise<T>
  ): Promise<T> {
    const queryKey = this.createQueryKey(projectId, query);
    
    // Check cache first
    const cached = this.queryCache.get(queryKey);
    if (cached && Date.now() - cached.timestamp.getTime() < this.ttl) {
      return cached.result as T;
    }
    
    // Execute query
    const startTime = Date.now();
    const result = await executor();
    const executionTime = Date.now() - startTime;
    
    // Cache result
    this.queryCache.set(queryKey, {
      key: queryKey,
      result,
      timestamp: new Date(),
      executionTime
    });
    
    // Limit query cache size
    if (this.queryCache.size > 50) {
      this.evictOldestQuery();
    }
    
    return result;
  }
  
  /**
   * Get query cache hit rate
   */
  getQueryCacheStats(): {
    size: number;
    hitRate: number;
    avgExecutionTime: number;
  } {
    let totalExecutionTime = 0;
    let hits = 0;
    
    this.queryCache.forEach(entry => {
      totalExecutionTime += entry.executionTime;
      // Simple hit tracking (would need more sophisticated tracking in production)
      if (entry.executionTime < 100) hits++; // Assume fast queries are cache hits
    });
    
    const size = this.queryCache.size;
    
    return {
      size,
      hitRate: size > 0 ? hits / size : 0,
      avgExecutionTime: size > 0 ? totalExecutionTime / size : 0
    };
  }
  
  /**
   * Debug method to inspect cache contents
   */
  debugInspectCache(options?: {
    showContent?: boolean;
    chunkId?: string;
    limit?: number;
  }): void {
    const opts = {
      showContent: false,
      limit: 10,
      ...options
    };

    console.log('\n=== CACHE DEBUG INFO ===');
    console.log(`Total cached items: ${this.cache.size}`);
    console.log(`Current memory usage: ${(this.currentMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Max memory: ${(this.maxMemory / 1024 / 1024).toFixed(2)} MB`);
    
    if (opts.chunkId) {
      // Show specific chunk
      const entry = this.cache.get(opts.chunkId);
      if (entry) {
        console.log(`\nChunk ${opts.chunkId}:`);
        console.log('- Timestamp:', new Date(entry.timestamp).toISOString());
        console.log('- Hits:', entry.hits);
        console.log('- Size:', entry.size || 'unknown');
        
        if (opts.showContent && entry.data) {
          console.log('\n--- CHUNK CONTENT ---');
          if (entry.data.content) {
            console.log(entry.data.content.substring(0, 1000));
            if (entry.data.content.length > 1000) {
              console.log(`\n... (${entry.data.content.length - 1000} more characters)`);
            }
          } else {
            console.log('Full data:', JSON.stringify(entry.data, null, 2));
          }
          console.log('--- END CONTENT ---\n');
        }
      } else {
        console.log(`Chunk ${opts.chunkId} not found in cache`);
      }
    } else {
      // Show cache overview
      console.log('\nCached chunks:');
      let count = 0;
      for (const [key, entry] of this.cache.entries()) {
        if (count >= opts.limit) break;
        console.log(`- ${key}: ${entry.hits} hits, ${new Date(entry.timestamp).toISOString()}`);
        count++;
      }
      
      if (this.cache.size > opts.limit) {
        console.log(`... and ${this.cache.size - opts.limit} more`);
      }
    }
    
    console.log('=== END DEBUG INFO ===\n');
  }

  /**
   * Create query cache key
   */
  private createQueryKey(projectId: string, query: string): string {
    const hash = createHash('md5')
      .update(`${projectId}:${query.toLowerCase().trim()}`)
      .digest('hex');
    return `query:${projectId}:${hash}`;
  }
  
  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return str.length * 2; // Rough estimate (2 bytes per char)
  }
  
  /**
   * Evict entries by memory usage
   */
  private evictByMemory(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        // Sort by access recency and hit count
        const scoreA = a[1].timestamp + (a[1].hits * 1000);
        const scoreB = b[1].timestamp + (b[1].hits * 1000);
        return scoreA - scoreB;
      });
    
    let freedSpace = 0;
    
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      if (entry.size) {
        freedSpace += entry.size;
        this.currentMemory -= entry.size;
      }
      
      this.cache.delete(key);
    }
  }
  
  /**
   * Evict oldest query cache entry
   */
  private evictOldestQuery(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    
    this.queryCache.forEach((entry, key) => {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.queryCache.delete(oldestKey);
    }
  }
}