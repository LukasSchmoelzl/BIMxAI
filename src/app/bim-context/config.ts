/**
 * Configuration for Smart Chunks MVP
 */

import path from 'path';
import { MVPConfig } from '@/types/chunks';

const defaultConfig: MVPConfig = {
  tokens: {
    targetChunkSize: 3000,
    maxChunkSize: 4000,
    overlapSize: 200,
    maxContextSize: 10000,
  },
  
  storage: {
    basePath: path.join(process.cwd(), 'data'),
    projectsPath: path.join(process.cwd(), 'data', 'projects'),
  },
  
  processing: {
    enableSpatialIndex: true,
    enableRelationships: true,
    compressionEnabled: false,
  },
  
  api: {
    maxUploadSize: 100 * 1024 * 1024, // 100MB
    maxProjectsPerUser: 10,
    requestTimeout: 60000, // 60 seconds
  },
  
  features: {
    debugMode: process.env.NODE_ENV === 'development',
    cachingEnabled: true,
    asyncProcessing: true,
  },
};

// Configuration singleton
let config: MVPConfig = defaultConfig;

/**
 * Get current MVP configuration
 */
export function getMVPConfig(): MVPConfig {
  return config;
}

/**
 * Update MVP configuration
 */
export function setMVPConfig(newConfig: Partial<MVPConfig>): void {
  config = {
    ...config,
    ...newConfig,
    tokens: { ...config.tokens, ...newConfig.tokens },
    storage: { ...config.storage, ...newConfig.storage },
    processing: { ...config.processing, ...newConfig.processing },
    api: { ...config.api, ...newConfig.api },
    features: { ...config.features, ...newConfig.features },
  };
}

/**
 * Reset to default configuration
 */
export function resetMVPConfig(): void {
  config = defaultConfig;
}