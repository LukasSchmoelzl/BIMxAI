// UI-spezifische TypeScript Types
// Only actually used types - cleaned up unused exports

// Chat UI Component Types (Used in QuickTips.tsx)
export interface QuickTipsProps {
  onQuickAction: (action: string) => void;
  onClose?: () => void;
} 