/**
 * Base type definitions that are reused across the application
 */

// ===== GEOMETRY TYPES =====

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
  center?: Vec3;
  diagonal?: number;
}

// ===== ENTITY TYPES =====

export interface BaseEntity {
  id: string | number;
  type: string;
  name?: string;
}

export interface TimestampedEntity {
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// ===== RESPONSE TYPES =====

export interface BaseResponse<T = any> {
  success: boolean;
  data?: T;
  error?: BaseError;
}

export interface PaginatedResponse<T> extends BaseResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ===== ERROR TYPES =====

export interface BaseError {
  code: string;
  message: string;
  details?: any;
  timestamp?: Date | string;
  stack?: string;
}

export interface ValidationError extends BaseError {
  field?: string;
  value?: any;
  constraint?: string;
}

// ===== PERFORMANCE TYPES =====

export interface BaseMetrics {
  timestamp: Date | string;
  duration?: number;
  count?: number;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
}

// ===== CACHE TYPES =====

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date | string;
  expiresAt?: Date | string;
  size?: number;
}

// ===== COMMON UTILITY TYPES =====

export type ID = string | number;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<BaseResponse<T>>;

// ===== QUERY TYPES =====

export interface BaseQuery {
  id?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

export interface QueryResult<T = any> {
  items: T[];
  total: number;
  query: BaseQuery;
}