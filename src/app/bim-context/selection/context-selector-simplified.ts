/**
 * Simplified Context Selector without query analysis
 * Accepts direct tool parameters instead of analyzing the query
 */

import { SmartChunk, ChunkSelectionResult, ProjectManifest, DirectSelectionParams, IndexCollection, ChunkSelectionMetrics } from '@/types/chunks';
import { FileStore } from '../storage/file-store';
import { CacheManager } from '../storage/cache-manager';
import { RelevanceScorer } from './relevance-scorer';
import { TokenBudgetManager } from './token-budget-manager';
import { ContextAssembler } from './context-assembler';
import { RankedChunk } from '@/types/selection';

export class SimplifiedContextSelector {
  private relevanceScorer: RelevanceScorer;
  private budgetManager: TokenBudgetManager;
  private contextAssembler: ContextAssembler;
  private cache: CacheManager;
  
  constructor(private fileStore: FileStore) {
    this.relevanceScorer = new RelevanceScorer();
    this.budgetManager = new TokenBudgetManager();
    this.contextAssembler = new ContextAssembler();
    this.cache = new CacheManager(100, 5 * 60 * 1000, 50); // 100 items, 5 min TTL, 50MB
  }
  
  /**
   * Select relevant chunks based on direct parameters
   */
  async selectChunks(
    projectId: string,
    params: DirectSelectionParams
  ): Promise<ChunkSelectionResult> {
    const startTime = Date.now();
    const maxTokens = params.maxTokens || 4000;
    
    // Create cache key from params
    const cacheKey = JSON.stringify({ projectId, ...params });
    
    // Try cache first
    const cached = this.cache.get<ChunkSelectionResult>(cacheKey);
    if (cached) {
      return cached as ChunkSelectionResult;
    }
    
    try {
      // 1. Load manifest and initialize scorer
      const manifest = await this.fileStore.loadManifest(projectId);
      if (!manifest) {
        throw new Error(`Project ${projectId} not found`);
      }
      this.relevanceScorer.initialize(manifest);
      
      // 2. Load relevant indices based on params
      const indices = await this.loadRelevantIndices(projectId, params);
      
      // 3. Get candidate chunks using indices
      const candidateIds = await this.getCandidateChunks(indices, params, manifest);
      
      // 4. Load and rank chunks progressively
      const { candidates, rankedChunks } = await this.progressiveChunkLoading(
        projectId,
        candidateIds,
        params,
        maxTokens
      );
      
      // 5. Apply token budget management
      const confidence = this.calculateConfidence(params);
      const budget = this.budgetManager.allocateBudget(maxTokens, confidence);
      const selectedChunks = this.budgetManager.selectWithinBudget(rankedChunks, budget);
      
      // 6. Calculate metrics
      const metrics = this.calculateMetrics(selectedChunks, candidates);
      
      // 7. Assemble context
      const assembled = this.contextAssembler.assembleContext(
        selectedChunks,
        {
          type: params.queryType || 'general',
          entityTypes: params.entityTypes || [],
          keywords: params.keywords || [],
          spatialTerms: params.spatialTerms || [],
          systemTerms: [],
          confidence
        },
        budget,
        {
          includeMetadata: true,
          includeHeaders: true,
          highlightKeywords: false,
          compactMode: selectedChunks.length > 10,
          language: 'de'
        }
      );
      
      const result: ChunkSelectionResult = {
        chunks: selectedChunks,
        selectedChunks,
        totalTokens: this.budgetManager.calculateTokenStats(selectedChunks).totalTokens,
        relevanceScores: Object.fromEntries(
          rankedChunks
            .filter(rc => selectedChunks.includes(rc.chunk))
            .map(rc => [rc.chunk.id, rc.score])
        ),
        reason: this.generateSelectionReason(params, selectedChunks.length),
        metrics,
        formattedContext: assembled.content, // already string[]
        processingTime: Date.now() - startTime
      };
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Chunk selection error:', error);
      throw error;
    }
  }
  
