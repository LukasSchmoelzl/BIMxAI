/**
 * Context selector for choosing relevant chunks
 */

import { SmartChunk, QueryContext, ChunkSelectionResult, ProjectManifest } from '@/types/chunks';
import { FileStore } from '../storage/file-store';
import { CacheManager } from '../storage/cache-manager';
import { QueryAnalyzer } from './query-analyzer';
import { QueryIntent, RankedChunk, BudgetAllocation } from '@/types/selection';
import { RelevanceScorer } from './relevance-scorer';
import { TokenBudgetManager } from './token-budget-manager';
import { IndexQueryOptimizer } from './index-query-optimizer';
import { ContextAssembler } from './context-assembler';

import { IndexCollection, ChunkSelectionMetrics } from '@/types/selection';

export class ContextSelector {
  private queryAnalyzer: QueryAnalyzer;
  private relevanceScorer: RelevanceScorer;
  private budgetManager: TokenBudgetManager;
  private queryOptimizer: IndexQueryOptimizer;
  private contextAssembler: ContextAssembler;
  private cache: CacheManager;
  
  constructor(private fileStore: FileStore) {
    this.queryAnalyzer = new QueryAnalyzer();
    this.relevanceScorer = new RelevanceScorer();
    this.budgetManager = new TokenBudgetManager();
    this.queryOptimizer = new IndexQueryOptimizer();
    this.contextAssembler = new ContextAssembler();
    this.cache = new CacheManager(100, 5 * 60 * 1000, 50); // 100 items, 5 min TTL, 50MB
  }
  
  /**
   * Select relevant chunks for a query with advanced features and caching
   */
  async selectChunks(
    projectId: string,
    query: string,
    maxTokens: number = 4000
  ): Promise<ChunkSelectionResult> {
    const startTime = Date.now();
    
    // Try cache first
    const cached = await this.cache.cacheQuery(
      projectId,
      query,
      async () => this.selectChunksInternal(projectId, query, maxTokens)
    );
    
    return cached;
  }
  
  /**
   * Internal chunk selection with performance optimizations
   */
  private async selectChunksInternal(
    projectId: string,
    query: string,
    maxTokens: number
  ): Promise<ChunkSelectionResult> {
    const startTime = Date.now();
    
    // 1. Load manifest and initialize scorer
    const manifest = await this.fileStore.loadManifest(projectId);
    if (!manifest) {
      throw new Error(`Project ${projectId} not found`);
    }
    this.relevanceScorer.initialize(manifest);
    
    // 2. Analyze query intent
    const intent = await this.queryAnalyzer.analyzeIntent(query);
    const queryContext = this.queryAnalyzer.analyze(query, maxTokens);
    
    // 3. Create optimized query plan
    this.queryOptimizer.initialize(manifest);
    const availableIndices = ['byType', 'byEntityType', 'byFloor', 'bySystem', 'spatial'];
    const queryPlan = this.queryOptimizer.optimizeQuery(intent, availableIndices);
    
    // 4. Load indices in parallel if possible
    const indices = await this.loadRelevantIndicesOptimized(projectId, intent, queryPlan);
    
    // 5. Get candidate chunks using optimized strategy
    const candidateIds = await this.getCandidateChunks(indices, intent, manifest);
    
    // 6. Progressive chunk loading with early termination
    const { candidates, rankedChunks } = await this.progressiveChunkLoading(
      projectId,
      candidateIds,
      intent,
      maxTokens
    );
    
    // 6. Apply token budget management
    const budget = this.budgetManager.allocateBudget(maxTokens, intent.confidence);
    const selectedChunks = this.budgetManager.selectWithinBudget(rankedChunks, budget);
    
    // 7. Calculate metrics
    const metrics = this.calculateMetrics(selectedChunks, candidates, intent);
    
    // 8. Assemble context using dedicated assembler
    const assembled = this.contextAssembler.assembleContext(
      selectedChunks,
      intent,
      budget,
      {
        includeMetadata: true,
        includeHeaders: true,
        highlightKeywords: false,
        compactMode: selectedChunks.length > 10,
        language: 'de'
      }
    );
    
    const formattedContext = assembled.content;
    
    return {
      chunks: selectedChunks,
      selectedChunks,
      totalTokens: this.budgetManager.calculateTokenStats(selectedChunks).totalTokens,
      relevanceScores: Object.fromEntries(
        rankedChunks
          .filter(rc => selectedChunks.includes(rc.chunk))
          .map(rc => [rc.chunk.id, rc.score])
      ),
      reason: this.generateSelectionReason(queryContext, rankedChunks.filter(rc => selectedChunks.includes(rc.chunk))),
      queryAnalysis: intent,
      metrics,
      formattedContext,
      processingTime: Date.now() - startTime
    } as ChunkSelectionResult;
  }
  
