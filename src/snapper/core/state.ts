/**
 * SnApper Core - State Service
 * 
 * SnApp state persistence with filesystem storage, TTL support,
 * encryption hooks, and change event synchronization.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { EventEmitter } from 'events';

/** Options for persisting state */
export interface PersistOptions {
  /** Encrypt the stored data */
  encrypted?: boolean;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Sync across multiple windows */
  sync?: boolean;
  /** Custom namespace override */
  namespace?: string;
}

/** State entry metadata */
export interface StateEntry<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  encrypted: boolean;
  version: number;
}

/** State change event */
export interface StateSyncEvent {
  namespace: string;
  key: string;
  snappId: string;
}

/** Handler for state changes */
export type StateChangeHandler = (event: StateSyncEvent) => void;

/** State statistics */
export interface StateStats {
  totalEntries: number;
  totalSize: number;
  expiredEntries: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/** Basic state service interface */
export interface StateService {
  persist<T>(snappId: string, key: string, value: T, options?: PersistOptions): Promise<void>;
  restore<T>(snappId: string, key: string, defaultValue?: T): Promise<T | undefined>;
  remove(snappId: string, key: string): Promise<void>;
  listKeys(snappId: string): Promise<string[]>;
  clear(snappId: string): Promise<void>;
}

/** Enhanced state service with advanced features */
export interface EnhancedStateService extends StateService {
  restore<T>(snappId: string, key: string, defaultValue?: T, namespace?: string): Promise<T | undefined>;
  remove(snappId: string, key: string, namespace?: string): Promise<void>;
  listKeys(snappId: string, namespace?: string): Promise<string[]>;
  clear(snappId: string, namespace?: string): Promise<void>;
  clearExpired(snappId: string, namespace?: string): Promise<number>;
  onChange(handler: StateChangeHandler): () => void;
  getStats(snappId: string, namespace?: string): Promise<StateStats>;
}

/** Encryption function type */
export type EncryptFn = (data: string) => Promise<string> | string;

/** Decryption function type */
export type DecryptFn = (data: string) => Promise<string> | string;

/**
 * File-based state persistence with advanced features.
 * Extends EventEmitter for internal event handling.
 */
export class FileStateService extends EventEmitter implements EnhancedStateService {
  private basePath: string;
  private memory: Map<string, Map<string, StateEntry>> = new Map();
  private encryptFn?: EncryptFn;
  private decryptFn?: DecryptFn;
  private changeHandlers: Set<StateChangeHandler> = new Set();
  private readonly CURRENT_VERSION = 1;

  /**
   * Create a new FileStateService.
   * @param basePath - Base directory for state storage
   * @param crypto - Optional encryption/decryption functions
   */
  constructor(
    basePath?: string,
    crypto?: { encrypt: EncryptFn; decrypt: DecryptFn }
  ) {
    super();
    this.basePath = basePath ?? join(homedir(), '.openclaw', 'snapper-state');
    
    if (crypto) {
      this.encryptFn = crypto.encrypt;
      this.decryptFn = crypto.decrypt;
    }
  }

  /**
   * Persist a value with optional TTL and encryption.
   * @param snappId - SnApp ID
   * @param key - Storage key
   * @param value - Value to store
   * @param options - Persistence options
   */
  async persist<T>(
    snappId: string,
    key: string,
    value: T,
    options: PersistOptions = {}
  ): Promise<void> {
    const namespace = options.namespace ?? snappId;
    const fullKey = this.getFullKey(namespace, key);
    const now = Date.now();
    
    const entry: StateEntry<T> = {
      value,
      createdAt: now,
      expiresAt: options.ttl ? now + options.ttl : undefined,
      encrypted: options.encrypted ?? false,
      version: this.CURRENT_VERSION
    };

    // Store in memory
    if (!this.memory.has(namespace)) {
      this.memory.set(namespace, new Map());
    }
    this.memory.get(namespace)!.set(key, entry);

    // Persist to disk
    await this.persistToDisk(fullKey, entry);

    // Emit sync event if requested
    if (options.sync) {
      this.emitChange({ namespace, key, snappId });
    }
  }

