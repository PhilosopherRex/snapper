/**
 * SnApper Core - SnApp Registry
 * 
 * The SnAppRegistry discovers, validates, and manages SnApp manifests.
 * It maintains a catalog of available SnApps but does not handle lifecycle
 * (that's the job of SnAppLifecycle in phase 1.2).
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { 
  SnApp, 
  SnAppManifest, 
  RegistryOptions,
  DiscoveryResult 
} from '../types';

/**
 * Manages discovery and registration of SnApps.
 */
export class SnAppRegistry {
  private snapps: Map<string, SnApp> = new Map();
  private builtinPath: string;
  private additionalPaths: string[];

  /**
   * Create a new SnAppRegistry.
   * @param options - Configuration options
   */
  constructor(options: RegistryOptions = {}) {
    this.builtinPath = options.builtinPath ?? './snapps';
    this.additionalPaths = options.additionalPaths ?? [];
  }

  /**
   * Discover all available SnApps from configured paths.
   * @returns Promise resolving to discovery results
   */
  async discover(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      manifests: [],
      errors: []
    };

    // Scan built-in path
    const builtinResult = await this.scanDirectory(this.builtinPath);
    result.manifests.push(...builtinResult.manifests);
    result.errors.push(...builtinResult.errors);

    // Scan additional paths
    for (const path of this.additionalPaths) {
      const pathResult = await this.scanDirectory(path);
      result.manifests.push(...pathResult.manifests);
      result.errors.push(...pathResult.errors);
    }

    return result;
  }

  /**
   * Register a discovered SnApp manifest.
   * @param manifest - The SnApp manifest to register
   * @returns The registered SnApp entry
   * @throws If SnApp ID is invalid or already registered
   */
  register(manifest: SnAppManifest): SnApp {
    // Check for duplicate
    if (this.snapps.has(manifest.id)) {
      throw new Error(`SnApp "${manifest.id}" is already registered`);
    }

    // Validate manifest
    this.validateManifest(manifest);

    const now = new Date();
    const snapp: SnApp = {
      manifest,
      state: 'registered',
      registeredAt: now,
      stateChangedAt: now
    };

    this.snapps.set(manifest.id, snapp);
    return snapp;
  }

  /**
   * Unregister a SnApp by ID.
   * @param id - The SnApp ID to unregister
   * @returns True if SnApp was found and removed
   */
  unregister(id: string): boolean {
    return this.snapps.delete(id);
  }

  /**
   * Get a registered SnApp by ID.
   * @param id - The SnApp ID
   * @returns The SnApp entry or undefined if not found
   */
  get(id: string): SnApp | undefined {
    return this.snapps.get(id);
  }

  /**
   * Get all registered SnApps.
   * @returns Array of all registered SnApps
   */
  getAll(): SnApp[] {
    return Array.from(this.snapps.values());
  }

  /**
   * Check if a SnApp is registered.
   * @param id - The SnApp ID to check
   * @returns True if registered
   */
  has(id: string): boolean {
    return this.snapps.has(id);
  }

  /**
   * Get count of registered SnApps.
   * @returns Number of registered SnApps
   */
  count(): number {
    return this.snapps.size;
  }

  /**
   * Clear all registered SnApps.
   */
  clear(): void {
    this.snapps.clear();
  }

  /**
   * Scan a directory for SnApp manifests.
   * @param dirPath - Directory to scan
   * @returns Discovery result with manifests and errors
   */
  private async scanDirectory(dirPath: string): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      manifests: [],
      errors: []
    };

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const snappPath = join(dirPath, entry.name);
          const manifestPath = join(snappPath, 'snap.json');

          try {
            const manifest = await this.loadManifest(manifestPath);
            result.manifests.push(manifest);
          } catch (error) {
            // Only log errors for directories that look like SnApps
            // (have a snap.json file that failed to parse)
            if (await this.fileExists(manifestPath)) {
              result.errors.push({
                path: snappPath,
                error: error instanceof Error ? error : new Error(String(error))
              });
            }
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - not an error, just empty
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        result.errors.push({
          path: dirPath,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }

    return result;
  }

  /**
   * Load and parse a manifest file.
   * @param manifestPath - Path to snap.json
   * @returns Parsed manifest
   */
  private async loadManifest(manifestPath: string): Promise<SnAppManifest> {
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as SnAppManifest;
    return manifest;
  }

  /**
   * Validate a SnApp manifest.
   * @param manifest - Manifest to validate
   * @throws Error if validation fails
   */
  private validateManifest(manifest: SnAppManifest): void {
    // Required fields
    if (!manifest.id) {
      throw new Error('Missing required field: id');
    }
    if (!manifest.name) {
      throw new Error('Missing required field: name');
    }
    if (!manifest.entry) {
      throw new Error('Missing required field: entry');
    }
    if (!manifest.permissions) {
      throw new Error('Missing required field: permissions');
    }
    if (!manifest.openclaw) {
      throw new Error('Missing required field: openclaw');
    }

    // ID format: kebab-case (lowercase letters, numbers, hyphens)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.id)) {
      throw new Error(
        `Invalid SnApp ID "${manifest.id}": must be kebab-case (lowercase letters, numbers, hyphens only)`
      );
    }

    // Version format: basic SemVer check
    if (manifest.version && !/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error(
        `Invalid version format "${manifest.version}": must be semantic version (e.g., "1.0.0")`
      );
    }

    // Short name: 2-3 characters recommended
    if (manifest.shortName && manifest.shortName.length > 5) {
      console.warn(
        `SnApp "${manifest.id}" has long shortName "${manifest.shortName}" (recommend 2-3 chars for tabs)`
      );
    }

    // Permissions must be an array
    if (!Array.isArray(manifest.permissions)) {
      throw new Error('permissions must be an array');
    }

    // Validate permission values
    const validPermissions = new Set([
      'storage:read', 'storage:write', 'storage:delete',
      'session:hook', 'prompt:inject',
      'ui:tab', 'ui:panel', 'ui:modal', 'ui:toast',
      'command:register',
      'tool:register', 'tool:wrap',
      'fs:read', 'fs:write',
      'bus:publish', 'bus:subscribe',
      'system:exec', 'network:request'
    ]);

    for (const perm of manifest.permissions) {
      if (!validPermissions.has(perm)) {
        console.warn(`SnApp "${manifest.id}" has unknown permission: "${perm}"`);
      }
    }

    // OpenClaw version required
    if (!manifest.openclaw.minVersion) {
      throw new Error('openclaw.minVersion is required');
    }
  }

  /**
   * Check if a file exists.
   * @param filePath - Path to check
   * @returns True if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
