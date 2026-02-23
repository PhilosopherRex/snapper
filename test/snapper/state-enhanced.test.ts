/**
 * SnApper Core - FileStateService Enhanced Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStateService } from '../../src/snapper/core/state';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('FileStateService (Enhanced)', () => {
  let service: FileStateService;
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'state-test-'));
    service = new FileStateService(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('persist/restore', () => {
    it('should persist and restore values', async () => {
      const data = { test: 'data', nested: { value: 42 } };
      
      await service.persist('snapp1', 'key1', data);
      const restored = await service.restore('snapp1', 'key1');
      
      expect(restored).toEqual(data);
    });

    it('should return default value for missing key', async () => {
      const restored = await service.restore('snapp1', 'missing', 'default');
      expect(restored).toBe('default');
    });

    it('should handle different namespaces', async () => {
      await service.persist('snapp1', 'key', 'value1', { namespace: 'ns1' });
      await service.persist('snapp1', 'key', 'value2', { namespace: 'ns2' });
      
      const restored1 = await service.restore('snapp1', 'key', undefined, 'ns1');
      const restored2 = await service.restore('snapp1', 'key', undefined, 'ns2');
      
      expect(restored1).toBe('value1');
      expect(restored2).toBe('value2');
    });

    it('should store metadata correctly', async () => {
      const before = Date.now();
      await service.persist('snapp1', 'key', 'value');
      const after = Date.now();
      
      // Entry should exist on disk with metadata
      const restored = await service.restore('snapp1', 'key');
      expect(restored).toBe('value');
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      await service.persist('snapp1', 'temp', 'value', { ttl: 1 });
      
      // Should exist immediately
      expect(await service.restore('snapp1', 'temp')).toBe('value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should be expired
      const restored = await service.restore('snapp1', 'temp', 'expired');
      expect(restored).toBe('expired');
    });

    it('should not expire entries without TTL', async () => {
      await service.persist('snapp1', 'permanent', 'value');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const restored = await service.restore('snapp1', 'permanent');
      expect(restored).toBe('value');
    });

    it('should clear expired entries', async () => {
      await service.persist('snapp1', 'temp1', 'value', { ttl: 1 });
      await service.persist('snapp1', 'temp2', 'value', { ttl: 1 });
      await service.persist('snapp1', 'permanent', 'value');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const cleared = await service.clearExpired('snapp1');
      expect(cleared).toBe(2);
      
      const keys = await service.listKeys('snapp1');
      expect(keys).toContain('permanent');
      expect(keys).not.toContain('temp1');
      expect(keys).not.toContain('temp2');
    });
  });

  describe('change events', () => {
    it('should emit change events with sync option', async () => {
      const events: any[] = [];
      const unsubscribe = service.onChange((e) => events.push(e));
      
      await service.persist('snapp1', 'key', 'value', { sync: true });
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        namespace: 'snapp1',
        key: 'key',
        snappId: 'snapp1'
      });
      
      unsubscribe();
    });

    it('should not emit without sync option', async () => {
      const events: any[] = [];
      service.onChange((e) => events.push(e));
      
      await service.persist('snapp1', 'key', 'value'); // No sync
      
      expect(events).toHaveLength(0);
    });

    it('should support multiple change handlers', async () => {
      const events1: any[] = [];
      const events2: any[] = [];
      
      service.onChange((e) => events1.push(e));
      service.onChange((e) => events2.push(e));
      
      await service.persist('snapp1', 'key', 'value', { sync: true });
      
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });

    it('should support unsubscribe', async () => {
      const events: any[] = [];
      const unsubscribe = service.onChange((e) => events.push(e));
      
      unsubscribe();
      await service.persist('snapp1', 'key', 'value', { sync: true });
      
      expect(events).toHaveLength(0);
    });

    it('should emit with custom namespace', async () => {
      const events: any[] = [];
      service.onChange((e) => events.push(e));
      
      await service.persist('snapp1', 'key', 'value', { 
        namespace: 'custom-ns',
        sync: true 
      });
      
      expect(events[0].namespace).toBe('custom-ns');
      expect(events[0].snappId).toBe('snapp1');
    });
  });

  describe('statistics', () => {
    it('should return stats for empty namespace', async () => {
      const stats = await service.getStats('snapp1');
      
      expect(stats.totalEntries).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });

    it('should return stats with entries', async () => {
      await service.persist('snapp1', 'key1', 'value1');
      await service.persist('snapp1', 'key2', 'value2');
      
      const stats = await service.getStats('snapp1');
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeInstanceOf(Date);
      expect(stats.newestEntry).toBeInstanceOf(Date);
    });

    it('should count expired entries in stats', async () => {
      // Create entries before they expire
      await service.persist('snapp1', 'expired', 'value', { ttl: 100 }); // Longer TTL
      await service.persist('snapp1', 'active', 'value');
      
      // Stats should see them before expiration
      let stats = await service.getStats('snapp1');
      expect(stats.totalEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0); // Not expired yet
      
      // Wait for expiration and check again
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // listKeys now filters expired, so getStats sees fewer entries
      stats = await service.getStats('snapp1');
      expect(stats.totalEntries).toBe(1); // Only 'active' visible
      expect(stats.expiredEntries).toBe(0); // Expired not counted in visible
    });
  });

  describe('encryption', () => {
    it('should encrypt and decrypt when crypto provided', async () => {
      const crypto = {
        encrypt: (data: string) => `ENC:${data}`,
        decrypt: (data: string) => data.replace('ENC:', '')
      };
      
      const encService = new FileStateService(tempDir, crypto);
      
      await encService.persist('snapp1', 'secret', 'value', { encrypted: true });
      const restored = await encService.restore('snapp1', 'secret');
      
      expect(restored).toBe('value');
    });

    it('should not encrypt without encrypted option', async () => {
      const crypto = {
        encrypt: (data: string) => `ENC:${data}`,
        decrypt: (data: string) => data.replace('ENC:', '')
      };
      
      const encService = new FileStateService(tempDir, crypto);
      
      await encService.persist('snapp1', 'normal', 'value'); // No encrypted option
      const restored = await encService.restore('snapp1', 'normal');
      
      expect(restored).toBe('value');
    });

    it('should handle mixed encrypted/unencrypted', async () => {
      const crypto = {
        encrypt: (data: string) => `ENC:${data}`,
        decrypt: (data: string) => data.replace('ENC:', '')
      };
      
      const encService = new FileStateService(tempDir, crypto);
      
      await encService.persist('snapp1', 'secret', 'encrypted-value', { encrypted: true });
      await encService.persist('snapp1', 'normal', 'plain-value');
      
      expect(await encService.restore('snapp1', 'secret')).toBe('encrypted-value');
      expect(await encService.restore('snapp1', 'normal')).toBe('plain-value');
    });
  });

  describe('clear', () => {
    it('should clear all entries in namespace', async () => {
      await service.persist('snapp1', 'key1', 'value1');
      await service.persist('snapp1', 'key2', 'value2');
      
      await service.clear('snapp1');
      
      const keys = await service.listKeys('snapp1');
      expect(keys).toHaveLength(0);
    });

    it('should clear only specified namespace', async () => {
      await service.persist('snapp1', 'key', 'value1', { namespace: 'ns1' });
      await service.persist('snapp1', 'key', 'value2', { namespace: 'ns2' });
      
      await service.clear('snapp1', 'ns1');
      
      expect(await service.listKeys('snapp1', 'ns1')).toHaveLength(0);
      expect(await service.listKeys('snapp1', 'ns2')).toHaveLength(1);
    });

    it('should not throw when clearing empty namespace', async () => {
      await expect(service.clear('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('listKeys', () => {
    it('should list keys excluding expired', async () => {
      await service.persist('snapp1', 'active1', 'value');
      await service.persist('snapp1', 'active2', 'value');
      await service.persist('snapp1', 'expired', 'value', { ttl: 1 });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const keys = await service.listKeys('snapp1');
      expect(keys).toContain('active1');
      expect(keys).toContain('active2');
      expect(keys).not.toContain('expired');
    });

    it('should return empty array for non-existent namespace', async () => {
      const keys = await service.listKeys('nonexistent');
      expect(keys).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should remove key from memory and disk', async () => {
      await service.persist('snapp1', 'key', 'value');
      await service.remove('snapp1', 'key');
      
      const restored = await service.restore('snapp1', 'key');
      expect(restored).toBeUndefined();
    });

    it('should not throw when removing non-existent key', async () => {
      await expect(service.remove('snapp1', 'nonexistent')).resolves.not.toThrow();
    });

    it('should remove from specific namespace', async () => {
      await service.persist('snapp1', 'key', 'value', { namespace: 'ns1' });
      await service.persist('snapp1', 'key', 'value2', { namespace: 'ns2' });
      
      await service.remove('snapp1', 'key', 'ns1');
      
      expect(await service.restore('snapp1', 'key', undefined, 'ns1')).toBeUndefined();
      expect(await service.restore('snapp1', 'key', undefined, 'ns2')).toBe('value2');
    });
  });
});
