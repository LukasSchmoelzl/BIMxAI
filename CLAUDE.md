# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run dev              # Start dev server on http://localhost:3010
npm run build            # Production build
npm run start            # Start production server on port 3010
npm run lint             # Run Next.js ESLint configuration
```

### Code Generation
```bash
npm run generate:schemas    # Regenerate FlatBuffer TypeScript definitions from .fbs files
npm run generate:fragments  # Generate fragment data from IFC models
npm run audit:css          # Audit CSS usage in the project
```

## Architecture

### Core Architecture Pattern
This is a Next.js 15 application with a client-only rendering approach to avoid SSR issues with WebGL/Three.js components.

**Key Design Decision**: The entire app is wrapped in a single dynamic import with `ssr: false` in `src/app/page.tsx`, loading `ClientApp.tsx` which contains all client-side logic. This eliminates SSR-related errors while maintaining Next.js routing and build benefits.

### Event-Driven Architecture
The codebase uses a centralized Event Bus (`src/core/events/event-bus.ts`) for loose coupling:
- Type-safe events with TypeScript mapped types
- Key events: `entities:loaded`, `highlight:entities`, `model:loaded`, `chunks:ready`, `fragment:loaded`, `entity:clicked`, `smartchunks:ready`
- EventBus.on() returns an unsubscribe function - there is no EventBus.off() method
- EventBus is exposed globally via `window.EventBus`

### AI Pipeline Pattern
The Claude integration follows a three-phase pipeline:
1. **Plan Phase**: Analyze query and select tools
2. **Execute Phase**: Run tools with context assembly
3. **Format Phase**: Generate natural language response

Key files:
- `src/features/ai/components/SmartChunksPipeline.tsx`: Smart chunks-aware pipeline
- `src/app/chat-tools/improved-tool-chain-executor.ts`: Enhanced tool execution
- `src/app/chat-tools/tool-registry.ts`: Tool registry with 6 consolidated tools

### Smart Chunks System
Memory-efficient BIM data processing:
- Chunk-based loading with LRU cache
- Spatial indexing using Octree for 3D queries
- FlatBuffers for binary serialization
- Token limits (target: 3000, max: 4000)
- Automatically activated when Smart Chunks data is available

Key files:
- `src/app/bim-context/storage/cache-manager.ts`: Core chunk management
- `src/app/bim-context/chunking/smart-chunker.ts`: Advanced chunking strategies
- `src/app/bim-context/selection/context-assembler.ts`: AI context optimization

### BIM Viewer Integration
The 3D viewer uses @thatopen/components v3 and @thatopen/fragments v3:
- Fragment-based model loading (.frag files)
- Entity highlighting via native Fragment API (model.highlight())
- Automatic bridge.frag model loading on startup
- All BIM components use normal imports (no dynamic) since the entire app is client-only

Key files:
- `src/app/bim-viewer/useViewerV3.ts`: Core viewer hook with initialization
- `src/app/bim-viewer/BimViewer.tsx`: Main viewer component
- `src/app/bim-viewer/FragmentHighlighter.tsx`: Entity highlighting using native API

### Data Access Patterns
Global model data is stored in `window.__bimData`:
```typescript
window.__bimData = {
  fragmentsManager,
  model,
  indexMap,
  allFragments,
  entities,         // Array of all entities
  entityIndex,      // Index by type
  entityTypes,      // Available types
  spatialIndex,
  octreeData,
  chunkManager,
  smartChunks: {
    projectId: string
  }
}
```

Smart Chunks project ID is also stored in `window.__smartChunksProjectId`

### Claude AI Tools
Current tool set (6 consolidated tools):
- `bim-universal-search-tool`: Unified search, count, and progressive search
- `bim-entity-detail-tool`: Detailed entity information
- `bim-type-list-tool`: Entity type enumeration
- `bim-spatial-geometry-tool`: Spatial queries and geometric analysis
- `bim-highlight-tool`: Visualization and highlighting
- `bim-chunk-management-tool`: Chunk status and analysis

### CSS Architecture
- **DRY Principle**: All CSS variables defined in `src/styles/`
- **No Fallbacks**: TSX files should not contain CSS variable fallbacks
- **Variable Access**: Use `src/utils/css-variables.ts` to access CSS variables programmatically
- CSS files are imported in `src/app/layout.tsx` in this order:
  1. `globals.css`
  2. `color-palette.css`
  3. `layout-variables.css`
  4. `main.css`
  5. `chat-message.css`

### UI Architecture
- **Bento Box Layout**: Resizable layout system with defined areas (header, viewer, chat)
- **Tailwind CSS**: With custom dark mode support via class strategy
- **Radix UI**: Component library for accessible UI primitives
- **Custom UI Components**: Located in `src/components/ui-ls/`

### Environment Variables
Required for local development:
```bash
ANTHROPIC_API_KEY=sk-ant-...  # Claude API key
```

### Performance Considerations
- TypeScript strict mode is disabled - be careful with type safety
- React StrictMode only enabled in production
- Worker threads used for heavy computations
- Fragment loading includes camera initialization checks
- ESLint build errors are ignored in production builds

### Debugging
Debug utilities are located in `src/core/debug/`. Comprehensive debug commands are available in development mode. See [docs/DEBUG_COMMANDS.md](./docs/DEBUG_COMMANDS.md) for details.

Quick examples:
```javascript
debug.showChunk('chunk-id', true)  // Show chunk with content
debug.listChunks(50)               // List first 50 chunks
debug.searchChunks('wall')         // Search chunks for "wall"
debug.cacheStats()                 // Show cache statistics
```

### Configuration
Smart Chunks configuration in `src/app/bim-context/config.ts`:
- Token limits (target: 3000, max: 4000)
- Storage paths for projects
- Processing options (spatial index, relationships, compression)
- API limits (100MB upload, 60s timeout)

### Project Structure
```
src/
├── app/                    # Next.js app directory
│   ├── bim-viewer/        # 3D viewer components
│   ├── bim-context/       # Smart chunks system
│   └── chat-tools/        # AI tool implementations
├── features/              # Feature-based modules (ai, chat)
├── core/                  # Core utilities
│   ├── events/           # Event bus system
│   ├── chunks/           # Chunk management
│   ├── debug/            # Debug utilities
│   └── spatial/          # Spatial indexing (Octree)
├── components/            # Shared components
│   ├── ui/               # Base UI components
│   └── ui-ls/            # Custom UI library components
├── types/                # TypeScript type definitions
│   └── base.ts          # Shared base types (Vec3, BoundingBox, etc.)
├── styles/               # Global CSS and variables
└── utils/               # Utility functions
    └── css-variables.ts # CSS variable access helpers

docs/                      # Documentation
├── DEBUG_COMMANDS.md     # Debug commands reference
└── ...
```

### Security & Headers
- Custom security headers configured in next.config.ts
- WASM MIME type properly configured for web-ifc
- HSTS header enforcement