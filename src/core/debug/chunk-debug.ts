/**
 * Chunk-specific debug utilities
 */

import { SmartChunk } from '@/types/chunks';

/**
 * Debug inspect a specific chunk
 */
export function debugInspectChunk(chunk: SmartChunk, options?: {
  showFullContent?: boolean;
  showMetadata?: boolean;
  showTokenAnalysis?: boolean;
}) {
  const opts = {
    showFullContent: false,
    showMetadata: true,
    showTokenAnalysis: false,
    ...options
  };

  console.log('\n=== CHUNK DEBUG INFO ===');
  console.log(`ID: ${chunk.id}`);
  console.log(`Type: ${chunk.type}`);
  console.log(`Project: ${chunk.projectId}`);
  console.log(`Tokens: ${chunk.tokenCount}`);
  console.log(`Created: ${chunk.created}`);
  console.log(`Version: ${chunk.version}`);
  
  console.log(`\nSummary: ${chunk.summary}`);
  
  if (opts.showMetadata && chunk.metadata) {
    console.log('\nMetadata:');
    console.log(`- Entity Count: ${chunk.metadata.entityCount}`);
    console.log(`- Entity Types: ${chunk.metadata.entityTypes.join(', ')}`);
    console.log(`- Floor: ${chunk.metadata.floor || 'N/A'}`);
    console.log(`- Zone: ${chunk.metadata.zone || 'N/A'}`);
    console.log(`- System: ${chunk.metadata.system || 'N/A'}`);
    
    if (chunk.metadata.bbox) {
      console.log(`- Bounding Box:`);
      console.log(`  Min: (${chunk.metadata.bbox.min.x}, ${chunk.metadata.bbox.min.y}, ${chunk.metadata.bbox.min.z})`);
      console.log(`  Max: (${chunk.metadata.bbox.max.x}, ${chunk.metadata.bbox.max.y}, ${chunk.metadata.bbox.max.z})`);
    }
    
    if (chunk.metadata.aggregates) {
      console.log(`- Aggregates:`);
      if (chunk.metadata.aggregates.totalVolume) {
        console.log(`  Total Volume: ${chunk.metadata.aggregates.totalVolume}`);
      }
      if (chunk.metadata.aggregates.totalArea) {
        console.log(`  Total Area: ${chunk.metadata.aggregates.totalArea}`);
      }
    }
  }
  
  if (opts.showTokenAnalysis) {
    analyzeTokenDistribution(chunk.content);
  }
  
  if (opts.showFullContent) {
    console.log('\n--- CHUNK CONTENT ---');
    console.log(chunk.content);
    console.log('--- END CONTENT ---');
  } else {
    console.log('\n--- CHUNK PREVIEW (first 500 chars) ---');
    console.log(chunk.content.substring(0, 500));
    if (chunk.content.length > 500) {
      console.log(`\n... (${chunk.content.length - 500} more characters)`);
    }
    console.log('--- END PREVIEW ---');
  }
  
  console.log('\n=== END DEBUG INFO ===\n');
}

/**
 * Analyze token distribution in content
 */
function analyzeTokenDistribution(content: string) {
  // Simple word-based approximation (actual tokenization is more complex)
  const words = content.split(/\s+/);
  const lines = content.split('\n');
  const avgWordsPerLine = words.length / lines.length;
  
  console.log('\nToken Analysis (approximation):');
  console.log(`- Total characters: ${content.length}`);
  console.log(`- Total words: ${words.length}`);
  console.log(`- Total lines: ${lines.length}`);
  console.log(`- Avg words/line: ${avgWordsPerLine.toFixed(1)}`);
  console.log(`- Estimated tokens: ${Math.round(words.length * 1.3)}`);
  
  // Find most common words (excluding common stop words)
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'may', 'might', 'must', 'can', 'could', 'to', 'of', 'in', 'for', 'with', 'by']);
  const wordFreq: Record<string, number> = {};
  
  words.forEach(word => {
    const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleaned && !stopWords.has(cleaned) && cleaned.length > 2) {
      wordFreq[cleaned] = (wordFreq[cleaned] || 0) + 1;
    }
  });
  
  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log('\nTop 10 keywords:');
  topWords.forEach(([word, count]) => {
    console.log(`- ${word}: ${count} occurrences`);
  });
}