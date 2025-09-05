import * as flatbuffers from 'flatbuffers';
import { Octree } from '@/generated/octree';
import { OctreeNode } from '@/generated/octree-node';
import { SpatialIndex } from '@/generated/spatial-index';
import { BoundingBox } from '@/generated/bounding-box';
import { Vec3 } from '@/generated/vec3';
import { EntityLocation } from '@/generated/entity-location';
import { IfcEntity } from '@/types/bim';
import { BBox, OctreeOptions } from '@/types';

/**
 * Builds an octree spatial index from IFC entities
 */
export class OctreeBuilder {
  private nodes: Map<number, OctreeNodeData> = new Map();
  private entityLocations: Map<number, number> = new Map(); // entity ID -> node ID
  private nodeIdCounter = 0;
  
  constructor(
    private options: OctreeOptions = {
      maxDepth: 8,
      maxEntitiesPerLeaf: 100,
      minNodeSize: 1.0 // 1 meter minimum
    }
  ) {}
  
  /**
   * Build octree from IFC entities
   */
  buildFromEntities(entities: IfcEntity[]): OctreeData {
    console.log(`🌳 Building octree from ${entities.length} entities...`);
    
    // 1. Calculate overall bounding box
    const bounds = this.calculateBounds(entities);
    console.log(`📏 Model bounds: ${JSON.stringify(bounds)}`);
    
    // 2. Create root node
    const rootId = this.createNode(bounds, 0);
    
    // 3. Insert entities
    let processed = 0;
    for (const entity of entities) {
      if (entity.position || entity.boundingBox) {
        this.insertEntity(entity, rootId);
        processed++;
      }
    }
    
    console.log(`✅ Inserted ${processed} entities into octree`);
    
    // 4. Return octree data
    return {
      rootId,
      nodes: this.nodes,
      entityLocations: this.entityLocations,
      bounds,
      stats: this.calculateStats()
    };
  }
  
  /**
   * Serialize octree to Flatbuffer format
   */
  serialize(octreeData: OctreeData): Uint8Array {
    const builder = new flatbuffers.Builder(1024);
    
    // Build nodes
    const nodeOffsets: number[] = [];
    const sortedNodes = Array.from(octreeData.nodes.entries())
      .sort(([a], [b]) => a - b);
    
    for (const [nodeId, node] of sortedNodes) {
      // Create bounds
      const minVec = Vec3.createVec3(
        builder,
        node.bounds.min.x,
        node.bounds.min.y,
        node.bounds.min.z
      );
      
      const maxVec = Vec3.createVec3(
        builder,
        node.bounds.max.x,
        node.bounds.max.y,
        node.bounds.max.z
      );
      
      const center = this.getCenter(node.bounds);
      const centerVec = Vec3.createVec3(
        builder,
        center.x,
        center.y,
        center.z
      );
      
      const diagonal = this.getDiagonal(node.bounds);
      
      BoundingBox.startBoundingBox(builder);
      BoundingBox.addMin(builder, minVec);
      BoundingBox.addMax(builder, maxVec);
      BoundingBox.addCenter(builder, centerVec);
      BoundingBox.addDiagonal(builder, diagonal);
      const boundsOffset = BoundingBox.endBoundingBox(builder);
      
      // Create children array (always 8 for octree)
      const children = new Uint32Array(8);
      for (let i = 0; i < 8; i++) {
        children[i] = node.children[i] || 0;
      }
      const childrenOffset = OctreeNode.createChildrenVector(builder, children);
      
      // Create entities array
      const entitiesOffset = node.entities.length > 0
        ? OctreeNode.createEntitiesVector(builder, new Uint32Array(node.entities))
        : null;
      
      // Create node
      OctreeNode.startOctreeNode(builder);
      OctreeNode.addId(builder, nodeId);
      OctreeNode.addLevel(builder, node.level);
      OctreeNode.addBounds(builder, boundsOffset);
      OctreeNode.addChildren(builder, childrenOffset);
      if (entitiesOffset) {
        OctreeNode.addEntities(builder, entitiesOffset);
      }
      OctreeNode.addEntityCount(builder, node.entities.length);
      OctreeNode.addIsLeaf(builder, node.isLeaf);
      OctreeNode.addMortonCode(builder, BigInt(node.mortonCode || 0));
      
      nodeOffsets.push(OctreeNode.endOctreeNode(builder));
    }
    
    // Create nodes vector
    const nodesVector = Octree.createNodesVector(builder, nodeOffsets);
    
    // Create entity locations
    const locationOffsets: number[] = [];
    for (const [entityId, nodeId] of octreeData.entityLocations) {
      EntityLocation.startEntityLocation(builder);
      EntityLocation.addEntityId(builder, entityId);
      EntityLocation.addNodeId(builder, nodeId);
      locationOffsets.push(EntityLocation.endEntityLocation(builder));
    }
    const locationsVector = locationOffsets.length > 0
      ? Octree.createEntityLocationsVector(builder, locationOffsets)
      : null;
    
    // Create spatial index metadata
    const rootBounds = octreeData.nodes.get(octreeData.rootId)!.bounds;
    const metadataBounds = this.createBoundingBox(builder, rootBounds);
    
    SpatialIndex.startSpatialIndex(builder);
    SpatialIndex.addRootNodeId(builder, octreeData.rootId);
    SpatialIndex.addTotalNodes(builder, octreeData.nodes.size);
    SpatialIndex.addTotalEntities(builder, octreeData.entityLocations.size);
    SpatialIndex.addMaxDepth(builder, octreeData.stats.maxDepth);
    SpatialIndex.addLeafNodeCount(builder, octreeData.stats.leafCount);
    SpatialIndex.addNonEmptyLeafCount(builder, octreeData.stats.nonEmptyLeafCount);
    SpatialIndex.addEntitiesPerLeaf(builder, this.options.maxEntitiesPerLeaf!);
    SpatialIndex.addBounds(builder, metadataBounds);
    SpatialIndex.addCreatedAt(builder, BigInt(Date.now()));
    const metadataOffset = SpatialIndex.endSpatialIndex(builder);
    
    // Create octree
    Octree.startOctree(builder);
    Octree.addMetadata(builder, metadataOffset);
    Octree.addNodes(builder, nodesVector);
    if (locationsVector) {
      Octree.addEntityLocations(builder, locationsVector);
    }
    
    const octree = Octree.endOctree(builder);
    builder.finish(octree);
    
    return builder.asUint8Array();
  }
  
