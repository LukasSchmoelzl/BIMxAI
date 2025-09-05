/**
 * Query analyzer for understanding user intent
 */

import { QueryContext } from '@/types/chunks';

import { QueryIntent } from '@/types/selection';

export class QueryAnalyzer {
  // Pattern-based analysis
  private patterns = {
    count: /wie viele|anzahl|count|zähle|number of|total|gesamt/i,
    spatial: /etage|stockwerk|raum|bereich|zone|floor|room|level|geschoss/i,
    system: /heizung|lüftung|elektro|sanitär|hvac|mep|electrical|plumbing/i,

    find: /zeige|finde|suche|wo|show|find|search|where|locate/i
  };
  
  // German to IFC entity mappings
  private germanMappings: Record<string, string[]> = {
    'wand': ['IFCWALL', 'IFCCURTAINWALL'],
    'wände': ['IFCWALL', 'IFCCURTAINWALL'],
    'tür': ['IFCDOOR'],
    'türen': ['IFCDOOR'],
    'fenster': ['IFCWINDOW'],
    'decke': ['IFCSLAB', 'IFCROOF'],
    'decken': ['IFCSLAB', 'IFCROOF'],
    'dach': ['IFCROOF'],
    'säule': ['IFCCOLUMN'],
    'säulen': ['IFCCOLUMN'],
    'stütze': ['IFCCOLUMN'],
    'stützen': ['IFCCOLUMN'],
    'träger': ['IFCBEAM'],
    'balken': ['IFCBEAM'],
    'treppe': ['IFCSTAIR', 'IFCSTAIRFLIGHT'],
    'treppen': ['IFCSTAIR', 'IFCSTAIRFLIGHT'],
    'raum': ['IFCSPACE'],
    'räume': ['IFCSPACE'],
    'zimmer': ['IFCSPACE'],
    'geschoss': ['IFCBUILDINGSTOREY'],
    'stockwerk': ['IFCBUILDINGSTOREY'],
    'etage': ['IFCBUILDINGSTOREY'],
    'gebäude': ['IFCBUILDING'],
    'möbel': ['IFCFURNISHINGELEMENT'],
    'einrichtung': ['IFCFURNISHINGELEMENT'],
    'rohr': ['IFCPIPESEGMENT', 'IFCFLOWSEGMENT'],
    'rohre': ['IFCPIPESEGMENT', 'IFCFLOWSEGMENT'],
    'leitung': ['IFCFLOWSEGMENT', 'IFCCABLESEGMENT'],
    'leitungen': ['IFCFLOWSEGMENT', 'IFCCABLESEGMENT']
  };
  
  // Common IFC entity types
  private readonly entityTypes = [
    'IFCWALL', 'IFCDOOR', 'IFCWINDOW', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN',
    'IFCROOF', 'IFCSTAIR', 'IFCRAILING', 'IFCSPACE', 'IFCZONE', 'IFCBUILDING',
    'IFCBUILDINGSTOREY', 'IFCSITE', 'IFCFURNISHINGELEMENT', 'IFCEQUIPMENTELEMENT',
    'IFCFLOWFITTING', 'IFCFLOWSEGMENT', 'IFCFLOWTERMINAL', 'IFCDISTRIBUTIONELEMENT'
  ];
  
  // System keywords
  private readonly systemKeywords = {
    hvac: ['hvac', 'heating', 'cooling', 'ventilation', 'air', 'klimaanlage', 'lüftung', 'heizung'],
    electrical: ['electrical', 'electric', 'power', 'lighting', 'elektro', 'strom', 'beleuchtung'],
    plumbing: ['plumbing', 'water', 'pipe', 'drainage', 'sanitär', 'wasser', 'rohr'],
    structural: ['structural', 'structure', 'beam', 'column', 'slab', 'tragwerk', 'stütze', 'decke'],
  };
  
  // Floor keywords
  private readonly floorKeywords = {
    ground: ['ground', 'erdgeschoss', 'eg', 'level 0', 'floor 0'],
    first: ['first', 'erstes', '1st', 'level 1', 'floor 1', '1. og'],
    second: ['second', 'zweites', '2nd', 'level 2', 'floor 2', '2. og'],
    basement: ['basement', 'keller', 'untergeschoss', 'ug', 'level -1'],
  };
  
  /**
   * Analyze query to extract intent and context
   */
  async analyzeIntent(query: string): Promise<QueryIntent> {
    const lowerQuery = query.toLowerCase();
    const startTime = Date.now();
    
    // Detect query type
    const type = this.detectQueryType(lowerQuery);
    
    // Extract entities with improved detection
    const entityTypes = this.extractEntityTypesAdvanced(lowerQuery);
    
    // Extract keywords with stemming
    const keywords = this.extractKeywords(lowerQuery);
    
    // Extract spatial terms
    const spatialTerms = this.extractSpatialTerms(lowerQuery);
    
    // Extract system terms
    const systemTerms = this.extractSystemTerms(lowerQuery);
    
    // Calculate confidence
    const confidence = this.calculateConfidence({
      type,
      entityTypes,
      keywords,
      spatialTerms,
      systemTerms
    });
    
    return {
      type,
      entityTypes,
      keywords,
      spatialTerms,
      systemTerms,
      confidence,
      executionTime: Date.now() - startTime
    };
  }
  
