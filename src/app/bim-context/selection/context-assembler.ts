/**
 * Context assembly for optimal presentation
 */

import { SmartChunk } from '@/types/chunks';
import { QueryIntent, BudgetAllocation } from '@/types/selection';

import { AssembledContext, ContextMetadata, FormattingOptions } from '@/types/selection';

export class ContextAssembler {
  private readonly FORMAT_VERSION = '1.0';
  
  /**
   * Assemble context from selected chunks
   */
  assembleContext(
    chunks: SmartChunk[],
    intent: QueryIntent,
    budget: BudgetAllocation,
    options: FormattingOptions = {
      includeMetadata: true,
      includeHeaders: true,
      highlightKeywords: false,
      compactMode: false,
      language: 'de'
    }
  ): AssembledContext {
    // 1. Sort and organize chunks
    const organized = this.organizeChunks(chunks, intent);
    
    // 2. Create context header
    const header = this.createContextHeader(intent, chunks, options);
    
    // 3. Format chunks based on intent and options
    const formatted = this.formatChunks(organized, budget, intent, options);
    
    // 4. Calculate metadata
    const metadata = this.calculateMetadata(chunks, formatted);
    
    return {
      header,
      content: formatted,
      metadata
    };
  }
  
  /**
   * Organize chunks by relevance and type
   */
  private organizeChunks(
    chunks: SmartChunk[],
    intent: QueryIntent
  ): Map<string, SmartChunk[]> {
    const organized = new Map<string, SmartChunk[]>();
    
    // Group by type
    chunks.forEach(chunk => {
      const type = chunk.type;
      if (!organized.has(type)) {
        organized.set(type, []);
      }
      organized.get(type)!.push(chunk);
    });
    
    // Sort within each group based on query intent
    organized.forEach((chunks, type) => {
      chunks.sort((a, b) => {
        // Primary sort by relevance score
        const scoreA = a.metadata.relevanceScore || 0.5;
        const scoreB = b.metadata.relevanceScore || 0.5;
        
        if (Math.abs(scoreA - scoreB) > 0.1) {
          return scoreB - scoreA;
        }
        
        // Secondary sort based on query type
        if (intent.type === 'spatial' && a.metadata.spatialInfo && b.metadata.spatialInfo) {
          // Sort by floor for spatial queries
          return (a.metadata.spatialInfo.floor || 0) - (b.metadata.spatialInfo.floor || 0);
        }
        
        // Default to token count (smaller first for efficiency)
        return a.tokenCount - b.tokenCount;
      });
    });
    
    return organized;
  }
  
  /**
   * Create context header with query summary
   */
  private createContextHeader(
    intent: QueryIntent,
    chunks: SmartChunk[],
    options: FormattingOptions
  ): string {
    const lines: string[] = [];
    
    if (!options.includeHeaders) {
      return '';
    }
    
    const lang = options.language;
    
    lines.push(lang === 'de' 
      ? `## Kontext für Ihre Anfrage`
      : `## Context for Your Query`
    );
    
    lines.push('');
    
    // Query type summary
    const typeDescriptions = {
      de: {
        count: 'Zählung von Elementen',
        find: 'Suche nach spezifischen Elementen',
        spatial: 'Räumliche Abfrage',
        system: 'System-bezogene Abfrage',
        
        general: 'Allgemeine Abfrage'
      },
      en: {
        count: 'Counting elements',
        find: 'Finding specific elements',
        spatial: 'Spatial query',
        system: 'System-related query',
        
        general: 'General query'
      }
    };
    
    lines.push(lang === 'de'
      ? `**Abfragetyp:** ${typeDescriptions.de[intent.type]}`
      : `**Query Type:** ${typeDescriptions.en[intent.type]}`
    );
    
    // Entity types if present
    if (intent.entityTypes.length > 0) {
      lines.push(lang === 'de'
        ? `**Gesuchte Elemente:** ${intent.entityTypes.join(', ')}`
        : `**Requested Elements:** ${intent.entityTypes.join(', ')}`
      );
    }
    
    // Spatial context if present
    if (intent.spatialTerms.length > 0) {
      lines.push(lang === 'de'
        ? `**Räumlicher Kontext:** ${intent.spatialTerms.join(', ')}`
        : `**Spatial Context:** ${intent.spatialTerms.join(', ')}`
      );
    }
    
    // Chunk summary
    lines.push('');
    lines.push(lang === 'de'
      ? `**Ausgewählte Chunks:** ${chunks.length}`
      : `**Selected Chunks:** ${chunks.length}`
    );
    
    lines.push('');
    lines.push('---');
    lines.push('');
    
    return lines.join('\n');
  }
  
