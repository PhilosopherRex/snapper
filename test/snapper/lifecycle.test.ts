/**
 * SnApper Core - SnAppLifecycle Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SnAppLifecycle, LifecycleError } from '../../src/snapper/core/lifecycle';
import type { SnApp, SnAppInstance, SnAppState } from '../../src/snapper/types';

// Helper to create a mock SnApp
function createMockSnApp(state: SnAppState = 'registered'): SnApp {
  return {
    manifest: {
      id: 'test-snapp',
      name: 'Test SnApp',
      shortName: 'TS',
      version: '1.0.0',
      description: 'A test SnApp',
      entry: './index.ts',
      permissions: [],
      openclaw: { minVersion: '2.0.0' }
    },
    state,
    registeredAt: new Date(),
    stateChangedAt: new Date()
  };
}

describe('SnAppLifecycle', () => {
  let lifecycle: SnAppLifecycle;

  beforeEach(() => {
    lifecycle = new SnAppLifecycle();
  });

  // ===========================================================================
  // State Transition Tests
  // ===========================================================================

  describe('canTransition', () => {
    it('should allow valid transitions', () => {
      expect(lifecycle.canTransition('registered', 'loading')).toBe(true);
      expect(lifecycle.canTransition('loading', 'loaded')).toBe(true);
      expect(lifecycle.canTransition('loading', 'error')).toBe(true);
      expect(lifecycle.canTransition('loaded', 'activating')).toBe(true);
      expect(lifecycle.canTransition('loaded', 'unloading')).toBe(true);
      expect(lifecycle.canTransition('activating', 'active')).toBe(true);
      expect(lifecycle.canTransition('activating', 'error')).toBe(true);
      expect(lifecycle.canTransition('active', 'suspending')).toBe(true);
      expect(lifecycle.canTransition('active', 'unloading')).toBe(true);
      expect(lifecycle.canTransition('suspending', 'suspended')).toBe(true);
      expect(lifecycle.canTransition('suspending', 'error')).toBe(true);
      expect(lifecycle.canTransition('suspended', 'activating')).toBe(true);
      expect(lifecycle.canTransition('suspended', 'unloading')).toBe(true);
      expect(lifecycle.canTransition('unloading', 'registered')).toBe(true);
      expect(lifecycle.canTransition('unloading', 'error')).toBe(true);
      expect(lifecycle.canTransition('error', 'unloading')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(lifecycle.canTransition('registered', 'active')).toBe(false);
      expect(lifecycle.canTransition('registered', 'loaded')).toBe(false);
      expect(lifecycle.canTransition('loading', 'active')).toBe(false);
      expect(lifecycle.canTransition('active', 'registered')).toBe(false);
      expect(lifecycle.canTransition('error', 'active')).toBe(false);
    });

    it('should allow same-state transitions (no-op)', () => {
      const states: SnAppState[] = ['registered', 'loading', 'loaded', 'active', 'suspended', 'error'];
      for (const state of states) {
        expect(lifecycle.canTransition(state, state)).toBe(true);
      }
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid target states', () => {
      expect(lifecycle.getValidTransitions('registered')).toEqual(['loading']);
      expect(lifecycle.getValidTransitions('loading')).toEqual(['loaded', 'error']);
      expect(lifecycle.getValidTransitions('loaded')).toEqual(['activating', 'unloading']);
      expect(lifecycle.getValidTransitions('active')).toEqual(['suspending', 'unloading']);
      expect(lifecycle.getValidTransitions('error')).toEqual(['unloading']);
    });
  });

  // ===========================================================================
  // Load Tests
  // ===========================================================================

  describe('load', () => {
    it('should transition registered -> loading -> loaded', async () => {
      const snapp = createMockSnApp('registered');
      
      await lifecycle.load(snapp);
      
      expect(snapp.state).toBe('loaded');
    });

    it('should reject load from non-registered state', async () => {
      const invalidStates: SnAppState[] = ['loading', 'loaded', 'active', 'suspended', 'error'];
      
      for (const state of invalidStates) {
        const snapp = createMockSnApp(state);
        
        await expect(lifecycle.load(snapp)).rejects.toThrow(
          `Cannot load SnApp "test-snapp" in state: ${state}`
        );
      }
    });

    it('should use custom loader when provided', async () => {
      const snapp = createMockSnApp('registered');
      const customLoader = vi.fn().mockResolvedValue(undefined);
      
      await lifecycle.load(snapp, customLoader);
      
      expect(customLoader).toHaveBeenCalled();
      expect(snapp.state).toBe('loaded');
    });

    it('should set error state on loader failure', async () => {
      const snapp = createMockSnApp('registered');
      const error = new Error('Load failed');
      const failingLoader = vi.fn().mockRejectedValue(error);
      
      await expect(lifecycle.load(snapp, failingLoader)).rejects.toThrow('Load failed');
      
      expect(snapp.state).toBe('error');
      expect(snapp.error).toBe(error);
    });

    it('should update stateChangedAt timestamp', async () => {
      const snapp = createMockSnApp('registered');
      const beforeTime = snapp.stateChangedAt.getTime();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await lifecycle.load(snapp);
      
      expect(snapp.stateChangedAt.getTime()).toBeGreaterThan(beforeTime);
    });
  });

  // ===========================================================================
  // Activate Tests
  // ===========================================================================

  describe('activate', () => {
    it('should transition loaded -> activating -> active', async () => {
      const snapp = createMockSnApp('loaded');
      const mockInstance: SnAppInstance = {};
      const factory = vi.fn().mockResolvedValue(mockInstance);
      
      await lifecycle.activate(snapp, factory);
      
      expect(factory).toHaveBeenCalled();
      expect(snapp.instance).toBe(mockInstance);
      expect(snapp.state).toBe('active');
    });

    it('should transition suspended -> activating -> active', async () => {
      const snapp = createMockSnApp('suspended');
      const factory = vi.fn().mockResolvedValue({});
      
      await lifecycle.activate(snapp, factory);
      
      expect(snapp.state).toBe('active');
    });

    it('should call onActivate if defined', async () => {
      const snapp = createMockSnApp('loaded');
      const onActivate = vi.fn().mockResolvedValue(undefined);
      const mockInstance: SnAppInstance = { onActivate };
      
      await lifecycle.activate(snapp, async () => mockInstance);
      
      expect(onActivate).toHaveBeenCalled();
      expect(snapp.state).toBe('active');
    });

    it('should reject activation from invalid states', async () => {
      const invalidStates: SnAppState[] = ['registered', 'loading', 'activating', 'active', 'suspending', 'unloading'];
      
      for (const state of invalidStates) {
        const snapp = createMockSnApp(state);
        
        await expect(
          lifecycle.activate(snapp, async () => ({}))
        ).rejects.toThrow(`Cannot activate SnApp "test-snapp" in state: ${state}`);
      }
    });

    it('should set error state on factory failure', async () => {
      const snapp = createMockSnApp('loaded');
      const error = new Error('Factory failed');
      
      await expect(
        lifecycle.activate(snapp, async () => { throw error; })
      ).rejects.toThrow('Factory failed');
      
      expect(snapp.state).toBe('error');
      expect(snapp.error).toBe(error);
    });

    it('should set error state if onActivate throws', async () => {
      const snapp = createMockSnApp('loaded');
      const error = new Error('onActivate failed');
      const mockInstance: SnAppInstance = {
        onActivate: () => Promise.reject(error)
      };
      
      await expect(
        lifecycle.activate(snapp, async () => mockInstance)
      ).rejects.toThrow('onActivate failed');
      
      expect(snapp.state).toBe('error');
    });
  });

  // ===========================================================================
  // Suspend Tests
  // ===========================================================================

  describe('suspend', () => {
    it('should transition active -> suspending -> suspended', async () => {
      const snapp = createMockSnApp('active');
      snapp.instance = {};
      
      const result = await lifecycle.suspend(snapp);
      
      expect(result).toBe(true);
      expect(snapp.state).toBe('suspended');
    });

    it('should call onSuspend if defined', async () => {
      const snapp = createMockSnApp('active');
      const onSuspend = vi.fn().mockResolvedValue(undefined);
      snapp.instance = { onSuspend };
      
      await lifecycle.suspend(snapp);
      
      expect(onSuspend).toHaveBeenCalled();
    });

    it('should return false when not active', async () => {
      const nonActiveStates: SnAppState[] = ['registered', 'loading', 'loaded', 'suspended', 'error'];
      
      for (const state of nonActiveStates) {
        const snapp = createMockSnApp(state);
        
        const result = await lifecycle.suspend(snapp);
        
        expect(result).toBe(false);
        expect(snapp.state).toBe(state); // Unchanged
      }
    });

    it('should set error state if onSuspend throws', async () => {
      const snapp = createMockSnApp('active');
      const error = new Error('onSuspend failed');
      snapp.instance = {
        onSuspend: () => Promise.reject(error)
      };
      
      await expect(lifecycle.suspend(snapp)).rejects.toThrow('onSuspend failed');
      
      expect(snapp.state).toBe('error');
      expect(snapp.error).toBe(error);
    });
  });

  // ===========================================================================
  // Unload Tests
  // ===========================================================================

  describe('unload', () => {
    it('should transition loaded -> unloading -> registered', async () => {
      const snapp = createMockSnApp('loaded');
      snapp.instance = {};
      
      const result = await lifecycle.unload(snapp);
      
      expect(result).toBe(true);
      expect(snapp.state).toBe('registered');
      expect(snapp.instance).toBeUndefined();
    });

    it('should transition active -> unloading -> registered', async () => {
      const snapp = createMockSnApp('active');
      snapp.instance = {};
      
      const result = await lifecycle.unload(snapp);
      
      expect(result).toBe(true);
      expect(snapp.state).toBe('registered');
    });

    it('should transition suspended -> unloading -> registered', async () => {
      const snapp = createMockSnApp('suspended');
      snapp.instance = {};
      
      const result = await lifecycle.unload(snapp);
      
      expect(result).toBe(true);
      expect(snapp.state).toBe('registered');
    });

    it('should transition error -> unloading -> registered', async () => {
      const snapp = createMockSnApp('error');
      snapp.error = new Error('Test error');
      snapp.instance = {};
      
      const result = await lifecycle.unload(snapp);
      
      expect(result).toBe(true);
      expect(snapp.state).toBe('registered');
      expect(snapp.error).toBeUndefined();
      expect(snapp.instance).toBeUndefined();
    });

    it('should call onDestroy if defined', async () => {
      const snapp = createMockSnApp('loaded');
      const onDestroy = vi.fn().mockResolvedValue(undefined);
      snapp.instance = { onDestroy };
      
      await lifecycle.unload(snapp);
      
      expect(onDestroy).toHaveBeenCalled();
    });

    it('should return false when already registered', async () => {
      const snapp = createMockSnApp('registered');
      
      const result = await lifecycle.unload(snapp);
      
      expect(result).toBe(false);
      expect(snapp.state).toBe('registered');
    });

    it('should clear error on unload', async () => {
      const snapp = createMockSnApp('error');
      snapp.error = new Error('Test error');
      snapp.instance = {};
      
      await lifecycle.unload(snapp);
      
      expect(snapp.error).toBeUndefined();
    });

    it('should clear instance on unload', async () => {
      const snapp = createMockSnApp('loaded');
      snapp.instance = { onActivate: () => Promise.resolve() };
      
      await lifecycle.unload(snapp);
      
      expect(snapp.instance).toBeUndefined();
    });

    it('should set error state if onDestroy throws', async () => {
      const snapp = createMockSnApp('loaded');
      const error = new Error('onDestroy failed');
      snapp.instance = {
        onDestroy: () => Promise.reject(error)
      };
      
      await expect(lifecycle.unload(snapp)).rejects.toThrow('onDestroy failed');
      
      expect(snapp.state).toBe('error');
      expect(snapp.error).toBe(error);
    });
  });

  // ===========================================================================
  // Full Lifecycle Tests
  // ===========================================================================

  describe('full lifecycle', () => {
    it('should complete full cycle: registered -> loaded -> active -> suspended -> active -> registered', async () => {
      const snapp = createMockSnApp('registered');
      const mockInstance: SnAppInstance = {
        onActivate: vi.fn().mockResolvedValue(undefined),
        onSuspend: vi.fn().mockResolvedValue(undefined),
        onDestroy: vi.fn().mockResolvedValue(undefined)
      };

      // Load
      await lifecycle.load(snapp);
      expect(snapp.state).toBe('loaded');

      // Activate
      await lifecycle.activate(snapp, async () => mockInstance);
      expect(snapp.state).toBe('active');
      expect(mockInstance.onActivate).toHaveBeenCalledTimes(1);

      // Suspend
      await lifecycle.suspend(snapp);
      expect(snapp.state).toBe('suspended');
      expect(mockInstance.onSuspend).toHaveBeenCalledTimes(1);

      // Reactivate
      await lifecycle.activate(snapp, async () => mockInstance);
      expect(snapp.state).toBe('active');
      expect(mockInstance.onActivate).toHaveBeenCalledTimes(2);

      // Unload
      await lifecycle.unload(snapp);
      expect(snapp.state).toBe('registered');
      expect(mockInstance.onDestroy).toHaveBeenCalledTimes(1);
    });

    it('should handle error recovery', async () => {
      const snapp = createMockSnApp('registered');
      
      // Load successfully
      await lifecycle.load(snapp);
      expect(snapp.state).toBe('loaded');

      // Activation fails
      const error = new Error('Activation failed');
      await expect(
        lifecycle.activate(snapp, async () => { throw error; })
      ).rejects.toThrow('Activation failed');
      
      expect(snapp.state).toBe('error');
      expect(snapp.error).toBe(error);

      // Recover by unloading
      await lifecycle.unload(snapp);
      expect(snapp.state).toBe('registered');
      expect(snapp.error).toBeUndefined();

      // Can load again
      await lifecycle.load(snapp);
      expect(snapp.state).toBe('loaded');
    });
  });

  // ===========================================================================
  // Utility Tests
  // ===========================================================================

  describe('getStateDescription', () => {
    it('should return descriptions for all states', () => {
      const states: SnAppState[] = [
        'registered', 'loading', 'loaded', 'activating', 'active',
        'suspending', 'suspended', 'unloading', 'error'
      ];

      for (const state of states) {
        const description = lifecycle.getStateDescription(state);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('LifecycleError', () => {
  it('should store from and to states', () => {
    const error = new LifecycleError('registered', 'active');
    
    expect(error.from).toBe('registered');
    expect(error.to).toBe('active');
    expect(error.message).toBe('Invalid state transition: registered -> active');
    expect(error.name).toBe('LifecycleError');
  });
});
