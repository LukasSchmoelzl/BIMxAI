/**
 * Manager for project manifests
 */

import { ProjectManifest, SmartChunk, ChunkSummary, ChunkIndex } from '@/types/chunks';
import { FileStore } from './file-store';
import { ProjectNotFoundError, CorruptedDataError } from '@/types/api';

export class ManifestManager {
  constructor(private fileStore: FileStore) {}
  
  /**
   * Create manifest from chunks
   */
  createManifest(
    projectId: string,
    projectName: string,
    chunks: SmartChunk[],
    metadata: {
      fileName: string;
      fileSize: number;
      processingTime: number;
    }
  ): ProjectManifest {
    const now = new Date();
    
    // Create chunk summaries
    const chunkSummaries: ChunkSummary[] = chunks.map(chunk => ({
      id: chunk.id,
      type: chunk.type,
      summary: chunk.summary,
      tokenCount: chunk.tokenCount,
      entityCount: chunk.metadata.entityCount,
      keywords: this.extractKeywords(chunk),
    }));
    
    // Build indices
    const index = this.buildIndex(chunks);
    
    // Calculate totals
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    const totalEntities = chunks.reduce((sum, chunk) => sum + chunk.metadata.entityCount, 0);
    
    return {
      projectId,
      name: projectName,
      totalChunks: chunks.length,
      totalEntities,
      totalTokens,
      created: now,
      updated: now,
      chunks: chunkSummaries,
      index,
      metadata: {
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        processingTime: metadata.processingTime,
        version: '0.1.0',
      },
    };
  }
  
  /**
   * Update manifest with new chunks
   */
  async updateManifest(
    projectId: string,
    newChunks: SmartChunk[]
  ): Promise<ProjectManifest | null> {
    const manifest = await this.fileStore.loadManifest(projectId);
    if (!manifest) {
      return null;
    }
    
    // Add new chunk summaries
    const newSummaries: ChunkSummary[] = newChunks.map(chunk => ({
      id: chunk.id,
      type: chunk.type,
      summary: chunk.summary,
      tokenCount: chunk.tokenCount,
      entityCount: chunk.metadata.entityCount,
      keywords: this.extractKeywords(chunk),
    }));
    
    manifest.chunks.push(...newSummaries);
    manifest.totalChunks = manifest.chunks.length;
    manifest.totalTokens += newChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    manifest.totalEntities += newChunks.reduce((sum, chunk) => sum + chunk.metadata.entityCount, 0);
    manifest.updated = new Date();
    
    // Rebuild index with all chunks
    const allChunks = await this.fileStore.loadAllChunks(projectId);
    manifest.index = this.buildIndex(allChunks);
    
    await this.fileStore.saveManifest(manifest);
    
    // Save indices separately for faster access
    await this.saveIndices(projectId, manifest.index);
    
    return manifest;
  }
  
  /**
   * Build chunk index
   */
  private buildIndex(chunks: SmartChunk[]): ChunkIndex {
    const index: ChunkIndex = {
      byType: {},
      byEntityType: {},
      byFloor: {},
      bySystem: {},
      spatial: { chunks: [] },
    };
    
    for (const chunk of chunks) {
      // Index by chunk type
      if (!index.byType[chunk.type]) {
        index.byType[chunk.type] = [];
      }
      index.byType[chunk.type].push(chunk.id);
      
      // Index by entity types
      for (const entityType of chunk.metadata.entityTypes) {
        if (!index.byEntityType[entityType]) {
          index.byEntityType[entityType] = [];
        }
        index.byEntityType[entityType].push(chunk.id);
      }
      
      // Index by floor
      if (chunk.metadata.floor !== undefined) {
        const floor = chunk.metadata.floor;
        if (!index.byFloor[floor]) {
          index.byFloor[floor] = [];
        }
        index.byFloor[floor].push(chunk.id);
      }
      
      // Index by system
      if (chunk.metadata.system) {
        const system = chunk.metadata.system;
        if (!index.bySystem[system]) {
          index.bySystem[system] = [];
        }
        index.bySystem[system].push(chunk.id);
      }
      
      // Spatial index
      if (chunk.metadata.bbox) {
        index.spatial.chunks.push({
          id: chunk.id,
          bbox: chunk.metadata.bbox,
        });
      }
    }
    
    return index;
  }
  
  /**
   * Extract keywords from chunk
   */
  private extractKeywords(chunk: SmartChunk): string[] {
    const keywords: Set<string> = new Set();
    
    // Add entity types
    chunk.metadata.entityTypes.forEach(type => keywords.add(type.toLowerCase()));
    
    // Add system if present
    if (chunk.metadata.system) {
      keywords.add(chunk.metadata.system.toLowerCase());
    }
    
    // Add floor info
    if (chunk.metadata.floor !== undefined) {
      keywords.add(`floor${chunk.metadata.floor}`);
      keywords.add(`level${chunk.metadata.floor}`);
    }
    
    // Extract from summary (simple approach)
    const summaryWords = chunk.summary
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    summaryWords.slice(0, 10).forEach(word => keywords.add(word));
    
    return Array.from(keywords);
  }
  
  /**
   * Save indices as separate files for faster access
   */
  private async saveIndices(projectId: string, index: ChunkIndex): Promise<void> {
    // Save each index type separately
    await this.fileStore.saveIndex(projectId, 'byType', index.byType);
    await this.fileStore.saveIndex(projectId, 'byEntityType', index.byEntityType);
    await this.fileStore.saveIndex(projectId, 'byFloor', index.byFloor);
    await this.fileStore.saveIndex(projectId, 'bySystem', index.bySystem);
    await this.fileStore.saveIndex(projectId, 'spatial', index.spatial);
  }
  
