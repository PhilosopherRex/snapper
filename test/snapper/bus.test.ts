/**
 * SnApper Core - MessageBusService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageBusService } from '../../src/snapper/core/bus';

describe('MessageBusService', () => {
  let bus: MessageBusService;

  beforeEach(() => {
    bus = new MessageBusService();
  });

  describe('publish/subscribe', () => {
    it('should deliver messages to subscribers', () => {
      const handler = vi.fn();
      bus.subscribe('test-channel', handler, 'test-snapp');
      
      bus.publish('test-channel', { data: 'hello' }, 'sender');
      
      expect(handler).toHaveBeenCalledWith({ data: 'hello' }, 'sender');
    });

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      bus.subscribe('test-channel', handler1, 'snapp1');
      bus.subscribe('test-channel', handler2, 'snapp2');
      
      bus.publish('test-channel', 'message', 'sender');
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should support unsubscribe', () => {
      const handler = vi.fn();
      const unsubscribe = bus.subscribe('test-channel', handler, 'test-snapp');
      
      unsubscribe();
      bus.publish('test-channel', 'message', 'sender');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle errors in handlers gracefully', () => {
      const errorHandler = vi.fn().mockImplementation(() => { throw new Error('oops'); });
      const successHandler = vi.fn();
      
      bus.subscribe('test-channel', errorHandler, 'snapp1');
      bus.subscribe('test-channel', successHandler, 'snapp2');
      
      bus.publish('test-channel', 'message', 'sender');
      
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('subscribeOnce', () => {
    it('should only receive one message', () => {
      const handler = vi.fn();
      bus.subscribeOnce('test-channel', handler, 'test-snapp');
      
      bus.publish('test-channel', 'msg1', 'sender');
      bus.publish('test-channel', 'msg2', 'sender');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('msg1', 'sender');
    });
  });

  describe('getSubscriberCount', () => {
    it('should return 0 for empty channel', () => {
      expect(bus.getSubscriberCount('empty-channel')).toBe(0);
    });

    it('should return correct count', () => {
      bus.subscribe('test-channel', () => {}, 'snapp1');
      bus.subscribe('test-channel', () => {}, 'snapp2');
      
      expect(bus.getSubscriberCount('test-channel')).toBe(2);
    });
  });

  describe('clear', () => {
    it('should remove all subscriptions', () => {
      const handler = vi.fn();
      bus.subscribe('channel1', handler, 'snapp');
      bus.subscribe('channel2', handler, 'snapp');
      
      bus.clear();
      
      bus.publish('channel1', 'msg', 'sender');
      bus.publish('channel2', 'msg', 'sender');
      
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
