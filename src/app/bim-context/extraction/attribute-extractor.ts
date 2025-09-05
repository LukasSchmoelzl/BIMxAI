/**
 * Attribute extractor for enhanced IFC entities
 */

import { IfcEntity } from '@/types/bim';
import { 
  EnhancedIfcEntity, 
  GeometryData, 
  Material, 
  IfcQuantity,
  RelationshipData,
  AttributeLoadOptions
} from '@/types/bim';
import { BoundingBox } from '@/types/base';

/**
 * Extracts and calculates attributes from IFC entities
 */
export class AttributeExtractor {
  private entityCache: Map<number, EnhancedIfcEntity> = new Map();
  
  /**
   * Extract all attributes for an entity
   */
  async extractAttributes(
    entity: IfcEntity,
    options: AttributeLoadOptions = {}
  ): Promise<EnhancedIfcEntity> {
    // Check cache first
    const cached = this.entityCache.get(entity.expressID);
    if (cached && this.hasRequestedAttributes(cached, options)) {
      return cached;
    }
    
    const enhanced: EnhancedIfcEntity = {
      ...entity,
      attributesLoaded: [],
      lastUpdated: new Date()
    };
    
    // Extract requested attributes
    if (options.includeGeometry !== false) {
      enhanced.geometry = await this.extractGeometry(entity);
      enhanced.attributesLoaded?.push('geometry');
    }
    
    if (options.includeMaterials !== false) {
      enhanced.materials = await this.extractMaterials(entity);
      enhanced.attributesLoaded?.push('materials');
    }
    
    if (options.includeQuantities !== false) {
      enhanced.quantities = await this.extractQuantities(entity);
      enhanced.attributesLoaded?.push('quantities');
    }
    
    if (options.includeRelationships) {
      enhanced.relationships = await this.extractRelationships(entity);
      enhanced.attributesLoaded?.push('relationships');
    }
    
    if (options.includeCustom) {
      enhanced.customAttributes = await this.extractCustomAttributes(entity);
      enhanced.attributesLoaded?.push('custom');
    }
    
    // Update cache
    this.entityCache.set(entity.expressID, enhanced);
    
    return enhanced;
  }
  
  /**
   * Extract geometry data from entity
   */
  private async extractGeometry(entity: IfcEntity): Promise<GeometryData> {
    const geometry: GeometryData = {};
    
    // Extract from properties if available
    if (entity.properties && typeof entity.properties === 'object') {
      // Common property names for dimensions
      const props = entity.properties;
      
      // Length dimensions
      geometry.length = this.extractDimension(props, ['Length', 'NetLength', 'OverallLength']);
      geometry.width = this.extractDimension(props, ['Width', 'NetWidth', 'OverallWidth']);
      geometry.height = this.extractDimension(props, ['Height', 'NetHeight', 'OverallHeight']);
      geometry.thickness = this.extractDimension(props, ['Thickness', 'Width']);
      
      // Area and volume
      geometry.area = this.extractDimension(props, ['Area', 'NetArea', 'GrossArea', 'NetSideArea']);
      geometry.volume = this.extractDimension(props, ['Volume', 'NetVolume', 'GrossVolume']);
      
      // Calculate volume if not present but dimensions are
      if (!geometry.volume && geometry.length && geometry.width && geometry.height) {
        geometry.volume = geometry.length * geometry.width * geometry.height;
      }
      
      // For walls, calculate from thickness and area
      if (!geometry.volume && entity.type === 'IFCWALL' && geometry.thickness && geometry.area) {
        geometry.volume = geometry.thickness * geometry.area;
      }
    }
    
    // Calculate bounding box (simplified for MVP)
    if (geometry.length || geometry.width || geometry.height) {
      geometry.boundingBox = this.calculateBoundingBox(geometry);
    }
    
    return geometry;
  }
  
  /**
   * Extract material information
   */
  private async extractMaterials(entity: IfcEntity): Promise<Material[]> {
    const materials: Material[] = [];
    
    if (entity.properties) {
      // Look for material properties
      const materialName = entity.properties['Material'] || 
                          entity.properties['MaterialName'] ||
                          entity.properties['MaterialType'];
      
      if (materialName) {
        const material: Material = {
          name: String(materialName),
          properties: {}
        };
        
        // Extract material properties
        if (entity.properties['MaterialDensity']) {
          material.properties!.density = Number(entity.properties['MaterialDensity']);
        }
        
        // Add common material densities
        if (!material.properties!.density) {
          material.properties!.density = this.getDefaultDensity(material.name);
        }
        
        materials.push(material);
      }
    }
    
    return materials;
  }
  
