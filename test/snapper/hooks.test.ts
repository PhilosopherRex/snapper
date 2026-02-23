/**
 * SnApper Core - HookService Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HookService } from '../../src/snapper/core/hooks';

describe('HookService', () => {
  let hooks: HookService;

  beforeEach(() => {
    hooks = new HookService();
  });

  describe('on', () => {
    it('should register handler and emit', async () => {
      const handler = vi.fn();
      hooks.on('session_start', handler);
      
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ sessionId: 'test' });
    });

    it('should support priority ordering', async () => {
      const order: number[] = [];
      
      hooks.on('session_start', () => order.push(1), { priority: 1 });
      hooks.on('session_start', () => order.push(3), { priority: 3 });
      hooks.on('session_start', () => order.push(2), { priority: 2 });
      
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(order).toEqual([3, 2, 1]);
    });

    it('should return unsubscribe function', async () => {
      const handler = vi.fn();
      const unsubscribe = hooks.on('session_start', handler);
      
      unsubscribe();
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers for same event', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      hooks.on('session_start', handler1);
      hooks.on('session_start', handler2);
      
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should support filter option', async () => {
      const handler = vi.fn();
      hooks.on('session_start', handler, { 
        filter: (payload: any) => payload.userId === 'admin' 
      });
      
      await hooks.emit('session_start', { sessionId: '1', userId: 'user' });
      expect(handler).not.toHaveBeenCalled();
      
      await hooks.emit('session_start', { sessionId: '2', userId: 'admin' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('once', () => {
    it('should only trigger once', async () => {
      const handler = vi.fn();
      hooks.once('session_start', handler);
      
      await hooks.emit('session_start', { sessionId: '1' });
      await hooks.emit('session_start', { sessionId: '2' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasHandlers', () => {
    it('should return false when no handlers', () => {
      expect(hooks.hasHandlers('session_start')).toBe(false);
    });

    it('should return true when handlers exist', () => {
      hooks.on('session_start', () => {});
      expect(hooks.hasHandlers('session_start')).toBe(true);
    });
  });

  describe('count', () => {
    it('should return 0 when no handlers', () => {
      expect(hooks.count('session_start')).toBe(0);
    });

    it('should return correct count', () => {
      hooks.on('session_start', () => {});
      hooks.on('session_start', () => {});
      hooks.on('session_start', () => {});
      expect(hooks.count('session_start')).toBe(3);
    });
  });

  describe('emit', () => {
    it('should not throw when no handlers', async () => {
      await expect(hooks.emit('session_start', { sessionId: 'test' })).resolves.not.toThrow();
    });

    it('should continue after handler error', async () => {
      const errorHandler = vi.fn().mockImplementation(() => { throw new Error('oops'); });
      const successHandler = vi.fn();
      
      hooks.on('session_start', errorHandler);
      hooks.on('session_start', successHandler);
      
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('async handlers', () => {
    it('should await async handlers', async () => {
      let resolved = false;
      
      hooks.on('session_start', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        resolved = true;
      });
      
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(resolved).toBe(true);
    });

    it('should await when async option set', async () => {
      let resolved = false;
      
      hooks.on('session_start', () => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolved = true;
            resolve(undefined);
          }, 10);
        });
      }, { async: true });
      
      await hooks.emit('session_start', { sessionId: 'test' });
      
      expect(resolved).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear specific event', () => {
      hooks.on('session_start', () => {});
      hooks.on('session_end', () => {});
      
      hooks.clear('session_start');
      
      expect(hooks.hasHandlers('session_start')).toBe(false);
      expect(hooks.hasHandlers('session_end')).toBe(true);
    });

    it('should clear all events when no argument', () => {
      hooks.on('session_start', () => {});
      hooks.on('session_end', () => {});
      
      hooks.clear();
      
      expect(hooks.hasHandlers('session_start')).toBe(false);
      expect(hooks.hasHandlers('session_end')).toBe(false);
    });
  });
});
