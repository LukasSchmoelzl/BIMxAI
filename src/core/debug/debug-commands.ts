/**
 * Debug commands for BIM Context / Smart Chunks system
 * 
 * These commands are exposed on window.debug for development
 */

import { ChunkManager } from '@/core/chunks/chunk-manager';
import { CacheManager } from '@/app/bim-context/storage/cache-manager';
import { chunkLogger } from '@/app/bim-context/utils/enhanced-chunk-logger';

export interface DebugCommands {
  // Chunk inspection
  showChunk: (chunkId: string, showContent?: boolean) => void;
  listChunks: (limit?: number) => void;
  searchChunks: (query: string) => void;
  
  // Cache management
  showCache: (options?: { showContent?: boolean; chunkId?: string; limit?: number }) => void;
  clearCache: () => void;
  cacheStats: () => void;
  
  // Logging control
  enableLogging: () => void;
  disableLogging: () => void;
  showLogs: (limit?: number) => void;
  
  // Model info
  showModel: () => void;
  showEntities: (type?: string, limit?: number) => void;
  showStats: () => void;
  
  // Smart Chunks specific
  showManifest: (projectId?: string) => void;
  showChunkIndex: (projectId?: string) => void;
  analyzeTokenUsage: () => void;
}

export function initializeDebugCommands(): void {
  // Only initialize in development
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const debug: DebugCommands = {
    // Chunk inspection
    showChunk: (chunkId: string, showContent = false) => {
      const bimData = (window as any).__bimData;
      if (!bimData?.chunkManager) {
        console.log('❌ No chunk manager available');
        return;
      }
      
      const chunkManager = bimData.chunkManager as ChunkManager;
      const cacheManager = (chunkManager as any).cache as CacheManager;
      
      if (cacheManager?.debugInspectCache) {
        cacheManager.debugInspectCache({ chunkId, showContent });
      } else {
        console.log('❌ Cache manager debug not available');
      }
    },
    
    listChunks: (limit = 20) => {
      const bimData = (window as any).__bimData;
      const smartChunks = (window as any).__smartChunksData;
      
      if (smartChunks?.chunks) {
        console.log(`\n📦 Smart Chunks (${smartChunks.chunks.length} total):`);
        smartChunks.chunks.slice(0, limit).forEach((chunk: any, i: number) => {
          console.log(`${i + 1}. ${chunk.id}`);
          console.log(`   Type: ${chunk.type}, Tokens: ${chunk.tokenCount}`);
          console.log(`   Summary: ${chunk.summary}`);
          console.log(`   Entities: ${chunk.metadata?.entityCount || 0}`);
        });
        
        if (smartChunks.chunks.length > limit) {
          console.log(`\n... and ${smartChunks.chunks.length - limit} more chunks`);
        }
      } else if (bimData?.chunkManager) {
        console.log('📦 Legacy chunk system - use showCache() instead');
      } else {
        console.log('❌ No chunks available');
      }
    },
    
    searchChunks: (query: string) => {
      const smartChunks = (window as any).__smartChunksData;
      if (!smartChunks?.chunks) {
        console.log('❌ No smart chunks available');
        return;
      }
      
      const matches = smartChunks.chunks.filter((chunk: any) => 
        chunk.content?.toLowerCase().includes(query.toLowerCase()) ||
        chunk.summary?.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log(`\n🔍 Found ${matches.length} chunks matching "${query}":`);
      matches.slice(0, 10).forEach((chunk: any, i: number) => {
        console.log(`${i + 1}. ${chunk.id} (${chunk.type})`);
        
        // Show snippet
        const content = chunk.content || '';
        const index = content.toLowerCase().indexOf(query.toLowerCase());
        if (index >= 0) {
          const start = Math.max(0, index - 50);
          const end = Math.min(content.length, index + query.length + 50);
          console.log(`   "...${content.substring(start, end)}..."`);
        }
      });
    },
    
    // Cache management
    showCache: (options) => {
      const bimData = (window as any).__bimData;
      if (!bimData?.chunkManager) {
        console.log('❌ No chunk manager available');
        return;
      }
      
      const chunkManager = bimData.chunkManager as ChunkManager;
      const cacheManager = (chunkManager as any).cache as CacheManager;
      
      if (cacheManager?.debugInspectCache) {
        cacheManager.debugInspectCache(options);
      } else {
        console.log('❌ Cache manager not available');
      }
    },
    
    clearCache: () => {
      const bimData = (window as any).__bimData;
      if (!bimData?.chunkManager) {
        console.log('❌ No chunk manager available');
        return;
      }
      
      const chunkManager = bimData.chunkManager as ChunkManager;
      (chunkManager as any).cache?.clear();
      console.log('✅ Cache cleared');
    },
    
    cacheStats: () => {
      const bimData = (window as any).__bimData;
      if (!bimData?.chunkManager) {
        console.log('❌ No chunk manager available');
        return;
      }
      
      const chunkManager = bimData.chunkManager as ChunkManager;
      const stats = chunkManager.getMemoryStats();
      console.log('\n📊 Cache Statistics:');
      console.log(`- Used Memory: ${(stats.usedMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Max Memory: ${(stats.maxMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`- Loaded Chunks: ${stats.loadedChunks}`);
      console.log(`- Cached Chunks: ${stats.cachedChunks}`);
      console.log(`- Evicted Chunks: ${stats.evictedChunks}`);
    },
    
    // Logging control
    enableLogging: () => {
      chunkLogger.enable();
      console.log('✅ Chunk logging enabled');
    },
    
    disableLogging: () => {
      chunkLogger.disable();
      console.log('✅ Chunk logging disabled');
    },
    
    showLogs: (limit = 50) => {
      const logs = chunkLogger.getLogs();
      console.log(`\n📋 Recent logs (${logs.length} total):`);
      logs.slice(-limit).forEach(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const icon = log.level === 'error' ? '❌' : 
                     log.level === 'warn' ? '⚠️' : 
                     log.level === 'debug' ? '🔍' : 'ℹ️';
        console.log(`${time} ${icon} ${log.message}`, log.data || '');
      });
    },
    
    // Model info
    showModel: () => {
      const bimData = (window as any).__bimData;
      const smartChunks = (window as any).__smartChunksData;
      
      console.log('\n🏗️ Model Information:');
      
      if (bimData) {
        console.log('Legacy System:');
        console.log(`- Entities: ${bimData.entities?.length || 0}`);
        console.log(`- Types: ${Object.keys(bimData.entityIndex || {}).join(', ')}`);
        console.log(`- Spatial Index: ${bimData.spatialIndex ? 'Yes' : 'No'}`);
        console.log(`- Chunk Manager: ${bimData.chunkManager ? 'Yes' : 'No'}`);
      }
      
      if (smartChunks) {
        console.log('\nSmart Chunks System:');
        console.log(`- Project ID: ${(window as any).__smartChunksProjectId}`);
        console.log(`- Total Chunks: ${smartChunks.chunks?.length || 0}`);
        console.log(`- Total Entities: ${smartChunks.manifest?.totalEntities || 0}`);
        console.log(`- Total Tokens: ${smartChunks.manifest?.totalTokens || 0}`);
      }
      
      if (!bimData && !smartChunks) {
        console.log('❌ No model loaded');
      }
    },
    
    showEntities: (type?: string, limit = 10) => {
      const bimData = (window as any).__bimData;
      const entities = bimData?.entities || [];
      
      if (entities.length === 0) {
        console.log('❌ No entities loaded');
        return;
      }
      
      const filtered = type 
        ? entities.filter((e: any) => e.type === type)
        : entities;
      
      console.log(`\n🏢 Entities ${type ? `of type ${type}` : ''} (${filtered.length} total):`);
      filtered.slice(0, limit).forEach((entity: any, i: number) => {
        console.log(`${i + 1}. ${entity.type} - ${entity.name || 'Unnamed'} (ID: ${entity.expressID})`);
        if (entity.properties && Object.keys(entity.properties).length > 0) {
          console.log(`   Properties: ${Object.keys(entity.properties).slice(0, 5).join(', ')}`);
        }
      });
      
      if (filtered.length > limit) {
        console.log(`\n... and ${filtered.length - limit} more`);
      }
    },
    
    showStats: () => {
      const stats = chunkLogger.getStats();
      console.log('\n📊 Processing Statistics:');
      console.log(`- Total Entities: ${stats.totalEntities}`);
      console.log(`- Chunks Created: ${stats.chunksCreated}`);
      console.log(`- Attributes Extracted: ${stats.attributesExtracted}`);
      console.log(`- PSets Extracted: ${stats.psetsExtracted}`);
      console.log(`- Geometries Extracted: ${stats.geometriesExtracted}`);
      console.log(`- Processing Time: ${(stats.processingTime / 1000).toFixed(2)}s`);
    },
    
    // Smart Chunks specific
    showManifest: (projectId?: string) => {
      const smartChunks = (window as any).__smartChunksData;
      const id = projectId || (window as any).__smartChunksProjectId;
      
      if (!smartChunks?.manifest) {
        console.log('❌ No Smart Chunks manifest available');
        return;
      }
      
      console.log('\n📄 Smart Chunks Manifest:');
      console.log(JSON.stringify(smartChunks.manifest, null, 2));
    },
    
    showChunkIndex: (projectId?: string) => {
      const smartChunks = (window as any).__smartChunksData;
      
      if (!smartChunks?.manifest?.index) {
        console.log('❌ No chunk index available');
        return;
      }
      
      const index = smartChunks.manifest.index;
      console.log('\n🗂️ Chunk Index:');
      console.log('By Type:', Object.keys(index.byType));
      console.log('By Entity Type:', Object.keys(index.byEntityType));
      console.log('By Floor:', Object.keys(index.byFloor));
      console.log('By System:', Object.keys(index.bySystem));
      console.log('Spatial Chunks:', index.spatial?.chunks?.length || 0);
    },
    
    analyzeTokenUsage: () => {
      const smartChunks = (window as any).__smartChunksData;
      
      if (!smartChunks?.chunks) {
        console.log('❌ No chunks available for analysis');
        return;
      }
      
      const chunks = smartChunks.chunks;
      const totalTokens = chunks.reduce((sum: number, c: any) => sum + (c.tokenCount || 0), 0);
      const avgTokens = totalTokens / chunks.length;
      const minTokens = Math.min(...chunks.map((c: any) => c.tokenCount || 0));
      const maxTokens = Math.max(...chunks.map((c: any) => c.tokenCount || 0));
      
      console.log('\n📊 Token Usage Analysis:');
      console.log(`- Total Tokens: ${totalTokens.toLocaleString()}`);
      console.log(`- Average per Chunk: ${Math.round(avgTokens).toLocaleString()}`);
      console.log(`- Min Tokens: ${minTokens.toLocaleString()}`);
      console.log(`- Max Tokens: ${maxTokens.toLocaleString()}`);
      
      // Distribution
      const distribution: Record<string, number> = {
        '0-1000': 0,
        '1000-2000': 0,
        '2000-3000': 0,
        '3000-4000': 0,
        '4000+': 0
      };
      
      chunks.forEach((c: any) => {
        const tokens = c.tokenCount || 0;
        if (tokens < 1000) distribution['0-1000']++;
        else if (tokens < 2000) distribution['1000-2000']++;
        else if (tokens < 3000) distribution['2000-3000']++;
        else if (tokens < 4000) distribution['3000-4000']++;
        else distribution['4000+']++;
      });
      
      console.log('\nToken Distribution:');
      Object.entries(distribution).forEach(([range, count]) => {
        const percentage = ((count / chunks.length) * 100).toFixed(1);
        console.log(`- ${range}: ${count} chunks (${percentage}%)`);
      });
    }
  };
  
  // Expose on window
  (window as any).debug = debug;
  
  console.log('🐛 Debug commands initialized. Type "debug" in console to see available commands.');
  console.log('Available commands:', Object.keys(debug).join(', '));
}