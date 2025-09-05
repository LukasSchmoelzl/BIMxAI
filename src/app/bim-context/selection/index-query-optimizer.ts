/**
 * Index query optimization for performance
 */

import { QueryIntent } from '@/types/selection';
import { ProjectManifest } from '@/types/chunks';

import { IndexQueryPlan, QueryStep, IndexResult, LoadingPlan } from '@/types/selection';

export class IndexQueryOptimizer {
  private indexStats: Map<string, IndexStatistics> = new Map();
  
  /**
   * Initialize with manifest statistics
   */
  initialize(manifest: ProjectManifest) {
    // Extract index statistics from manifest
    if ((manifest.metadata as any)?.indexStats) {
      Object.entries((manifest.metadata as any).indexStats).forEach(([name, stats]) => {
        this.indexStats.set(name, stats as IndexStatistics);
      });
    }
  }
  
  /**
   * Optimize query execution plan
   */
  optimizeQuery(
    intent: QueryIntent,
    availableIndices: string[]
  ): IndexQueryPlan {
    // Analyze query complexity
    const complexity = this.analyzeQueryComplexity(intent);
    
    // Choose strategy
    let strategy: IndexQueryPlan['strategy'];
    let steps: QueryStep[] = [];
    
    if (complexity.isSingleIndex) {
      strategy = 'single-index';
      steps = this.planSingleIndexQuery(intent, availableIndices);
    } else if (complexity.requiresMultipleIndices) {
      strategy = 'multi-index';
      steps = this.planMultiIndexQuery(intent, availableIndices);
    } else {
      strategy = 'full-scan';
      steps = this.planFullScan();
    }
    
    // Calculate cost
    const estimatedCost = steps.reduce((sum, step) => sum + step.cost, 0);
    
    // Determine if parallelizable
    const parallelizable = strategy === 'multi-index' && 
      steps.every(s => s.operation === 'lookup');
    
    return {
      steps,
      estimatedCost,
      strategy,
      parallelizable
    };
  }
  
  /**
   * Combine results from multiple indices
   */
  combineIndexResults(
    results: IndexResult[],
    operation: 'AND' | 'OR'
  ): string[] {
    if (results.length === 0) return [];
    if (results.length === 1) return results[0].chunkIds;
    
    if (operation === 'AND') {
      return this.intersection(results.map(r => r.chunkIds));
    } else {
      return this.union(results.map(r => r.chunkIds));
    }
  }
  
  /**
   * Create loading plan for chunks
   */
  createLoadingPlan(
    chunkIds: string[],
    scoreThreshold: number,
    maxBatchSize: number = 50
  ): LoadingPlan {
    // Create batches
    const batches: string[][] = [];
    
    for (let i = 0; i < chunkIds.length; i += maxBatchSize) {
      batches.push(chunkIds.slice(i, i + maxBatchSize));
    }
    
    // Determine loading strategy
    const strategy = batches.length > 3 ? 'parallel' : 'sequential';
    
    return {
      batches,
      strategy,
      scoreThreshold
    };
  }
  
  /**
   * Analyze query complexity
   */
  private analyzeQueryComplexity(intent: QueryIntent): QueryComplexity {
    const hasEntityFilter = intent.entityTypes.length > 0;
    const hasSpatialFilter = intent.spatialTerms.length > 0;
    const hasSystemFilter = intent.systemTerms.length > 0;
    
    const filterCount = [hasEntityFilter, hasSpatialFilter, hasSystemFilter]
      .filter(Boolean).length;
    
    return {
      isSingleIndex: filterCount === 1,
      requiresMultipleIndices: filterCount > 1,
      isComplexQuery: filterCount > 2 || intent.keywords.length > 5,
      estimatedSelectivity: this.estimateSelectivity(intent)
    };
  }
  
  /**
   * Plan single index query
   */
  private planSingleIndexQuery(
    intent: QueryIntent,
    availableIndices: string[]
  ): QueryStep[] {
    let indexName: string;
    let keys: string[] = [];
    
    if (intent.entityTypes.length > 0 && availableIndices.includes('byEntityType')) {
      indexName = 'byEntityType';
      keys = intent.entityTypes;
    } else if (intent.spatialTerms.length > 0 && availableIndices.includes('spatial')) {
      indexName = 'spatial';
      keys = intent.spatialTerms;
    } else if (intent.systemTerms.length > 0 && availableIndices.includes('bySystem')) {
      indexName = 'bySystem';
      keys = intent.systemTerms;
    } else {
      return this.planFullScan();
    }
    
    const stats = this.indexStats.get(indexName);
    const estimatedResults = this.estimateResultCount(indexName, keys, stats);
    
    return [{
      index: indexName,
      operation: 'lookup',
      keys,
      estimatedResults,
      cost: keys.length * 0.1
    }];
  }
  
