/**
 * Smart Chunks MVP - Main export file
 */


// Types are now centralized in @/types

// Chunking
export { SmartChunker } from './chunking/smart-chunker';
// (ChunkingStrategy is not exported as a type from chunk-strategies)
export { 
  SpatialChunkingStrategy,
  SystemChunkingStrategy,
  ElementTypeChunkingStrategy,
  createDefaultStrategies
} from './chunking/chunk-strategies';

// Selection
export { ContextSelector } from './selection/context-selector';
export { SimplifiedContextSelector } from './selection/context-selector-simplified';
// DirectSelectionParams is defined in '@/types/selection' and should be imported from there

// Utils
export { chunkLogger } from './utils/enhanced-chunk-logger';
export { ChunkLogger } from './utils/chunk-logger';