  /**
   * Extract quantity information
   */
  private async extractQuantities(entity: IfcEntity): Promise<IfcQuantity[]> {
    const quantities: IfcQuantity[] = [];
    
    // Extract from geometry if available
    const geometry = await this.extractGeometry(entity);
    
    if (geometry.volume) {
      quantities.push({
        name: 'NetVolume',
        value: geometry.volume,
        unit: 'm³',
        type: 'volume'
      });
    }
    
    if (geometry.area) {
      quantities.push({
        name: 'NetArea',
        value: geometry.area,
        unit: 'm²',
        type: 'area'
      });
    }
    
    if (geometry.length) {
      quantities.push({
        name: 'Length',
        value: geometry.length,
        unit: 'm',
        type: 'length'
      });
    }
    
    // Calculate weight if volume and material density are available
    const materials = await this.extractMaterials(entity);
    if (geometry.volume && materials.length > 0 && materials[0].properties?.density) {
      const weight = geometry.volume * materials[0].properties.density;
      quantities.push({
        name: 'Weight',
        value: weight,
        unit: 'kg',
        type: 'weight'
      });
    }
    
    return quantities;
  }
  
  /**
   * Extract relationship data
   */
  private async extractRelationships(entity: IfcEntity): Promise<RelationshipData> {
    // For MVP, return empty relationships
    // In full implementation, this would traverse IFC relationships
    return {};
  }
  
  /**
   * Extract custom attributes from property sets
   */
  private async extractCustomAttributes(entity: IfcEntity): Promise<Record<string, any>> {
    const custom: Record<string, any> = {};
    
    if (entity.properties) {
      // Extract non-standard properties
      const standardProps = [
        'Name', 'Description', 'ObjectType', 'Tag',
        'Length', 'Width', 'Height', 'Thickness',
        'Area', 'Volume', 'Material'
      ];
      
      try {
        for (const [key, value] of Object.entries(entity.properties)) {
          if (!standardProps.includes(key)) {
            custom[key] = value;
          }
        }
      } catch (error) {
        // Safe handling of non-enumerable properties
        console.warn('Failed to extract custom properties', error);
      }
    }
    
    return custom;
  }
  
  /**
   * Helper: Extract dimension from properties
   */
  private extractDimension(
    props: Record<string, string | number | boolean | null>,
    keys: string[]
  ): number | undefined {
    for (const key of keys) {
      if (props[key] !== null && props[key] !== undefined) {
        const value = Number(props[key]);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
    return undefined;
  }
  
  /**
   * Helper: Calculate bounding box
   */
  private calculateBoundingBox(geometry: GeometryData): BoundingBox {
    const length = geometry.length || 0;
    const width = geometry.width || 0;
    const height = geometry.height || 0;
    
    return {
      min: { x: 0, y: 0, z: 0 },
      max: { x: length, y: width, z: height },
      center: { x: length / 2, y: width / 2, z: height / 2 }
    };
  }
  
  /**
   * Helper: Get default material density
   */
  private getDefaultDensity(materialName: string): number {
    const name = materialName.toLowerCase();
    
    // Common construction material densities (kg/m³)
    const densities: Record<string, number> = {
      'concrete': 2400,
      'beton': 2400,
      'stahlbeton': 2500,
      'steel': 7850,
      'stahl': 7850,
      'aluminum': 2700,
      'aluminium': 2700,
      'wood': 600,
      'holz': 600,
      'glass': 2500,
      'glas': 2500,
      'gipskarton': 900,
      'gypsum': 900,
      'insulation': 50,
      'dämmung': 50,
      'brick': 1800,
      'ziegel': 1800,
      'mauerwerk': 1800
    };
    
    for (const [key, density] of Object.entries(densities)) {
      if (name.includes(key)) {
        return density;
      }
    }
    
    return 1000; // Default density
  }
  
  /**
   * Check if entity has requested attributes loaded
   */
  private hasRequestedAttributes(
    entity: EnhancedIfcEntity,
    options: AttributeLoadOptions
  ): boolean {
    const loaded = entity.attributesLoaded || [];
    
    if (options.includeGeometry && !loaded.includes('geometry')) return false;
    if (options.includeMaterials && !loaded.includes('materials')) return false;
    if (options.includeQuantities && !loaded.includes('quantities')) return false;
    if (options.includeRelationships && !loaded.includes('relationships')) return false;
    if (options.includeCustom && !loaded.includes('custom')) return false;
    
    return true;
  }
  
  /**
   * Clear cache
   */
  clearCache(): void {
    this.entityCache.clear();
  }
}