  /**
   * Analyze query to extract context (backward compatibility)
   */
  analyze(query: string, maxTokens: number = 10000): QueryContext {
    const lowerQuery = query.toLowerCase();
    
    return {
      query,
      requestedEntityTypes: this.extractEntityTypes(lowerQuery),
      floor: this.extractFloor(lowerQuery),
      system: this.extractSystem(lowerQuery),
      maxTokens,
      relevanceThreshold: 0.3,
    };
  }
  
  /**
   * Detect query type based on patterns
   */
  private detectQueryType(query: string): QueryIntent['type'] {
    // Check patterns in order of specificity
    if (this.patterns.count.test(query)) return 'count';
    if (this.patterns.spatial.test(query)) return 'spatial';
    if (this.patterns.system.test(query)) return 'system';
    if (this.patterns.find.test(query)) return 'find';
    return 'general';
  }
  
  /**
   * Extract keywords with stemming and normalization
   */
  private extractKeywords(query: string): string[] {
    // Remove stopwords
    const stopwords = new Set([
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
      'und', 'oder', 'aber', 'mit', 'von', 'zu', 'in', 'an', 'auf', 'für',
      'the', 'a', 'an', 'and', 'or', 'but', 'with', 'from', 'to', 'in', 'on', 'for',
      'ist', 'sind', 'war', 'waren', 'is', 'are', 'was', 'were'
    ]);
    
    // Tokenize and filter
    const words = query.split(/\s+/)
      .map(w => w.toLowerCase().replace(/[^\wäöüß-]/g, ''))
      .filter(w => w.length > 2 && !stopwords.has(w));
    
    // Apply simple stemming for German/English
    const stemmed = words.map(word => {
      // German plural reduction
      if (word.endsWith('en') && word.length > 4) return word.slice(0, -2);
      if (word.endsWith('er') && word.length > 4) return word.slice(0, -2);
      if (word.endsWith('e') && word.length > 3) return word.slice(0, -1);
      
      // English plural reduction
      if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
      if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
      
      return word;
    });
    
    // Remove duplicates
    return [...new Set(stemmed)];
  }
  
  /**
   * Extract spatial terms
   */
  private extractSpatialTerms(query: string): string[] {
    const spatialTerms: string[] = [];
    
    // Floor patterns
    const floorMatches = query.match(/\d+\.?\s*(og|ug|stock|etage|geschoss|floor|level)/gi);
    if (floorMatches) spatialTerms.push(...floorMatches);
    
    // Zone/area patterns
    const zonePatterns = [
      /zone\s+[a-z0-9]+/gi,
      /bereich\s+[a-z0-9]+/gi,
      /raum\s+[a-z0-9.-]+/gi,
      /room\s+[a-z0-9.-]+/gi
    ];
    
    zonePatterns.forEach(pattern => {
      const matches = query.match(pattern);
      if (matches) spatialTerms.push(...matches);
    });
    
    // Named areas
    const namedAreas = [
      'nordflügel', 'südflügel', 'ostflügel', 'westflügel',
      'north wing', 'south wing', 'east wing', 'west wing',
      'hauptgebäude', 'nebengebäude', 'anbau',
      'main building', 'annex', 'extension'
    ];
    
    namedAreas.forEach(area => {
      if (query.includes(area)) spatialTerms.push(area);
    });
    
    return spatialTerms;
  }
  
  /**
   * Extract system terms
   */
  private extractSystemTerms(query: string): string[] {
    const systemTerms: string[] = [];
    
    Object.entries(this.systemKeywords).forEach(([system, keywords]) => {
      const found = keywords.filter(keyword => query.includes(keyword));
      if (found.length > 0) {
        systemTerms.push(system, ...found);
      }
    });
    
    return [...new Set(systemTerms)];
  }
  
