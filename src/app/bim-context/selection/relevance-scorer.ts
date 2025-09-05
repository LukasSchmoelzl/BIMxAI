/**
 * Relevance scoring for chunk selection
 */

import { SmartChunk, ProjectManifest } from '@/types/chunks';
import { QueryIntent } from '@/types/selection';

import { ScoringFactors, ScoringWeights, RankedChunk } from '@/types/selection';

const defaultWeights: ScoringWeights = {
  textMatch: 0.3,
  entityMatch: 0.3,
  spatialRelevance: 0.2,
  recency: 0.05,
  typeAlignment: 0.15
};

export class RelevanceScorer {
  private documentFrequency: Map<string, number> = new Map();
  private totalDocuments: number = 0;
  
  /**
   * Initialize scorer with document statistics
   */
  initialize(manifest: ProjectManifest) {
    this.totalDocuments = manifest.totalChunks;
    
    // Build document frequency map from manifest
    if ((manifest.metadata as any)?.termFrequency) {
      Object.entries((manifest.metadata as any).termFrequency).forEach(([term, freq]) => {
        this.documentFrequency.set(term, freq as number);
      });
    }
  }
  
  /**
   * Score a chunk based on query intent
   */
  scoreChunk(
    chunk: SmartChunk,
    queryIntent: QueryIntent,
    weights: ScoringWeights = defaultWeights
  ): number {
    const factors = this.calculateFactors(chunk, queryIntent);
    return this.weightedSum(factors, weights);
  }
  
