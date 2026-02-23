/**
 * SnApper Core - SnApp API Implementation
 * 
 * The main API surface exposed to SnApp developers. This is the interface
 * through which SnApps interact with SnApper Core and OpenClaw.
 */

import type { 
  SnAppManifest, 
  SnAppState,
  SnAppPermission,
  PersistOptions,
  TabDefinition,
  TabEvent,
  PanelDefinition,
  ToastOptions,
  CommandDefinition,
  CommandArgs,
  CommandResult,
  CommandContext,
  HookMap,
  HookOptions
} from '../types';
import type { StateService } from './state';
import type { HookService } from './hooks';
import type { MessageBus } from './bus';

/** Logger interface for SnApps */
export interface SnAppLogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  child(prefix: string): SnAppLogger;
}

/** Main SnApp API interface */
export interface SnAppApi {
  // Identity
  readonly id: string;
  readonly manifest: SnAppManifest;
  readonly state: SnAppState;
  getVersion(): { version: string; apiVersion: string };
  
  // State
  persist<T>(key: string, value: T, options?: PersistOptions): Promise<void>;
  restore<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  remove(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
  clear(): Promise<void>;
  
  // Tabs
  registerTab(tab: TabDefinition): string;
  unregisterTab(tabId: string): void;
  updateTab(tabId: string, updates: Partial<TabDefinition>): void;
  activateTab(tabId: string): void;
  getTabs(): TabDefinition[];
  onTabEvent(callback: (event: TabEvent) => void): () => void;
  
  // Panels
  registerPanel(panel: PanelDefinition): string;
  updatePanel(panelId: string, updates: Partial<PanelDefinition>): void;
  togglePanel(panelId: string, expanded?: boolean): void;
  showToast(options: ToastOptions): void;
  
  // Commands
  registerCommand(command: CommandDefinition): void;
  unregisterCommand(name: string): void;
  executeCommand(commandLine: string): Promise<CommandResult>;
  
  // Hooks
  onHook<K extends keyof HookMap>(
    event: K,
    handler: HookMap[K],
    options?: HookOptions
  ): () => void;
  onceHook<K extends keyof HookMap>(event: K, handler: HookMap[K]): void;
  
  // Context
  injectPromptContext(text: string, priority?: number): void;
  getWorkingDirectory(): string;
  
  // Messaging
  publish<T>(channel: string, message: T): void;
  subscribe<T>(channel: string, handler: (message: T, sender: string) => void): () => void;
  
  // Permissions
  hasPermission(permission: SnAppPermission): boolean;
  
  // Logger
  readonly logger: SnAppLogger;
  
  // Cleanup
  dispose(): Promise<void>;
}

/** Options for creating SnAppApi */
export interface SnAppApiOptions {
  snappId: string;
  manifest: SnAppManifest;
  state: SnAppState;
  permissions: SnAppPermission[];
  stateService: StateService;
  hookService: HookService;
  messageBus: MessageBus;
  workingDirectory: string;
}

/** Logger implementation */
class Logger implements SnAppLogger {
  constructor(
    private prefix: string,
    private snappId: string
  ) {}

  debug(message: string, ...args: unknown[]): void {
    console.debug(`[${this.prefix}:${this.snappId}] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[${this.prefix}:${this.snappId}] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[${this.prefix}:${this.snappId}] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[${this.prefix}:${this.snappId}] ${message}`, ...args);
  }

  child(prefix: string): SnAppLogger {
    return new Logger(`${this.prefix}:${prefix}`, this.snappId);
  }
}

/** SnApp API implementation */
export class SnAppApiImpl implements SnAppApi {
  readonly id: string;
  readonly manifest: SnAppManifest;
  state: SnAppState;
  readonly logger: SnAppLogger;
  
  private permissions: Set<SnAppPermission>;
  private stateService: StateService;
  private hookService: HookService;
  private messageBus: MessageBus;
  private workingDirectory: string;
  
  // Tab/Panel tracking
  private tabs: Map<string, TabDefinition> = new Map();
  private panels: Map<string, PanelDefinition> = new Map();
  private tabEventCallbacks: Set<(event: TabEvent) => void> = new Set();
  private tabIdCounter = 0;
  private panelIdCounter = 0;
  
  // Command tracking
  private commands: Map<string, CommandDefinition> = new Map();
  
  // Cleanup tracking
  private disposables: Array<() => void> = [];

  constructor(options: SnAppApiOptions) {
    this.id = options.snappId;
    this.manifest = options.manifest;
    this.state = options.state;
    this.permissions = new Set(options.permissions);
    this.stateService = options.stateService;
    this.hookService = options.hookService;
    this.messageBus = options.messageBus;
    this.workingDirectory = options.workingDirectory;
    this.logger = new Logger('SnApp', options.snappId);
  }

  // ==================== IDENTITY ====================

  getVersion(): { version: string; apiVersion: string } {
    return {
      version: this.manifest.version,
      apiVersion: '1.0.0'
    };
  }

  // ==================== STATE ====================

  async persist<T>(key: string, value: T, options?: PersistOptions): Promise<void> {
    this.requirePermission('storage:write');
    await this.stateService.persist(this.id, key, value, options);
  }

  async restore<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    this.requirePermission('storage:read');
    return this.stateService.restore(this.id, key, defaultValue);
  }

  async remove(key: string): Promise<void> {
    this.requirePermission('storage:delete');
    await this.stateService.remove(this.id, key);
  }

  async listKeys(): Promise<string[]> {
    this.requirePermission('storage:read');
    return this.stateService.listKeys(this.id);
  }