  /**
   * Restore a value, checking expiration.
   * @param snappId - SnApp ID
   * @param key - Storage key
   * @param defaultValue - Default value if not found
   * @param namespace - Optional namespace override
   * @returns Stored value or default
   */
  async restore<T>(
    snappId: string,
    key: string,
    defaultValue?: T,
    namespace?: string
  ): Promise<T | undefined> {
    const ns = namespace ?? snappId;
    
    // Check memory first
    const memEntry = this.memory.get(ns)?.get(key);
    if (memEntry) {
      if (this.isExpired(memEntry)) {
        await this.remove(snappId, key, ns);
        return defaultValue;
      }
      return memEntry.value as T;
    }

    // Load from disk
    const fullKey = this.getFullKey(ns, key);
    const entry = await this.loadFromDisk<T>(fullKey);
    
    if (!entry) {
      return defaultValue;
    }

    if (this.isExpired(entry)) {
      await this.remove(snappId, key, ns);
      return defaultValue;
    }

    // Cache in memory
    if (!this.memory.has(ns)) {
      this.memory.set(ns, new Map());
    }
    this.memory.get(ns)!.set(key, entry);

    return entry.value;
  }

  /**
   * Remove a key.
   * @param snappId - SnApp ID
   * @param key - Storage key
   * @param namespace - Optional namespace override
   */
  async remove(snappId: string, key: string, namespace?: string): Promise<void> {
    const ns = namespace ?? snappId;
    
    // Remove from memory
    this.memory.get(ns)?.delete(key);
    
    // Remove from disk
    const fullKey = this.getFullKey(ns, key);
    const filePath = this.getFilePath(fullKey);
    const encPath = filePath.replace('.json', '.enc');
    
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore if doesn't exist
    }
    
    try {
      await fs.unlink(encPath);
    } catch {
      // Ignore if doesn't exist
    }
  }