  /**
   * Score multiple chunks and return ranked list
   */
  rankChunks(
    chunks: SmartChunk[],
    queryIntent: QueryIntent,
    weights: ScoringWeights = defaultWeights
  ): RankedChunk[] {
    const ranked = chunks.map(chunk => {
      const factors = this.calculateFactors(chunk, queryIntent);
      const score = this.weightedSum(factors, weights);
      
      return {
        chunk,
        score,
        factors
      };
    });
    
    // Sort by score descending
    return ranked.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Calculate all scoring factors for a chunk
   */
  private calculateFactors(chunk: SmartChunk, queryIntent: QueryIntent): ScoringFactors {
    return {
      textMatch: this.calculateTextMatch(chunk, queryIntent.keywords),
      entityMatch: this.calculateEntityMatch(chunk, queryIntent.entityTypes),
      spatialRelevance: this.calculateSpatialRelevance(chunk, queryIntent.spatialTerms),
      recency: this.calculateRecency(chunk),
      typeAlignment: this.calculateTypeAlignment(chunk, queryIntent.type)
    };
  }
  
  /**
   * TF-IDF based text matching
   */
  private calculateTextMatch(chunk: SmartChunk, keywords: string[]): number {
    if (keywords.length === 0) return 0;
    
    const chunkText = chunk.content.toLowerCase();
    const chunkTokens = this.tokenize(chunkText);
    const tokenSet = new Set(chunkTokens);
    
    let totalScore = 0;
    let matchedKeywords = 0;
    
    keywords.forEach(keyword => {
      if (tokenSet.has(keyword.toLowerCase())) {
        matchedKeywords++;
        
        // Calculate TF (term frequency)
        const tf = chunkTokens.filter(t => t === keyword).length / chunkTokens.length;
        
        // Calculate IDF (inverse document frequency)
        const df = this.documentFrequency.get(keyword) || 1;
        const idf = Math.log((this.totalDocuments + 1) / (df + 1));
        
        // TF-IDF score
        totalScore += tf * idf;
      }
    });
    
    // Normalize by number of keywords
    const baseScore = keywords.length > 0 ? matchedKeywords / keywords.length : 0;
    
    // Combine with TF-IDF score
    return Math.min(1, baseScore * 0.5 + totalScore * 0.5);
  }
  
  /**
   * Entity type matching with hierarchy support
   */
  private calculateEntityMatch(chunk: SmartChunk, entityTypes: string[]): number {
    if (entityTypes.length === 0) return 0.5; // Neutral score if no entities requested
    
    const chunkEntities = new Set(chunk.metadata.entityTypes || []);
    
    // Handle wildcard
    if (entityTypes.includes('*')) {
      return chunkEntities.size > 0 ? 1 : 0;
    }
    
    let matchScore = 0;
    let hierarchyBonus = 0;
    
    entityTypes.forEach(requestedType => {
      // Exact match
      if (chunkEntities.has(requestedType)) {
        matchScore += 1;
      } else {
        // Check hierarchical matches
        const hierarchy = this.getEntityHierarchy(requestedType);
        const hierarchyMatch = hierarchy.some(parent => chunkEntities.has(parent));
        if (hierarchyMatch) {
          hierarchyBonus += 0.5;
        }
      }
    });
    
    // Normalize
    const exactScore = matchScore / entityTypes.length;
    const totalScore = Math.min(1, exactScore + (hierarchyBonus / entityTypes.length) * 0.5);
    
    return totalScore;
  }
  
  /**
   * Spatial relevance based on floor/zone matching
   */
  private calculateSpatialRelevance(chunk: SmartChunk, spatialTerms: string[]): number {
    if (spatialTerms.length === 0) return 0.5; // Neutral score if no spatial context
    
    const chunkSpatial = chunk.metadata.spatialInfo;
    if (!chunkSpatial) return 0;
    
    let relevance = 0;
    
    spatialTerms.forEach(term => {
      const termLower = term.toLowerCase();
      
      // Check floor match
      if (chunkSpatial.floor !== undefined) {
        const floorStr = chunkSpatial.floor.toString();
        if (termLower.includes(floorStr)) {
          relevance += 1;
        }
      }
      
      // Check zone match
      if (chunkSpatial.zone && termLower.includes(chunkSpatial.zone.toLowerCase())) {
        relevance += 1;
      }
      
      // Check building/area match
      if (chunkSpatial.building && termLower.includes(chunkSpatial.building.toLowerCase())) {
        relevance += 0.5;
      }
    });
    
    return Math.min(1, relevance / spatialTerms.length);
  }
  
  /**
   * Recency score (newer chunks score higher)
   */
  private calculateRecency(chunk: SmartChunk): number {
    if (!chunk.metadata.timestamp) return 0.5;
    
    const age = Date.now() - chunk.metadata.timestamp;
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Linear decay over 30 days
    const ageDays = age / dayInMs;
    return Math.max(0, 1 - (ageDays / 30));
  }
  
  /**
   * Type alignment (chunk type matches query intent)
   */
  private calculateTypeAlignment(chunk: SmartChunk, queryType: QueryIntent['type']): number {
    const alignmentMap: Record<QueryIntent['type'], string[]> = {
      'count': ['element-type', 'system', 'spatial'],
      'find': ['element-type', 'spatial'],
      'spatial': ['spatial', 'element-type'],
      'system': ['system', 'element-type'],
      'general': ['element-type', 'spatial', 'system']
    };
    
    const preferredTypes = alignmentMap[queryType];
    const chunkTypeIndex = preferredTypes.indexOf(chunk.type);
    
    if (chunkTypeIndex === -1) return 0.3; // Low score for non-preferred types
    
    // Higher score for earlier in preference list
    return 1 - (chunkTypeIndex * 0.2);
  }
  
  /**
   * Calculate weighted sum of factors
   */
  private weightedSum(factors: ScoringFactors, weights: ScoringWeights): number {
    let sum = 0;
    let totalWeight = 0;
    
    Object.entries(factors).forEach(([key, value]) => {
      const weight = weights[key as keyof ScoringWeights];
      sum += value * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? sum / totalWeight : 0;
  }
  
  /**
   * Simple tokenization
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^\wäöüß-]/g, ''))
      .filter(w => w.length > 2);
  }
  
  /**
   * Get entity type hierarchy
   */
  private getEntityHierarchy(entityType: string): string[] {
    const hierarchy: Record<string, string[]> = {
      'IFCWALL': ['IFCBUILDINGELEMENT', 'IFCELEMENT'],
      'IFCDOOR': ['IFCBUILDINGELEMENT', 'IFCELEMENT'],
      'IFCWINDOW': ['IFCBUILDINGELEMENT', 'IFCELEMENT'],
      'IFCSLAB': ['IFCBUILDINGELEMENT', 'IFCELEMENT'],
      'IFCBEAM': ['IFCBUILDINGELEMENT', 'IFCELEMENT'],
      'IFCCOLUMN': ['IFCBUILDINGELEMENT', 'IFCELEMENT'],
      'IFCFLOWSEGMENT': ['IFCDISTRIBUTIONFLOWELEMENT', 'IFCDISTRIBUTIONELEMENT'],
      'IFCFLOWTERMINAL': ['IFCDISTRIBUTIONFLOWELEMENT', 'IFCDISTRIBUTIONELEMENT'],
      'IFCFLOWFITTING': ['IFCDISTRIBUTIONFLOWELEMENT', 'IFCDISTRIBUTIONELEMENT']
    };
    
    return hierarchy[entityType] || ['IFCELEMENT'];
  }
}