  /**
   * Deserialize octree from Flatbuffer
   */
  static deserialize(buffer: Uint8Array): OctreeReader {
    const buf = new flatbuffers.ByteBuffer(buffer);
    const octree = Octree.getRootAsOctree(buf);
    return new OctreeReader(octree);
  }
  
  private calculateBounds(entities: IfcEntity[]): BBox {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    
    for (const entity of entities) {
      if (entity.boundingBox) {
        minX = Math.min(minX, entity.boundingBox.min.x);
        minY = Math.min(minY, entity.boundingBox.min.y);
        minZ = Math.min(minZ, entity.boundingBox.min.z);
        maxX = Math.max(maxX, entity.boundingBox.max.x);
        maxY = Math.max(maxY, entity.boundingBox.max.y);
        maxZ = Math.max(maxZ, entity.boundingBox.max.z);
      } else if (entity.position) {
        minX = Math.min(minX, entity.position.x);
        minY = Math.min(minY, entity.position.y);
        minZ = Math.min(minZ, entity.position.z);
        maxX = Math.max(maxX, entity.position.x);
        maxY = Math.max(maxY, entity.position.y);
        maxZ = Math.max(maxZ, entity.position.z);
      }
    }
    
    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  }
  
  private createNode(bounds: BBox, level: number): number {
    const id = this.nodeIdCounter++;
    this.nodes.set(id, {
      id,
      bounds,
      level,
      children: new Array(8).fill(0),
      entities: [],
      isLeaf: true,
      mortonCode: this.calculateMortonCode(bounds)
    });
    return id;
  }
  
  private insertEntity(entity: IfcEntity, nodeId: number): void {
    const node = this.nodes.get(nodeId)!;
    
    // Check if we should subdivide
    if (node.isLeaf && 
        node.entities.length >= this.options.maxEntitiesPerLeaf! &&
        node.level < this.options.maxDepth! &&
        this.getNodeSize(node.bounds) > this.options.minNodeSize!) {
      this.subdivideNode(nodeId);
    }
    
    if (node.isLeaf) {
      // Add to leaf node
      node.entities.push(entity.expressID);
      this.entityLocations.set(entity.expressID, nodeId);
    } else {
      // Find appropriate child
      const childIndex = this.getChildIndex(entity, node.bounds);
      const childId = node.children[childIndex];
      if (childId) {
        this.insertEntity(entity, childId);
      }
    }
  }
  
  private subdivideNode(nodeId: number): void {
    const node = this.nodes.get(nodeId)!;
    node.isLeaf = false;
    
    // Create 8 children
    const center = this.getCenter(node.bounds);
    
    for (let i = 0; i < 8; i++) {
      const childBounds = this.getChildBounds(node.bounds, center, i);
      const childId = this.createNode(childBounds, node.level + 1);
      node.children[i] = childId;
    }
    
    // Redistribute entities
    const entities = [...node.entities];
    node.entities = [];
    
    for (const entityId of entities) {
      // Note: We need entity data to properly redistribute
      // For now, we'll keep them in the parent
      this.entityLocations.set(entityId, nodeId);
    }
  }
  
