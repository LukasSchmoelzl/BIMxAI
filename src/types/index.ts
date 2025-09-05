// Centralized type exports
// Only re-exporting actually used type files - cleaned up unused exports

export * from './base';      // Core geometry types (Vec3, BoundingBox, etc.)
export * from './events';    // Event system types (EventMap, EventHandler, etc.)
export * from './chat';      // Chat-related types
export * from './bim';       // BIM entity types
export * from './chunks';    // Smart chunks types
export * from './selection'; // Context selection types
export * from './tools';     // Tool execution types
export * from './api';       // Error classes (StorageError, etc.)
export * from './utils';     // Utility types (ChunkLogEntry, etc.)
export * from './ui';        // UI component types
export * from './spatial';   // Spatial query types
export * from './bento-types'; // Bento layout types
export * from './claude';    // Claude API types