  /**
   * Load relevant indices based on direct parameters
   */
  private async loadRelevantIndices(
    projectId: string,
    params: DirectSelectionParams
  ): Promise<IndexCollection> {
    const indices: IndexCollection = {};
    const loadPromises: Promise<void>[] = [];
    
    // Always load byType for filtering
    loadPromises.push(
      this.fileStore.loadIndex(projectId, 'byType')
        .then(index => { indices.byType = index; })
    );
    
    // Load entity type index if needed
    if (params.entityTypes && params.entityTypes.length > 0) {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'byEntityType')
          .then(index => { indices.byEntityType = index; })
      );
    }
    
    // Load spatial indices if needed
    if (params.floor !== undefined || params.spatialTerms?.length) {
      loadPromises.push(
        Promise.all([
          this.fileStore.loadIndex(projectId, 'byFloor'),
          this.fileStore.loadIndex(projectId, 'spatial')
        ]).then(([floor, spatial]) => {
          indices.byFloor = floor;
          indices.spatial = spatial;
        })
      );
    }
    
    // Load system index if needed
    if (params.system) {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'bySystem')
          .then(index => { indices.bySystem = index; })
      );
    }
    
    await Promise.all(loadPromises);
    return indices;
  }
  
  /**
   * Get candidate chunks using indices
   */
  private async getCandidateChunks(
    indices: IndexCollection,
    params: DirectSelectionParams,
    manifest: ProjectManifest
  ): Promise<string[]> {
    const candidateSets: Set<string>[] = [];
    
    // Query entity type index
    if (params.entityTypes?.length && indices.byEntityType) {
      const entitySet = new Set<string>();
      
      for (const entityType of params.entityTypes) {
        if (entityType === '*') {
          // Wildcard - include all chunks
          manifest.chunks.forEach(chunk => entitySet.add(chunk.id));
        } else {
          const chunkIds = indices.byEntityType[entityType] || [];
          chunkIds.forEach(id => entitySet.add(id));
        }
      }
      
      if (entitySet.size > 0) {
        candidateSets.push(entitySet);
      }
    }
    
    // Query floor index
    if (params.floor !== undefined && indices.byFloor) {
      const floorSet = new Set<string>();
      const chunkIds = indices.byFloor[params.floor] || [];
      chunkIds.forEach(id => floorSet.add(id));
      
      if (floorSet.size > 0) {
        candidateSets.push(floorSet);
      }
    }
    
    // Query system index
    if (params.system && indices.bySystem) {
      const systemSet = new Set<string>();
      const chunkIds = indices.bySystem[params.system] || [];
      chunkIds.forEach(id => systemSet.add(id));
      
      if (systemSet.size > 0) {
        candidateSets.push(systemSet);
      }
    }
    
    // Combine results
    if (candidateSets.length === 0) {
      // No specific criteria - return all chunks
      return manifest.chunks.map(c => c.id);
    } else if (candidateSets.length === 1) {
      return Array.from(candidateSets[0]);
    } else {
      // Intersect sets for AND operation
      const intersection = this.intersectSets(candidateSets);
      return Array.from(intersection);
    }
  }
  
  /**
   * Progressive chunk loading with early termination
   */
  private async progressiveChunkLoading(
    projectId: string,
    candidateIds: string[],
    params: DirectSelectionParams,
    maxTokens: number
  ): Promise<{ candidates: SmartChunk[], rankedChunks: RankedChunk[] }> {
    const batchSize = 50;
    const candidates: SmartChunk[] = [];
    const rankedChunks: RankedChunk[] = [];
    
    // Process in batches
    for (let i = 0; i < candidateIds.length; i += batchSize) {
      const batch = candidateIds.slice(i, i + batchSize);
      
      // Load batch
      const batchChunks = await this.fileStore.loadChunks(projectId, batch);
      candidates.push(...batchChunks);
      
      // Score batch based on params
      const batchRanked = this.rankChunksSimple(batchChunks, params);
      rankedChunks.push(...batchRanked);
      
      // Re-sort all ranked chunks
      rankedChunks.sort((a, b) => b.score - a.score);
      
      // Check if we have enough high-quality chunks
      const highQualityChunks = rankedChunks.filter(rc => rc.score > 0.7);
      const estimatedTokens = highQualityChunks.reduce(
        (sum, rc) => sum + rc.chunk.tokenCount,
        0
      );
      
      // Early termination if we have enough good chunks
      if (estimatedTokens > maxTokens * 1.5 && highQualityChunks.length > 10) {
        break;
      }
    }
    
    return { candidates, rankedChunks };
  }
  
  /**
   * Simple ranking based on direct parameters
   */
  private rankChunksSimple(chunks: SmartChunk[], params: DirectSelectionParams): RankedChunk[] {
    return chunks.map(chunk => {
      let score = 0.5; // Base score
      
      let entityMatchFactor = 0;
      let spatialFactor = 0;
      let textMatchFactor = 0;
      let typeAlignmentFactor = 0.5;
      const recencyFactor = 0.5; // unknown in simplified mode
      
      // Entity type match
      if (params.entityTypes?.length) {
        const matchingTypes = chunk.metadata.entityTypes.filter(
          type => params.entityTypes?.includes(type)
        );
        entityMatchFactor = Math.min(1, matchingTypes.length / (params.entityTypes.length || 1));
        score += matchingTypes.length * 0.2;
      }
      
      // Floor match
      if (params.floor !== undefined && chunk.metadata.floor === params.floor) {
        spatialFactor = 1;
        score += 0.3;
      }
      
      // System match
      if (params.system && chunk.metadata.system === params.system) {
        typeAlignmentFactor = 0.8;
        score += 0.3;
      }
      
      // Keyword match in summary
      if (params.keywords?.length) {
        const summaryLower = chunk.summary.toLowerCase();
        const matchingKeywords = params.keywords.filter(
          keyword => summaryLower.includes(keyword.toLowerCase())
        );
        textMatchFactor = matchingKeywords.length / params.keywords.length;
        score += (matchingKeywords.length / params.keywords.length) * 0.2;
      }
      
      return {
        chunk,
        score: Math.min(score, 1.0),
        factors: {
          textMatch: Math.min(1, textMatchFactor),
          entityMatch: Math.min(1, entityMatchFactor),
          spatialRelevance: Math.min(1, spatialFactor),
          recency: recencyFactor,
          typeAlignment: Math.min(1, typeAlignmentFactor)
        }
      };
    });
  }
  
  /**
   * Calculate confidence based on params specificity
   */
  private calculateConfidence(params: DirectSelectionParams): number {
    let confidence = 0.5; // Base confidence
    
    // Boost for specific query types
    if (params.queryType && params.queryType !== 'general') confidence += 0.2;
    
    // Boost for entity types
    if (params.entityTypes?.length) confidence += 0.2;
    
    // Boost for spatial/system context
    if (params.floor !== undefined) confidence += 0.1;
    if (params.system) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Intersect multiple sets
   */
  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) return new Set();
    if (sets.length === 1) return sets[0];
    
    const result = new Set(sets[0]);
    
    for (let i = 1; i < sets.length; i++) {
      const currentSet = sets[i];
      for (const item of result) {
        if (!currentSet.has(item)) {
          result.delete(item);
        }
      }
    }
    
    return result;
  }

  /**
   * Calculate metrics from selected and candidate chunks
   */
  private calculateMetrics(selectedChunks: SmartChunk[], candidates: SmartChunk[]): ChunkSelectionMetrics {
    const totalTokens = selectedChunks.reduce((sum, c) => sum + c.tokenCount, 0);
    const coverage = candidates.length > 0 ? selectedChunks.length / candidates.length : 0;
    const diversityScore = this.calculateDiversity(selectedChunks);

    return {
      coverage,
      relevanceScore: selectedChunks.length > 0 ? totalTokens / selectedChunks.length : 0,
      diversityScore,
      tokenEfficiency: totalTokens
    };
  }

  private calculateDiversity(chunks: SmartChunk[]): number {
    const typeCounts: Record<string, number> = {};
    for (const c of chunks) {
      typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
    }
    const uniqueTypes = Object.keys(typeCounts).length;
    return chunks.length > 0 ? uniqueTypes / chunks.length : 0;
  }

  private generateSelectionReason(params: DirectSelectionParams, count: number): string {
    const parts: string[] = [];
    if (params.entityTypes?.length) parts.push(`EntityTypes: ${params.entityTypes.join(', ')}`);
    if (params.floor !== undefined) parts.push(`Floor: ${params.floor}`);
    if (params.system) parts.push(`System: ${params.system}`);
    if (params.keywords?.length) parts.push(`Keywords: ${params.keywords.join(', ')}`);
    return `Selected ${count} chunks (${parts.join(' | ')})`;
  }
}