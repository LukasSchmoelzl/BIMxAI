/**
 * Token budget management for context selection
 */

import { SmartChunk } from '@/types/chunks';
import { RankedChunk } from '@/types/selection';

import { BudgetAllocation, TokenStats } from '@/types/selection';

export class TokenBudgetManager {
  private readonly SYSTEM_PROMPT_TOKENS = 500;
  private readonly RESPONSE_BUFFER = 1000;
  private readonly MIN_CHUNK_TOKENS = 50;
  private readonly MAX_CHUNK_TOKENS = 2000;
  
  /**
   * Allocate token budget based on query complexity
   */
  allocateBudget(
    totalLimit: number = 4000,
    queryComplexity: number = 0.5
  ): BudgetAllocation {
    // Dynamic allocation based on query complexity (0-1)
    const complexityMultiplier = 1 + (queryComplexity * 0.5);
    
    const systemNeeds = Math.round(
      this.SYSTEM_PROMPT_TOKENS + (queryComplexity * 200)
    );
    
    const responseNeeds = Math.round(
      this.RESPONSE_BUFFER + (queryComplexity * 300)
    );
    
    const availableForContext = Math.max(
      500, // Minimum context tokens
      totalLimit - systemNeeds - responseNeeds
    );
    
    return {
      maxTokens: totalLimit,
      reservedForSystem: systemNeeds,
      availableForContext,
      strategy: this.selectStrategy(queryComplexity, availableForContext)
    };
  }
  
  /**
   * Select chunks within token budget
   */
  selectWithinBudget(
    rankedChunks: RankedChunk[],
    budget: BudgetAllocation
  ): SmartChunk[] {
    switch (budget.strategy) {
      case 'greedy':
        return this.greedySelection(rankedChunks, budget.availableForContext);
      
      case 'balanced':
        return this.balancedSelection(rankedChunks, budget.availableForContext);
      
      case 'diverse':
        return this.diverseSelection(rankedChunks, budget.availableForContext);
      
      default:
        return this.greedySelection(rankedChunks, budget.availableForContext);
    }
  }
  
  /**
   * Greedy selection - take top chunks by score
   */
  private greedySelection(
    rankedChunks: RankedChunk[],
    tokenBudget: number
  ): SmartChunk[] {
    const selected: SmartChunk[] = [];
    let usedTokens = 0;
    
    for (const rankedChunk of rankedChunks) {
      const chunk = rankedChunk.chunk;
      const chunkTokens = chunk.tokenCount || this.estimateTokens(chunk.content);
      
      if (usedTokens + chunkTokens <= tokenBudget) {
        selected.push(chunk);
        usedTokens += chunkTokens;
      } else if (selected.length === 0 && chunkTokens <= tokenBudget) {
        // Always include at least one chunk if it fits
        selected.push(chunk);
        break;
      }
    }
    
    return selected;
  }
  
  /**
   * Balanced selection - mix of different chunk types
   */
  private balancedSelection(
    rankedChunks: RankedChunk[],
    tokenBudget: number
  ): SmartChunk[] {
    // Group by type
    const typeGroups = new Map<string, RankedChunk[]>();
    
    rankedChunks.forEach(rc => {
      const type = rc.chunk.type;
      if (!typeGroups.has(type)) {
        typeGroups.set(type, []);
      }
      typeGroups.get(type)!.push(rc);
    });
    
    const selected: SmartChunk[] = [];
    let usedTokens = 0;
    
    // Calculate tokens per type
    const typeBudgets = this.calculateTypeBudgets(typeGroups, tokenBudget);
    
    // Select from each type
    typeGroups.forEach((chunks, type) => {
      const typeBudget = typeBudgets.get(type) || 0;
      let typeTokens = 0;
      
      for (const rankedChunk of chunks) {
        const chunk = rankedChunk.chunk;
        const chunkTokens = chunk.tokenCount || this.estimateTokens(chunk.content);
        
        if (typeTokens + chunkTokens <= typeBudget && 
            usedTokens + chunkTokens <= tokenBudget) {
          selected.push(chunk);
          typeTokens += chunkTokens;
          usedTokens += chunkTokens;
        }
      }
    });
    
    // Fill remaining budget with top chunks
    if (usedTokens < tokenBudget * 0.8) {
      const remaining = rankedChunks
        .filter(rc => !selected.includes(rc.chunk))
        .slice(0, 10);
      
      for (const rankedChunk of remaining) {
        const chunk = rankedChunk.chunk;
        const chunkTokens = chunk.tokenCount || this.estimateTokens(chunk.content);
        
        if (usedTokens + chunkTokens <= tokenBudget) {
          selected.push(chunk);
          usedTokens += chunkTokens;
        }
      }
    }
    
    return selected;
  }
  
