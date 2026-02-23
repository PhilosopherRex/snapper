/**
 * SnApper Core - State Service
 * 
 * SnApp state persistence with filesystem storage and TTL support.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface PersistOptions {
  /** Encrypt the stored data */
  encrypted?: boolean;
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Synchronous write (default: false) */
  sync?: boolean;
}

export interface StateService {
  persist<T>(snappId: string, key: string, value: T, options?: PersistOptions): Promise<void>;
  restore<T>(snappId: string, key: string, defaultValue?: T): Promise<T | undefined>;
  remove(snappId: string, key: string): Promise<void>;
  listKeys(snappId: string): Promise<string[]>;
  clear(snappId: string): Promise<void>;
}

interface StateEntry {
  value: unknown;
  expiresAt?: number;
  encrypted: boolean;
}

/**
 * File-based state persistence service.
 */
export class FileStateService implements StateService {
  private basePath: string;
  private memory: Map<string, Map<string, StateEntry>> = new Map();

  /**
   * Create a new FileStateService.
   * @param basePath - Base directory for state storage
   */
  constructor(basePath?: string) {
    this.basePath = basePath ?? join(homedir(), '.openclaw', 'snapper-state');
  }

  /**
   * Get storage directory for a SnApp.
   */
  private getSnappPath(snappId: string): string {
    return join(this.basePath, snappId);
  }

  /**
   * Get file path for a key.
   */
  private getKeyPath(snappId: string, key: string): string {
    // Sanitize key for filesystem
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return join(this.getSnappPath(snappId), `${safeKey}.json`);
  }

  /**
   * Persist a value.
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
    const snappPath = this.getSnappPath(snappId);
    
    // Ensure directory exists
    await fs.mkdir(snappPath, { recursive: true });

    const entry: StateEntry = {
      value,
      expiresAt: options.ttl ? Date.now() + options.ttl : undefined,
      encrypted: options.encrypted ?? false
    };

    // Store in memory for fast access
    if (!this.memory.has(snappId)) {
      this.memory.set(snappId, new Map());
    }
    this.memory.get(snappId)!.set(key, entry);

    // Persist to disk
    const filePath = this.getKeyPath(snappId, key);
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  /**
   * Restore a value.
   * @param snappId - SnApp ID
   * @param key - Storage key
   * @param defaultValue - Default value if key not found
   * @returns Stored value or default
   */
  async restore<T>(snappId: string, key: string, defaultValue?: T): Promise<T | undefined> {
    // Check memory first
    const memEntry = this.memory.get(snappId)?.get(key);
    if (memEntry) {
      if (memEntry.expiresAt && Date.now() > memEntry.expiresAt) {
        await this.remove(snappId, key);
        return defaultValue;
      }
      return memEntry.value as T;
    }

    // Try loading from disk
    try {
      const filePath = this.getKeyPath(snappId, key);
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: StateEntry = JSON.parse(content);

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.remove(snappId, key);
        return defaultValue;
      }

      // Cache in memory
      if (!this.memory.has(snappId)) {
        this.memory.set(snappId, new Map());
      }
      this.memory.get(snappId)!.set(key, entry);

      return entry.value as T;
    } catch (error) {
      // File doesn't exist or is corrupt
      return defaultValue;
    }
  }

  /**
   * Remove a key.
   * @param snappId - SnApp ID
   * @param key - Storage key
   */
  async remove(snappId: string, key: string): Promise<void> {
    // Remove from memory
    this.memory.get(snappId)?.delete(key);

    // Remove from disk
    try {
      const filePath = this.getKeyPath(snappId, key);
      await fs.unlink(filePath);
    } catch (error) {
      // File may not exist, that's ok
    }
  }

  /**
   * List all keys for a SnApp.
   * @param snappId - SnApp ID
   * @returns Array of keys
   */
  async listKeys(snappId: string): Promise<string[]> {
    const snappPath = this.getSnappPath(snappId);
    
    try {
      const entries = await fs.readdir(snappPath);
      return entries
        .filter(f => f.endsWith('.json'))
        .map(f => f.slice(0, -5)); // Remove .json extension
    } catch (error) {
      return [];
    }
  }

  /**
   * Clear all data for a SnApp.
   * @param snappId - SnApp ID
   */
  async clear(snappId: string): Promise<void> {
    // Clear memory
    this.memory.delete(snappId);

    // Clear disk
    const snappPath = this.getSnappPath(snappId);
    try {
      await fs.rm(snappPath, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist
    }
  }
}
