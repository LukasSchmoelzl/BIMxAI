// BIM-spezifische TypeScript Types

import { Vec3, BoundingBox, BaseEntity } from './base';

// IFC Entity Types
export interface IfcEntity {
  expressID: number;
  type: string;
  name?: string;
  globalId?: string;
  description?: string;
  objectType?: string;
  tag?: string;
  properties?: Record<string, any>;
  geometryId?: number;
  position?: Vec3;
  boundingBox?: BoundingBox;
}

// Fragment Types
export interface Fragment {
  id: string;
  name: string;
  entities: IfcEntity[];
  boundingBox: BoundingBox;
  entityIndex: Record<string, number[]>;
  version: number;
  createdAt: number;
}

// Spatial Indexing Types
export interface SpatialQuery {
  type: 'boundingBox' | 'sphere' | 'frustum' | 'ray' | 'nearest';
  bounds?: BoundingBox;
  center?: Vec3;
  radius?: number;
  maxResults?: number;
  entityTypes?: string[];
}

export interface SpatialQueryResult {
  entities: IfcEntity[];
  distances?: number[];
  nodesVisited: number;
  timeMs: number;
}

// Chunk Types
export interface Chunk {
  id: string;
  spatialBounds: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
  entityIds: number[];
  entityTypes: string[];
  sizeBytes: number;
  compressionType: 'none' | 'gzip' | 'brotli';
  createdAt: number;
  metadata: any;
}

export interface ChunkMetadata {
  entityCount: number;
  typeHistogram: Array<{ type: string; count: number }>;
  avgComplexity: number;
  hasGeometry: boolean;
  minExpressId: number;
  maxExpressId: number;
}

// Model Types
export interface BimModel {
  id: string;
  name: string;
  fragments: Fragment[];
  boundingBox: BoundingBox;
  entityTypes: string[];
  totalEntities: number;
  version: string;
  createdAt: number;
}

// Selection Types
export interface EntitySelection {
  expressIds: number[];
  entities: IfcEntity[];
  timestamp: number;
}

// Highlight Types
export interface HighlightOptions {
  color?: string;
  opacity?: number;
  duration?: number;
  pulse?: boolean;
}

// IFC Model Types
export interface IfcModel {
  id: string;
  name: string;
  url: string;
  description?: string;
  thumbnail?: string;
  metadata?: {
    size: number;
    loadTime?: number;
    vertexCount?: number;
    triangleCount?: number;
    ifcSchema?: string;
    ifcVersion?: string;
  };
}

export type IfcEntityIndex = Record<string, number[]>;

export interface DynamicIfcSchema {
  entityTypes: string[];
  version?: string;
  metadata?: Record<string, any>;
}

// Material information
export interface Material {
  name: string;
  type?: string;
  properties?: {
    density?: number; // kg/m³
    thermalConductivity?: number; // W/(m·K)
    strength?: number; // N/mm²
    [key: string]: any;
  };
}

// IFC Quantity information
export interface IfcQuantity {
  name: string;
  description?: string;
  unit?: string;
  value: number;
  type: 'length' | 'area' | 'volume' | 'weight' | 'count' | 'time';
}

// Geometry information
export interface GeometryData {
  volume?: number; // m³
  area?: number; // m²
  length?: number; // m
  width?: number; // m
  height?: number; // m
  thickness?: number; // m
  boundingBox?: BoundingBox;
  perimeter?: number; // m
  centerOfGravity?: Vec3;
}

// Relationship information
export interface RelationshipData {
  containedIn?: number; // Express ID of spatial container
  containedInName?: string;
  connectedTo?: number[]; // Express IDs of connected elements
  connectedToNames?: string[];
  relatedElements?: number[]; // Express IDs of related elements
  relatedElementNames?: string[];
  isPartOf?: number; // Express ID of assembly
  hasParts?: number[]; // Express IDs of parts
}

// Cost and scheduling data
export interface CostData {
  material?: number;
  labor?: number;
  equipment?: number;
  total?: number;
  currency?: string;
}

export interface ScheduleData {
  startDate?: Date;
  endDate?: Date;
  duration?: number; // days
  status?: 'planned' | 'in_progress' | 'completed';
}

// Enhanced IFC Entity with all attributes
export interface EnhancedIfcEntity extends IfcEntity {
  // Geometry and spatial data
  geometry?: GeometryData;
  
  // Materials and properties
  materials?: Material[];
  quantities?: IfcQuantity[];
  
  // Relationships
  relationships?: RelationshipData;
  
  // Additional metadata
  cost?: CostData;
  schedule?: ScheduleData;
  
  // Custom attributes from property sets
  customAttributes?: Record<string, any>;
  
  // Performance data
  lastUpdated?: Date;
  attributesLoaded?: string[]; // Track which attributes have been loaded
}

// Attribute loading options
export interface AttributeLoadOptions {
  includeGeometry?: boolean;
  includeMaterials?: boolean;
  includeQuantities?: boolean;
  includeRelationships?: boolean;
  includeCost?: boolean;
  includeSchedule?: boolean;
  includeCustom?: boolean;
}

// Query-specific entity projection
export interface EntityProjection {
  entityId: number;
  attributes: string[];
  data: Partial<EnhancedIfcEntity>;
}

// Viewer Hook Return Type
export interface UseViewerReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  componentsRef: React.RefObject<any>;
  worldRef: React.RefObject<any>;
  fragmentsRef: React.RefObject<any>;
  currentModelRef: React.RefObject<any>;
  initializeViewer: () => Promise<void>;
  loadFragmentFromBytes: (bytes: ArrayBuffer, modelId: string) => Promise<void>;
}

// Extracted Entity for improved entity extraction
export interface ExtractedEntity extends IfcEntity {
  localId: number;
  category: string;
  position?: { x: number; y: number; z: number };
  spatialParent?: string;
} 