  /**
   * Plan multi-index query
   */
  private planMultiIndexQuery(
    intent: QueryIntent,
    availableIndices: string[]
  ): QueryStep[] {
    const steps: QueryStep[] = [];
    
    // Order indices by selectivity (most selective first)
    const indexOrder = this.orderBySelectivity(intent, availableIndices);
    
    indexOrder.forEach(({ index, keys, selectivity }) => {
      const stats = this.indexStats.get(index);
      const estimatedResults = Math.round(selectivity * 1000); // Assuming 1000 total chunks
      
      steps.push({
        index,
        operation: 'lookup',
        keys,
        estimatedResults,
        cost: keys.length * 0.1 * (steps.length + 1) // Cost increases with each step
      });
    });
    
    return steps;
  }
  
  /**
   * Plan full scan
   */
  private planFullScan(): QueryStep[] {
    return [{
      index: 'manifest',
      operation: 'scan',
      estimatedResults: 1000, // Assume 1000 chunks
      cost: 10 // High cost for full scan
    }];
  }
  
  /**
   * Order indices by selectivity
   */
  private orderBySelectivity(
    intent: QueryIntent,
    availableIndices: string[]
  ): Array<{ index: string; keys: string[]; selectivity: number }> {
    const candidates: Array<{ index: string; keys: string[]; selectivity: number }> = [];
    
    if (intent.entityTypes.length > 0 && availableIndices.includes('byEntityType')) {
      candidates.push({
        index: 'byEntityType',
        keys: intent.entityTypes,
        selectivity: this.calculateSelectivity('byEntityType', intent.entityTypes)
      });
    }
    
    if (intent.spatialTerms.length > 0 && availableIndices.includes('spatial')) {
      candidates.push({
        index: 'spatial',
        keys: intent.spatialTerms,
        selectivity: this.calculateSelectivity('spatial', intent.spatialTerms)
      });
    }
    
    if (intent.systemTerms.length > 0 && availableIndices.includes('bySystem')) {
      candidates.push({
        index: 'bySystem',
        keys: intent.systemTerms,
        selectivity: this.calculateSelectivity('bySystem', intent.systemTerms)
      });
    }
    
    // Sort by selectivity (ascending - most selective first)
    return candidates.sort((a, b) => a.selectivity - b.selectivity);
  }
  
  /**
   * Calculate selectivity for an index
   */
  private calculateSelectivity(indexName: string, keys: string[]): number {
    const stats = this.indexStats.get(indexName);
    
    if (!stats) {
      // Default selectivity estimates
      const defaults: Record<string, number> = {
        'byEntityType': 0.1,
        'spatial': 0.2,
        'bySystem': 0.15,
        'byFloor': 0.25
      };
      return defaults[indexName] || 0.5;
    }
    
    // Calculate based on stats
    const totalKeys = stats.uniqueKeys || 10;
    const avgDocsPerKey = stats.totalDocs / totalKeys;
    const estimatedDocs = keys.length * avgDocsPerKey;
    
    return Math.min(1, estimatedDocs / stats.totalDocs);
  }
  
  /**
   * Estimate result count
   */
  private estimateResultCount(
    indexName: string,
    keys: string[],
    stats?: IndexStatistics
  ): number {
    if (!stats) {
      return keys.length * 10; // Default estimate
    }
    
    const avgDocsPerKey = stats.totalDocs / (stats.uniqueKeys || 1);
    return Math.round(keys.length * avgDocsPerKey);
  }
  
  /**
   * Estimate overall selectivity
   */
  private estimateSelectivity(intent: QueryIntent): number {
    let selectivity = 1;
    
    if (intent.entityTypes.length > 0) {
      selectivity *= this.calculateSelectivity('byEntityType', intent.entityTypes);
    }
    
    if (intent.spatialTerms.length > 0) {
      selectivity *= this.calculateSelectivity('spatial', intent.spatialTerms);
    }
    
    if (intent.systemTerms.length > 0) {
      selectivity *= this.calculateSelectivity('bySystem', intent.systemTerms);
    }
    
    return selectivity;
  }
  
  /**
   * Set intersection
   */
  private intersection(arrays: string[][]): string[] {
    if (arrays.length === 0) return [];
    if (arrays.length === 1) return arrays[0];
    
    const result = new Set(arrays[0]);
    
    for (let i = 1; i < arrays.length; i++) {
      const currentSet = new Set(arrays[i]);
      for (const item of result) {
        if (!currentSet.has(item)) {
          result.delete(item);
        }
      }
    }
    
    return Array.from(result);
  }
  
  /**
   * Set union
   */
  private union(arrays: string[][]): string[] {
    const result = new Set<string>();
    
    arrays.forEach(arr => {
      arr.forEach(item => result.add(item));
    });
    
    return Array.from(result);
  }
}

import { IndexStatistics, QueryComplexity } from '@/types/selection';