  /**
   * Progressive chunk loading with early termination
   */
  private async progressiveChunkLoading(
    projectId: string,
    candidateIds: string[],
    intent: QueryIntent,
    maxTokens: number
  ): Promise<{ candidates: SmartChunk[], rankedChunks: RankedChunk[] }> {
    const batchSize = 50;
    const candidates: SmartChunk[] = [];
    const rankedChunks: RankedChunk[] = [];
    let totalTokens = 0;
    
    // Process in batches
    for (let i = 0; i < candidateIds.length; i += batchSize) {
      const batch = candidateIds.slice(i, i + batchSize);
      
      // Load batch
      const batchChunks = await this.fileStore.loadChunks(projectId, batch);
      candidates.push(...batchChunks);
      
      // Score batch
      const batchRanked = this.relevanceScorer.rankChunks(batchChunks, intent);
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
   * Load relevant indices with optimization
   */
  private async loadRelevantIndicesOptimized(
    projectId: string,
    intent: QueryIntent,
    queryPlan: any
  ): Promise<IndexCollection> {
    const indices: IndexCollection = {};
    
    // Determine which indices to load based on query plan
    const neededIndices = new Set<string>();
    queryPlan.steps.forEach((step: any) => {
      neededIndices.add(step.index);
    });
    
    // Load indices in parallel
    const loadPromises: Promise<void>[] = [];
    
    if (neededIndices.has('byEntityType')) {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'byEntityType')
          .then(index => { indices.byEntityType = index; })
      );
    }
    
    if (neededIndices.has('byFloor') || neededIndices.has('spatial')) {
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
    
    if (neededIndices.has('bySystem')) {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'bySystem')
          .then(index => { indices.bySystem = index; })
      );
    }
    
    // Always load byType for filtering
    loadPromises.push(
      this.fileStore.loadIndex(projectId, 'byType')
        .then(index => { indices.byType = index; })
    );
    
    await Promise.all(loadPromises);
    
