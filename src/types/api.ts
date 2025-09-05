/**
 * API-specific TypeScript types
 * Only actually used types - cleaned up unused exports
 */

// Custom error classes (Used in storage components)
export class StorageError extends Error {
  constructor(
    message: string,
    public code: string = 'STORAGE_ERROR',
    public details?: any
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

export class CorruptedDataError extends StorageError {
  constructor(message: string, filePath: string) {
    super(message, 'CORRUPTED_DATA', { filePath });
    this.name = 'CorruptedDataError';
  }
}