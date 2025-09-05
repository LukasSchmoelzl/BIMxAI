# Types Documentation

## Overview

This directory contains centralized TypeScript type definitions organized by domain and purpose.

## File Structure

### Core Types
- `chat.ts` - Chat functionality types (messages, state, context)
- `bim.ts` - BIM/3D viewer types (entities, models, spatial data)
- `chunks.ts` - Smart chunks and data processing types
- `selection.ts` - Entity selection and query types
- `api.ts` - API and service types
- `utils.ts` - Utility and helper types

### UI Types
- `ui.ts` - UI component types (buttons, layouts, forms, modals)

## Type Categories

### Chat Types (`chat.ts`)
- `ChatMessage` - Individual chat messages
- `ChatState` - Chat application state
- `ChatContextType` - React context for chat
- `ChatEvent` - Chat event types
- `ChatAction` - Chat action types
- `ChatPipelineResult` - AI pipeline results
- `ChatPipelineError` - Error handling
- `ChatQuickAction` - Quick action definitions
- `ChatModelContext` - Model context information

### UI Types (`ui.ts`)
- `ButtonProps` - Button component props
- `LayoutProps` - Layout component props
- `BentoLayoutProps` - Bento layout specific props
- `ChatMessageUI` - UI-specific chat message type
- `ChatMessagesProps` - Chat messages component props
- `QuickTipsProps` - Quick tips component props
- `ChatInputProps` - Chat input component props
- `ChatContentProps` - Chat content component props
- `AvatarProps` - Avatar component props
- `MessageBubbleProps` - Message bubble component props
- `TimestampProps` - Timestamp component props
- `QuickAction` - Quick action definitions
- `FormField` - Form field definitions
- `ModalProps` - Modal component props
- `LoadingSpinnerProps` - Loading spinner props
- `Notification` - Notification types

### BIM Types (`bim.ts`)
- `Entity` - 3D entity definitions
- `Model` - BIM model types
- `SpatialData` - Spatial indexing types
- `ViewerState` - 3D viewer state

### Chunk Types (`chunks.ts`)
- `SmartChunk` - Smart chunk definitions
- `ChunkingStrategy` - Chunking strategy types
- `ChunkMetadata` - Chunk metadata

### Selection Types (`selection.ts`)
- `QueryIntent` - Query intent analysis
- `IndexQueryPlan` - Query optimization plans
- `RankedChunk` - Ranked chunk results

### API Types (`api.ts`)
- `APIResponse` - API response types
- `RequestConfig` - Request configuration
- `ErrorResponse` - Error handling

### Utility Types (`utils.ts`)
- `CacheEntry` - Caching types
- `PerformanceMetrics` - Performance tracking
- `LoggingConfig` - Logging configuration

## Usage Guidelines

### Importing Types
```typescript
// Import specific types
import { ChatMessage, ChatState } from '@/types/chat';
import { ButtonProps, LayoutProps } from '@/types/ui';

// Import all types from a domain
import * as ChatTypes from '@/types/chat';
import * as UITypes from '@/types/ui';
```

### Type Organization Principles

1. **Domain Separation**: Types are organized by functional domain
2. **UI Separation**: UI-specific types are in `ui.ts`
3. **Reusability**: Common types are shared across domains
4. **Consistency**: Naming conventions are consistent
5. **Documentation**: All types are documented

### Best Practices

1. **Use Specific Imports**: Import only the types you need
2. **Extend Existing Types**: Extend rather than duplicate
3. **Document Complex Types**: Add JSDoc comments for complex types
4. **Version Compatibility**: Maintain backward compatibility
5. **Type Safety**: Use strict typing throughout

## Migration Notes

### From Local Types to Centralized Types
- Move component-specific types to appropriate domain files
- Update imports to use centralized types
- Maintain backward compatibility during migration
- Test thoroughly after type migrations

### UI Type Migration
- UI component types moved to `ui.ts`
- Chat-specific UI types in `chat.ts`
- Layout types in `ui.ts`
- Form and modal types in `ui.ts`

## Future Enhancements

1. **Type Validation**: Add runtime type validation
2. **Type Generation**: Auto-generate types from schemas
3. **Type Testing**: Add type-level testing
4. **Documentation**: Enhanced type documentation
5. **Migration Tools**: Automated migration scripts 