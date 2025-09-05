import { LRUCache, calculateChunkSize } from './lru-cache';
import { ChunkStorage } from './chunk-storage';
import { Chunk } from '@/generated/chunk';
import { ChunkIndex } from '@/generated/chunk-index';
import { BoundingBox } from '@/generated/bounding-box';
import { EventBus } from '@/core/events/event-bus';
import * as flatbuffers from 'flatbuffers';
import { ChunkManagerOptions, MemoryStats, ChunkLoadResult } from '@/types';

/**
 * Manages dynamic loading and caching of model chunks
 */
export class ChunkManager {
  private lruCache: LRUCache<string, Chunk>;
  private storage: ChunkStorage;
  private chunkIndex?: ChunkIndex;
  private loadingChunks = new Map<string, Promise<Chunk>>();
  private stats = {
    totalLoads: 0,
    cacheHits: 0,
    evictions: 0
  };

  constructor(
    private options: ChunkManagerOptions = {
      maxMemoryMB: 500,
      prefetchAhead: 2,
      compressionEnabled: true
    }
  ) {
    // Initialize LRU cache with memory limit
    const maxBytes = options.maxMemoryMB * 1024 * 1024;
    this.lruCache = new LRUCache<string, Chunk>({
      maxSize: maxBytes,
      sizeCalculator: calculateChunkSize,
      onEviction: this.onChunkEvicted.bind(this)
    });

    // Initialize storage backend
    this.storage = new ChunkStorage();
  }