  /**
   * Diverse selection - maximize coverage
   */
  private diverseSelection(
    rankedChunks: RankedChunk[],
    tokenBudget: number
  ): SmartChunk[] {
    const selected: SmartChunk[] = [];
    const coveredEntities = new Set<string>();
    const coveredSpatial = new Set<string>();
    let usedTokens = 0;
    
    // First pass: select chunks that add new coverage
    for (const rankedChunk of rankedChunks) {
      const chunk = rankedChunk.chunk;
      const chunkTokens = chunk.tokenCount || this.estimateTokens(chunk.content);
      
      if (usedTokens + chunkTokens > tokenBudget) continue;
      
      // Check if chunk adds new coverage
      const newEntities = (chunk.metadata.entityTypes || [])
        .filter(e => !coveredEntities.has(e));
      
      const spatialKey = chunk.metadata.spatialInfo 
        ? `${chunk.metadata.spatialInfo.floor}-${chunk.metadata.spatialInfo.zone}`
        : '';
      
      const addsNewCoverage = newEntities.length > 0 || 
        (spatialKey && !coveredSpatial.has(spatialKey));
      
      if (addsNewCoverage || rankedChunk.score > 0.8) {
        selected.push(chunk);
        usedTokens += chunkTokens;
        
        // Update coverage
        newEntities.forEach(e => coveredEntities.add(e));
        if (spatialKey) coveredSpatial.add(spatialKey);
      }
    }
    
    // Second pass: fill remaining budget with high-score chunks
    if (usedTokens < tokenBudget * 0.7) {
      const remaining = rankedChunks
        .filter(rc => !selected.includes(rc.chunk) && rc.score > 0.5)
        .slice(0, 20);
      
      for (const rankedChunk of remaining) {
        const chunk = rankedChunk.chunk;
        const chunkTokens = chunk.tokenCount || this.estimateTokens(chunk.content);
        
        if (usedTokens + chunkTokens <= tokenBudget) {
          selected.push(chunk);
          usedTokens += chunkTokens;
        }
      }
    }
    
    return selected;
  }
  
  /**
   * Calculate token budget per chunk type
   */
  private calculateTypeBudgets(
    typeGroups: Map<string, RankedChunk[]>,
    totalBudget: number
  ): Map<string, number> {
    const budgets = new Map<string, number>();
    
    // Base allocation per type
    const baseAllocation = Math.floor(totalBudget / typeGroups.size);
    
    // Adjust based on average score per type
    let totalScore = 0;
    const typeScores = new Map<string, number>();
    
    typeGroups.forEach((chunks, type) => {
      const avgScore = chunks.reduce((sum, rc) => sum + rc.score, 0) / chunks.length;
      typeScores.set(type, avgScore);
      totalScore += avgScore;
    });
    
    // Allocate proportionally to scores
    typeGroups.forEach((chunks, type) => {
      const score = typeScores.get(type) || 0;
      const proportion = totalScore > 0 ? score / totalScore : 1 / typeGroups.size;
      budgets.set(type, Math.floor(totalBudget * proportion));
    });
    
    return budgets;
  }
  
  /**
   * Select strategy based on query complexity and budget
   */
  private selectStrategy(
    queryComplexity: number,
    availableTokens: number
  ): BudgetAllocation['strategy'] {
    // For simple queries or tight budgets, use greedy
    if (queryComplexity < 0.3 || availableTokens < 1000) {
      return 'greedy';
    }
    
    // For complex queries with good budget, use diverse
    if (queryComplexity > 0.7 && availableTokens > 3000) {
      return 'diverse';
    }
    
    // Default to balanced
    return 'balanced';
  }
  
  /**
   * Estimate token count for content
   */
  estimateTokens(content: string): number {
    // Rough estimation: ~1 token per 4 characters
    // More accurate for English/German text
    const charCount = content.length;
    const wordCount = content.split(/\s+/).length;
    
    // Average of character and word-based estimates
    const charEstimate = charCount / 4;
    const wordEstimate = wordCount * 1.3;
    
    return Math.round((charEstimate + wordEstimate) / 2);
  }
  
  /**
   * Calculate token statistics for chunks
   */
  calculateTokenStats(chunks: SmartChunk[]): TokenStats {
    const tokenCounts = chunks.map(c => 
      c.tokenCount || this.estimateTokens(c.content)
    );
    
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);
    
    // Token distribution by chunk type
    const distribution: Record<string, number> = {};
    chunks.forEach((chunk, i) => {
      const type = chunk.type;
      distribution[type] = (distribution[type] || 0) + tokenCounts[i];
    });
    
    return {
      totalTokens,
      chunkCount: chunks.length,
      averageTokensPerChunk: chunks.length > 0 ? totalTokens / chunks.length : 0,
      tokenDistribution: distribution
    };
  }
  
  /**
   * Optimize chunk selection for token efficiency
   */
  optimizeSelection(
    selected: SmartChunk[],
    targetTokens: number,
    tolerance: number = 0.1
  ): SmartChunk[] {
    const stats = this.calculateTokenStats(selected);
    
    // If within tolerance, return as is
    if (Math.abs(stats.totalTokens - targetTokens) / targetTokens <= tolerance) {
      return selected;
    }
    
    // If over budget, remove lowest value chunks
    if (stats.totalTokens > targetTokens) {
      const sorted = [...selected].sort((a, b) => {
        // Sort by token efficiency (value per token)
        const efficiencyA = (a.metadata.relevanceScore || 0.5) / (a.tokenCount || 1000);
        const efficiencyB = (b.metadata.relevanceScore || 0.5) / (b.tokenCount || 1000);
        return efficiencyA - efficiencyB;
      });
      
      let optimized = [...sorted];
      let currentTokens = stats.totalTokens;
      
      while (currentTokens > targetTokens && optimized.length > 1) {
        const removed = optimized.shift()!;
        currentTokens -= (removed.tokenCount || this.estimateTokens(removed.content));
      }
      
      return optimized;
    }
    
    // If under budget, we could add more chunks (handled elsewhere)
    return selected;
  }
}