    return indices;
  }
  
  /**
   * Load relevant indices based on query intent (backward compatibility)
   */
  private async loadRelevantIndices(
    projectId: string,
    intent: QueryIntent
  ): Promise<IndexCollection> {
    const indices: IndexCollection = {};
    
    // Load indices based on query type
    const loadPromises: Promise<void>[] = [];
    
    if (intent.entityTypes.length > 0 || intent.type === 'find') {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'byEntityType')
          .then(index => { indices.byEntityType = index; })
      );
    }
    
    if (intent.spatialTerms.length > 0 || intent.type === 'spatial') {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'byFloor')
          .then(index => { indices.byFloor = index; }),
        this.fileStore.loadIndex(projectId, 'spatial')
          .then(index => { indices.spatial = index; })
      );
    }
    
    if (intent.systemTerms.length > 0 || intent.type === 'system') {
      loadPromises.push(
        this.fileStore.loadIndex(projectId, 'bySystem')
          .then(index => { indices.bySystem = index; })
      );
    }
    
    // Always load byType for chunk type filtering
    loadPromises.push(
      this.fileStore.loadIndex(projectId, 'byType')
        .then(index => { indices.byType = index; })
    );
    
    await Promise.all(loadPromises);
    
    return indices;
  }
  
  /**
   * Get candidate chunks using multi-index query
   */
  private async getCandidateChunks(
    indices: IndexCollection,
    intent: QueryIntent,
    manifest: ProjectManifest
  ): Promise<string[]> {
    const candidateSets: Set<string>[] = [];
    
    // Query entity type index
    if (intent.entityTypes.length > 0 && indices.byEntityType) {
      const entitySet = new Set<string>();
      
      for (const entityType of intent.entityTypes) {
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
    
    // Query spatial indices
    if (intent.spatialTerms.length > 0) {
      const spatialSet = new Set<string>();
      
      // Parse floor numbers from spatial terms
      intent.spatialTerms.forEach(term => {
        const floorMatch = term.match(/\d+/);
        if (floorMatch && indices.byFloor) {
          const floor = parseInt(floorMatch[0]);
          const chunkIds = indices.byFloor[floor] || [];
          chunkIds.forEach(id => spatialSet.add(id));
        }
        
        // Check spatial zones
        if (indices.spatial) {
          Object.entries(indices.spatial).forEach(([zone, chunkIds]) => {
            if (term.toLowerCase().includes(zone.toLowerCase())) {
              chunkIds.forEach(id => spatialSet.add(id));
            }
          });
        }
      });
      
      if (spatialSet.size > 0) {
        candidateSets.push(spatialSet);
      }
    }
    
    // Query system index
    if (intent.systemTerms.length > 0 && indices.bySystem) {
      const systemSet = new Set<string>();
      
      intent.systemTerms.forEach(term => {
        const chunkIds = indices.bySystem?.[term] || [];
        chunkIds.forEach(id => systemSet.add(id));
      });
      
      if (systemSet.size > 0) {
        candidateSets.push(systemSet);
      }
    }
    
    // Combine results based on query type
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
   * Find potentially relevant chunks using indices (backward compatibility)
   */
  private async findRelevantChunks(
    manifest: ProjectManifest,
    context: QueryContext
  ): Promise<string[]> {
    const relevantIds = new Set<string>();
    
    // Check entity types
    if (context.requestedEntityTypes && context.requestedEntityTypes.length > 0) {
      for (const entityType of context.requestedEntityTypes) {
        const ids = manifest.index.byEntityType[entityType] || [];
        ids.forEach(id => relevantIds.add(id));
      }
    }
    
    // Check floor
    if (context.floor !== undefined) {
      const ids = manifest.index.byFloor[context.floor] || [];
      ids.forEach(id => relevantIds.add(id));
    }
    
    // Check system
    if (context.system) {
      const ids = manifest.index.bySystem[context.system] || [];
      ids.forEach(id => relevantIds.add(id));
    }
    
    // If no specific criteria, include all chunks
    if (relevantIds.size === 0) {
      manifest.chunks.forEach(chunk => relevantIds.add(chunk.id));
    }
    
    return Array.from(relevantIds);
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
   * Calculate selection metrics
   */
  private calculateMetrics(
    selected: SmartChunk[],
    candidates: SmartChunk[],
    intent: QueryIntent
  ): ChunkSelectionMetrics {
    // Coverage: what percentage of relevant content was selected
    const selectedEntities = new Set<string>();
    const candidateEntities = new Set<string>();
    
    selected.forEach(chunk => {
      (chunk.metadata.entityTypes || []).forEach(e => selectedEntities.add(e));
    });
    
    candidates.forEach(chunk => {
      (chunk.metadata.entityTypes || []).forEach(e => candidateEntities.add(e));
    });
    
    const coverage = candidateEntities.size > 0 
      ? selectedEntities.size / candidateEntities.size 
      : 1;
    
    // Average relevance score
    const avgRelevance = selected.length > 0
      ? selected.reduce((sum, chunk) => sum + (chunk.metadata.relevanceScore || 0.5), 0) / selected.length
      : 0;
    
    // Diversity: how many different chunk types are included
    const typeCount = new Set(selected.map(c => c.type)).size;
    const diversityScore = typeCount / 4; // Assuming 4 main types
    
    // Token efficiency: information density
    const totalTokens = this.budgetManager.calculateTokenStats(selected).totalTokens;
    const tokenEfficiency = selected.length > 0 ? selected.length / (totalTokens / 1000) : 0;
    
    return {
      coverage: Math.round(coverage * 100),
      relevanceScore: avgRelevance,
      diversityScore,
      tokenEfficiency
    };
  }
  
  /**
   * Assemble context from selected chunks
   */
  private async assembleContext(
    chunks: SmartChunk[],
    intent: QueryIntent,
    budget: BudgetAllocation
  ): Promise<string[]> {
    const sections: string[] = [];
    
    // Group chunks by type
    const grouped = new Map<string, SmartChunk[]>();
    chunks.forEach(chunk => {
      const type = chunk.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(chunk);
    });
    
    // Format each group
    grouped.forEach((chunks, type) => {
      sections.push(`### ${this.formatChunkType(type)} (${chunks.length} chunks)`);
      sections.push('');
      
      chunks.forEach((chunk, index) => {
        sections.push(`#### Chunk ${index + 1}: ${chunk.summary}`);
        sections.push('```');
        sections.push(chunk.content);
        sections.push('```');
        sections.push('');
      });
    });
    
    return sections;
  }
  
  /**
   * Format chunk type for display
   */
  private formatChunkType(type: string): string {
    const typeMap: Record<string, string> = {
      'spatial': 'Räumliche Informationen',
      'system': 'System-Komponenten',
      'element-type': 'Element-Typen',
      
    };
    
    return typeMap[type] || type;
  }
  
  /**
   * Score chunks by relevance (backward compatibility)
   */
  private async scoreChunks(
    projectId: string,
    chunkIds: string[],
    context: QueryContext
  ): Promise<Array<{ chunk: SmartChunk; score: number }>> {
    const scoredChunks: Array<{ chunk: SmartChunk; score: number }> = [];
    
    // Load chunks
    const chunks = await this.fileStore.loadChunks(projectId, chunkIds);
    
    for (const chunk of chunks) {
      const score = this.calculateRelevanceScore(chunk, context);
      if (score >= context.relevanceThreshold) {
        scoredChunks.push({ chunk, score });
      }
    }
    
    // Sort by score (descending)
    scoredChunks.sort((a, b) => b.score - a.score);
    
    return scoredChunks;
  }
  
  /**
   * Calculate relevance score for a chunk
   */
  private calculateRelevanceScore(chunk: SmartChunk, context: QueryContext): number {
    let score = 0;
    
    // Entity type match
    if (context.requestedEntityTypes) {
      const matchingTypes = chunk.metadata.entityTypes.filter(
        type => context.requestedEntityTypes?.includes(type)
      );
      score += matchingTypes.length * 0.3;
    }
    
    // Floor match
    if (context.floor !== undefined && chunk.metadata.floor === context.floor) {
      score += 0.2;
    }
    
    // System match
    if (context.system && chunk.metadata.system === context.system) {
      score += 0.2;
    }
    
    // Keyword match in summary
    const queryWords = context.query.toLowerCase().split(/\s+/);
    const summaryWords = chunk.summary.toLowerCase();
    const matchingWords = queryWords.filter(word => summaryWords.includes(word));
    score += (matchingWords.length / queryWords.length) * 0.3;
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Select chunks within token limit
   */
  private selectWithinTokenLimit(
    scoredChunks: Array<{ chunk: SmartChunk; score: number }>,
    maxTokens: number
  ): Array<{ chunk: SmartChunk; score: number }> {
    const selected: Array<{ chunk: SmartChunk; score: number }> = [];
    let totalTokens = 0;
    
    for (const scoredChunk of scoredChunks) {
      if (totalTokens + scoredChunk.chunk.tokenCount <= maxTokens) {
        selected.push(scoredChunk);
        totalTokens += scoredChunk.chunk.tokenCount;
      }
    }
    
    return selected;
  }
  
  /**
   * Generate explanation for chunk selection
   */
  private generateSelectionReason(
    context: QueryContext,
    selectedChunks: Array<{ chunk: SmartChunk; score: number } | RankedChunk>
  ): string {
    const reasons: string[] = [];
    
    if (selectedChunks.length === 0) {
      return 'No relevant chunks found for the query';
    }
    
    reasons.push(`Selected ${selectedChunks.length} chunks`);
    
    if (context.requestedEntityTypes && context.requestedEntityTypes.length > 0) {
      reasons.push(`Filtered by entity types: ${context.requestedEntityTypes.join(', ')}`);
    }
    
    if (context.floor !== undefined) {
      reasons.push(`Filtered by floor: ${context.floor}`);
    }
    
    if (context.system) {
      reasons.push(`Filtered by system: ${context.system}`);
    }
    
    const avgScore = selectedChunks.reduce((sum, sc) => sum + sc.score, 0) / selectedChunks.length;
    reasons.push(`Average relevance score: ${avgScore.toFixed(2)}`);
    
    return reasons.join('. ');
  }
}