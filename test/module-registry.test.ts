/**
 * Tests for ModuleRegistry — the module discovery and management system
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModuleRegistry } from '../src/lib/module-registry';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry('/nonexistent-test-path');
  });

  describe('scanPackagesDirectory', () => {
    it('returns empty array when packages path does not exist', async () => {
      const result = await registry.scanPackagesDirectory();
      expect(result).toEqual([]);
    });
  });

  describe('getModuleState', () => {
    it('returns undefined for unknown module', () => {
      expect(registry.getModuleState('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllModules', () => {
    it('returns empty array initially', () => {
      expect(registry.getAllModules()).toEqual([]);
    });
  });

  describe('getModulesByCategory', () => {
    it('returns empty array for foundation category when no modules', () => {
      expect(registry.getModulesByCategory('foundation')).toEqual([]);
    });

    it('returns empty array for feature category when no modules', () => {
      expect(registry.getModulesByCategory('feature')).toEqual([]);
    });
  });

  describe('getLoadedModules', () => {
    it('returns empty array when no modules are loaded', () => {
      expect(registry.getLoadedModules()).toEqual([]);
    });
  });

  describe('updateModuleStatus', () => {
    it('does not throw when updating unknown module', () => {
      expect(() => registry.updateModuleStatus('unknown', 'loaded')).not.toThrow();
    });

    it('does not throw when setting error on unknown module', () => {
      expect(() => registry.updateModuleStatus('unknown', 'error', 'test error')).not.toThrow();
    });
  });

  describe('updateModuleResources', () => {
    it('does not throw when updating unknown module', () => {
      expect(() => registry.updateModuleResources('unknown', { cpu: 50 })).not.toThrow();
    });
  });

  describe('getStatistics', () => {
    it('returns zero statistics when registry is empty', () => {
      const stats = registry.getStatistics();
      expect(stats).toEqual({
        total: 0,
        foundation: 0,
        feature: 0,
        loaded: 0,
        installed: 0,
      });
    });
  });
});

describe('ModuleRegistry with injected state', () => {
  // We can test the internal logic by using the scanPackagesDirectory
  // with a mock filesystem. For now, test the pure logic methods.

  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry('/nonexistent-test-path');
    // Manually populate via the scan method's internals would require
    // mocking fs. Instead, we test that the registry handles edge cases gracefully.
  });

  it('handles concurrent status updates without throwing', () => {
    expect(() => {
      registry.updateModuleStatus('a', 'loading');
      registry.updateModuleStatus('b', 'loaded');
      registry.updateModuleStatus('c', 'error', 'disk full');
      registry.updateModuleStatus('a', 'loaded');
    }).not.toThrow();
  });

  it('handles concurrent resource updates without throwing', () => {
    expect(() => {
      registry.updateModuleResources('a', { cpu: 10 });
      registry.updateModuleResources('a', { memory: 512 });
      registry.updateModuleResources('b', { disk: 1024, cpu: 5 });
    }).not.toThrow();
  });

  it('getStatistics returns consistent counts', () => {
    const stats1 = registry.getStatistics();
    const stats2 = registry.getStatistics();
    expect(stats1).toEqual(stats2);
  });
});

describe('ModuleRegistry isFoundationModule logic', () => {
  // Test via the public API by creating a temp packages dir
  // This is an integration test that uses real filesystem
  
  it('categorizes foundation modules correctly', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-test-'));
    
    // Create a foundation-like module
    const asyncDir = path.join(tmpDir, 'async');
    await fs.mkdir(asyncDir);
    await fs.writeFile(
      path.join(asyncDir, 'package.json'),
      JSON.stringify({ name: '@superinstance/async', version: '1.0.0' })
    );
    
    // Create a feature-like module
    const featureDir = path.join(tmpDir, 'cool-feature');
    await fs.mkdir(featureDir);
    await fs.writeFile(
      path.join(featureDir, 'package.json'),
      JSON.stringify({ name: '@superinstance/cool-feature', version: '1.0.0' })
    );
    
    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();
    
    const modules = registry.getAllModules();
    expect(modules.length).toBe(2);
    
    const asyncModule = registry.getModuleState('@superinstance/async');
    expect(asyncModule).toBeDefined();
    expect(asyncModule?.category).toBe('foundation');
    
    const featureModule = registry.getModuleState('@superinstance/cool-feature');
    expect(featureModule).toBeDefined();
    expect(featureModule?.category).toBe('feature');
    
    // Cleanup
    await fs.rm(tmpDir, { recursive: true });
  });

  it('preserves runtime state on rescan', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-test-'));
    
    const modDir = path.join(tmpDir, 'mymod');
    await fs.mkdir(modDir);
    await fs.writeFile(
      path.join(modDir, 'package.json'),
      JSON.stringify({ name: '@superinstance/mymod', version: '1.0.0' })
    );
    
    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();
    
    // Update state
    registry.updateModuleStatus('@superinstance/mymod', 'loaded');
    registry.updateModuleResources('@superinstance/mymod', { cpu: 42 });
    
    // Rescan
    await registry.scanPackagesDirectory();
    
    // State should be preserved
    const mod = registry.getModuleState('@superinstance/mymod');
    expect(mod?.loaded).toBe(true);
    expect(mod?.status).toBe('loaded');
    expect(mod?.resources.cpu).toBe(42);
    
    await fs.rm(tmpDir, { recursive: true });
  });

  it('skips hidden directories', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-test-'));
    
    // Hidden directory (should be skipped)
    await fs.mkdir(path.join(tmpDir, '.hidden'));
    await fs.writeFile(
      path.join(tmpDir, '.hidden', 'package.json'),
      JSON.stringify({ name: '@superinstance/hidden', version: '1.0.0' })
    );
    
    // Real module
    const modDir = path.join(tmpDir, 'real');
    await fs.mkdir(modDir);
    await fs.writeFile(
      path.join(modDir, 'package.json'),
      JSON.stringify({ name: '@superinstance/real', version: '1.0.0' })
    );
    
    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();
    
    expect(registry.getAllModules().length).toBe(1);
    expect(registry.getModuleState('@superinstance/hidden')).toBeUndefined();
    expect(registry.getModuleState('@superinstance/real')).toBeDefined();
    
    await fs.rm(tmpDir, { recursive: true });
  });

  it('handles directories without package.json gracefully', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-test-'));
    
    // Directory without package.json
    await fs.mkdir(path.join(tmpDir, 'no-package'));
    
    // Directory with invalid JSON
    await fs.mkdir(path.join(tmpDir, 'bad-json'));
    await fs.writeFile(
      path.join(tmpDir, 'bad-json', 'package.json'),
      '{ invalid json }'
    );
    
    const registry = new ModuleRegistry(tmpDir);
    const result = await registry.scanPackagesDirectory();
    
    expect(result).toEqual([]);
    
    await fs.rm(tmpDir, { recursive: true });
  });

  it('getStatistics computes correct counts', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');
    
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-test-'));
    
    // Create modules
    for (const name of ['async', 'validate', 'cache', 'mymod', 'cool']) {
      const dir = path.join(tmpDir, name);
      await fs.mkdir(dir);
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: `@superinstance/${name}`, version: '1.0.0' })
      );
    }
    
    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();
    
    // Load one foundation and one feature
    registry.updateModuleStatus('@superinstance/async', 'loaded');
    registry.updateModuleStatus('@superinstance/cool', 'loaded');
    
    const stats = registry.getStatistics();
    expect(stats.total).toBe(5);
    expect(stats.foundation).toBe(3); // async, validate, cache
    expect(stats.feature).toBe(2); // mymod, cool
    expect(stats.loaded).toBe(2);
    expect(stats.installed).toBe(5);
    
    await fs.rm(tmpDir, { recursive: true });
  });
});