  /**
   * Load indices from separate files
   */
  async loadIndices(projectId: string): Promise<ChunkIndex | null> {
    try {
      const byType = await this.fileStore.loadIndex(projectId, 'byType');
      const byEntityType = await this.fileStore.loadIndex(projectId, 'byEntityType');
      const byFloor = await this.fileStore.loadIndex(projectId, 'byFloor');
      const bySystem = await this.fileStore.loadIndex(projectId, 'bySystem');
      const spatial = await this.fileStore.loadIndex(projectId, 'spatial');
      
      if (!byType || !byEntityType) {
        return null;
      }
      
      return {
        byType,
        byEntityType,
        byFloor: byFloor || {},
        bySystem: bySystem || {},
        spatial: spatial || { chunks: [] },
      };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Validate manifest integrity
   */
  async validateManifest(projectId: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    try {
      const manifest = await this.fileStore.loadManifest(projectId);
      if (!manifest) {
        throw new ProjectNotFoundError(projectId);
      }
      
      // Check required fields
      if (!manifest.projectId) errors.push('Missing projectId');
      if (!manifest.name) errors.push('Missing project name');
      if (!manifest.chunks || !Array.isArray(manifest.chunks)) errors.push('Invalid chunks array');
      if (!manifest.index) errors.push('Missing index');
      
      // Validate chunk references
      const chunkIds = new Set(manifest.chunks.map(c => c.id));
      const indexedChunkIds = new Set<string>();
      
      // Collect all chunk IDs from indices
      Object.values(manifest.index.byType || {}).flat().forEach(id => indexedChunkIds.add(id));
      
      // Check for orphaned chunks in index
      indexedChunkIds.forEach(id => {
        if (!chunkIds.has(id)) {
          errors.push(`Chunk ${id} in index but not in manifest`);
        }
      });
      
      // Verify chunk files exist
      for (const summary of manifest.chunks) {
        const chunk = await this.fileStore.loadChunk(projectId, summary.id);
        if (!chunk) {
          errors.push(`Chunk file missing: ${summary.id}`);
        } else if (chunk.tokenCount !== summary.tokenCount) {
          errors.push(`Token count mismatch for chunk ${summary.id}`);
        }
      }
      
      // Validate totals
      const actualTotalTokens = manifest.chunks.reduce((sum, c) => sum + c.tokenCount, 0);
      if (manifest.totalTokens !== actualTotalTokens) {
        errors.push(`Total tokens mismatch: ${manifest.totalTokens} vs ${actualTotalTokens}`);
      }
      
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        errors.push(`Project not found: ${projectId}`);
      } else {
        errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * Rebuild manifest from chunks
   */
  async rebuildManifest(projectId: string): Promise<ProjectManifest> {
    const chunks = await this.fileStore.loadAllChunks(projectId);
    if (chunks.length === 0) {
      throw new ProjectNotFoundError(projectId);
    }
    
    // Get existing manifest for metadata
    const existingManifest = await this.fileStore.loadManifest(projectId);
    const metadata = existingManifest?.metadata || {
      fileName: 'Unknown',
      fileSize: 0,
      processingTime: 0,
      version: '0.1.0',
    };
    
    const manifest = this.createManifest(
      projectId,
      existingManifest?.name || 'Rebuilt Project',
      chunks,
      metadata
    );
    
    // Preserve original creation date if available
    if (existingManifest?.created) {
      manifest.created = existingManifest.created;
    }
    
    await this.fileStore.saveManifest(manifest);
    await this.saveIndices(projectId, manifest.index);
    
    return manifest;
  }
  
  /**
   * Get manifest statistics
   */
  async getManifestStats(projectId: string): Promise<{
    chunkSizeDistribution: Record<string, number>;
    entityTypeDistribution: Record<string, number>;
    avgTokensPerChunk: number;
    avgEntitiesPerChunk: number;
    storageSize: number;
  }> {
    const manifest = await this.fileStore.loadManifest(projectId);
    if (!manifest) {
      throw new ProjectNotFoundError(projectId);
    }
    
    const chunkSizeDistribution: Record<string, number> = {
      small: 0,    // < 1000 tokens
      medium: 0,   // 1000-3000 tokens
      large: 0,    // > 3000 tokens
    };
    
    manifest.chunks.forEach(chunk => {
      if (chunk.tokenCount < 1000) chunkSizeDistribution.small++;
      else if (chunk.tokenCount <= 3000) chunkSizeDistribution.medium++;
      else chunkSizeDistribution.large++;
    });
    
    const entityTypeDistribution: Record<string, number> = {};
    Object.entries(manifest.index.byEntityType).forEach(([type, chunkIds]) => {
      entityTypeDistribution[type] = chunkIds.length;
    });
    
    const avgTokensPerChunk = manifest.totalTokens / Math.max(manifest.totalChunks, 1);
    const avgEntitiesPerChunk = manifest.totalEntities / Math.max(manifest.totalChunks, 1);
    const storageSize = await this.fileStore.getProjectSize(projectId);
    
    return {
      chunkSizeDistribution,
      entityTypeDistribution,
      avgTokensPerChunk,
      avgEntitiesPerChunk,
      storageSize,
    };
  }
}