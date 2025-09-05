/**
 * Minimal logging utility for chunk processing
 */

export interface ChunkLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: any;
}

export class ChunkLogger {
  private static enabled = process.env.NODE_ENV === 'development';
  private static logs: ChunkLogEntry[] = [];
  
  static info(message: string, data?: any) {
    if (!this.enabled) return;
    
    // Only log relevant information
    const relevantData = data ? this.filterRelevantData(data) : undefined;
    
    console.log(`[Chunk] ${message}`, relevantData || '');
    this.addLog('info', message, relevantData);
  }
  
  static warn(message: string, data?: any) {
    if (!this.enabled) return;
    
    const relevantData = data ? this.filterRelevantData(data) : undefined;
    console.warn(`[Chunk Warning] ${message}`, relevantData || '');
    this.addLog('warn', message, relevantData);
  }
  
  static error(message: string, error?: any) {
    // Always log errors
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n') // Only first 3 lines
    } : error;
    
    console.error(`[Chunk Error] ${message}`, errorData || '');
    this.addLog('error', message, errorData);
  }
  
  private static filterRelevantData(data: any): any {
    // Only include relevant fields
    if (Array.isArray(data)) {
      return { count: data.length };
    }
    
    if (typeof data === 'object' && data !== null) {
      const filtered: any = {};
      
      // Whitelist of relevant fields
      const relevantFields = [
        'projectId', 'entityCount', 'chunkCount', 'totalVolume',
        'totalArea', 'totalWeight', 'strategy', 'processingTime',
        'tokenCount', 'error', 'warning'
      ];
      
      for (const field of relevantFields) {
        if (field in data) {
          filtered[field] = data[field];
        }
      }
      
      return Object.keys(filtered).length > 0 ? filtered : undefined;
    }
    
    return data;
  }
  
  private static addLog(level: ChunkLogEntry['level'], message: string, data?: any) {
    this.logs.push({
      timestamp: new Date(),
      level,
      message,
      data
    });
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }
  
  static getLogs(): ChunkLogEntry[] {
    return [...this.logs];
  }
  
  static clearLogs() {
    this.logs = [];
  }
}