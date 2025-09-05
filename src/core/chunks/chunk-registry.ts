/**
 * Global Chunk Registry - Ensures chunks are only created once per model
 */

import { ChunkManager } from './chunk-manager';
import { ChunkBuilder } from './chunk-builder';
import { ChunkRegistryEntry } from '@/types';

export class ChunkRegistry {
  private static instance: ChunkRegistry;
  private registry = new Map<string, ChunkRegistryEntry>();
  private chunkBuilder: ChunkBuilder | null = null;

  private constructor() {}

  static getInstance(): ChunkRegistry {
    if (!ChunkRegistry.instance) {
      ChunkRegistry.instance = new ChunkRegistry();
    }
    return ChunkRegistry.instance;
  }

  /**
   * Check if chunks exist for a model
   */
  hasChunks(modelId: string): boolean {
    return this.registry.has(modelId);
  }

  /**
   * Get existing chunks for a model
   */
  getChunks(modelId: string): ChunkRegistryEntry | null {
    return this.registry.get(modelId) || null;
  }

  /**
   * Create chunks for a model (only if they don't exist)
   */
  async createChunksForModel(
    modelId: string,
    entities: any[],
    entityIndex: Record<string, number[]>
  ): Promise<ChunkRegistryEntry | null> {
    // Check if chunks already exist
    if (this.hasChunks(modelId)) {
      console.log(`🔄 Chunks already exist for model ${modelId}, returning existing`);
      return this.getChunks(modelId);
    }

    console.log(`🏗️ Creating chunks for model ${modelId} (${entities.length} entities)`);

    try {
      // Initialize ChunkBuilder if needed
      if (!this.chunkBuilder) {
        this.chunkBuilder = new ChunkBuilder({
          targetChunkSize: 1000,
          minChunkSize: 100,
          spatialStrategy: 'type',
          compressionEnabled: false
        });
      }

      // Create ChunkManager
      const chunkManager = new ChunkManager({
        maxMemoryMB: 500,
        prefetchAhead: 2,
        compressionEnabled: false
      });

      // Build chunks
      const startTime = Date.now();
      const chunkResult = await this.chunkBuilder.buildChunksFromTypes(entities, entityIndex);
      const buildTime = Date.now() - startTime;

      // Initialize ChunkManager
      await chunkManager.initialize(chunkResult.indexBuffer);

      // Create registry entry
      const entry: ChunkRegistryEntry = {
        modelId,
        chunkManager,
        chunkResult,
        createdAt: new Date(),
        entityCount: entities.length,
        chunkCount: chunkResult.chunks.length,
        totalSize: chunkResult.totalSize
      };

      // Store in registry
      this.registry.set(modelId, entry);

      console.log(`✅ Chunks created for model ${modelId}:`);
      console.log(`  - Chunks: ${entry.chunkCount}`);
      console.log(`  - Entities: ${entry.entityCount}`);
      console.log(`  - Size: ${(entry.totalSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  - Build time: ${buildTime}ms`);

      return entry;

    } catch (error) {
      console.error(`❌ Failed to create chunks for model ${modelId}:`, error);
      return null;
    }
  }

  /**
   * Get memory usage for all models
   */
  getMemoryUsage(): { totalUsed: number; totalMax: number; modelCount: number } {
    let totalUsed = 0;
    let totalMax = 0;
    const modelCount = this.registry.size;

    for (const entry of this.registry.values()) {
      const stats = entry.chunkManager.getMemoryUsage();
      totalUsed += stats.usedMemory;
      totalMax += stats.maxMemory;
    }

    return { totalUsed, totalMax, modelCount };
  }

  /**
   * Get cache statistics for all models
   */
  getCacheStats(): { totalLoads: number; totalHits: number; totalMisses: number; averageHitRate: number } {
    let totalLoads = 0;
    let totalHits = 0;
    let totalMisses = 0;

    for (const entry of this.registry.values()) {
      const stats = entry.chunkManager.getCacheStats();
      totalLoads += stats.totalLoads;
      totalHits += stats.cacheHits;
      totalMisses += stats.cacheMisses;
    }

    const averageHitRate = totalLoads > 0 ? totalHits / totalLoads : 0;

    return { totalLoads, totalHits, totalMisses, averageHitRate };
  }

  /**
   * Clear chunks for a specific model
   */
  clearChunks(modelId: string): boolean {
    const entry = this.registry.get(modelId);
    if (entry) {
      // Cleanup ChunkManager
      // Note: ChunkManager doesn't have a cleanup method, but we can remove the reference
      this.registry.delete(modelId);
      console.log(`🗑️ Cleared chunks for model ${modelId}`);
      return true;
    }
    return false;
  }

  /**
   * Clear all chunks
   */
  clearAllChunks(): void {
    this.registry.clear();
    console.log('🗑️ Cleared all chunks from registry');
  }

  /**
   * Get all registered model IDs
   */
  getModelIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    modelCount: number;
    totalEntities: number;
    totalChunks: number;
    totalSize: number;
    memoryUsage: { totalUsed: number; totalMax: number };
    cacheStats: { totalLoads: number; totalHits: number; averageHitRate: number };
  } {
    let totalEntities = 0;
    let totalChunks = 0;
    let totalSize = 0;

    for (const entry of this.registry.values()) {
      totalEntities += entry.entityCount;
      totalChunks += entry.chunkCount;
      totalSize += entry.totalSize;
    }

    const memoryUsage = this.getMemoryUsage();
    const cacheStats = this.getCacheStats();

    return {
      modelCount: this.registry.size,
      totalEntities,
      totalChunks,
      totalSize,
      memoryUsage,
      cacheStats: {
        totalLoads: cacheStats.totalLoads,
        totalHits: cacheStats.totalHits,
        averageHitRate: cacheStats.averageHitRate
      }
    };
  }
}

// Global singleton instance
export const chunkRegistry = ChunkRegistry.getInstance(); 