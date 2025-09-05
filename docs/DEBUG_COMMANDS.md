# Debug Commands Documentation

This document describes all available debug commands for the BIM Context / Smart Chunks system. These commands are only available in development mode.

## How to Use

1. Open the browser console (F12)
2. Type `debug` to see all available commands
3. Use commands like `debug.showChunk('chunk-id')`

## Available Commands

### 📦 Chunk Inspection

#### `debug.showChunk(chunkId, showContent?)`
Shows information about a specific chunk.
```javascript
// Show chunk metadata only
debug.showChunk('bridge_1754482484863_project-spatial-0-1754482485123')

// Show chunk with content (first 1000 chars)
debug.showChunk('bridge_1754482484863_project-spatial-0-1754482485123', true)
```

#### `debug.listChunks(limit?)`
Lists all available chunks with summaries.
```javascript
// Show first 20 chunks (default)
debug.listChunks()

// Show first 50 chunks
debug.listChunks(50)
```

#### `debug.searchChunks(query)`
Search for chunks containing specific text.
```javascript
// Find chunks mentioning "wall"
debug.searchChunks('wall')

// Find chunks with specific properties
debug.searchChunks('LoadBearing')
```

### 💾 Cache Management

#### `debug.showCache(options?)`
Inspect cache contents and status.
```javascript
// Show cache overview
debug.showCache()

// Show specific cached chunk
debug.showCache({ chunkId: 'chunk-123' })

// Show cache with content
debug.showCache({ showContent: true, limit: 5 })
```

#### `debug.clearCache()`
Clear the entire cache.
```javascript
debug.clearCache()
```

#### `debug.cacheStats()`
Show detailed cache statistics.
```javascript
debug.cacheStats()
// Output:
// - Used Memory: 12.34 MB
// - Max Memory: 512.00 MB
// - Loaded Chunks: 45
// - Cached Chunks: 38
// - Evicted Chunks: 7
```

### 📋 Logging Control

#### `debug.enableLogging()`
Enable detailed chunk processing logs.
```javascript
debug.enableLogging()
```

#### `debug.disableLogging()`
Disable chunk processing logs.
```javascript
debug.disableLogging()
```

#### `debug.showLogs(limit?)`
Show recent log entries.
```javascript
// Show last 50 logs (default)
debug.showLogs()

// Show last 100 logs
debug.showLogs(100)
```

### 🏗️ Model Information

#### `debug.showModel()`
Display loaded model information.
```javascript
debug.showModel()
// Shows:
// - Entity count
// - Entity types
// - Smart chunks status
// - Spatial index availability
```

#### `debug.showEntities(type?, limit?)`
Show entities in the model.
```javascript
// Show first 10 entities of any type
debug.showEntities()

// Show all walls
debug.showEntities('IFCWALL')

// Show first 50 doors
debug.showEntities('IFCDOOR', 50)
```

#### `debug.showStats()`
Show processing statistics.
```javascript
debug.showStats()
// Shows:
// - Total entities processed
// - Chunks created
// - Attributes extracted
// - Processing time
```

### 🧩 Smart Chunks Specific

#### `debug.showManifest(projectId?)`
Display the Smart Chunks project manifest.
```javascript
// Show current project manifest
debug.showManifest()

// Show specific project manifest
debug.showManifest('bridge_1754482484863_project')
```

#### `debug.showChunkIndex(projectId?)`
Show how chunks are indexed.
```javascript
debug.showChunkIndex()
// Shows:
// - Chunks by type (spatial, system, etc.)
// - Chunks by entity type (IFCWALL, etc.)
// - Chunks by floor
// - Chunks by system
```

#### `debug.analyzeTokenUsage()`
Analyze token distribution across chunks.
```javascript
debug.analyzeTokenUsage()
// Shows:
// - Total tokens
// - Average tokens per chunk
// - Min/max tokens
// - Token distribution histogram
```

## Example Workflows

### 1. Debugging Slow Queries
```javascript
// Enable logging to see what's happening
debug.enableLogging()

// Check cache status
debug.cacheStats()

// Search for specific content
debug.searchChunks('column')

// Inspect a specific chunk that was found
debug.showChunk('chunk-id', true)
```

### 2. Memory Optimization
```javascript
// Check current memory usage
debug.cacheStats()

// See what's cached
debug.showCache({ limit: 20 })

// Clear cache if needed
debug.clearCache()

// Verify memory was freed
debug.cacheStats()
```

### 3. Understanding Model Structure
```javascript
// Get overview
debug.showModel()

// List entity types and counts
debug.showEntities()

// Inspect specific type
debug.showEntities('IFCPROPERTYSET', 20)

// Analyze chunk organization
debug.showChunkIndex()
```

### 4. Token Optimization
```javascript
// Analyze current token usage
debug.analyzeTokenUsage()

// Find large chunks
debug.listChunks(100)

// Inspect specific large chunk
debug.showChunk('large-chunk-id', true)
```

## Tips

1. **Performance**: Some commands like `searchChunks` may be slow on large models
2. **Memory**: Showing content of many chunks can use significant memory
3. **Development Only**: These commands are not available in production builds
4. **Auto-complete**: Most modern browsers support auto-complete for object properties, so typing `debug.` will show available commands

## Common Issues

### "No chunk manager available"
The model hasn't finished loading yet. Wait for the "chunks:ready" event.

### "No smart chunks available"
The model was loaded without Smart Chunks enabled. Check if Smart Chunks is activated in settings.

### "Cache manager not available"
The legacy chunk system is being used instead of Smart Chunks.

## Additional Global Objects

Besides `debug`, these objects are also available in development:

- `window.__bimData` - Legacy BIM data structure
- `window.__smartChunksData` - Smart Chunks data
- `window.__smartChunksProjectId` - Current Smart Chunks project ID
- `window.EventBus` - Global event bus for debugging events