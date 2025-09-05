// Chunk-spezifische TypeScript Types

// Chunk Builder Types
export interface ChunkBuilderOptions {
  targetChunkSize: number;      // Target entities per chunk
  minChunkSize: number;         // Minimum entities per chunk
  spatialStrategy: 'octree' | 'grid' | 'type';
  compressionEnabled: boolean;
}

export interface ChunkBuildResult {
  chunks: any[]; // Chunk[]
  indexBuffer: Uint8Array;
  totalEntities: number;
  totalSize: number;
}

// Chunk Manager Types
export interface ChunkManagerOptions {
  maxMemoryMB: number;
  prefetchAhead: number;
  compressionEnabled: boolean;
}

export interface MemoryStats {
  usedMemory: number;
  maxMemory: number;
  loadedChunks: number;
  cachedChunks: number;
  evictedChunks: number;
}

export interface ChunkLoadResult {
  chunk: any; // Chunk
  fromCache: boolean;
  loadTimeMs: number;
}

// Chunk Registry Types
export interface ChunkRegistryEntry {
  modelId: string;
  chunkManager: any; // ChunkManager
  chunkResult: any;
  createdAt: Date;
  entityCount: number;
  chunkCount: number;
  totalSize: number;
}

// Smart Chunks Types

// BoundingBox definition (moved from spatial.ts)
export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

// Metadata for a chunk
export interface ChunkMetadata {
  floor?: number;
  zone?: string;
  bbox?: BoundingBox;
  entityTypes: string[];
  entityCount: number;
  entityIds: number[];
  system?: string;
  properties?: string[];
  relationships?: string[];
  aggregates?: {
    totalVolume?: number;
    totalArea?: number;
    totalWeight?: number;
    volumeByMaterial?: Record<string, number>;
  };
  queryPattern?: string;
  groupKey?: string;
}

// Main chunk interface
export interface SmartChunk {
  id: string;
  projectId: string;
  type: 'spatial' | 'system' | 'element-type' | 'hybrid';
  content: string;
  summary: string;
  metadata: ChunkMetadata & {
    relevanceScore?: number;
    timestamp?: number;
    spatialInfo?: {
      floor?: number;
      zone?: string;
      building?: string;
    };
  };
  tokenCount: number;
  created: Date;
  version: number;
  queryPattern?: string;
}

// Summary of a chunk for manifest
export interface ChunkSummary {
  id: string;
  type: SmartChunk['type'];
  summary: string;
  tokenCount: number;
  entityCount: number;
  keywords: string[];
}

// Index for fast chunk lookup
export interface ChunkIndex {
  byType: Record<string, string[]>;
  byEntityType: Record<string, string[]>;
  byFloor: Record<number, string[]>;
  bySystem: Record<string, string[]>;
  spatial: {
    chunks: Array<{
      id: string;
      bbox: BoundingBox;
    }>;
  };
}

// Project manifest
export interface ProjectManifest {
  projectId: string;
  name: string;
  totalChunks: number;
  totalEntities: number;
  totalTokens: number;
  created: Date;
  updated: Date;
  chunks: ChunkSummary[];
  index: ChunkIndex;
  metadata: {
    fileName: string;
    fileSize: number;
    processingTime: number;
    version: string;
  };
}

// Query context for chunk selection
export interface QueryContext {
  query: string;
  requestedEntityTypes?: string[];
  spatialBounds?: BoundingBox;
  floor?: number;
  system?: string;
  maxTokens: number;
  relevanceThreshold: number;
}

// Chunk selection result
export interface ChunkSelectionResult {
  chunks: SmartChunk[];
  selectedChunks?: SmartChunk[];
  totalTokens: number;
  relevanceScores: Record<string, number>;
  reason: string;
  queryAnalysis?: any;
  metrics?: any;
  formattedContext?: string[];
  processingTime?: number;
}

// Processing options
export interface ChunkingOptions {
  targetTokenSize: number;
  maxTokenSize: number;
  overlapTokens: number;
  includeRelationships: boolean;
  includeSpatialIndex: boolean;
}

// Processing result
export interface ChunkingResult {
  manifest: ProjectManifest;
  chunks: SmartChunk[];
  processingTime: number;
  warnings?: string[];
}

// Chunking Strategy Interface
export interface ChunkingStrategy {
  name: string;
  type: SmartChunk['type'];
  
  /**
   * Check if this strategy applies to the given entities
   */
  canProcess(entities: any[]): boolean;
  
  /**
   * Process entities into chunks
   */
  process(
    entities: any[],
    projectId: string,
    options: {
      targetTokenSize: number;
      maxTokenSize: number;
    }
  ): SmartChunk[] | Promise<SmartChunk[]>;
}

// Direct Selection Parameters for Context Selection
export interface DirectSelectionParams {
  entityTypes?: string[];
  floor?: number;
  system?: string;
  spatialTerms?: string[];
  keywords?: string[];
  queryType?: 'count' | 'find' | 'spatial' | 'system' | 'general';
  maxTokens?: number;
}

// Index Collection for chunk lookups
export interface IndexCollection {
  byType?: Record<string, string[]>;
  byEntityType?: Record<string, string[]>;
  byFloor?: Record<number, string[]>;
  bySystem?: Record<string, string[]>;
  spatial?: Record<string, string[]>;
}

// Chunk Selection Metrics
export interface ChunkSelectionMetrics {
  coverage: number;
  relevanceScore: number;
  diversityScore: number;
  tokenEfficiency: number;
}

// MVP Configuration for Smart Chunks
export interface MVPConfig {
  // Token limits
  tokens: {
    targetChunkSize: number;
    maxChunkSize: number;
    overlapSize: number;
    maxContextSize: number;
  };
  
  // Storage paths
  storage: {
    basePath: string;
    projectsPath: string;
  };
  
  // Processing options
  processing: {
    enableSpatialIndex: boolean;
    enableRelationships: boolean;
    compressionEnabled: boolean;
  };
  
  // API limits
  api: {
    maxUploadSize: number; // in bytes
    maxProjectsPerUser: number;
    requestTimeout: number; // in ms
  };
  
  // Feature flags
  features: {
    debugMode: boolean;
    cachingEnabled: boolean;
    asyncProcessing: boolean;
  };
} 