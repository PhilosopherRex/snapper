/**
 * SnApper Core - SnApp Lifecycle Management
 * 
 * Manages the lifecycle state machine for SnApps:
 * registered → loading → loaded → activating → active → suspending → suspended → unloading → registered
 *                                     ↓          ↓         ↓
 *                                   error ←──────┴─────────┘
 */

import type { SnApp, SnAppInstance, SnAppState } from '../types';

/**
 * Error thrown when an invalid state transition is attempted.
 */
export class LifecycleError extends Error {
  constructor(
    public readonly from: SnAppState,
    public readonly to: SnAppState
  ) {
    super(`Invalid state transition: ${from} -> ${to}`);
    this.name = 'LifecycleError';
  }
}

/**
 * Manages SnApp lifecycle state transitions and method invocation.
 */
export class SnAppLifecycle {
  
  /**
   * Valid state transitions map.
   * Each state lists the states it can transition TO.
   */
  private static readonly validTransitions: Record<SnAppState, SnAppState[]> = {
    'registered': ['loading'],
    'loading': ['loaded', 'error'],
    'loaded': ['activating', 'unloading'],
    'activating': ['active', 'error'],
    'active': ['suspending', 'unloading'],
    'suspending': ['suspended', 'error'],
    'suspended': ['activating', 'unloading'],
    'unloading': ['registered', 'error'],
    'error': ['unloading']
  };
  
  /**
   * Check if a state transition is valid.
   * @param from - Current state
   * @param to - Target state
   * @returns True if transition is allowed
   */
  canTransition(from: SnAppState, to: SnAppState): boolean {
    if (from === to) return true; // Same state is always valid (no-op)
    return SnAppLifecycle.validTransitions[from]?.includes(to) ?? false;
  }
  
  /**
   * Get all valid target states from a given state.
   * @param from - Current state
   * @returns Array of valid target states
   */
  getValidTransitions(from: SnAppState): SnAppState[] {
    return SnAppLifecycle.validTransitions[from] ?? [];
  }
  
  /**
   * Transition SnApp to a new state.
   * @param snapp - The SnApp to transition
   * @param to - Target state
   * @throws LifecycleError if transition is invalid
   */
  private transition(snapp: SnApp, to: SnAppState): void {
    const from = snapp.state;
    
    if (from === to) return; // No change needed
    
    if (!this.canTransition(from, to)) {
      throw new LifecycleError(from, to);
    }
    
    snapp.state = to;
    snapp.stateChangedAt = new Date();
  }
  
  /**
   * Load SnApp code and prepare for activation.
   * Valid: registered → loading → loaded
   * @param snapp - The SnApp to load
   * @param loader - Optional custom loader function
   * @throws Error if loading fails
   */
  async load(
    snapp: SnApp,
    loader?: () => Promise<void>
  ): Promise<void> {
    if (snapp.state !== 'registered') {
      throw new Error(
        `Cannot load SnApp "${snapp.manifest.id}" in state: ${snapp.state}`
      );
    }
    
    this.transition(snapp, 'loading');
    
    try {
      if (loader) {
        await loader();
      } else {
        await this.defaultLoad(snapp);
      }
      
      this.transition(snapp, 'loaded');
    } catch (error) {
      snapp.state = 'error';
      snapp.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }
  
  /**
   * Activate a loaded or suspended SnApp.
   * Valid: loaded/suspended → activating → active
   * @param snapp - The SnApp to activate
   * @param factory - Factory function that creates the SnApp instance
   * @throws Error if activation fails
   */
  async activate(
    snapp: SnApp,
    factory: () => Promise<SnAppInstance>
  ): Promise<void> {
    if (snapp.state !== 'loaded' && snapp.state !== 'suspended') {
      throw new Error(
        `Cannot activate SnApp "${snapp.manifest.id}" in state: ${snapp.state}`
      );
    }
    
    this.transition(snapp, 'activating');
    
    try {
      // Create instance
      const instance = await factory();
      snapp.instance = instance;
      
      // Call onActivate lifecycle method if defined
      if (instance.onActivate) {
        await instance.onActivate();
      }
      
      this.transition(snapp, 'active');
    } catch (error) {
      snapp.state = 'error';
      snapp.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }
  
  /**
   * Suspend an active SnApp.
   * Valid: active → suspending → suspended
   * @param snapp - The SnApp to suspend
   * @returns True if suspended, false if not active
   */
  async suspend(snapp: SnApp): Promise<boolean> {
    if (snapp.state !== 'active') {
      // Not active, nothing to suspend
      return false;
    }
    
    this.transition(snapp, 'suspending');
    
    try {
      // Call onSuspend lifecycle method if defined
      if (snapp.instance?.onSuspend) {
        await snapp.instance.onSuspend();
      }
      
      this.transition(snapp, 'suspended');
      return true;
    } catch (error) {
      snapp.state = 'error';
      snapp.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }
  
  /**
   * Unload a SnApp and return to registered state.
   * Valid: loaded/active/suspended/error → unloading → registered
   * @param snapp - The SnApp to unload
   * @returns True if unloaded, false if already registered
   */
  async unload(snapp: SnApp): Promise<boolean> {
    // Already unloaded or unloading
    if (snapp.state === 'registered') {
      return false;
    }
    
    this.transition(snapp, 'unloading');
    
    try {
      // Call onDestroy lifecycle method if defined
      if (snapp.instance?.onDestroy) {
        await snapp.instance.onDestroy();
      }
      
      // Clear instance and error
      snapp.instance = undefined;
      snapp.error = undefined;
      
      this.transition(snapp, 'registered');
      return true;
    } catch (error) {
      snapp.state = 'error';
      snapp.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }
  
  /**
   * Get a human-readable description of a state's meaning.
   * @param state - The state to describe
   * @returns Description string
   */
  getStateDescription(state: SnAppState): string {
    const descriptions: Record<SnAppState, string> = {
      'registered': 'SnApp is registered but not loaded',
      'loading': 'SnApp code is being loaded',
      'loaded': 'SnApp code loaded, waiting for activation',
      'activating': 'SnApp is being activated',
      'active': 'SnApp is active and running',
      'suspending': 'SnApp is being suspended',
      'suspended': 'SnApp is suspended (backgrounded)',
      'unloading': 'SnApp is being unloaded',
      'error': 'SnApp encountered an error'
    };
    return descriptions[state];
  }
  
  /**
   * Default load implementation - simulates async loading.
   * In production, this would dynamically import the SnApp module.
   */
  private async defaultLoad(snapp: SnApp): Promise<void> {
    // Simulate async load time
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // In real implementation:
    // const entryPath = join('snapps', snapp.manifest.id, snapp.manifest.entry);
    // const module = await import(entryPath);
    // if (typeof module.default !== 'function') {
    //   throw new Error('SnApp must export default factory function');
    // }
  }
}