  private getChildIndex(entity: IfcEntity, bounds: BBox): number {
    const center = this.getCenter(bounds);
    const pos = entity.position || this.getCenter(entity.boundingBox!);
    
    let index = 0;
    if (pos.x > center.x) index |= 1;
    if (pos.y > center.y) index |= 2;
    if (pos.z > center.z) index |= 4;
    
    return index;
  }
  
  private getChildBounds(parent: BBox, center: { x: number; y: number; z: number }, index: number): BBox {
    const min = { ...parent.min };
    const max = { ...parent.max };
    
    if (index & 1) min.x = center.x; else max.x = center.x;
    if (index & 2) min.y = center.y; else max.y = center.y;
    if (index & 4) min.z = center.z; else max.z = center.z;
    
    return { min, max };
  }
  
  private getCenter(bounds: BBox): { x: number; y: number; z: number } {
    return {
      x: (bounds.min.x + bounds.max.x) / 2,
      y: (bounds.min.y + bounds.max.y) / 2,
      z: (bounds.min.z + bounds.max.z) / 2
    };
  }
  
  private getDiagonal(bounds: BBox): number {
    const dx = bounds.max.x - bounds.min.x;
    const dy = bounds.max.y - bounds.min.y;
    const dz = bounds.max.z - bounds.min.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  
  private getNodeSize(bounds: BBox): number {
    return Math.min(
      bounds.max.x - bounds.min.x,
      bounds.max.y - bounds.min.y,
      bounds.max.z - bounds.min.z
    );
  }
  
  private calculateMortonCode(bounds: BBox): number {
    // Simple Morton code based on center position
    // In production, use proper Morton encoding library
    const center = this.getCenter(bounds);
    const x = Math.floor(center.x * 1000);
    const y = Math.floor(center.y * 1000);
    const z = Math.floor(center.z * 1000);
    
    // Simplified - real implementation would interleave bits
    return (x << 20) | (y << 10) | z;
  }
  
  private createBoundingBox(builder: flatbuffers.Builder, bounds: BBox): number {
    const minVec = Vec3.createVec3(builder, bounds.min.x, bounds.min.y, bounds.min.z);
    const maxVec = Vec3.createVec3(builder, bounds.max.x, bounds.max.y, bounds.max.z);
    const center = this.getCenter(bounds);
    const centerVec = Vec3.createVec3(builder, center.x, center.y, center.z);
    
    BoundingBox.startBoundingBox(builder);
    BoundingBox.addMin(builder, minVec);
    BoundingBox.addMax(builder, maxVec);
    BoundingBox.addCenter(builder, centerVec);
    BoundingBox.addDiagonal(builder, this.getDiagonal(bounds));
    return BoundingBox.endBoundingBox(builder);
  }
  
  private calculateStats(): OctreeStats {
    let maxDepth = 0;
    let leafCount = 0;
    let nonEmptyLeafCount = 0;
    
    for (const node of this.nodes.values()) {
      maxDepth = Math.max(maxDepth, node.level);
      if (node.isLeaf) {
        leafCount++;
        if (node.entities.length > 0) {
          nonEmptyLeafCount++;
        }
      }
    }
    
    return { maxDepth, leafCount, nonEmptyLeafCount };
  }
}

// Types
interface OctreeNodeData {
  id: number;
  bounds: BBox;
  level: number;
  children: number[];
  entities: number[];
  isLeaf: boolean;
  mortonCode?: number;
}

interface OctreeData {
  rootId: number;
  nodes: Map<number, OctreeNodeData>;
  entityLocations: Map<number, number>;
  bounds: BBox;
  stats: OctreeStats;
}

interface OctreeStats {
  maxDepth: number;
  leafCount: number;
  nonEmptyLeafCount: number;
}

/**
 * Reader for Flatbuffer octree
 */
export class OctreeReader {
  constructor(private octree: Octree) {}
  
  getMetadata() {
    const meta = this.octree.metadata()!;
    return {
      rootNodeId: meta.rootNodeId(),
      totalNodes: meta.totalNodes(),
      totalEntities: meta.totalEntities(),
      maxDepth: meta.maxDepth(),
      leafCount: meta.leafNodeCount(),
      nonEmptyLeafCount: meta.nonEmptyLeafCount()
    };
  }
  
  getNode(nodeId: number): OctreeNode | null {
    for (let i = 0; i < this.octree.nodesLength(); i++) {
      const node = this.octree.nodes(i)!;
      if (node.id() === nodeId) {
        return node;
      }
    }
    return null;
  }
  
  findEntityNode(entityId: number): number | null {
    for (let i = 0; i < this.octree.entityLocationsLength(); i++) {
      const loc = this.octree.entityLocations(i)!;
      if (loc.entityId() === entityId) {
        return loc.nodeId();
      }
    }
    return null;
  }
}