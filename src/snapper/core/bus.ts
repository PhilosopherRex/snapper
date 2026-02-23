/**
 * SnApper Core - Message Bus Service
 * 
 * Inter-SnApp communication via pub/sub channels and RPC.
 */

export interface MessageBus {
  publish<T>(channel: string, message: T, sender?: string): void;
  subscribe<T>(
    channel: string,
    handler: (message: T, sender: string) => void,
    subscriber?: string
  ): () => void;
  subscribeOnce<T>(
    channel: string,
    handler: (message: T, sender: string) => void,
    subscriber?: string
  ): void;
  request<TRequest, TResponse>(
    targetSnapp: string,
    method: string,
    payload: TRequest,
    timeout?: number
  ): Promise<TResponse>;
  registerMethod<TRequest, TResponse>(
    snappId: string,
    method: string,
    handler: (payload: TRequest, sender: string) => Promise<TResponse> | TResponse
  ): () => void;
}

type Subscription = {
  handler: Function;
  subscriber: string;
  once: boolean;
};

type MethodRegistration = {
  handler: Function;
};

/**
 * Implements pub/sub messaging and RPC between SnApps.
 */
export class MessageBusService implements MessageBus {
  private channels: Map<string, Subscription[]> = new Map();
  private methods: Map<string, Map<string, MethodRegistration>> = new Map();
  private requestResolvers: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }> = new Map();

  /**
   * Publish a message to a channel.
   * @param channel - Channel name
   * @param message - Message payload
   * @param sender - Sender identifier
   */
  publish<T>(channel: string, message: T, sender: string = 'system'): void {
    const subscriptions = this.channels.get(channel) ?? [];
    
    // Process subscriptions and track one-time handlers to remove
    const toRemove: number[] = [];
    
    subscriptions.forEach((sub, index) => {
      try {
        sub.handler(message, sender);
        if (sub.once) {
          toRemove.push(index);
        }
      } catch (error) {
        console.error(`Message handler error on ${channel}:`, error);
      }
    });

    // Remove one-time handlers (in reverse order to maintain indices)
    toRemove.reverse().forEach(idx => subscriptions.splice(idx, 1));
  }

  /**
   * Subscribe to a channel.
   * @param channel - Channel name
   * @param handler - Message handler
   * @param subscriber - Subscriber identifier
   * @returns Unsubscribe function
   */
  subscribe<T>(
    channel: string,
    handler: (message: T, sender: string) => void,
    subscriber: string = 'unknown'
  ): () => void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, []);
    }

    const subscription: Subscription = { handler, subscriber, once: false };
    this.channels.get(channel)!.push(subscription);

    return () => {
      const subs = this.channels.get(channel);
      if (subs) {
        const idx = subs.indexOf(subscription);
        if (idx !== -1) subs.splice(idx, 1);
      }
    };
  }

  /**
   * Subscribe to a channel for a single message.
   * @param channel - Channel name
   * @param handler - Message handler
   * @param subscriber - Subscriber identifier
   */
  subscribeOnce<T>(
    channel: string,
    handler: (message: T, sender: string) => void,
    subscriber: string = 'unknown'
  ): void {
    if (!this.channels.has(channel)) {
      this.channels.set(channel, []);
    }

    const subscription: Subscription = { handler, subscriber, once: true };
    this.channels.get(channel)!.push(subscription);
  }

  /**
   * Register a method for RPC calls.
   * @param snappId - SnApp ID that owns the method
   * @param method - Method name
   * @param handler - Method handler
   * @returns Unregister function
   */
  registerMethod<TRequest, TResponse>(
    snappId: string,
    method: string,
    handler: (payload: TRequest, sender: string) => Promise<TResponse> | TResponse
  ): () => void {
    if (!this.methods.has(snappId)) {
      this.methods.set(snappId, new Map());
    }

    const snappMethods = this.methods.get(snappId)!;
    snappMethods.set(method, { handler });

    return () => {
      snappMethods.delete(method);
    };
  }

  /**
   * Make an RPC request to another SnApp.
   * @param targetSnapp - Target SnApp ID
   * @param method - Method to call
   * @param payload - Request payload
   * @param timeout - Timeout in milliseconds
   * @returns Promise resolving to response
   */
  async request<TRequest, TResponse>(
    targetSnapp: string,
    method: string,
    payload: TRequest,
    timeout: number = 5000
  ): Promise<TResponse> {
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.requestResolvers.delete(requestId);
        reject(new Error(`Request timeout: ${targetSnapp}.${method}`));
      }, timeout);

      this.requestResolvers.set(requestId, { resolve, reject, timeout: timeoutId });

      // Publish request
      this.publish(`rpc:${targetSnapp}:${method}`, {
        requestId,
        payload,
        sender: 'requester'
      }, 'system');
    });
  }

  /**
   * Clear all subscriptions and methods.
   */
  clear(): void {
    this.channels.clear();
    this.methods.clear();
    this.requestResolvers.forEach(({ timeout }) => clearTimeout(timeout));
    this.requestResolvers.clear();
  }

  /**
   * Get subscriber count for a channel.
   * @param channel - Channel name
   * @returns Number of subscribers
   */
  getSubscriberCount(channel: string): number {
    return this.channels.get(channel)?.length ?? 0;
  }
}