  /**
   * List all keys in a namespace.
   * @param snappId - SnApp ID
   * @param namespace - Optional namespace override
   * @returns Array of keys
   */
  async listKeys(snappId: string, namespace?: string): Promise<string[]> {
    const ns = namespace ?? snappId;
    const nsPath = join(this.basePath, this.sanitizePath(ns));
    
    try {
      const entries = await fs.readdir(nsPath);
      const keys: string[] = [];
      
      for (const entry of entries) {
        if (entry.endsWith('.json') || entry.endsWith('.enc')) {
          // Remove extension
          const key = entry.replace(/\.(json|enc)$/, '');
          
          // Check if expired
          const fullKey = this.getFullKey(ns, key);
          const stateEntry = await this.loadFromDisk(fullKey);
          
          if (stateEntry && !this.isExpired(stateEntry)) {
            keys.push(key);
          }
        }
      }
      
      return keys;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear all entries in a namespace.
   * @param snappId - SnApp ID
   * @param namespace - Optional namespace override
   */
  async clear(snappId: string, namespace?: string): Promise<void> {
    const ns = namespace ?? snappId;
    
    // Clear memory
    this.memory.delete(ns);
    
    // Clear disk
    const nsPath = join(this.basePath, this.sanitizePath(ns));
    try {
      await fs.rm(nsPath, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
  }

  /**
   * Clear expired entries and return count removed.
   * @param snappId - SnApp ID
   * @param namespace - Optional namespace override
   * @returns Number of entries removed
   */
  async clearExpired(snappId: string, namespace?: string): Promise<number> {
    const ns = namespace ?? snappId;
    // Get ALL keys including expired (direct disk read)
    const nsPath = join(this.basePath, this.sanitizePath(ns));
    let removed = 0;
    
    try {
      const entries = await fs.readdir(nsPath);
      
      for (const entry of entries) {
        if (entry.endsWith('.json') || entry.endsWith('.enc')) {
          const key = entry.replace(/\.(json|enc)$/, '');
          const fullKey = this.getFullKey(ns, key);
          const stateEntry = await this.loadFromDisk(fullKey);
          
          if (stateEntry && this.isExpired(stateEntry)) {
            await this.remove(snappId, key, ns);
            removed++;
          }
        }
      }
    } catch {
      // Directory may not exist
    }
    
    return removed;
  }

  /**
   * Subscribe to state changes.
   * @param handler - Change handler function
   * @returns Unsubscribe function
   */
  onChange(handler: StateChangeHandler): () => void {
    this.changeHandlers.add(handler);
    return () => this.changeHandlers.delete(handler);
  }

  /**
   * Get statistics for a namespace.
   * @param snappId - SnApp ID
   * @param namespace - Optional namespace override
   * @returns Statistics object
   */
  async getStats(snappId: string, namespace?: string): Promise<StateStats> {
    const ns = namespace ?? snappId;
    const keys = await this.listKeys(snappId, ns);
    
    let totalSize = 0;
    let expiredCount = 0;
    let oldest: number | null = null;
    let newest: number | null = null;
    
    for (const key of keys) {
      const fullKey = this.getFullKey(ns, key);
      const entry = await this.loadFromDisk(fullKey);
      
      if (entry) {
        const filePath = this.getFilePath(fullKey);
        try {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        } catch {
          // Try encrypted path
          try {
            const encStats = await fs.stat(filePath.replace('.json', '.enc'));
            totalSize += encStats.size;
          } catch {
            // Ignore
          }
        }
        
        if (this.isExpired(entry)) {
          expiredCount++;
        }
        
        if (oldest === null || entry.createdAt < oldest) {
          oldest = entry.createdAt;
        }
        if (newest === null || entry.createdAt > newest) {
          newest = entry.createdAt;
        }
      }
    }
    
    return {
      totalEntries: keys.length,
      totalSize,
      expiredEntries: expiredCount,
      oldestEntry: oldest ? new Date(oldest) : null,
      newestEntry: newest ? new Date(newest) : null
    };
  }

  // ==================== PRIVATE METHODS ====================

  private getFullKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private getFilePath(fullKey: string): string {
    const [namespace, ...keyParts] = fullKey.split(':');
    const key = keyParts.join(':'); // Handle keys with colons
    const safeKey = this.sanitizePath(key);
    return join(this.basePath, this.sanitizePath(namespace), `${safeKey}.json`);
  }

  private sanitizePath(input: string): string {
    // Replace filesystem-unsafe characters
    return input.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private isExpired(entry: StateEntry): boolean {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }

  private async persistToDisk(fullKey: string, entry: StateEntry): Promise<void> {
    const filePath = this.getFilePath(fullKey);
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    
    await fs.mkdir(dir, { recursive: true });
    
    let data = JSON.stringify(entry, null, 2);
    
    // Encrypt if requested and encryption is available
    if (entry.encrypted && this.encryptFn) {
      data = await Promise.resolve(this.encryptFn(data));
      // Change extension for encrypted files
      const encPath = filePath.replace('.json', '.enc');
      await fs.writeFile(encPath, data, { mode: 0o600 });
      return;
    }
    
    await fs.writeFile(filePath, data, { mode: 0o600 });
  }

  private async loadFromDisk<T>(fullKey: string): Promise<StateEntry<T> | null> {
    const filePath = this.getFilePath(fullKey);
    const encPath = filePath.replace('.json', '.enc');
    
    // Try encrypted first
    let content: string;
    let isEncrypted = false;
    
    try {
      content = await fs.readFile(encPath, 'utf-8');
      isEncrypted = true;
    } catch {
      // Try unencrypted
      try {
        content = await fs.readFile(filePath, 'utf-8');
      } catch {
        return null;
      }
    }
    
    // Decrypt if needed
    if (isEncrypted && this.decryptFn) {
      content = await Promise.resolve(this.decryptFn(content));
    }
    
    try {
      const parsed: StateEntry<T> = JSON.parse(content);
      
      // Version migration could happen here
      if (parsed.version !== this.CURRENT_VERSION) {
        console.warn(`State entry version mismatch: ${parsed.version} vs ${this.CURRENT_VERSION}`);
      }
      
      return parsed;
    } catch {
      return null;
    }
  }

  private emitChange(event: StateSyncEvent): void {
    this.changeHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (e) {
        // Ignore handler errors
      }
    });
    
    // Also emit via EventEmitter for internal use
    this.emit('change', event);
  }
}
