/**
 * SnApper Core - TypeScript Type Definitions
 * 
 * This module defines all public types for the SnApper platform.
 */

// =============================================================================
// SnApp Manifest (snap.json)
// =============================================================================

/**
 * SnApp manifest - defines a SnApp's identity, capabilities, and requirements.
 * This is loaded from snap.json in each SnApp's directory.
 */
export interface SnAppManifest {
  /** Unique identifier for the SnApp (kebab-case: "my-snapp") */
  id: string;
  
  /** Display name for the SnApp */
  name: string;
  
  /** Short name for tab labels (2-3 characters) */
  shortName: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Brief description of what the SnApp does */
  description: string;
  
  /** Optional icon path or emoji */
  icon?: string;
  
  /** Author or organization */
  author?: string;
  
  /** Entry point file path (relative to SnApp root) */
  entry: string;
  
  /** Optional configuration schema and defaults */
  config?: {
    /** JSON Schema for configuration validation */
    schema: object;
    /** Default configuration values */
    defaults?: Record<string, unknown>;
  };
  
  /** Required permissions for this SnApp */
  permissions: SnAppPermission[];
  
  /** OpenClaw integration requirements */
  openclaw: {
    /** Minimum OpenClaw version required */
    minVersion: string;
    /** Lifecycle hooks this SnApp wants to subscribe to */
    hooks?: HookName[];
  };
}

/** Valid permission strings for SnApps */
export type SnAppPermission =
  // Storage permissions
  | 'storage:read' | 'storage:write' | 'storage:delete'
  // Session lifecycle
  | 'session:hook' | 'prompt:inject'
  // UI capabilities
  | 'ui:tab' | 'ui:panel' | 'ui:modal' | 'ui:toast'
  // Command registration
  | 'command:register'
  // Tool integration
  | 'tool:register' | 'tool:wrap'
  // File system (sandboxed)
  | 'fs:read' | 'fs:write'
  // Message bus
  | 'bus:publish' | 'bus:subscribe'
  // System/network (restricted)
  | 'system:exec' | 'network:request';

/** Available lifecycle hook names */
export type HookName = 
  | 'session_start'      // New session begins
  | 'session_end'        // Session ends
  | 'before_agent'       // Before agent processes prompt
  | 'after_agent'        // After agent responds
  | 'before_tool'        // Before tool execution
  | 'after_tool'         // After tool execution
  | 'tool_error';        // Tool execution error

// =============================================================================
// SnApp State
// =============================================================================

/** Lifecycle states for a SnApp instance */
export type SnAppState = 
  | 'registered'   // Discovered and registered, not loaded
  | 'loading'      // Loading in progress
  | 'loaded'       // Code loaded, not yet activated
  | 'activating'   // Activation in progress
  | 'active'       // Running and visible
  | 'suspending'   // Suspension in progress
  | 'suspended'    // Backgrounded (state preserved)
  | 'unloading'    // Cleanup in progress
  | 'error';       // Error state

/** SnApp instance interface - implemented by loaded SnApps */
export interface SnAppInstance {
  /** Called when SnApp is activated (switched to) */
  onActivate?(): Promise<void> | void;
  
  /** Called when SnApp is suspended (switched away from) */
  onSuspend?(): Promise<void> | void;
  
  /** Called when SnApp is destroyed (unloaded) */
  onDestroy?(): Promise<void> | void;
  
  /** Allow additional properties */
  [key: string]: unknown;
}

/** SnApp entry in the registry */
export interface SnApp {
  /** The manifest that defines this SnApp */
  manifest: SnAppManifest;
  
  /** Current lifecycle state */
  state: SnAppState;
  
  /** Loaded instance (if state >= 'loaded') */
  instance?: SnAppInstance;
  
  /** Error information (if state === 'error') */
  error?: Error;
  
  /** Timestamp of registration */
  registeredAt: Date;
  
  /** Timestamp of last state change */
  stateChangedAt: Date;
}

// =============================================================================
// API Types
// =============================================================================

/** Context provided to SnApps about the current session */
export interface SnAppContext {
  /** Unique session identifier */
  sessionId: string;
  
  /** Current workorder ID (if in a workorder) */
  workorderId?: string;
  
  /** User information */
  user?: {
    id: string;
    name: string;
  };
  
  /** Active channel information */
  channel?: {
    id: string;
    type: string;
    name: string;
  };
}

/** Message bus event */
export interface BusMessage {
  /** Event type/topic */
  type: string;
  
  /** Event payload */
  payload: unknown;
  
  /** Source SnApp ID */
  source: string;
  
  /** Timestamp */
  timestamp: number;
}

/** Command registration */
export interface SnAppCommand {
  /** Command name (e.g., "/wo") */
  name: string;
  
  /** Brief description */
  description: string;
  
  /** Handler function */
  handler: (args: string[], context: SnAppContext) => Promise<string | void>;
}

// =============================================================================
// Registry Types
// =============================================================================

/** Options for SnAppRegistry */
export interface RegistryOptions {
  /** Path to built-in SnApps directory */
  builtinPath?: string;
  
  /** Additional paths to scan */
  additionalPaths?: string[];
}

/** Result of a discovery scan */
export interface DiscoveryResult {
  /** Successfully discovered manifests */
  manifests: SnAppManifest[];
  
  /** Errors encountered during discovery */
  errors: Array<{ path: string; error: Error }>;
}
