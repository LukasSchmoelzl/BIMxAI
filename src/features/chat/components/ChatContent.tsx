"use client";

import React, { useState } from 'react';
import { useChatContext } from '../context/ChatProvider';
import { ChatMessages } from './ChatMessages';
import { QuickTips } from './QuickTips';

export default function ChatContent() {
  const { chatState, handleQuickAction } = useChatContext();
  const [showQuickTips, setShowQuickTips] = useState(true);

  const handleQuickActionAndHide = (action: string) => {
    handleQuickAction(action);
    // QuickTips bleiben sichtbar für bessere UX
  };

  return (
    <div className="h-full min-h-0 max-h-full w-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 h-full overflow-hidden">
        {showQuickTips && chatState.messages.length === 0 ? (
          <div className="h-full overflow-auto">
            <QuickTips
              onQuickAction={handleQuickActionAndHide}
              onClose={() => setShowQuickTips(false)}
            />
          </div>
        ) : (
          <div className="h-full">
            <ChatMessages messages={chatState.messages} />
          </div>
        )}
      </div>
    </div>
  );
}