  /**
   * Initialize with chunk index
   */
  async initialize(indexBuffer: Uint8Array): Promise<void> {
    const buf = new flatbuffers.ByteBuffer(indexBuffer);
    this.chunkIndex = ChunkIndex.getRootAsChunkIndex(buf);
    
    console.log(`📦 ChunkManager initialized with ${this.chunkIndex.chunksLength()} chunks`);
    console.log(`   Total entities: ${this.chunkIndex.totalEntities()}`);
    console.log(`   Total size: ${(Number(this.chunkIndex.totalSize()) / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Load a single chunk
   */
  async loadChunk(chunkId: string): Promise<ChunkLoadResult> {
    const startTime = performance.now();
    this.stats.totalLoads++;

    // Check cache first
    const cached = this.lruCache.get(chunkId);
    if (cached) {
      this.stats.cacheHits++;
      return {
        chunk: cached,
        fromCache: true,
        loadTimeMs: performance.now() - startTime
      };
    }

    // Check if already loading
    const loading = this.loadingChunks.get(chunkId);
    if (loading) {
      const chunk = await loading;
      return {
        chunk,
        fromCache: false,
        loadTimeMs: performance.now() - startTime
      };
    }

    // Start loading
    const loadPromise = this.loadChunkFromStorage(chunkId);
    this.loadingChunks.set(chunkId, loadPromise);

    try {
      const chunk = await loadPromise;
      
      // Add to cache
      this.lruCache.set(chunkId, chunk);
      
      // Emit load event
      EventBus.emit('chunk:loaded', {
        chunkId,
        entityCount: chunk.metadata()?.entityCount() || 0,
        memoryUsage: calculateChunkSize(chunk)
      });

      return {
        chunk,
        fromCache: false,
        loadTimeMs: performance.now() - startTime
      };
    } finally {
      this.loadingChunks.delete(chunkId);
    }
  }

  /**
   * Prefetch multiple chunks
   */
  async prefetchChunks(chunkIds: string[]): Promise<void> {
    console.log(`🔄 Prefetching ${chunkIds.length} chunks...`);
    
    // Filter out already cached chunks
    const toLoad = chunkIds.filter(id => !this.lruCache.has(id));
    
    if (toLoad.length === 0) {
      console.log('✅ All chunks already cached');
      return;
    }

    // Load in parallel with concurrency limit
    const concurrency = 3;
    const results: Promise<ChunkLoadResult>[] = [];
    
    for (let i = 0; i < toLoad.length; i += concurrency) {
      const batch = toLoad.slice(i, i + concurrency);
      const batchPromises = batch.map(id => this.loadChunk(id));
      results.push(...batchPromises);
      
      // Wait for batch to complete before starting next
      if (i + concurrency < toLoad.length) {
        await Promise.all(batchPromises);
      }
    }

    await Promise.all(results);
    console.log(`✅ Prefetched ${toLoad.length} chunks`);
  }

  /**
   * Query chunks by spatial bounds
   */
  async queryChunks(bounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  }): Promise<Chunk[]> {
    if (!this.chunkIndex) {
      throw new Error('ChunkManager not initialized');
    }

    const matchingChunks: string[] = [];

    // Find chunks that intersect with query bounds
    for (let i = 0; i < this.chunkIndex.chunksLength(); i++) {
      const chunk = this.chunkIndex.chunks(i);
      if (!chunk) continue;

      const chunkBounds = chunk.spatialBounds();
      if (!chunkBounds) continue;

      // Check intersection
      const intersects = this.boundsIntersect(
        {
          min: {
            x: chunkBounds.min()!.x(),
            y: chunkBounds.min()!.y(),
            z: chunkBounds.min()!.z()
          },
          max: {
            x: chunkBounds.max()!.x(),
            y: chunkBounds.max()!.y(),
            z: chunkBounds.max()!.z()
          }
        },
        bounds
      );

      if (intersects && chunk.id()) {
        matchingChunks.push(chunk.id()!);
      }
    }

    // Load matching chunks
    const loadPromises = matchingChunks.map(id => this.loadChunk(id));
    const results = await Promise.all(loadPromises);
    
    return results.map(r => r.chunk);
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): MemoryStats {
    return {
      usedMemory: this.lruCache.memoryUsage(),
      maxMemory: this.options.maxMemoryMB * 1024 * 1024,
      loadedChunks: this.lruCache.size(),
      cachedChunks: this.lruCache.size(),
      evictedChunks: this.stats.evictions
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const lruStats = this.lruCache.getStats();
    return {
      ...lruStats,
      totalLoads: this.stats.totalLoads,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.totalLoads - this.stats.cacheHits,
      hitRate: this.stats.totalLoads > 0 
        ? this.stats.cacheHits / this.stats.totalLoads 
        : 0,
      evictions: this.stats.evictions
    };
  }

  /**
   * Clear all cached chunks
   */
  clear(): void {
    this.lruCache.clear();
    this.loadingChunks.clear();
    console.log('🗑️ Chunk cache cleared');
  }

  /**
   * Get loaded chunk IDs
   */
  getLoadedChunks(): string[] {
    return this.lruCache.keys();
  }

  /**
   * Check if a chunk is loaded
   */
  isChunkLoaded(chunkId: string): boolean {
    return this.lruCache.has(chunkId);
  }

  private async loadChunkFromStorage(chunkId: string): Promise<Chunk> {
    console.log(`📥 Loading chunk ${chunkId} from storage...`);
    
    try {
      // Load from storage backend
      const chunkData = await this.storage.loadChunk(chunkId);
      
      // Decompress if needed
      if (this.options.compressionEnabled) {
        // TODO: Implement decompression based on chunk.compressionType
      }
      
      // Parse Flatbuffer
      const buf = new flatbuffers.ByteBuffer(chunkData);
      const chunk = Chunk.getRootAsChunk(buf);
      
      return chunk;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkId}:`, error);
      throw error;
    }
  }

  private onChunkEvicted(chunkId: string, chunk: Chunk): void {
    this.stats.evictions++;
    
    console.log(`♻️ Evicted chunk ${chunkId} (${chunk.metadata()?.entityCount() || 0} entities)`);
    
    EventBus.emit('chunk:evicted', {
      chunkId,
      entityCount: chunk.metadata()?.entityCount() || 0
    });
  }

  private boundsIntersect(
    a: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
    b: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } }
  ): boolean {
    return !(
      a.max.x < b.min.x || a.min.x > b.max.x ||
      a.max.y < b.min.y || a.min.y > b.max.y ||
      a.max.z < b.min.z || a.min.z > b.max.z
    );
  }
}