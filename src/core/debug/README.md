# Debug Module

This module provides debugging utilities for the BIM Context / Smart Chunks system.

## Structure

```
debug/
├── index.ts              # Module exports
├── debug-commands.ts     # Global debug commands (window.debug)
├── chunk-debug.ts        # Chunk-specific debug utilities
├── cache-debug.ts        # Cache-specific debug utilities
└── README.md            # This file
```

## Usage

### Global Debug Commands

The debug commands are automatically initialized in development mode:

```javascript
// In browser console
debug.showChunk('chunk-id', true)
debug.listChunks()
debug.cacheStats()
```

### Programmatic Usage

```typescript
import { debugInspectChunk, analyzeCachePerformance } from '@/core/debug';

// Debug a specific chunk
debugInspectChunk(chunk, {
  showFullContent: true,
  showTokenAnalysis: true
});

// Analyze cache performance
analyzeCachePerformance(cacheManager);
```

## Features

### Chunk Debugging
- Inspect chunk content and metadata
- Analyze token distribution
- Search chunks by content
- View chunk summaries

### Cache Debugging
- View cache statistics
- Inspect cached items
- Analyze cache performance
- Clear cache

### Model Debugging
- View loaded entities
- Inspect entity properties
- Show model statistics
- List entity types

## Documentation

For complete documentation of all debug commands, see [docs/DEBUG_COMMANDS.md](../../../docs/DEBUG_COMMANDS.md).