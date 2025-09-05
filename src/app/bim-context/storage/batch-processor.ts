/**
 * Batch operations for storage
 */

import fs from 'fs-extra';
import path from 'path';
import { FileStore } from './file-store';
import { ManifestManager } from './manifest-manager';
import { SmartChunk, ProjectManifest } from '@/types/chunks';
import { ProjectNotFoundError, StorageError } from '@/types/api';

export class BatchProcessor {
  constructor(
    private fileStore: FileStore,
    private manifestManager: ManifestManager
  ) {}
  
  /**
   * Export project as a single archive
   */
  async exportProject(projectId: string): Promise<{
    data: Buffer;
    metadata: {
      projectId: string;
      exportDate: Date;
      version: string;
      size: number;
    };
  }> {
    const manifest = await this.fileStore.loadManifest(projectId);
    if (!manifest) {
      throw new ProjectNotFoundError(projectId);
    }
    
    const exportData = {
      manifest,
      chunks: [] as SmartChunk[],
      metadata: await this.fileStore.getProjectMetadata(projectId),
      indices: {} as Record<string, any>,
    };
    
    // Load all chunks
    exportData.chunks = await this.fileStore.loadAllChunks(projectId);
    
    // Load all indices
    const indexNames = ['byType', 'byEntityType', 'byFloor', 'bySystem', 'spatial'];
    for (const indexName of indexNames) {
      const index = await this.fileStore.loadIndex(projectId, indexName);
      if (index) {
        exportData.indices[indexName] = index;
      }
    }
    
    // Convert to JSON buffer
    const jsonString = JSON.stringify(exportData, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    
    return {
      data: buffer,
      metadata: {
        projectId,
        exportDate: new Date(),
        version: manifest.metadata.version,
        size: buffer.length,
      },
    };
  }
  
  /**
   * Import project from archive
   */
  async importProject(
    archiveData: Buffer,
    newProjectId?: string
  ): Promise<{
    projectId: string;
    chunksImported: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      // Parse archive
      const importData = JSON.parse(archiveData.toString('utf-8'));
      
      if (!importData.manifest || !importData.chunks) {
        throw new StorageError('Invalid archive format', 'INVALID_ARCHIVE');
      }
      
      const manifest = importData.manifest as ProjectManifest;
      const projectId = newProjectId || manifest.projectId;
      
      // Check if project already exists
      if (await this.fileStore.projectExists(projectId)) {
        throw new StorageError(`Project ${projectId} already exists`, 'PROJECT_EXISTS');
      }
      
      // Create project
      await this.fileStore.createProject(projectId, importData.metadata);
      
      // Update manifest with new project ID if changed
      if (projectId !== manifest.projectId) {
        manifest.projectId = projectId;
        // Update chunk project IDs
        importData.chunks.forEach((chunk: SmartChunk) => {
          chunk.projectId = projectId;
        });
      }
      
      // Save chunks
      for (const chunk of importData.chunks) {
        try {
          await this.fileStore.saveChunk(chunk);
        } catch (error) {
          warnings.push(`Failed to import chunk ${chunk.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Save manifest
      await this.fileStore.saveManifest(manifest);
      
      // Save indices if available
      if (importData.indices) {
        for (const [indexName, indexData] of Object.entries(importData.indices)) {
          try {
            await this.fileStore.saveIndex(projectId, indexName, indexData);
          } catch (error) {
            warnings.push(`Failed to import index ${indexName}`);
          }
        }
      }
      
      return {
        projectId,
        chunksImported: importData.chunks.length,
        warnings,
      };
      
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      throw new StorageError(
        'Failed to import project archive',
        'IMPORT_FAILED',
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
  
  /**
   * Merge multiple projects into one
   */
  async mergeProjects(
    projectIds: string[],
    targetProjectId: string,
    targetProjectName: string
  ): Promise<{
    projectId: string;
    totalChunks: number;
    totalEntities: number;
  }> {
    if (projectIds.length < 2) {
      throw new StorageError('At least 2 projects required for merge', 'INVALID_MERGE');
    }
    
    const allChunks: SmartChunk[] = [];
    let totalEntities = 0;
    let totalSize = 0;
    
    // Collect all chunks from source projects
    for (const projectId of projectIds) {
      const manifest = await this.fileStore.loadManifest(projectId);
      if (!manifest) {
        throw new ProjectNotFoundError(projectId);
      }
      
      const chunks = await this.fileStore.loadAllChunks(projectId);
      
      // Update chunk IDs to avoid conflicts
      chunks.forEach((chunk, index) => {
        chunk.id = `${targetProjectId}-merged-${projectId}-${index}-${Date.now()}`;
        chunk.projectId = targetProjectId;
      });
      
      allChunks.push(...chunks);
      totalEntities += manifest.totalEntities;
      totalSize += manifest.metadata.fileSize;
    }
    
    // Create new project
    await this.fileStore.createProject(targetProjectId, {
      mergedFrom: projectIds,
      mergeDate: new Date(),
    });
    
    // Save all chunks
    await this.fileStore.saveChunks(allChunks);
    
    // Create merged manifest
    const mergedManifest = this.manifestManager.createManifest(
      targetProjectId,
      targetProjectName,
      allChunks,
      {
        fileName: `Merged from ${projectIds.join(', ')}`,
        fileSize: totalSize,
        processingTime: 0,
      }
    );
    
    await this.fileStore.saveManifest(mergedManifest);
    
    return {
      projectId: targetProjectId,
      totalChunks: allChunks.length,
      totalEntities,
    };
  }
  
  /**
   * Clone a project
   */
  async cloneProject(
    sourceProjectId: string,
    targetProjectId: string,
    targetProjectName?: string
  ): Promise<{
    projectId: string;
    chunksCloned: number;
  }> {
    // Export source project
    const exportResult = await this.exportProject(sourceProjectId);
    
    // Modify project name if provided
    if (targetProjectName) {
      const data = JSON.parse(exportResult.data.toString('utf-8'));
      data.manifest.name = targetProjectName;
      exportResult.data = Buffer.from(JSON.stringify(data), 'utf-8');
    }
    
    // Import as new project
    const importResult = await this.importProject(exportResult.data, targetProjectId);
    
    return {
      projectId: importResult.projectId,
      chunksCloned: importResult.chunksImported,
    };
  }
  
  /**
   * Batch delete projects
   */
  async deleteProjects(projectIds: string[]): Promise<{
    deleted: string[];
    failed: Array<{ projectId: string; error: string }>;
  }> {
    const deleted: string[] = [];
    const failed: Array<{ projectId: string; error: string }> = [];
    
    for (const projectId of projectIds) {
      try {
        await this.fileStore.deleteProject(projectId);
        deleted.push(projectId);
      } catch (error) {
        failed.push({
          projectId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return { deleted, failed };
  }
  
  /**
   * Optimize storage by removing duplicate chunks
   */
  async optimizeProject(projectId: string): Promise<{
    originalChunks: number;
    optimizedChunks: number;
    spaceSaved: number;
  }> {
    const manifest = await this.fileStore.loadManifest(projectId);
    if (!manifest) {
      throw new ProjectNotFoundError(projectId);
    }
    
    const chunks = await this.fileStore.loadAllChunks(projectId);
    const originalCount = chunks.length;
    const originalSize = await this.fileStore.getProjectSize(projectId);
    
    // Find and remove duplicates based on content hash
    const uniqueChunks = new Map<string, SmartChunk>();
    const duplicateIds: string[] = [];
    
    for (const chunk of chunks) {
      const contentHash = this.hashContent(chunk.content);
      
      if (uniqueChunks.has(contentHash)) {
        duplicateIds.push(chunk.id);
      } else {
        uniqueChunks.set(contentHash, chunk);
      }
    }
    
    // Delete duplicate chunks
    if (duplicateIds.length > 0) {
      await this.fileStore.deleteChunks(projectId, duplicateIds);
      
      // Rebuild manifest
      await this.manifestManager.rebuildManifest(projectId);
    }
    
    const optimizedSize = await this.fileStore.getProjectSize(projectId);
    
    return {
      originalChunks: originalCount,
      optimizedChunks: uniqueChunks.size,
      spaceSaved: originalSize - optimizedSize,
    };
  }
  
  /**
   * Simple content hashing (same as in SmartChunker)
   */
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}