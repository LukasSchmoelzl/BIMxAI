/**
 * Chat-specific TypeScript types
 */

// Chat message type
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  isError?: boolean;
}

// Chat state
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  hasModel: boolean;
  currentPhase: 'plan' | 'execution' | 'response' | null;
}

// Chat context type for provider
export interface ChatContextType {
  chatState: ChatState;
  entities: any[];
  entityIndex: any;
  claudePipelineRef: React.RefObject<any>;
  inputValue: string;
  setInputValue: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleQuickAction: (action: string) => void;
  handleDismissError: () => void;
  handleClaudeResult: (result: any) => void;
  handleClaudeError: (error: Error | string, phase?: string) => void;
  handlePhaseChange: (phase: any) => void;
  getModelContext: () => string;
}

// Chat Events
export interface ChatEvent {
  type: 'message' | 'error' | 'loading' | 'complete';
  data: any;
  timestamp: string;
}

// Chat Actions
export interface ChatAction {
  type: 'send' | 'clear' | 'retry' | 'dismiss';
  payload?: any;
}

// Chat Pipeline Results
export interface ChatPipelineResult {
  userMessage: string;
  assistantResponse: string;
  queryResult?: any;
  highlightedEntities?: number[];
  contextUsed?: boolean;
  chunksUsed?: number;
}

// Chat Pipeline Error
export interface ChatPipelineError {
  message: string;
  code?: string;
  phase?: string;
  retryable?: boolean;
}

// Chat Quick Actions
export interface ChatQuickAction {
  id: string;
  label: string;
  action: string;
  description?: string;
  category?: 'search' | 'count' | 'highlight' | 'info';
}

// Chat Model Context
export interface ChatModelContext {
  modelLoaded: boolean;
  entityCount: number;
  entityTypes: string[];
  modelName?: string;
  modelPath?: string;
}