/* ===== SELECTION TYPES ===== */
/* Centralized types for chunk selection and context assembly */

import { SmartChunk, QueryContext } from './chunks';

// ===== QUERY ANALYSIS =====

export interface QueryIntent {
  type: 'count' | 'find' | 'spatial' | 'system' | 'general';
  entityTypes: string[];
  keywords: string[];
  spatialTerms: string[];
  systemTerms: string[];
  confidence: number;
  executionTime?: number;
}

// ===== INDEX QUERY OPTIMIZATION =====

export interface IndexQueryPlan {
  steps: QueryStep[];
  estimatedCost: number;
  strategy: 'single-index' | 'multi-index' | 'full-scan';
  parallelizable: boolean;
}

export interface QueryStep {
  index: string;
  operation: 'lookup' | 'scan' | 'filter';
  keys?: string[];
  estimatedResults: number;
  cost: number;
}

export interface IndexResult {
  indexName: string;
  chunkIds: string[];
  queryTime: number;
}

export interface LoadingPlan {
  batches: string[][];
  strategy: 'sequential' | 'parallel';
  scoreThreshold: number;
}

export interface IndexStatistics {
  totalDocs: number;
  uniqueKeys: number;
  avgDocsPerKey: number;
  lastUpdated: Date;
}

export interface QueryComplexity {
  isSingleIndex: boolean;
  requiresMultipleIndices: boolean;
  isComplexQuery: boolean;
  estimatedSelectivity: number;
}

// ===== RELEVANCE SCORING =====

export interface ScoringFactors {
  textMatch: number;      // 0-1: Keyword matches
  entityMatch: number;    // 0-1: Entity type matches
  spatialRelevance: number; // 0-1: Spatial proximity
  recency: number;        // 0-1: How recent the chunk is
  typeAlignment: number;  // 0-1: Chunk type matches query intent
}

export interface ScoringWeights {
  textMatch: number;
  entityMatch: number;
  spatialRelevance: number;
  recency: number;
  typeAlignment: number;
}

export interface RankedChunk {
  chunk: SmartChunk;
  score: number;
  factors: ScoringFactors;
}

// ===== TOKEN BUDGET MANAGEMENT =====

export interface BudgetAllocation {
  maxTokens: number;
  reservedForSystem: number;
  availableForContext: number;
  strategy: 'greedy' | 'balanced' | 'diverse';
}

export interface TokenStats {
  totalTokens: number;
  chunkCount: number;
  averageTokensPerChunk: number;
  tokenDistribution: Record<string, number>;
}

// ===== CONTEXT SELECTION =====

export interface IndexCollection {
  byType?: Record<string, string[]>;
  byEntityType?: Record<string, string[]>;
  byFloor?: Record<number, string[]>;
  bySystem?: Record<string, string[]>;
  spatial?: Record<string, string[]>;
}

export interface ChunkSelectionMetrics {
  coverage: number;
  relevanceScore: number;
  diversityScore: number;
  tokenEfficiency: number;
}

// ===== CONTEXT ASSEMBLY =====

export interface AssembledContext {
  header: string;
  content: string[];
  metadata: ContextMetadata;
}

export interface ContextMetadata {
  totalChunks: number;
  totalTokens: number;
  coverage: number;
  chunkTypes: Record<string, number>;
  formatVersion: string;
}

export interface FormattingOptions {
  includeMetadata: boolean;
  includeHeaders: boolean;
  highlightKeywords: boolean;
  compactMode: boolean;
  language: 'de' | 'en';
}

// ===== DIRECT SELECTION (Simplified) =====

export interface DirectSelectionParams {
  projectId: string;
  query: string;
  maxTokens: number;
  entityTypes?: string[];
  queryType?: QueryIntent['type'];
  spatialTerms?: string[];
  systemTerms?: string[];
} 