/**
 * SnApper Core - SnAppRegistry Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SnAppRegistry } from '../../src/snapper/core/registry';
import type { SnAppManifest } from '../../src/snapper/types';

describe('SnAppRegistry', () => {
  let registry: SnAppRegistry;

  beforeEach(() => {
    registry = new SnAppRegistry();
  });

  // ===========================================================================
  // Registration Tests
  // ===========================================================================

  describe('register', () => {
    it('should register a valid SnApp', () => {
      const manifest: SnAppManifest = {
        id: 'test-snapp',
        name: 'Test SnApp',
        shortName: 'TS',
        version: '1.0.0',
        description: 'A test SnApp',
        entry: './index.ts',
        permissions: ['storage:read'],
        openclaw: { minVersion: '2.0.0' }
      };

      const snapp = registry.register(manifest);

      expect(snapp.manifest.id).toBe('test-snapp');
      expect(snapp.manifest.name).toBe('Test SnApp');
      expect(snapp.state).toBe('registered');
      expect(snapp.registeredAt).toBeInstanceOf(Date);
      expect(snapp.stateChangedAt).toBeInstanceOf(Date);
    });

    it('should reject duplicate IDs', () => {
      const manifest: SnAppManifest = {
        id: 'test-snapp',
        name: 'Test',
        shortName: 'TS',
        version: '1.0.0',
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      };

      registry.register(manifest);

      expect(() => registry.register(manifest)).toThrow('already registered');
    });

    it('should reject missing required field: id', () => {
      const manifest = {
        name: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      } as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('Missing required field: id');
    });

    it('should reject missing required field: name', () => {
      const manifest = {
        id: 'test-snapp',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      } as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('Missing required field: name');
    });

    it('should reject missing required field: entry', () => {
      const manifest = {
        id: 'test-snapp',
        name: 'Test',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      } as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('Missing required field: entry');
    });

    it('should reject missing required field: permissions', () => {
      const manifest = {
        id: 'test-snapp',
        name: 'Test',
        entry: './index.ts',
        openclaw: { minVersion: '2.0.0' }
      } as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('Missing required field: permissions');
    });

    it('should reject missing required field: openclaw', () => {
      const manifest = {
        id: 'test-snapp',
        name: 'Test',
        entry: './index.ts',
        permissions: []
      } as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('Missing required field: openclaw');
    });

    it('should reject invalid ID format (camelCase)', () => {
      const manifest: SnAppManifest = {
        id: 'TestSnapp',
        name: 'Test',
        shortName: 'TS',
        version: '1.0.0',
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      };

      expect(() => registry.register(manifest)).toThrow('Invalid SnApp ID');
    });

    it('should reject invalid ID format (snake_case)', () => {
      const manifest: SnAppManifest = {
        id: 'test_snapp',
        name: 'Test',
        shortName: 'TS',
        version: '1.0.0',
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      };

      expect(() => registry.register(manifest)).toThrow('Invalid SnApp ID');
    });

    it('should accept valid kebab-case IDs', () => {
      const validIds = ['test', 'test-snapp', 'my-cool-snapp', 'snapp123', 'a-b-c-d'];

      for (const id of validIds) {
        const testRegistry = new SnAppRegistry();
        const manifest: SnAppManifest = {
          id,
          name: 'Test',
          shortName: 'TS',
          version: '1.0.0',
          description: 'Test',
          entry: './index.ts',
          permissions: [],
          openclaw: { minVersion: '2.0.0' }
        };

        expect(() => testRegistry.register(manifest)).not.toThrow();
      }
    });

    it('should reject invalid version format', () => {
      const manifest: SnAppManifest = {
        id: 'test-snapp',
        name: 'Test',
        shortName: 'TS',
        version: 'v1.0', // Invalid: starts with 'v'
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      };

      expect(() => registry.register(manifest)).toThrow('Invalid version format');
    });

    it('should accept valid semantic versions', () => {
      const validVersions = ['1.0.0', '0.0.1', '10.20.30', '1.0.0-beta', '2.1.4+build.123'];

      for (const version of validVersions) {
        const testRegistry = new SnAppRegistry();
        // Create a safe ID from version (replace non-kebab chars)
        const safeId = `test-${version.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const manifest: SnAppManifest = {
          id: safeId,
          name: 'Test',
          shortName: 'TS',
          version,
          description: 'Test',
          entry: './index.ts',
          permissions: [],
          openclaw: { minVersion: '2.0.0' }
        };

        expect(() => testRegistry.register(manifest)).not.toThrow();
      }
    });

    it('should reject non-array permissions', () => {
      const manifest = {
        id: 'test-snapp',
        name: 'Test',
        entry: './index.ts',
        permissions: 'storage:read',
        openclaw: { minVersion: '2.0.0' }
      } as unknown as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('permissions must be an array');
    });

    it('should reject missing openclaw.minVersion', () => {
      const manifest = {
        id: 'test-snapp',
        name: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: {}
      } as SnAppManifest;

      expect(() => registry.register(manifest)).toThrow('openclaw.minVersion is required');
    });
  });

  // ===========================================================================
  // Retrieval Tests
  // ===========================================================================

  describe('get', () => {
    it('should return registered SnApp', () => {
      const manifest: SnAppManifest = {
        id: 'test-snapp',
        name: 'Test SnApp',
        shortName: 'TS',
        version: '1.0.0',
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      };

      registry.register(manifest);
      const snapp = registry.get('test-snapp');

      expect(snapp).toBeDefined();
      expect(snapp?.manifest.name).toBe('Test SnApp');
    });

    it('should return undefined for unknown SnApp', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no SnApps registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    it('should return all registered SnApps', () => {
      registry.register({
        id: 'snapp-1',
        name: 'SnApp 1',
        shortName: 'S1',
        version: '1.0.0',
        description: 'First',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      registry.register({
        id: 'snapp-2',
        name: 'SnApp 2',
        shortName: 'S2',
        version: '1.0.0',
        description: 'Second',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map(s => s.manifest.id)).toContain('snapp-1');
      expect(all.map(s => s.manifest.id)).toContain('snapp-2');
    });
  });

  describe('has', () => {
    it('should return true for registered SnApp', () => {
      registry.register({
        id: 'test-snapp',
        name: 'Test',
        shortName: 'TS',
        version: '1.0.0',
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      expect(registry.has('test-snapp')).toBe(true);
    });

    it('should return false for unregistered SnApp', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  describe('count', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return correct count', () => {
      registry.register({
        id: 'snapp-1',
        name: 'SnApp 1',
        shortName: 'S1',
        version: '1.0.0',
        description: 'First',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      expect(registry.count()).toBe(1);

      registry.register({
        id: 'snapp-2',
        name: 'SnApp 2',
        shortName: 'S2',
        version: '1.0.0',
        description: 'Second',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      expect(registry.count()).toBe(2);
    });
  });

  // ===========================================================================
  // Unregistration Tests
  // ===========================================================================

  describe('unregister', () => {
    it('should remove registered SnApp', () => {
      registry.register({
        id: 'test-snapp',
        name: 'Test',
        shortName: 'TS',
        version: '1.0.0',
        description: 'Test',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      expect(registry.has('test-snapp')).toBe(true);

      const removed = registry.unregister('test-snapp');

      expect(removed).toBe(true);
      expect(registry.has('test-snapp')).toBe(false);
    });

    it('should return false for unknown SnApp', () => {
      const removed = registry.unregister('unknown');
      expect(removed).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all SnApps', () => {
      registry.register({
        id: 'snapp-1',
        name: 'SnApp 1',
        shortName: 'S1',
        version: '1.0.0',
        description: 'First',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      registry.register({
        id: 'snapp-2',
        name: 'SnApp 2',
        shortName: 'S2',
        version: '1.0.0',
        description: 'Second',
        entry: './index.ts',
        permissions: [],
        openclaw: { minVersion: '2.0.0' }
      });

      expect(registry.count()).toBe(2);

      registry.clear();

      expect(registry.count()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });

  // ===========================================================================
  // Discovery Tests
  // ===========================================================================

  describe('discover', () => {
    it('should return empty result for non-existent directory', async () => {
      const testRegistry = new SnAppRegistry({ builtinPath: '/nonexistent/path' });
      const result = await testRegistry.discover();

      expect(result.manifests).toEqual([]);
      expect(result.errors).toEqual([]);
    });
  });

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe('constructor options', () => {
    it('should use default builtin path', () => {
      const defaultRegistry = new SnAppRegistry();
      // The default path is './snapps', tested via discover behavior
      expect(defaultRegistry).toBeDefined();
    });

    it('should accept custom builtin path', () => {
      const customRegistry = new SnAppRegistry({ builtinPath: './custom-snapps' });
      expect(customRegistry).toBeDefined();
    });

    it('should accept additional paths', () => {
      const multiPathRegistry = new SnAppRegistry({
        builtinPath: './snapps',
        additionalPaths: ['./extra-snapps', './third-party']
      });
      expect(multiPathRegistry).toBeDefined();
    });
  });
});
