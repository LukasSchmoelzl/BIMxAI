import { useEffect } from 'react';
import { useEventBusApi } from '@/core/events/event-bus';
import { ChatMessage } from '@/types/chat';

interface UseChatEventsProps {
  onEntitiesLoaded: (data: any) => void;
  onEntityClicked: (data: any) => void;
  onSmartChunksReady: (data: any) => void;
}

export function useChatEvents({
  onEntitiesLoaded,
  onEntityClicked,
  onSmartChunksReady
}: UseChatEventsProps) {
  const { on } = useEventBusApi();

  useEffect(() => {
    const unsubscribeEntities = on('entities:loaded', onEntitiesLoaded);
    const unsubscribeClick = on('entity:clicked', onEntityClicked);
    const unsubscribeSmartChunks = on('smartchunks:ready', onSmartChunksReady);
    
    return () => {
      unsubscribeEntities();
      unsubscribeClick();
      unsubscribeSmartChunks();
    };
  }, [on, onEntitiesLoaded, onEntityClicked, onSmartChunksReady]);
}

// Helper function to create entity info message
export function createEntityInfoMessage(data: any): ChatMessage {
  const expressId = data.localId || data.expressId;
  
  let entityType = 'Element';
  let entityName = '';
  
  if (data.attributes) {
    if (data.attributes._category?.value) {
      entityType = data.attributes._category.value;
    } else if (data.attributes.ObjectType?.value) {
      entityType = data.attributes.ObjectType.value;
    }
    
    if (data.attributes.Name?.value) {
      entityName = data.attributes.Name.value;
    }
  }
  
  const entityInfo = `${entityType} angeklickt: ${entityName || `ID: ${expressId}`}`;
  
  return {
    role: 'assistant',
    content: entityInfo,
    timestamp: new Date().toISOString(),
  };
} 