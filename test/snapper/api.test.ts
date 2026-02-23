/**
 * SnApper Core - SnAppApi Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SnAppApiImpl } from '../../src/snapper/core/api';
import { FileStateService } from '../../src/snapper/core/state';
import { HookService } from '../../src/snapper/core/hooks';
import { MessageBusService } from '../../src/snapper/core/bus';
import type { SnAppManifest, SnAppPermission } from '../../src/snapper/types';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

describe('SnAppApiImpl', () => {
  let api: SnAppApiImpl;
  let tempDir: string;

  const manifest: SnAppManifest = {
    id: 'test-snapp',
    name: 'Test SnApp',
    shortName: 'TS',
    version: '1.0.0',
    description: 'Test',
    entry: './index.ts',
    permissions: [
      'storage:read', 'storage:write', 'storage:delete',
      'ui:tab', 'ui:panel', 'ui:toast',
      'command:register', 'session:hook',
      'prompt:inject', 'bus:publish', 'bus:subscribe'
    ],
    openclaw: { minVersion: '2.0.0' }
  };

  const allPermissions: SnAppPermission[] = [
    'storage:read', 'storage:write', 'storage:delete',
    'ui:tab', 'ui:panel', 'ui:toast',
    'command:register', 'session:hook',
    'prompt:inject', 'bus:publish', 'bus:subscribe'
  ];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'snapper-api-test-'));
    
    api = new SnAppApiImpl({
      snappId: 'test-snapp',
      manifest,
      state: 'registered',
      permissions: allPermissions,
      stateService: new FileStateService(tempDir),
      hookService: new HookService(),
      messageBus: new MessageBusService(),
      workingDirectory: '/test/workdir'
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Identity', () => {
    it('should return correct id and manifest', () => {
      expect(api.id).toBe('test-snapp');
      expect(api.manifest.id).toBe('test-snapp');
      expect(api.manifest.name).toBe('Test SnApp');
    });

    it('should return version info', () => {
      const version = api.getVersion();
      expect(version.version).toBe('1.0.0');
      expect(version.apiVersion).toBe('1.0.0');
    });

    it('should expose logger', () => {
      expect(api.logger).toBeDefined();
      expect(typeof api.logger.debug).toBe('function');
      expect(typeof api.logger.info).toBe('function');
      expect(typeof api.logger.warn).toBe('function');
      expect(typeof api.logger.error).toBe('function');
    });

    it('should create child logger', () => {
      const child = api.logger.child('child');
      expect(child).toBeDefined();
      expect(typeof child.debug).toBe('function');
    });
  });

  describe('State', () => {
    it('should persist and restore', async () => {
      await api.persist('key1', { data: 'test' });
      const restored = await api.restore('key1');
      expect(restored).toEqual({ data: 'test' });
    });

    it('should return default value for missing key', async () => {
      const restored = await api.restore('missing', 'default');
      expect(restored).toBe('default');
    });

    it('should remove key', async () => {
      await api.persist('key1', 'value');
      await api.remove('key1');
      const restored = await api.restore('key1');
      expect(restored).toBeUndefined();
    });

    it('should list keys', async () => {
      await api.persist('key1', 'value1');
      await api.persist('key2', 'value2');
      const keys = await api.listKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should clear all keys', async () => {
      await api.persist('key1', 'value1');
      await api.clear();
      const keys = await api.listKeys();
      expect(keys).toEqual([]);
    });

    it('should throw without storage:write permission', async () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: ['storage:read'], // No write
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      await expect(restrictedApi.persist('key', 'value')).rejects.toThrow('Permission denied');
    });

    it('should throw without storage:read permission', async () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: ['storage:write'], // No read
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      await expect(restrictedApi.restore('key')).rejects.toThrow('Permission denied');
    });
  });

  describe('Tabs', () => {
    it('should register and return tab id', () => {
      const tabId = api.registerTab({
        label: 'Test Tab',
        component: 'test-component'
      });
      
      expect(tabId).toContain('test-snapp');
      expect(api.getTabs()).toHaveLength(1);
    });

    it('should unregister tab', () => {
      const tabId = api.registerTab({
        label: 'Test',
        component: 'test-component'
      });
      
      api.unregisterTab(tabId);
      expect(api.getTabs()).toHaveLength(0);
    });

    it('should update tab', () => {
      const tabId = api.registerTab({
        label: 'Test',
        component: 'test-component'
      });
      
      api.updateTab(tabId, { label: 'Updated' });
      const tabs = api.getTabs();
      expect(tabs[0].label).toBe('Updated');
    });

    it('should emit tab events on register', () => {
      const handler = vi.fn();
      api.onTabEvent(handler);
      
      api.registerTab({
        label: 'Test',
        component: 'test-component'
      });
      
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'activated' }));
    });

    it('should emit tab events on unregister', () => {
      const handler = vi.fn();
      const tabId = api.registerTab({
        label: 'Test',
        component: 'test-component'
      });
      
      api.onTabEvent(handler);
      api.unregisterTab(tabId);
      
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'closed' }));
    });

    it('should unsubscribe from tab events', () => {
      const handler = vi.fn();
      const unsubscribe = api.onTabEvent(handler);
      
      unsubscribe();
      api.registerTab({ label: 'Test', component: 'c' });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should throw without ui:tab permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: [], // No tab permission
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.registerTab({ label: 'Test', component: 'c' }))
        .toThrow('Permission denied');
    });
  });

  describe('Panels', () => {
    it('should register panel', () => {
      const panelId = api.registerPanel({
        title: 'Test Panel',
        component: 'test-component',
        position: 'left'
      });
      
      expect(panelId).toContain('test-snapp');
    });

    it('should update panel', () => {
      const panelId = api.registerPanel({
        title: 'Test Panel',
        component: 'test-component',
        position: 'left'
      });
      
      api.updatePanel(panelId, { title: 'Updated' });
      // Panels don't have a getter in current API, but update shouldn't throw
    });

    it('should toggle panel expanded state', () => {
      const panelId = api.registerPanel({
        title: 'Test Panel',
        component: 'test-component',
        position: 'left',
        expanded: false
      });
      
      api.togglePanel(panelId);
      // Toggle shouldn't throw
    });

    it('should throw without ui:panel permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: [], // No panel permission
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.registerPanel({ 
        title: 'Test', component: 'c', position: 'left' 
      })).toThrow('Permission denied');
    });
  });

  describe('Commands', () => {
    it('should register and execute command', async () => {
      const handler = vi.fn().mockReturnValue({ success: true });
      
      api.registerCommand({
        name: 'test-cmd',
        description: 'Test command',
        handler
      });

      const result = await api.executeCommand('test-snapp:test-cmd arg1');
      
      expect(handler).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should return error for unknown command', async () => {
      const result = await api.executeCommand('unknown-cmd');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should unregister command', async () => {
      api.registerCommand({
        name: 'test-cmd',
        description: 'Test',
        handler: vi.fn()
      });
      
      api.unregisterCommand('test-cmd');
      
      const result = await api.executeCommand('test-snapp:test-cmd');
      expect(result.success).toBe(false);
    });

    it('should throw without command:register permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: [], // No command permission
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.registerCommand({ 
        name: 'cmd', description: 'Test', handler: vi.fn() 
      })).toThrow('Permission denied');
    });
  });

  describe('Hooks', () => {
    it('should subscribe to hooks', async () => {
      const handler = vi.fn();
      api.onHook('session_start', handler);
      
      // Trigger through hook service
      await (api as any).hookService.emit('session_start', { sessionId: 'test' });
      
      expect(handler).toHaveBeenCalledWith({ sessionId: 'test' });
    });

    it('should subscribe once to hooks', async () => {
      const handler = vi.fn();
      api.onceHook('session_start', handler);
      
      await (api as any).hookService.emit('session_start', { sessionId: '1' });
      await (api as any).hookService.emit('session_start', { sessionId: '2' });
      
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', async () => {
      const handler = vi.fn();
      const unsubscribe = api.onHook('session_start', handler);
      
      unsubscribe();
      await (api as any).hookService.emit('session_start', { sessionId: 'test' });
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should throw without session:hook permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: [], // No hook permission
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.onHook('session_start', () => {}))
        .toThrow('Permission denied');
    });
  });

  describe('Permissions', () => {
    it('should check permissions', () => {
      expect(api.hasPermission('storage:read')).toBe(true);
      expect(api.hasPermission('system:exec')).toBe(false);
    });

    it('should have all granted permissions', () => {
      for (const perm of allPermissions) {
        expect(api.hasPermission(perm)).toBe(true);
      }
    });
  });

  describe('Context', () => {
    it('should return working directory', () => {
      expect(api.getWorkingDirectory()).toBe('/test/workdir');
    });

    it('should inject prompt context with permission', () => {
      // Should not throw
      api.injectPromptContext('Additional context');
    });

    it('should throw without prompt:inject permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: [], // No inject permission
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.injectPromptContext('test'))
        .toThrow('Permission denied');
    });
  });

  describe('Messaging', () => {
    it('should publish and subscribe', () => {
      const handler = vi.fn();
      api.subscribe('test-channel', handler);
      api.publish('test-channel', { data: 'hello' });
      
      expect(handler).toHaveBeenCalledWith({ data: 'hello' }, 'test-snapp');
    });

    it('should throw without bus:publish permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: ['bus:subscribe'], // No publish
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.publish('channel', 'msg'))
        .toThrow('Permission denied');
    });

    it('should throw without bus:subscribe permission', () => {
      const restrictedApi = new SnAppApiImpl({
        snappId: 'test',
        manifest,
        state: 'registered',
        permissions: ['bus:publish'], // No subscribe
        stateService: new FileStateService(tempDir),
        hookService: new HookService(),
        messageBus: new MessageBusService(),
        workingDirectory: '/test'
      });

      expect(() => restrictedApi.subscribe('channel', () => {}))
        .toThrow('Permission denied');
    });
  });

  describe('Cleanup', () => {
    it('should dispose cleanly', async () => {
      api.registerTab({ label: 'Test', component: 'c' });
      api.registerPanel({ title: 'Panel', component: 'c', position: 'left' });
      
      await api.dispose();
      
      expect(api.getTabs()).toHaveLength(0);
    });

    it('should dispose even with empty state', async () => {
      await expect(api.dispose()).resolves.not.toThrow();
    });
  });
});
