/* ===== UTILITY TYPES ===== */
/* Only the actually used utility types - cleaned up unused exports */

// ===== CHUNK LOGGING ===== (Used in enhanced-chunk-logger.ts)

export interface ChunkCreationStats {
  totalEntities: number;
  chunksCreated: number;
  attributesExtracted: number;
  psetsExtracted: number;
  geometriesExtracted: number;
  processingTime: number;
  memoryUsed?: number;
}

export interface ChunkLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

// ===== QUERY CACHE ===== (Used in cache-manager.ts)

export interface QueryCache {
  key: string;
  result: any;
  timestamp: Date;
  executionTime: number;
} 