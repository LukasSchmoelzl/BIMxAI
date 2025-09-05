/**
 * Cached wrapper for FileStore operations
 */

import { FileStore } from './file-store';
import { CacheManager } from './cache-manager';
import { SmartChunk, ProjectManifest } from '@/types/chunks';
import { getMVPConfig } from '../config';

export class CachedFileStore extends FileStore {
  private cache: CacheManager;
  
  constructor(basePath?: string) {
    super(basePath);
    const config = getMVPConfig();
    this.cache = new CacheManager(
      config.features.cachingEnabled ? 100 : 0,
      5 * 60 * 1000 // 5 minutes
    );
  }
  
  /**
   * Load manifest with caching
   */
  async loadManifest(projectId: string): Promise<ProjectManifest | null> {
    const cacheKey = CacheManager.createKey('manifest', projectId);
    
    // Check cache first
    const cached = this.cache.get<ProjectManifest>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Load from file
    const manifest = await super.loadManifest(projectId);
    
    // Cache if found
    if (manifest) {
      this.cache.set(cacheKey, manifest);
    }
    
    return manifest;
  }
  
  /**
   * Save manifest and invalidate cache
   */
  async saveManifest(manifest: ProjectManifest): Promise<void> {
    await super.saveManifest(manifest);
    
    // Invalidate cache
    const cacheKey = CacheManager.createKey('manifest', manifest.projectId);
    this.cache.delete(cacheKey);
  }
  
  /**
   * Load chunk with caching
   */
  async loadChunk(projectId: string, chunkId: string): Promise<SmartChunk | null> {
    const cacheKey = CacheManager.createKey('chunk', projectId, chunkId);
    
    // Check cache first
    const cached = this.cache.get<SmartChunk>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Load from file
    const chunk = await super.loadChunk(projectId, chunkId);
    
    // Cache if found
    if (chunk) {
      this.cache.set(cacheKey, chunk);
    }
    
    return chunk;
  }
  
  /**
   * Save chunk and invalidate cache
   */
  async saveChunk(chunk: SmartChunk): Promise<void> {
    await super.saveChunk(chunk);
    
    // Invalidate cache
    const cacheKey = CacheManager.createKey('chunk', chunk.projectId, chunk.id);
    this.cache.delete(cacheKey);
  }
  
  /**
   * Load multiple chunks with caching
   */
  async loadChunks(projectId: string, chunkIds: string[]): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    const uncachedIds: string[] = [];
    
    // Check cache for each chunk
    for (const chunkId of chunkIds) {
      const cacheKey = CacheManager.createKey('chunk', projectId, chunkId);
      const cached = this.cache.get<SmartChunk>(cacheKey);
      
      if (cached) {
        chunks.push(cached);
      } else {
        uncachedIds.push(chunkId);
      }
    }
    
    // Load uncached chunks
    if (uncachedIds.length > 0) {
      const loadedChunks = await super.loadChunks(projectId, uncachedIds);
      
      // Cache loaded chunks
      for (const chunk of loadedChunks) {
        const cacheKey = CacheManager.createKey('chunk', projectId, chunk.id);
        this.cache.set(cacheKey, chunk);
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Delete project and invalidate all related cache
   */
  async deleteProject(projectId: string): Promise<void> {
    await super.deleteProject(projectId);
    
    // Invalidate all cache entries for this project
    this.cache.invalidatePattern(`.*:${projectId}.*`);
  }
  
  /**
   * Load index with caching
   */
  async loadIndex(projectId: string, indexName: string): Promise<any | null> {
    const cacheKey = CacheManager.createKey('index', projectId, indexName);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Load from file
    const index = await super.loadIndex(projectId, indexName);
    
    // Cache if found
    if (index) {
      this.cache.set(cacheKey, index);
    }
    
    return index;
  }
  
  /**
   * Save index and invalidate cache
   */
  async saveIndex(projectId: string, indexName: string, indexData: any): Promise<void> {
    await super.saveIndex(projectId, indexName, indexData);
    
    // Invalidate cache
    const cacheKey = CacheManager.createKey('index', projectId, indexName);
    this.cache.delete(cacheKey);
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}