/**
 * SnApper Core - Hook Service
 * 
 * Event routing and subscription management for OpenClaw lifecycle hooks.
 * Supports priority ordering, async handlers, and filtering.
 */

import type { HookMap, HookOptions } from '../types';

type HandlerEntry<K extends keyof HookMap> = {
  handler: HookMap[K];
  options: Required<HookOptions>;
  id: string;
};

/**
 * Manages hook subscriptions and event emission.
 */
export class HookService {
  private handlers: Map<keyof HookMap, HandlerEntry<keyof HookMap>[]> = new Map();
  private handlerIdCounter = 0;

  /**
   * Register a handler for a hook event.
   * @param event - The hook event name
   * @param handler - The handler function
   * @param options - Registration options (priority, filter, async)
   * @returns Unsubscribe function
   */
  on<K extends keyof HookMap>(
    event: K,
    handler: HookMap[K],
    options: HookOptions = {}
  ): () => void {
    const entry: HandlerEntry<K> = {
      handler,
      options: {
        priority: options.priority ?? 0,
        filter: options.filter ?? (() => true),
        async: options.async ?? false
      },
      id: `handler_${++this.handlerIdCounter}`
    };

    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }

    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.push(entry as HandlerEntry<keyof HookMap>);
    
    // Sort by priority (higher = earlier)
    eventHandlers.sort((a, b) => b.options.priority - a.options.priority);

    // Return unsubscribe function
    return () => {
      const idx = eventHandlers.findIndex(h => h.id === entry.id);
      if (idx !== -1) eventHandlers.splice(idx, 1);
    };
  }

  /**
   * Register a one-time handler for an event.
   * @param event - The hook event name
   * @param handler - The handler function
   */
  once<K extends keyof HookMap>(event: K, handler: HookMap[K]): void {
    const unsubscribe = this.on(event, ((...args: Parameters<HookMap[K]>) => {
      unsubscribe();
      return handler(...args);
    }) as HookMap[K]);
  }

  /**
   * Check if any handlers are registered for an event.
   * @param event - The hook event name
   * @returns True if handlers exist
   */
  hasHandlers<K extends keyof HookMap>(event: K): boolean {
    return (this.handlers.get(event)?.length ?? 0) > 0;
  }

  /**
   * Emit an event to all registered handlers.
   * @param event - The hook event name
   * @param payload - Event payload
   */
  async emit<K extends keyof HookMap>(
    event: K,
    payload: HookMap[K]
  ): Promise<void> {
    const handlers = this.handlers.get(event) ?? [];
    
    for (const entry of handlers) {
      // Apply filter
      if (entry.options.filter && !entry.options.filter(payload)) {
        continue;
      }

      try {
        const result = (entry.handler as Function)(payload);
        
        // Await if async handler or async option set
        if (entry.options.async || result instanceof Promise) {
          await result;
        }
      } catch (error) {
        console.error(`Hook handler error for ${event}:`, error);
        // Continue with other handlers even if one fails
      }
    }
  }

  /**
   * Remove all handlers for an event, or all events if no event specified.
   * @param event - Optional specific event to clear
   */
  clear<K extends keyof HookMap>(event?: K): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get count of handlers for an event.
   * @param event - The hook event name
   * @returns Number of registered handlers
   */
  count<K extends keyof HookMap>(event: K): number {
    return this.handlers.get(event)?.length ?? 0;
  }
}