  /**
   * Format chunks for optimal presentation
   */
  private formatChunks(
    organized: Map<string, SmartChunk[]>,
    budget: BudgetAllocation,
    intent: QueryIntent,
    options: FormattingOptions
  ): string[] {
    const sections: string[] = [];
    const lang = options.language;
    
    // Type display names
    const typeNames = {
      de: {
        'spatial': 'Räumliche Informationen',
        'system': 'System-Komponenten',
        'element-type': 'Element-Typen',
        
      },
      en: {
        'spatial': 'Spatial Information',
        'system': 'System Components',
        'element-type': 'Element Types',
        
      }
    };
    
    // Format each type group
    organized.forEach((chunks, type) => {
      if (chunks.length === 0) return;
      
      // Section header
      if (options.includeHeaders) {
        const typeName = (typeNames[lang] as any)?.[type] || type;
        sections.push(`### ${typeName} (${chunks.length} ${lang === 'de' ? 'Chunks' : 'chunks'})`);
        sections.push('');
      }
      
      // Format individual chunks
      chunks.forEach((chunk, index) => {
        if (options.compactMode) {
          sections.push(...this.formatChunkCompact(chunk, index, intent, options));
        } else {
          sections.push(...this.formatChunkFull(chunk, index, intent, options));
        }
      });
      
      sections.push('');
    });
    
    return sections;
  }
  
  /**
   * Format chunk in compact mode
   */
  private formatChunkCompact(
    chunk: SmartChunk,
    index: number,
    intent: QueryIntent,
    options: FormattingOptions
  ): string[] {
    const lines: string[] = [];
    
    // Compact header with key info
    const spatialInfo = chunk.metadata.spatialInfo 
      ? ` | ${options.language === 'de' ? 'Etage' : 'Floor'}: ${chunk.metadata.spatialInfo.floor}` 
      : '';
    
    lines.push(`**[${index + 1}]** ${chunk.summary}${spatialInfo}`);
    
    // Key entities only
    if (chunk.metadata.entityTypes.length > 0) {
      const relevantEntities = chunk.metadata.entityTypes
        .filter(e => intent.entityTypes.length === 0 || intent.entityTypes.includes(e))
        .slice(0, 5);
      
      if (relevantEntities.length > 0) {
        lines.push(`> ${relevantEntities.join(', ')}`);
      }
    }
    
    // Condensed content (first 200 chars)
    if (!options.includeMetadata) {
      const condensed = chunk.content.substring(0, 200).trim();
      lines.push(`> ${condensed}...`);
    }
    
    lines.push('');
    
    return lines;
  }
  
  /**
   * Format chunk in full mode
   */
  private formatChunkFull(
    chunk: SmartChunk,
    index: number,
    intent: QueryIntent,
    options: FormattingOptions
  ): string[] {
    const lines: string[] = [];
    const lang = options.language;
    
    // Chunk header
    lines.push(`#### ${lang === 'de' ? 'Chunk' : 'Chunk'} ${index + 1}: ${chunk.summary}`);
    
    // Metadata section
    if (options.includeMetadata) {
      lines.push('');
      lines.push(`**${lang === 'de' ? 'Metadaten' : 'Metadata'}:**`);
      
      // Entity types
      if (chunk.metadata.entityTypes.length > 0) {
        lines.push(`- ${lang === 'de' ? 'Entity-Typen' : 'Entity Types'}: ${chunk.metadata.entityTypes.join(', ')}`);
      }
      
      // Spatial info
      if (chunk.metadata.spatialInfo) {
        const spatial = chunk.metadata.spatialInfo;
        lines.push(`- ${lang === 'de' ? 'Position' : 'Location'}: ${lang === 'de' ? 'Etage' : 'Floor'} ${spatial.floor}${spatial.zone ? `, Zone ${spatial.zone}` : ''}`);
      }
      
      // Token count
      lines.push(`- ${lang === 'de' ? 'Token-Anzahl' : 'Token Count'}: ${chunk.tokenCount}`);
      
      lines.push('');
    }
    
    // Content with optional keyword highlighting
    lines.push('```');
    
    if (options.highlightKeywords && intent.keywords.length > 0) {
      lines.push(this.highlightContent(chunk.content, intent.keywords));
    } else {
      lines.push(chunk.content);
    }
    
    lines.push('```');
    lines.push('');
    
    return lines;
  }
  
  /**
   * Highlight keywords in content
   */
  private highlightContent(content: string, keywords: string[]): string {
    let highlighted = content;
    
    // Sort keywords by length (longest first) to avoid partial replacements
    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length);
    
    sortedKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
      highlighted = highlighted.replace(regex, `**$&**`);
    });
    
    return highlighted;
  }
  
  /**
   * Calculate context metadata
   */
  private calculateMetadata(
    chunks: SmartChunk[],
    formatted: string[]
  ): ContextMetadata {
    // Calculate total tokens
    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
    
    // Count chunk types
    const chunkTypes: Record<string, number> = {};
    chunks.forEach(chunk => {
      chunkTypes[chunk.type] = (chunkTypes[chunk.type] || 0) + 1;
    });
    
    // Calculate coverage (simplified - based on entity diversity)
    const uniqueEntities = new Set<string>();
    chunks.forEach(chunk => {
      (chunk.metadata.entityTypes || []).forEach(e => uniqueEntities.add(e));
    });
    
    const coverage = Math.min(100, uniqueEntities.size * 5); // Rough estimate
    
    return {
      totalChunks: chunks.length,
      totalTokens,
      coverage,
      chunkTypes,
      formatVersion: this.FORMAT_VERSION
    };
  }
  
  /**
   * Escape regex special characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Create summary for different query types
   */
  createQueryTypeSummary(
    chunks: SmartChunk[],
    intent: QueryIntent,
    lang: 'de' | 'en' = 'de'
  ): string[] {
    const lines: string[] = [];
    
    switch (intent.type) {
      case 'count':
        lines.push(...this.createCountSummary(chunks, intent, lang));
        break;
        
      case 'find':
        lines.push(...this.createFindSummary(chunks, intent, lang));
        break;
        
      case 'spatial':
        lines.push(...this.createSpatialSummary(chunks, intent, lang));
        break;
        
      case 'system':
        lines.push(...this.createSystemSummary(chunks, intent, lang));
        break;
        
      default:
        lines.push(...this.createGeneralSummary(chunks, intent, lang));
    }
    
    return lines;
  }
  
  /**
   * Create count query summary
   */
  private createCountSummary(
    chunks: SmartChunk[],
    intent: QueryIntent,
    lang: 'de' | 'en'
  ): string[] {
    const lines: string[] = [];
    
    // Count entities by type
    const entityCounts = new Map<string, number>();
    
    chunks.forEach(chunk => {
      const entities = chunk.content.match(/Entity Count: (\w+) = (\d+)/g) || [];
      entities.forEach((matchStr: string) => {
        const matchResult = matchStr.match(/Entity Count: (\w+) = (\d+)/);
        if (matchResult) {
          const [, type, count] = matchResult;
          if (type && count) {
            entityCounts.set(type, (entityCounts.get(type) || 0) + parseInt(count));
          }
        }
      });
    });
    
    if (entityCounts.size > 0) {
      lines.push(lang === 'de' ? '**Gefundene Anzahlen:**' : '**Found Counts:**');
      entityCounts.forEach((count, type) => {
        lines.push(`- ${type}: ${count}`);
      });
    }
    
    return lines;
  }
  
  /**
   * Create find query summary
   */
  private createFindSummary(
    chunks: SmartChunk[],
    intent: QueryIntent,
    lang: 'de' | 'en'
  ): string[] {
    const lines: string[] = [];
    
    const foundLocations = new Set<string>();
    
    chunks.forEach(chunk => {
      if (chunk.metadata.spatialInfo) {
        const location = `${lang === 'de' ? 'Etage' : 'Floor'} ${chunk.metadata.spatialInfo.floor}`;
        foundLocations.add(location);
      }
    });
    
    if (foundLocations.size > 0) {
      lines.push(lang === 'de' 
        ? `**Gefunden in:** ${Array.from(foundLocations).join(', ')}`
        : `**Found in:** ${Array.from(foundLocations).join(', ')}`
      );
    }
    
    return lines;
  }
  
  /**
   * Create spatial query summary
   */
  private createSpatialSummary(
    chunks: SmartChunk[],
    intent: QueryIntent,
    lang: 'de' | 'en'
  ): string[] {
    const lines: string[] = [];
    
    // Group by floor
    const byFloor = new Map<number, number>();
    
    chunks.forEach(chunk => {
      if (chunk.metadata.spatialInfo?.floor !== undefined) {
        const floor = chunk.metadata.spatialInfo.floor;
        byFloor.set(floor, (byFloor.get(floor) || 0) + 1);
      }
    });
    
    if (byFloor.size > 0) {
      lines.push(lang === 'de' 
        ? '**Verteilung nach Stockwerk:**'
        : '**Distribution by Floor:**'
      );
      
      Array.from(byFloor.entries())
        .sort(([a], [b]) => a - b)
        .forEach(([floor, count]) => {
          lines.push(`- ${lang === 'de' ? 'Etage' : 'Floor'} ${floor}: ${count} chunks`);
        });
    }
    
    return lines;
  }
  
  /**
   * Create system query summary
   */
  private createSystemSummary(
    chunks: SmartChunk[],
    intent: QueryIntent,
    lang: 'de' | 'en'
  ): string[] {
    const lines: string[] = [];
    
    const systemComponents = new Set<string>();
    
    chunks.forEach(chunk => {
      if (chunk.metadata.system) {
        systemComponents.add(chunk.metadata.system);
      }
    });
    
    if (systemComponents.size > 0) {
      lines.push(lang === 'de'
        ? `**Gefundene Systeme:** ${Array.from(systemComponents).join(', ')}`
        : `**Found Systems:** ${Array.from(systemComponents).join(', ')}`
      );
    }
    
    return lines;
  }
  
  /**
   * Create general query summary
   */
  private createGeneralSummary(
    chunks: SmartChunk[],
    intent: QueryIntent,
    lang: 'de' | 'en'
  ): string[] {
    const lines: string[] = [];
    
    lines.push(lang === 'de'
      ? `**Übersicht:** ${chunks.length} relevante Abschnitte gefunden`
      : `**Overview:** Found ${chunks.length} relevant sections`
    );
    
    return lines;
  }
}