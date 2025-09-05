"use client";

import React, { useRef, useEffect } from 'react';
import { useChatContext } from '../context/ChatProvider';

export default function ChatInput() {
  const { inputValue, setInputValue, handleSubmit } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      handleSubmit(e);
    }
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.trim()) {
        handleSubmit(e as any);
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  return (
    <div className="chat-input-container">
      <form onSubmit={handleFormSubmit} className="chat-input-form">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Stelle eine Frage über dein BIM-Modell..."
            className="chat-textarea"
            style={{ minHeight: '60px' }}
          />
        </div>
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="chat-send-button"
        >
          <span className="chat-send-icon">➤</span>
        </button>
      </form>
    </div>
  );
} 