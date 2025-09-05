// Spatial-spezifische TypeScript Types

import type { Vec3, BoundingBox } from './base';

// Re-export for backwards compatibility using export type to avoid conflicts
export type { Vec3, BoundingBox } from './base';

// Spatial Query Types
export interface SpatialQueryOptions {
  maxResults?: number;
  includeGeometry?: boolean;
  includeProperties?: boolean;
  tolerance?: number;
}

export interface BoundingBoxQuery {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  entityTypes?: string[];
}

export interface SphereQuery {
  center: { x: number; y: number; z: number };
  radius: number;
  entityTypes?: string[];
}

export interface NearestQuery {
  point: { x: number; y: number; z: number };
  k: number;
  entityTypes?: string[];
  maxDistance?: number;
}

// Octree Types
// Use BoundingBox instead of BBox
export type BBox = BoundingBox; // Alias for backwards compatibility

export interface OctreeOptions {
  maxDepth?: number;
  maxObjectsPerNode?: number;
  minNodeSize?: number;
}

// Types are now imported from base.ts 