/**
 * Enhanced Chunk logger utility for debugging chunk creation
 * Migrated from features/smart-chunks to bim-context
 */

import { ChunkCreationStats, ChunkLogEntry } from '@/types/utils';

export class EnhancedChunkLogger {
  private static instance: EnhancedChunkLogger;
  private enabled: boolean = true;
  private stats: ChunkCreationStats = {
    totalEntities: 0,
    chunksCreated: 0,
    attributesExtracted: 0,
    psetsExtracted: 0,
    geometriesExtracted: 0,
    processingTime: 0
  };
  private logs: ChunkLogEntry[] = [];
  private startTime: number = 0;
  
  private constructor() {
    // Auto-enable if in development
    if (process.env.NODE_ENV === 'development') {
      this.enabled = true;
    }
  }
  
  static getInstance(): EnhancedChunkLogger {
    if (!EnhancedChunkLogger.instance) {
      EnhancedChunkLogger.instance = new EnhancedChunkLogger();
    }
    return EnhancedChunkLogger.instance;
  }
  
  enable(): void {
    this.enabled = true;
    console.log('🔧 Chunk Logger: ENABLED');
  }
  
  disable(): void {
    this.enabled = false;
    console.log('🔧 Chunk Logger: DISABLED');
  }
  
  startProcessing(): void {
    if (!this.enabled) return;
    
    this.startTime = Date.now();
    this.stats = {
      totalEntities: 0,
      chunksCreated: 0,
      attributesExtracted: 0,
      psetsExtracted: 0,
      geometriesExtracted: 0,
      processingTime: 0
    };
    console.log('\n🏁 CHUNK PROCESSING STARTED\n' + '='.repeat(50));
  }
  
  logEntityProcessing(entity: any): void {
    if (!this.enabled) return;
    
    this.stats.totalEntities++;
    
    if (this.stats.totalEntities % 100 === 0) {
      console.log(`📊 Processed ${this.stats.totalEntities} entities...`);
    }
  }
  
  logChunkCreated(chunkId: string, entityCount: number, tokenCount?: number): void {
    if (!this.enabled) return;
    
    this.stats.chunksCreated++;
    console.log(`📦 Chunk Created: ${chunkId}`);
    console.log(`   - Entities: ${entityCount}`);
    if (tokenCount !== undefined) {
      console.log(`   - Tokens: ${tokenCount}`);
    }
    this.addLog('info', `Chunk created: ${chunkId}`, { entityCount, tokenCount });
  }
  
  logAttributeExtracted(attributeName: string, value: any): void {
    if (!this.enabled) return;
    
    this.stats.attributesExtracted++;
    
    // Only log every 10th attribute to avoid spam
    if (this.stats.attributesExtracted % 10 === 0) {
      console.log(`📋 Attributes extracted: ${this.stats.attributesExtracted}`);
    }
  }
  
  logPsetExtracted(psetName: string, propertyCount: number): void {
    if (!this.enabled) return;
    
    this.stats.psetsExtracted++;
    console.log(`🏠 Pset Extracted: ${psetName} (${propertyCount} properties)`);
  }
  
  logGeometryExtracted(entityId: string | number, vertexCount: number): void {
    if (!this.enabled) return;
    
    this.stats.geometriesExtracted++;
    
    // Only log significant geometries
    if (vertexCount > 100) {
      console.log(`📐 Geometry Extracted: Entity ${entityId} (${vertexCount} vertices)`);
    }
  }
  
  logError(message: string, error?: any): void {
    console.error(`❌ Chunk Processing Error: ${message}`, error);
    this.addLog('error', message, error);
  }
  
  logWarning(message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.warn(`⚠️ Chunk Processing Warning: ${message}`, data);
    this.addLog('warn', message, data);
  }
  
  logInfo(message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.log(`ℹ️ ${message}`, data);
    this.addLog('info', message, data);
  }
  
  logDebug(message: string, data?: any): void {
    if (!this.enabled) return;
    
    console.log(`🔍 Debug: ${message}`, data);
    this.addLog('debug', message, data);
  }
  
  logProcessingComplete(): void {
    if (!this.enabled) return;
    
    this.stats.processingTime = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ CHUNK PROCESSING COMPLETE');
    console.log('='.repeat(50));
    console.log(`📊 Processing Statistics:`);
    console.log(`   - Total Entities: ${this.stats.totalEntities}`);
    console.log(`   - Chunks Created: ${this.stats.chunksCreated}`);
    console.log(`   - Attributes Extracted: ${this.stats.attributesExtracted}`);
    console.log(`   - PSets Extracted: ${this.stats.psetsExtracted}`);
    console.log(`   - Geometries Extracted: ${this.stats.geometriesExtracted}`);
    console.log(`   - Processing Time: ${(this.stats.processingTime / 1000).toFixed(2)}s`);
    console.log(`   - Avg Time per Entity: ${(this.stats.processingTime / this.stats.totalEntities).toFixed(2)}ms`);
    
    if (this.stats.memoryUsed) {
      console.log(`   - Memory Used: ${(this.stats.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    }
    
    console.log('='.repeat(50) + '\n');
  }
  
  getStats(): ChunkCreationStats {
    return { ...this.stats };
  }
  
  getLogs(): ChunkLogEntry[] {
    return [...this.logs];
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  private addLog(level: ChunkLogEntry['level'], message: string, data?: any): void {
    this.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
    
    // Keep only last 500 logs
    if (this.logs.length > 500) {
      this.logs = this.logs.slice(-500);
    }
  }
}

// Export a singleton instance for backward compatibility
export const chunkLogger = EnhancedChunkLogger.getInstance();