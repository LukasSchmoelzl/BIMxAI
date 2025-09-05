'use client'

import React, { useEffect } from 'react';
import Header from './header/Header';
import Footer from './footer/Footer';
import { 
  BentoLayout, 
  BentoArea, 
  FirstVisitModal
} from '@/components/ui-ls';
import { ChatProvider } from '@/features/chat';
import ChatContent from '@/features/chat/components/ChatContent';
import ChatInput from '@/features/chat/components/ChatInput';
import { initializeDebugCommands } from '@/core/debug';
import BimViewer from './bim-viewer/BimViewer';

export default function ClientApp() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initializeDebugCommands();
    }
  }, []);

  return (
    <div className="app-container">
      <FirstVisitModal />
      
      <BentoLayout bordered={true} padding="1.5rem" resizable={true}>
        <BentoArea area="header">
          <div className="header-frame">
            <Header />
          </div>
        </BentoArea>
        
        <BentoArea area="background" className="layout-content" style={{ pointerEvents: 'auto' }}>
          <BimViewer />
        </BentoArea> 
        
        <ChatProvider>
          <BentoArea area="chat-frame" className="area-chat-frame" style={{ pointerEvents: 'auto' }}>
            <div className="chat-wrapper">
              <ChatContent />
              <ChatInput />
            </div>
          </BentoArea>
        </ChatProvider>
 
      </BentoLayout>
      
      <Footer />
    </div>
  );
}