  async clear(): Promise<void> {
    this.requirePermission('storage:delete');
    await this.stateService.clear(this.id);
  }

  // ==================== TABS ====================

  registerTab(tab: TabDefinition): string {
    this.requirePermission('ui:tab');
    const tabId = `tab_${this.id}_${++this.tabIdCounter}`;
    this.tabs.set(tabId, { ...tab, id: tabId });
    this.emitTabEvent({ type: 'activated', tabId });
    return tabId;
  }

  unregisterTab(tabId: string): void {
    this.requirePermission('ui:tab');
    this.tabs.delete(tabId);
    this.emitTabEvent({ type: 'closed', tabId });
  }

  updateTab(tabId: string, updates: Partial<TabDefinition>): void {
    this.requirePermission('ui:tab');
    const tab = this.tabs.get(tabId);
    if (tab) {
      this.tabs.set(tabId, { ...tab, ...updates });
      this.emitTabEvent({ type: 'updated', tabId });
    }
  }

  activateTab(tabId: string): void {
    this.requirePermission('ui:tab');
    this.emitTabEvent({ type: 'activated', tabId });
  }

  getTabs(): TabDefinition[] {
    return Array.from(this.tabs.values());
  }

  onTabEvent(callback: (event: TabEvent) => void): () => void {
    this.tabEventCallbacks.add(callback);
    return () => this.tabEventCallbacks.delete(callback);
  }

  private emitTabEvent(event: TabEvent): void {
    this.tabEventCallbacks.forEach(cb => {
      try { cb(event); } catch (e) { /* ignore */ }
    });
  }

  // ==================== PANELS ====================

  registerPanel(panel: PanelDefinition): string {
    this.requirePermission('ui:panel');
    const panelId = `panel_${this.id}_${++this.panelIdCounter}`;
    this.panels.set(panelId, { ...panel, id: panelId });
    return panelId;
  }

  updatePanel(panelId: string, updates: Partial<PanelDefinition>): void {
    this.requirePermission('ui:panel');
    const panel = this.panels.get(panelId);
    if (panel) {
      this.panels.set(panelId, { ...panel, ...updates });
    }
  }

  togglePanel(panelId: string, expanded?: boolean): void {
    this.requirePermission('ui:panel');
    const panel = this.panels.get(panelId);
    if (panel) {
      panel.expanded = expanded ?? !panel.expanded;
    }
  }

  showToast(options: ToastOptions): void {
    this.requirePermission('ui:toast');
    // In real implementation, this would integrate with OpenClaw's toast system
    console.log(`[Toast:${options.type}] ${options.message}`);
  }

  // ==================== COMMANDS ====================

  registerCommand(command: CommandDefinition): void {
    this.requirePermission('command:register');
    const fullName = `${this.id}:${command.name}`;
    this.commands.set(fullName, command);
  }

  unregisterCommand(name: string): void {
    this.requirePermission('command:register');
    const fullName = name.includes(':') ? name : `${this.id}:${name}`;
    this.commands.delete(fullName);
  }

  async executeCommand(commandLine: string): Promise<CommandResult> {
    // Parse command line
    const parts = commandLine.trim().split(/\s+/);
    const name = parts[0];
    const args: CommandArgs = {
      positional: parts.slice(1),
      options: {},
      raw: commandLine,
      flags: new Set()
    };

    const command = this.commands.get(name);
    if (!command) {
      return { success: false, message: `Command not found: ${name}` };
    }

    const context: CommandContext = {
      sessionId: 'test-session',
      reply: (msg) => console.log(msg),
      showProgress: (msg) => ({ 
        update: () => {}, 
        complete: () => {} 
      })
    };

    try {
      const result = await command.handler(args, context);
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: `Command failed: ${(error as Error).message}` 
      };
    }
  }

  // ==================== HOOKS ====================

  onHook<K extends keyof HookMap>(
    event: K,
    handler: HookMap[K],
    options?: HookOptions
  ): () => void {
    this.requirePermission('session:hook');
    return this.hookService.on(event, handler, options);
  }

  onceHook<K extends keyof HookMap>(event: K, handler: HookMap[K]): void {
    this.requirePermission('session:hook');
    this.hookService.once(event, handler);
  }

  // ==================== CONTEXT ====================

  injectPromptContext(text: string, priority: number = 0): void {
    this.requirePermission('prompt:inject');
    // In real implementation, this would add to prompt context
    this.logger.debug('Injecting prompt context:', text);
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  // ==================== MESSAGING ====================

  publish<T>(channel: string, message: T): void {
    this.requirePermission('bus:publish');
    this.messageBus.publish(channel, message, this.id);
  }

  subscribe<T>(
    channel: string,
    handler: (message: T, sender: string) => void
  ): () => void {
    this.requirePermission('bus:subscribe');
    return this.messageBus.subscribe(channel, handler, this.id);
  }

  // ==================== PERMISSIONS ====================

  hasPermission(permission: SnAppPermission): boolean {
    return this.permissions.has(permission);
  }

  private requirePermission(permission: SnAppPermission): void {
    if (!this.hasPermission(permission)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }

  // ==================== CLEANUP ====================

  async dispose(): Promise<void> {
    // Run all disposables
    this.disposables.forEach(dispose => {
      try { dispose(); } catch (e) { /* ignore */ }
    });
    this.disposables = [];

    // Clear tracking
    this.tabs.clear();
    this.panels.clear();
    this.commands.clear();
    this.tabEventCallbacks.clear();

    this.logger.info('API disposed');
  }
}
