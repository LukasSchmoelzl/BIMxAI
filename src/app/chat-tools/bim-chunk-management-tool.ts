import { Tool } from './tool-registry';
import { ChunkManager } from '@/core/chunks/chunk-manager';

interface ChunkManagementParams {
  operation: 'status' | 'analyze' | 'optimize';
  chunkId?: string;
}

export const createBimChunkManagementTool = (chunkManager: ChunkManager | null): Tool => ({
  name: 'bim_chunk_management',
  description: 'Manage and analyze the chunk system for performance optimization. Shows memory usage, cache statistics, and chunk distribution.',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['status', 'analyze', 'optimize'],
        description: 'Operation: status (current state), analyze (detailed analysis), optimize (trigger optimization)'
      },
      chunkId: {
        type: 'string',
        description: 'Optional: specific chunk ID to analyze'
      }
    },
    required: ['operation']
  },
  execute: async (params) => {
    const { operation, chunkId } = params as ChunkManagementParams;
    
    if (!chunkManager) {
      return {
        error: 'Chunk system not available',
        message: 'The model was loaded without chunk support'
      };
    }
    
    console.log(`📊 [bim_chunk_management] Operation: ${operation}`);
    
    switch (operation) {
      case 'status': {
        const stats = chunkManager.getStats();
        const memoryUsage = process.memoryUsage();
        
        return {
          operation: 'status',
          chunks: {
            total: stats.totalChunks,
            loaded: stats.loadedChunks,
            cached: stats.cachedChunks,
            avgSize: Math.round(stats.averageChunkSize / 1024) + 'KB'
          },
          memory: {
            heap: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
            usage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100) + '%'
          },
          cache: {
            hitRate: Math.round(stats.cacheHitRate * 100) + '%',
            evictions: stats.evictionCount
          }
        };
      }
      
      case 'analyze': {
        const stats = chunkManager.getStats();
        const chunkDistribution: Record<string, number> = {};
        
        // Analyze chunk distribution if specific chunk requested
        if (chunkId) {
          const chunk = await chunkManager.getChunk(chunkId);
          if (chunk) {
            return {
              operation: 'analyze',
              chunkId,
              entityCount: chunk.entityCount,
              size: Math.round(chunk.size / 1024) + 'KB',
              types: chunk.entityTypes,
              cached: chunk.cached,
              lastAccess: chunk.lastAccess
            };
          }
        }
        
        // General analysis
        const allChunks = chunkManager.getAllChunkIds();
        for (const id of allChunks) {
          const chunk = await chunkManager.getChunk(id);
          if (chunk) {
            const typeKey = chunk.entityTypes.join(',');
            chunkDistribution[typeKey] = (chunkDistribution[typeKey] || 0) + 1;
          }
        }
        
        return {
          operation: 'analyze',
          totalChunks: stats.totalChunks,
          distribution: chunkDistribution,
          performance: {
            cacheEfficiency: Math.round(stats.cacheHitRate * 100) + '%',
            avgLoadTime: stats.averageLoadTime + 'ms',
            fragmentationLevel: stats.fragmentationLevel || 'low'
          },
          recommendations: [
            stats.cacheHitRate < 0.7 ? 'Consider increasing cache size' : null,
            stats.evictionCount > stats.totalChunks ? 'High eviction rate detected' : null,
            stats.averageChunkSize > 1024 * 1024 ? 'Large chunks detected, consider splitting' : null
          ].filter(Boolean)
        };
      }
      
      case 'optimize': {
        // Trigger optimization
        console.log('🔧 Triggering chunk optimization...');
        
        // Clear low-priority chunks
        const cleared = await chunkManager.clearCache(0.5); // Keep 50% most used
        
        // Defragment if available
        if (typeof chunkManager.defragment === 'function') {
          await chunkManager.defragment();
        }
        
        return {
          operation: 'optimize',
          cleared: cleared,
          message: `Optimization complete. Cleared ${cleared} low-priority chunks.`
        };
      }
      
      default:
        return { error: 'Unknown operation' };
    }
  }
});