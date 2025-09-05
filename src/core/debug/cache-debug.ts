/**
 * Cache-specific debug utilities
 */

import { CacheManager } from '@/app/bim-context/storage/cache-manager';

/**
 * Debug inspect cache contents
 */
export function debugInspectCache(cacheManager: CacheManager, options?: {
  showContent?: boolean;
  chunkId?: string;
  limit?: number;
}) {
  if (!cacheManager) {
    console.error('❌ No cache manager provided');
    return;
  }

  // Use the built-in debug method if available
  if (typeof (cacheManager as any).debugInspectCache === 'function') {
    (cacheManager as any).debugInspectCache(options);
  } else {
    console.error('❌ Cache manager does not have debug capabilities');
  }
}

/**
 * Analyze cache performance
 */
export function analyzeCachePerformance(cacheManager: CacheManager) {
  const stats = cacheManager.getStats();
  const queryStats = cacheManager.getQueryCacheStats();
  
  console.log('\n=== CACHE PERFORMANCE ANALYSIS ===');
  
  // Cache efficiency
  const hitRate = stats.hits / (stats.hits + stats.misses) * 100;
  console.log('\nCache Efficiency:');
  console.log(`- Hit Rate: ${hitRate.toFixed(2)}%`);
  console.log(`- Total Hits: ${stats.hits}`);
  console.log(`- Total Misses: ${stats.misses}`);
  console.log(`- Total Evictions: ${stats.evictions}`);
  
  // Memory usage
  const memoryUsagePercent = (stats.size / stats.maxSize) * 100;
  console.log('\nMemory Usage:');
  console.log(`- Current Size: ${stats.size} items`);
  console.log(`- Max Size: ${stats.maxSize} items`);
  console.log(`- Usage: ${memoryUsagePercent.toFixed(2)}%`);
  
  // Query cache
  console.log('\nQuery Cache:');
  console.log(`- Cached Queries: ${queryStats.size}`);
  console.log(`- Query Hit Rate: ${(queryStats.hitRate * 100).toFixed(2)}%`);
  console.log(`- Avg Execution Time: ${queryStats.avgExecutionTime.toFixed(2)}ms`);
  
  // Recommendations
  console.log('\nRecommendations:');
  if (hitRate < 50) {
    console.log('⚠️ Low hit rate - consider increasing cache size or TTL');
  }
  if (memoryUsagePercent > 90) {
    console.log('⚠️ High memory usage - consider increasing max size or reducing TTL');
  }
  if (stats.evictions > stats.hits * 0.5) {
    console.log('⚠️ High eviction rate - cache may be too small');
  }
  if (queryStats.avgExecutionTime > 1000) {
    console.log('⚠️ Slow query execution - consider optimizing queries');
  }
  
  console.log('\n=== END ANALYSIS ===\n');
}