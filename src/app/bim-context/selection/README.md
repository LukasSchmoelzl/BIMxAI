# BIM Context Selection Module

The **Selection Module** is the intelligent core of the BIM Context system, responsible for analyzing user queries, selecting the most relevant chunks from large BIM models, and assembling optimal context for AI interactions.

## Overview

This module implements a sophisticated multi-stage pipeline that transforms natural language queries into precise, token-efficient context selections. It combines query analysis, relevance scoring, token budget management, and performance optimization to deliver the most relevant BIM information within AI model constraints.

## Architecture

```
User Query → Query Analysis → Index Optimization → Chunk Selection → Relevance Scoring → Budget Management → Context Assembly
```

## Core Components

### 1. Query Analyzer (`query-analyzer.ts`)
**Purpose**: Understands user intent and extracts structured information from natural language queries.

**Key Features**:
- **Intent Detection**: Identifies query types (count, find, spatial, system, general)
- **Entity Extraction**: Maps German terms to IFC entity types
- **Keyword Analysis**: Extracts and stems relevant keywords
- **Spatial Context**: Identifies floor levels, rooms, and spatial references
- **System Classification**: Detects HVAC, electrical, plumbing, and structural references

**Example**:
```typescript
// Input: "Wie viele Türen gibt es im 2. Stock?"
// Output: {
//   type: 'count',
//   entityTypes: ['IFCDOOR'],
//   spatialTerms: ['2. stock', 'zweites'],
//   keywords: ['türen', 'stock'],
//   confidence: 0.95
// }
```

### 2. Relevance Scorer (`relevance-scorer.ts`)
**Purpose**: Calculates relevance scores for chunks based on multiple factors.

**Scoring Factors**:
- **Text Match** (30%): Keyword frequency and TF-IDF scoring
- **Entity Match** (30%): IFC entity type alignment
- **Spatial Relevance** (20%): Proximity to spatial references
- **Type Alignment** (15%): Chunk type vs. query intent compatibility
- **Recency** (5%): Temporal relevance

**Features**:
- Document frequency analysis for TF-IDF
- Entity hierarchy awareness
- Configurable scoring weights
- Multi-factor ranking

### 3. Context Selector (`context-selector.ts`)
**Purpose**: Orchestrates the entire selection process with caching and optimization.

**Key Features**:
- **Intelligent Caching**: 5-minute TTL with 100-item cache
- **Progressive Loading**: Loads chunks in batches with early termination
- **Index Optimization**: Uses multiple indices for efficient queries
- **Performance Metrics**: Tracks coverage, relevance, diversity, and token efficiency

**Selection Process**:
1. Cache lookup for repeated queries
2. Query intent analysis
3. Index-based candidate selection
4. Progressive chunk loading
5. Relevance scoring and ranking
6. Token budget allocation
7. Final selection and context assembly

### 4. Token Budget Manager (`token-budget-manager.ts`)
**Purpose**: Manages token allocation to stay within AI model limits.

**Strategies**:
- **Greedy**: Selects highest-scoring chunks until budget exhausted
- **Balanced**: Distributes tokens across chunk types proportionally
- **Diverse**: Ensures representation from different chunk types

**Features**:
- Dynamic budget allocation based on query complexity
- System prompt and response buffer reservation
- Token estimation and optimization
- Minimum/maximum chunk size constraints

### 5. Context Assembler (`context-assembler.ts`)
**Purpose**: Formats selected chunks into optimal context for AI consumption.

**Formatting Options**:
- **Compact Mode**: Minimal formatting for token efficiency
- **Full Mode**: Detailed formatting with headers and metadata
- **Language Support**: German and English output
- **Keyword Highlighting**: Emphasizes relevant terms

**Features**:
- Intelligent chunk organization by type
- Query-specific summaries
- Metadata calculation (coverage, token distribution)
- Multi-language support

### 6. Index Query Optimizer (`index-query-optimizer.ts`)
**Purpose**: Optimizes query execution for performance and efficiency.

**Optimization Strategies**:
- **Single Index**: Direct lookup for simple queries
- **Multi Index**: Parallel index queries for complex queries
- **Full Scan**: Fallback for unsupported query patterns

**Features**:
- Query complexity analysis
- Cost estimation and optimization
- Parallel execution planning
- Index selectivity calculation

## Usage Example

```typescript
import { ContextSelector } from './context-selector';
import { FileStore } from '../storage/file-store';

const fileStore = new FileStore();
const selector = new ContextSelector(fileStore);

// Select relevant chunks for a query
const result = await selector.selectChunks(
  'project-123',
  'Zeige alle Türen im Erdgeschoss',
  4000 // max tokens
);

// Result contains:
// - selectedChunks: SmartChunk[]
// - assembledContext: string[]
// - metrics: ChunkSelectionMetrics
// - executionTime: number
```

## Performance Features

### Caching
- **Query Cache**: 5-minute TTL for repeated queries
- **Index Cache**: Persistent index storage
- **Chunk Cache**: Memory-efficient chunk storage

### Optimization
- **Progressive Loading**: Load chunks in batches with early termination
- **Index Selection**: Choose optimal indices based on query type
- **Parallel Processing**: Execute independent operations concurrently
- **Token Optimization**: Minimize token usage while maximizing relevance

### Metrics
- **Coverage**: Percentage of relevant information captured
- **Relevance Score**: Average relevance of selected chunks
- **Diversity Score**: Variety of chunk types represented
- **Token Efficiency**: Relevance per token ratio

## Configuration

The selection module can be configured through:

1. **Scoring Weights**: Adjust factor importance in `RelevanceScorer`
2. **Token Budgets**: Modify allocation strategies in `TokenBudgetManager`
3. **Cache Settings**: Configure TTL and size limits
4. **Index Strategies**: Customize query optimization approaches

## Integration

This module integrates with:
- **File Store**: For chunk and index storage
- **Cache Manager**: For performance optimization
- **BIM Context**: For chunk metadata and relationships
- **Claude Pipeline**: For AI interaction

## Error Handling

The module includes comprehensive error handling for:
- Missing projects or chunks
- Invalid query formats
- Token budget exceeded
- Index corruption or missing data
- Network or storage failures

## Future Enhancements

Potential improvements include:
- **Machine Learning**: Learn from user feedback to improve relevance
- **Semantic Search**: Advanced NLP for better query understanding
- **Dynamic Indexing**: Real-time index updates
- **Federated Search**: Search across multiple projects
- **Query Suggestions**: Intelligent query completion 