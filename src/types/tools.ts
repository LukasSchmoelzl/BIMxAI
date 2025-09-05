// Tool-spezifische TypeScript Types

// Tool Definition Types
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  execute: (params: Record<string, unknown>) => Promise<unknown>;
  validate?: (params: any) => ValidationResult;
}

// Tool Call Types
export interface ToolCall {
  tool: string;
  parameters: Record<string, unknown>;
  thought?: string;
}

// Tool Chain Types
export interface ToolChainResult {
  toolCalls: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: unknown;
    duration: number;
  }>;
  finalAnswer: string;
  error?: {
    message: string;
    code: string;
    status?: number;
    retry_after?: number;
  };
}

export interface ToolChainConfig {
  maxIterations?: number;
  includeThoughts?: boolean;
  retryOnError?: boolean;
  model?: string;
  maxRetries?: number;
  timeout?: number;
  parallel?: boolean;
  stopOnError?: boolean;
  context?: Record<string, any>;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Tool Registry Types
export interface ToolRegistry {
  tools: Map<string, Tool>;
  register(tool: Tool): void;
  unregister(name: string): void;
  get(name: string): Tool | undefined;
  list(): string[];
  validate(name: string, params: any): ValidationResult;
}

// Claude Tool Types
export interface ClaudeToolConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  tools: Tool[];
}

export interface ClaudeToolCall {
  tool: string;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
  duration?: number;
}

// Tool Decision Schema for improved tool chain executor
export interface ToolDecisionSchema {
  thought?: string;
  toolCalls?: Array<{
    tool: string;
    parameters: Record<string, any>;
  }>;
  finalAnswer?: string;
}

// Tool Decision Result
export interface ToolDecisionResult {
  thought?: string;
  toolCalls?: Array<{
    tool: string;
    parameters: Record<string, any>;
  }>;
  finalAnswer?: string;
  error?: {
    message: string;
    code: string;
    details?: any;
    retry?: boolean;
  };
  warning?: string;
}

// Entity Chunk Data for selection context tool
export interface EntityChunkData {
  localId: number;
  expressId?: number;
  globalId?: string;
  attributes: Record<string, any>;
  psets: Record<string, Record<string, any>>;
  geometry?: {
    vertexCount: number;
    triangleCount: number;
    boundingBox?: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  };
  category?: string;
  name?: string;
  description?: string;
}

// Spatial Geometry Parameters
export interface SpatialGeometryParams {
  operation: 'bounds' | 'volume' | 'area' | 'spatial_search' | 'geometry_info';
  entityIds?: number[];
  region?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
    minZ?: number;
    maxZ?: number;
  };
  nearPoint?: { x: number; y: number; z: number };
  radius?: number;
} 