"use client";

import React, { useEffect, useRef } from 'react';
import { User, Bot, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@/types/chat';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const getAvatar = (message: ChatMessage): React.ReactElement | null => {
    if (message.isError) {
      return (
        <div className="chat-avatar error">
          <AlertTriangle size={16} strokeWidth={2} />
        </div>
      );
    }
    switch (message.role) {
      case 'user':
        return (
          <div className="chat-avatar user">
            <User size={16} strokeWidth={2} />
          </div>
        );
      case 'assistant':
        return (
          <div className="chat-avatar assistant">
            <Bot size={16} strokeWidth={2} />
          </div>
        );
      default:
        return null;
    }
  };

  const getMessageStyle = (message: ChatMessage): string => {
    if (message.isError) {
      return 'chat-message-item error';
    }
    switch (message.role) {
      case 'user':
        return 'chat-message-item user';
      case 'assistant':
        return 'chat-message-item assistant';
      default:
        return 'chat-message-item';
    }
  };

  return (
    <div className="chat-messages-container flex-1 min-h-0">
      <ScrollArea className="chat-messages-scroll h-full max-h-full">
        <div className="chat-messages-content">
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <p className="chat-empty-title">Noch keine Nachrichten</p>

            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={getMessageStyle(message)}
              >
                {/* Avatar */}
                <div className="chat-message-avatar">
                  {getAvatar(message)}
                </div>
                
                {/* Message Content */}
                <div className="chat-message-content">
                  {/* Message Bubble */}
                  <div className="chat-message-bubble">
                    <p>{message.content}</p>
                  </div>
                  
                  {/* Timestamp removed per request */}
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  );
} 