// BIM AI Tools Module - Consolidated tool set for BIM model interaction

// Core Infrastructure
export { 
  ToolRegistry
} from './tool-registry';

export { 
  ToolChainExecutor
} from './tool-chain-executor';

export {
  ImprovedToolChainExecutor
} from './improved-tool-chain-executor';

// Main BIM Tools (6 consolidated tools)

// 1. Universal Search Tool (combines search, count, progressive search)
export { createBimUniversalSearchTool } from './bim-universal-search-tool';
export { createBimUniversalSearchToolOld } from './bim-universal-search-tool-old';

// 2. Entity Detail Tool
export { createBimEntityDetailTool } from './bim-entity-detail-tool';

// 3. Type List Tool
export { createBimTypeListTool } from './bim-type-list-tool';

// 4. Spatial & Geometry Tool (combines spatial search and geometry analysis)
export { createBimSpatialGeometryTool } from './bim-spatial-geometry-tool';

// 5. Visualization Tool
export { createBimHighlightTool } from './bim-highlight-tool';

// 6. Chunk Management Tool (combines status and analysis)
export { createBimChunkManagementTool } from './bim-chunk-management-tool';

// Context Tools
export { bimSelectionContextTool } from './bim-selection-context-tool';

// Type exports
export type { 
  Tool, 
  ToolCall, 
  ToolChainResult 
} from './tool-registry';

export type { 
  ToolChainConfig 
} from './tool-chain-executor';