// Event System Types

export type EventHandler<T = any> = (data: T) => void;
export type UnsubscribeFn = () => void;

export interface EventMap {
  'entities:loaded': { 
    entities: any[]; 
    count?: number; 
    entityIndex?: any;
    fragmentId?: string;
    fragmentName?: string;
    boundingBox?: any;
  };
  'entities:updated': any[];
  'entities:selected': { entities: any[]; expressIds: number[] };
  'entity:clicked': {
    expressId: number;
    modelId?: string;
    entity?: any;
    point?: any;
    meshInfo?: {
      name: string;
      uuid: string;
    };
  };
  'highlight:entities': { expressIds: number[]; globalIds: string[] };
  'user:highlight': { expressIds: number[]; globalIds?: string[] };
  'ai:highlight': { expressIds: number[]; globalIds?: string[] };
  'model:loaded': { name: string; stats: any };
  'query:executed': { result: any };
  'chat:message': { message: string; role: 'user' | 'assistant' };
  'file:uploaded': { model: any; uploadedFileData?: ArrayBuffer };
  'spatial:index:ready': { fragmentId: string; octreeBuffer: Uint8Array; entityCount?: number };
  'chunks:ready': { fragmentId: string; chunkCount: number; totalEntities: number; chunkManager: any };
  'chunk:loaded': { chunkId: string; entityCount: number; memoryUsage: number };
  'chunk:evicted': { chunkId: string; entityCount: number };
  'spatial:query:execute': { queryType: string; bounds?: any; center?: any; radius?: number; resultCount: number };
  'spatial:query:complete': { queryType: string; duration: number; method: string };
  'model:clear': void;
  'performance:metric': {
    type: string;
    fileName?: string;
    fileSize?: number;
    format?: string;
    entityCount?: number;
    entityTypes?: number;
    loadTimeMs?: number;
    bytesPerEntity?: number;
  };
  'fragment:loaded': { 
    fragment: any; 
    entityCount?: number; 
    expressIds?: number[];
  };
  'smartchunks:ready': { 
    projectId: string; 
    totalChunks: number; 
    totalEntities: number; 
  };
}