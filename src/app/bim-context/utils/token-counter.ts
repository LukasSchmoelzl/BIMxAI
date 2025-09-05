/**
 * Simple token counter for MVP
 * 
 * This is a simplified implementation that estimates tokens
 * without external dependencies. For production, consider
 * using tiktoken or gpt-3-encoder.
 */

export class TokenCounter {
  // Average characters per token for Claude/GPT models
  private readonly CHARS_PER_TOKEN = 4;
  
  /**
   * Estimate token count for a string
   * This is a simplified estimation that works reasonably well
   * for English and German text
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    
    // Basic estimation: characters / 4
    let tokenCount = text.length / this.CHARS_PER_TOKEN;
    
    // Adjust for common patterns that use more tokens
    // Numbers and special characters typically use more tokens
    const numbers = (text.match(/\d+/g) || []).length;
    const specialChars = (text.match(/[^\w\s]/g) || []).length;
    
    tokenCount += numbers * 0.5;
    tokenCount += specialChars * 0.3;
    
    // Adjust for whitespace (multiple spaces count as fewer tokens)
    const multipleSpaces = (text.match(/\s{2,}/g) || []).length;
    tokenCount -= multipleSpaces * 0.5;
    
    return Math.ceil(tokenCount);
  }
  
  /**
   * Split text into chunks that fit within token limit
   */
  splitByTokenLimit(text: string, maxTokens: number): string[] {
    const chunks: string[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentTokens = 0;
    
    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
  
  /**
   * Split text into sentences (simple implementation)
   */
  private splitIntoSentences(text: string): string[] {
    // Split by common sentence endings
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    // Handle edge cases where sentences might be too long
    const maxSentenceLength = 1000;
    const result: string[] = [];
    
    for (const sentence of sentences) {
      if (sentence.length > maxSentenceLength) {
        // Split long sentences by commas or semicolons
        const parts = sentence.split(/(?<=[,;])\s+/);
        result.push(...parts);
      } else {
        result.push(sentence);
      }
    }
    
    return result.filter(s => s.trim().length > 0);
  }
}

// Singleton instance
export const tokenCounter = new TokenCounter();