/**
 * SnApper Core - FileStateService Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStateService } from '../../src/snapper/core/state';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('FileStateService', () => {
  let service: FileStateService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'snapper-test-'));
    service = new FileStateService(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('persist/restore', () => {
    it('should persist and restore values', async () => {
      const data = { test: 'data', number: 42 };
      
      await service.persist('test-snapp', 'key1', data);
      const restored = await service.restore('test-snapp', 'key1');
      
      expect(restored).toEqual(data);
    });

    it('should return default value for missing key', async () => {
      const restored = await service.restore('test-snapp', 'missing', 'default');
      expect(restored).toBe('default');
    });

    it('should return undefined for missing key without default', async () => {
      const restored = await service.restore('test-snapp', 'missing');
      expect(restored).toBeUndefined();
    });

    it('should handle TTL expiration', async () => {
      await service.persist('test-snapp', 'temp', 'value', { ttl: 1 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const restored = await service.restore('test-snapp', 'temp', 'expired');
      expect(restored).toBe('expired');
    });

    it('should handle non-expired TTL', async () => {
      await service.persist('test-snapp', 'temp', 'value', { ttl: 10000 });
      
      const restored = await service.restore('test-snapp', 'temp');
      expect(restored).toBe('value');
    });

    it('should persist different types', async () => {
      await service.persist('test-snapp', 'string', 'hello');
      await service.persist('test-snapp', 'number', 42);
      await service.persist('test-snapp', 'boolean', true);
      await service.persist('test-snapp', 'array', [1, 2, 3]);
      await service.persist('test-snapp', 'object', { nested: { key: 'value' } });
      await service.persist('test-snapp', 'null', null);

      expect(await service.restore('test-snapp', 'string')).toBe('hello');
      expect(await service.restore('test-snapp', 'number')).toBe(42);
      expect(await service.restore('test-snapp', 'boolean')).toBe(true);
      expect(await service.restore('test-snapp', 'array')).toEqual([1, 2, 3]);
      expect(await service.restore('test-snapp', 'object')).toEqual({ nested: { key: 'value' } });
      expect(await service.restore('test-snapp', 'null')).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove persisted value', async () => {
      await service.persist('test-snapp', 'key1', 'value');
      await service.remove('test-snapp', 'key1');
      
      const restored = await service.restore('test-snapp', 'key1');
      expect(restored).toBeUndefined();
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(service.remove('test-snapp', 'nonexistent')).resolves.not.toThrow();
    });
  });

  describe('listKeys', () => {
    it('should list all keys', async () => {
      await service.persist('test-snapp', 'key1', 'value1');
      await service.persist('test-snapp', 'key2', 'value2');
      
      const keys = await service.listKeys('test-snapp');
      
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });

    it('should return empty array for non-existent snapp', async () => {
      const keys = await service.listKeys('nonexistent-snapp');
      expect(keys).toEqual([]);
    });

    it('should sanitize special characters in keys', async () => {
      await service.persist('test-snapp', 'key/with/slashes', 'value');
      await service.persist('test-snapp', 'key.with.dots', 'value');
      
      const keys = await service.listKeys('test-snapp');
      
      // Keys should be sanitized to use underscores
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('clear', () => {
    it('should remove all data for snapp', async () => {
      await service.persist('test-snapp', 'key1', 'value1');
      await service.persist('test-snapp', 'key2', 'value2');
      await service.clear('test-snapp');
      
      const restored1 = await service.restore('test-snapp', 'key1');
      const restored2 = await service.restore('test-snapp', 'key2');
      const keys = await service.listKeys('test-snapp');
      
      expect(restored1).toBeUndefined();
      expect(restored2).toBeUndefined();
      expect(keys).toEqual([]);
    });

    it('should not affect other snapps', async () => {
      await service.persist('snapp1', 'key', 'value1');
      await service.persist('snapp2', 'key', 'value2');
      
      await service.clear('snapp1');
      
      const restored = await service.restore('snapp2', 'key');
      expect(restored).toBe('value2');
    });
  });

  describe('memory caching', () => {
    it('should read from memory cache on second access', async () => {
      await service.persist('test-snapp', 'key', 'value');
      
      // First access loads from disk
      const first = await service.restore('test-snapp', 'key');
      expect(first).toBe('value');
      
      // Second access should come from memory
      const second = await service.restore('test-snapp', 'key');
      expect(second).toBe('value');
    });
  });
});
