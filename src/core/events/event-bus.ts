import { EventHandler, UnsubscribeFn, EventMap } from '@/types/events';

class EventBusClass {
  private listeners = new Map<string, Set<EventHandler>>();

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    // console.log(`Event: ${event}`, data);
    
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  on<K extends keyof EventMap>(
    event: K, 
    handler: EventHandler<EventMap[K]>
  ): UnsubscribeFn {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    
    return () => {
      const handlers = this.listeners.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.listeners.delete(event);
        }
      }
    };
  }

  once<K extends keyof EventMap>(
    event: K, 
    handler: EventHandler<EventMap[K]>
  ): UnsubscribeFn {
    const wrappedHandler = (data: EventMap[K]) => {
      handler(data);
      unsubscribe();
    };
    
    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  clear(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const EventBus = new EventBusClass();

// Make EventBus globally available
if (typeof window !== 'undefined') {
  (window as any).EventBus = EventBus;
}

// React Hook für Event Bus
import { useEffect } from 'react';

export function useEventBus<K extends keyof EventMap>(
  event: K,
  handler: EventHandler<EventMap[K]>
) {
  useEffect(() => {
    const unsubscribe = EventBus.on(event, handler);
    return unsubscribe;
  }, [event]); // handler nicht in deps, da sich die Referenz ändern kann
}

// Hook that returns emit, on, off functions
export function useEventBusApi() {
  return {
    emit: EventBus.emit.bind(EventBus),
    on: EventBus.on.bind(EventBus),
    off: (event: keyof EventMap, handler: EventHandler) => {
      const handlers = EventBus['listeners'].get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          EventBus['listeners'].delete(event);
        }
      }
    },
    once: EventBus.once.bind(EventBus),
  };
}