  /**
   * Calculate confidence score
   */
  private calculateConfidence(intent: Partial<QueryIntent>): number {
    let score = 0.5; // Base confidence
    
    // Boost for specific query types
    if (intent.type && intent.type !== 'general') score += 0.2;
    
    // Boost for entity detection
    if (intent.entityTypes && intent.entityTypes.length > 0) score += 0.2;
    
    // Boost for spatial/system context
    if (intent.spatialTerms && intent.spatialTerms.length > 0) score += 0.1;
    if (intent.systemTerms && intent.systemTerms.length > 0) score += 0.1;
    
    // Reduce for ambiguous queries
    if (intent.keywords && intent.keywords.length < 2) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Extract entity types from query (backward compatibility)
   */
  private extractEntityTypes(query: string): string[] {
    return this.extractEntityTypesAdvanced(query);
  }
  
  /**
   * Advanced entity type extraction
   */
  private extractEntityTypesAdvanced(query: string): string[] {
    const foundTypes: string[] = [];
    
    // Check for exact entity type matches
    for (const entityType of this.entityTypes) {
      if (query.includes(entityType.toLowerCase())) {
        foundTypes.push(entityType);
      }
    }
    
    // Check for wildcard
    if (query.includes('*') || query.includes('all') || query.includes('alle')) {
      foundTypes.push('*');
    }
    
    // Check German terms first
    for (const [term, types] of Object.entries(this.germanMappings)) {
      if (query.includes(term)) {
        foundTypes.push(...types);
      }
    }
    
    // Check English terms
    const englishMapping: Record<string, string[]> = {
      'wall': ['IFCWALL', 'IFCCURTAINWALL'],
      'walls': ['IFCWALL', 'IFCCURTAINWALL'],
      'door': ['IFCDOOR'],
      'doors': ['IFCDOOR'],
      'window': ['IFCWINDOW'],
      'windows': ['IFCWINDOW'],
      'floor': ['IFCSLAB'],
      'floors': ['IFCSLAB'],
      'slab': ['IFCSLAB'],
      'roof': ['IFCROOF'],
      'column': ['IFCCOLUMN'],
      'columns': ['IFCCOLUMN'],
      'beam': ['IFCBEAM'],
      'beams': ['IFCBEAM'],
      'space': ['IFCSPACE'],
      'spaces': ['IFCSPACE'],
      'room': ['IFCSPACE'],
      'rooms': ['IFCSPACE'],
      'stair': ['IFCSTAIR', 'IFCSTAIRFLIGHT'],
      'stairs': ['IFCSTAIR', 'IFCSTAIRFLIGHT'],
      'furniture': ['IFCFURNISHINGELEMENT'],
      'equipment': ['IFCEQUIPMENTELEMENT'],
      'pipe': ['IFCPIPESEGMENT', 'IFCFLOWSEGMENT'],
      'pipes': ['IFCPIPESEGMENT', 'IFCFLOWSEGMENT'],
      'duct': ['IFCDUCTSEGMENT', 'IFCFLOWSEGMENT'],
      'ducts': ['IFCDUCTSEGMENT', 'IFCFLOWSEGMENT']
    };
    
    for (const [term, types] of Object.entries(englishMapping)) {
      if (query.includes(term)) {
        foundTypes.push(...types);
      }
    }
    
    // Check for system-specific entities
    if (query.includes('hvac') || query.includes('lüftung') || query.includes('heizung')) {
      foundTypes.push('IFCFLOWSEGMENT', 'IFCFLOWTERMINAL', 'IFCFLOWFITTING');
    }
    
    if (query.includes('electrical') || query.includes('elektro')) {
      foundTypes.push('IFCCABLESEGMENT', 'IFCELECTRICALELEMENT', 'IFCLIGHTFIXTURE');
    }
    
    // Remove duplicates
    return [...new Set(foundTypes)];
  }
  
  /**
   * Extract floor number from query
   */
  private extractFloor(query: string): number | undefined {
    // Check named floors
    for (const [name, keywords] of Object.entries(this.floorKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        switch (name) {
          case 'ground': return 0;
          case 'first': return 1;
          case 'second': return 2;
          case 'basement': return -1;
        }
      }
    }
    
    // Check numeric patterns
    const floorPatterns = [
      /floor\s*(\d+)/,
      /level\s*(\d+)/,
      /(\d+)\.\s*stock/,
      /(\d+)\.\s*etage/,
      /(\d+)\.\s*og/,
    ];
    
    for (const pattern of floorPatterns) {
      const match = query.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    
    return undefined;
  }
  
  /**
   * Extract system from query
   */
  private extractSystem(query: string): string | undefined {
    for (const [system, keywords] of Object.entries(this.systemKeywords)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return system;
      }
    }
    
    return undefined;
  }
  
  /**
   * Check if query is asking for count
   */
  isCountQuery(query: string): boolean {
    const countKeywords = [
      'how many', 'wie viele', 'count', 'anzahl', 'number of',
      'total', 'gesamt', 'all', 'alle'
    ];
    
    return countKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }
  
  /**
   * Check if query is asking for location
   */
  isLocationQuery(query: string): boolean {
    const locationKeywords = [
      'where', 'wo', 'location', 'position', 'standort',
      'find', 'finde', 'locate', 'which floor', 'welches stockwerk'
    ];
    
    return locationKeywords.some(keyword => query.toLowerCase().includes(keyword));
  }
}