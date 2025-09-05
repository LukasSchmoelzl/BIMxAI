/**
 * File-based storage for chunks and manifests
 */

import path from 'path';
import { SmartChunk, ProjectManifest } from '@/types/chunks';
import { getMVPConfig } from '../config';

export class FileStore {
  private config = getMVPConfig();
  private fs: typeof import('fs-extra');
  
  constructor(private basePath: string = getMVPConfig().storage.projectsPath) {
    // Dynamic import for server-only module
    if (typeof window === 'undefined') {
      // Use dynamic import to avoid bundling issues
      const fsExtra = require('fs-extra');
      this.fs = fsExtra;
      // Ensure base path exists
      this.fs.ensureDirSync(this.basePath);
    } else {
      throw new Error('FileStore can only be used on the server side');
    }
  }
  
  /**
   * Get project directory path
   */
  private getProjectPath(projectId: string): string {
    return path.join(this.basePath, projectId);
  }
  
  /**
   * Get chunks directory path
   */
  private getChunksPath(projectId: string): string {
    return path.join(this.getProjectPath(projectId), 'chunks');
  }
  
  /**
   * Save project manifest
   */
  async saveManifest(manifest: ProjectManifest): Promise<void> {
    const projectPath = this.getProjectPath(manifest.projectId);
    await this.fs.ensureDir(projectPath);
    
    const manifestPath = path.join(projectPath, 'manifest.json');
    await this.fs.writeJson(manifestPath, manifest, { spaces: 2 });
  }
  
  /**
   * Load project manifest
   */
  async loadManifest(projectId: string): Promise<ProjectManifest | null> {
    const manifestPath = path.join(this.getProjectPath(projectId), 'manifest.json');
    
    if (!await this.fs.pathExists(manifestPath)) {
      return null;
    }
    
    return await this.fs.readJson(manifestPath);
  }
  
  /**
   * Save chunk
   */
  async saveChunk(chunk: SmartChunk): Promise<void> {
    const chunksPath = this.getChunksPath(chunk.projectId);
    await this.fs.ensureDir(chunksPath);
    
    const chunkPath = path.join(chunksPath, `${chunk.id}.json`);
    await this.fs.writeJson(chunkPath, chunk, { spaces: 2 });
  }
  
  /**
   * Save multiple chunks
   */
  async saveChunks(chunks: SmartChunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.saveChunk(chunk);
    }
  }
  
  /**
   * Load chunk
   */
  async loadChunk(projectId: string, chunkId: string): Promise<SmartChunk | null> {
    const chunkPath = path.join(this.getChunksPath(projectId), `${chunkId}.json`);
    
    if (!await this.fs.pathExists(chunkPath)) {
      return null;
    }
    
    return await this.fs.readJson(chunkPath);
  }
  
  /**
   * Load multiple chunks
   */
  async loadChunks(projectId: string, chunkIds: string[]): Promise<SmartChunk[]> {
    const chunks: SmartChunk[] = [];
    
    for (const chunkId of chunkIds) {
      const chunk = await this.loadChunk(projectId, chunkId);
      if (chunk) {
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Delete project and all its data
   */
  async deleteProject(projectId: string): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    await this.fs.remove(projectPath);
  }
  
  /**
   * List all projects
   */
  async listProjects(): Promise<string[]> {
    const entries = await this.fs.readdir(this.basePath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  }
  
  /**
   * Check if project exists
   */
  async projectExists(projectId: string): Promise<boolean> {
    return await this.fs.pathExists(this.getProjectPath(projectId));
  }
  
  /**
   * Get project storage size
   */
  async getProjectSize(projectId: string): Promise<number> {
    const projectPath = this.getProjectPath(projectId);
    
    if (!await this.fs.pathExists(projectPath)) {
      return 0;
    }
    
    return await this.getDirectorySize(projectPath);
  }
  
  /**
   * Calculate directory size recursively
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    const entries = await this.fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        totalSize += await this.getDirectorySize(fullPath);
      } else {
        const stats = await this.fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  }
  
  /**
   * Create a new project
   */
  async createProject(projectId: string, metadata?: Record<string, any>): Promise<void> {
    const projectPath = this.getProjectPath(projectId);
    
    if (await this.fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectId} already exists`);
    }
    
    // Create project structure
    await this.fs.ensureDir(path.join(projectPath, 'chunks'));
    await this.fs.ensureDir(path.join(projectPath, 'indices'));
    
    // Save metadata if provided
    if (metadata) {
      const metadataPath = path.join(projectPath, 'metadata.json');
      await this.fs.writeJson(metadataPath, {
        ...metadata,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }, { spaces: 2 });
    }
  }
  
  /**
   * Load all chunks for a project
   */
  async loadAllChunks(projectId: string): Promise<SmartChunk[]> {
    const chunksPath = this.getChunksPath(projectId);
    
    if (!await this.fs.pathExists(chunksPath)) {
      return [];
    }
    
    const chunkFiles = await this.fs.readdir(chunksPath);
    const chunks: SmartChunk[] = [];
    
    for (const file of chunkFiles) {
      if (file.endsWith('.json')) {
        const chunk = await this.fs.readJson(path.join(chunksPath, file));
        chunks.push(chunk);
      }
    }
    
    return chunks;
  }
  
  /**
   * Delete specific chunks
   */
  async deleteChunks(projectId: string, chunkIds: string[]): Promise<void> {
    const chunksPath = this.getChunksPath(projectId);
    
    for (const chunkId of chunkIds) {
      const chunkPath = path.join(chunksPath, `${chunkId}.json`);
      if (await this.fs.pathExists(chunkPath)) {
        await this.fs.remove(chunkPath);
      }
    }
  }
  
  /**
   * Get project metadata
   */
  async getProjectMetadata(projectId: string): Promise<Record<string, any> | null> {
    const metadataPath = path.join(this.getProjectPath(projectId), 'metadata.json');
    
    if (!await this.fs.pathExists(metadataPath)) {
      return null;
    }
    
    return await this.fs.readJson(metadataPath);
  }
  
  /**
   * Update project metadata
   */
  async updateProjectMetadata(projectId: string, metadata: Record<string, any>): Promise<void> {
    const metadataPath = path.join(this.getProjectPath(projectId), 'metadata.json');
    
    const existing = await this.getProjectMetadata(projectId) || {};
    
    await this.fs.writeJson(metadataPath, {
      ...existing,
      ...metadata,
      updated: new Date().toISOString(),
    }, { spaces: 2 });
  }
  
  /**
   * Save index file
   */
  async saveIndex(projectId: string, indexName: string, indexData: any): Promise<void> {
    const indexPath = path.join(this.getProjectPath(projectId), 'indices', `${indexName}.json`);
    await this.fs.ensureDir(path.dirname(indexPath));
    await this.fs.writeJson(indexPath, indexData, { spaces: 2 });
  }
  
  /**
   * Load index file
   */
  async loadIndex(projectId: string, indexName: string): Promise<any | null> {
    const indexPath = path.join(this.getProjectPath(projectId), 'indices', `${indexName}.json`);
    
    if (!await this.fs.pathExists(indexPath)) {
      return null;
    }
    
    return await this.fs.readJson(indexPath);
  }
}