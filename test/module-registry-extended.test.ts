/**
 * Extended ModuleRegistry tests — edge cases, resource updates, status transitions
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from '../src/lib/module-registry';

describe('ModuleRegistry extended edge cases', () => {
  let registry: ModuleRegistry;

  beforeEach(() => {
    registry = new ModuleRegistry('/nonexistent-test-path');
  });

  // === STATUS TRANSITIONS ===

  describe('status transitions on unknown modules', () => {
    it('silently ignores status update to idle on unknown', () => {
      expect(() => registry.updateModuleStatus('ghost', 'idle')).not.toThrow();
      expect(registry.getModuleState('ghost')).toBeUndefined();
    });

    it('silently ignores status update to loading on unknown', () => {
      expect(() => registry.updateModuleStatus('ghost', 'loading')).not.toThrow();
    });

    it('silently ignores status update to loaded on unknown', () => {
      expect(() => registry.updateModuleStatus('ghost', 'loaded')).not.toThrow();
    });

    it('silently ignores status update to error on unknown', () => {
      expect(() => registry.updateModuleStatus('ghost', 'error', 'boom')).not.toThrow();
    });
  });

  describe('resource updates on unknown modules', () => {
    it('silently ignores CPU update on unknown', () => {
      expect(() => registry.updateModuleResources('ghost', { cpu: 99 })).not.toThrow();
    });

    it('silently ignores memory update on unknown', () => {
      expect(() => registry.updateModuleResources('ghost', { memory: 4096 })).not.toThrow();
    });

    it('silently ignores disk update on unknown', () => {
      expect(() => registry.updateModuleResources('ghost', { disk: 500 })).not.toThrow();
    });

    it('silently ignores full resource update on unknown', () => {
      expect(() => registry.updateModuleResources('ghost', { cpu: 50, memory: 2048, disk: 100 })).not.toThrow();
    });

    it('silently ignores empty resource update on unknown', () => {
      expect(() => registry.updateModuleResources('ghost', {})).not.toThrow();
    });
  });

  // === STATISTICS CONSISTENCY ===

  describe('statistics invariants', () => {
    it('foundation + feature === total', () => {
      const stats = registry.getStatistics();
      expect(stats.foundation + stats.feature).toBe(stats.total);
    });

    it('loaded <= total', () => {
      const stats = registry.getStatistics();
      expect(stats.loaded).toBeLessThanOrEqual(stats.total);
    });

    it('installed <= total', () => {
      const stats = registry.getStatistics();
      expect(stats.installed).toBeLessThanOrEqual(stats.total);
    });

    it('returns fresh object each call (not cached)', () => {
      const stats1 = registry.getStatistics();
      const stats2 = registry.getStatistics();
      expect(stats1).not.toBe(stats2); // different object references
      expect(stats1).toEqual(stats2);  // same values
    });
  });

  // === MODULE LOOKUPS ===

  describe('module lookups', () => {
    it('getModuleState returns undefined for empty string id', () => {
      expect(registry.getModuleState('')).toBeUndefined();
    });

    it('getModuleState returns undefined for very long id', () => {
      expect(registry.getModuleState('a'.repeat(10000))).toBeUndefined();
    });

    it('getModuleState returns undefined for special characters', () => {
      expect(registry.getModuleState('@special/package-name!')).toBeUndefined();
    });

    it('getAllModules returns new array each call', () => {
      const a1 = registry.getAllModules();
      const a2 = registry.getAllModules();
      expect(a1).not.toBe(a2);
      expect(a1).toEqual(a2);
    });

    it('getLoadedModules returns new array each call', () => {
      const a1 = registry.getLoadedModules();
      const a2 = registry.getLoadedModules();
      expect(a1).not.toBe(a2);
    });

    it('getModulesByCategory returns new array each call', () => {
      const a1 = registry.getModulesByCategory('foundation');
      const a2 = registry.getModulesByCategory('foundation');
      expect(a1).not.toBe(a2);
    });
  });

  // === CATEGORY FILTERING ===

  describe('category filtering', () => {
    it('getModulesByCategory with invalid category returns empty', () => {
      // TypeScript would prevent this at compile time, but runtime test
      expect(registry.getModulesByCategory('invalid' as any)).toEqual([]);
    });
  });
});

// === INTEGRATION: scan + status + resources + stats ===

describe('ModuleRegistry full lifecycle', () => {
  it('full lifecycle: scan → status → resources → stats', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-lifecycle-'));

    // Create a foundation module
    const asyncDir = path.join(tmpDir, 'async');
    await fs.mkdir(asyncDir);
    await fs.writeFile(
      path.join(asyncDir, 'package.json'),
      JSON.stringify({
        name: '@superinstance/async',
        version: '2.0.0',
        description: 'Async utilities',
        dependencies: {},
      }),
    );

    // Create a feature module
    const featureDir = path.join(tmpDir, 'feature-mod');
    await fs.mkdir(featureDir);
    await fs.writeFile(
      path.join(featureDir, 'package.json'),
      JSON.stringify({
        name: '@superinstance/feature-mod',
        version: '0.1.0',
        description: 'A feature module',
        dependencies: { '@superinstance/async': '^2.0.0' },
      }),
    );

    const registry = new ModuleRegistry(tmpDir);

    // 1. Scan
    await registry.scanPackagesDirectory();
    expect(registry.getAllModules().length).toBe(2);

    // 2. Verify categories
    const foundations = registry.getModulesByCategory('foundation');
    const features = registry.getModulesByCategory('feature');
    expect(foundations.length).toBe(1);
    expect(features.length).toBe(1);

    // 3. Initial state
    const asyncMod = registry.getModuleState('@superinstance/async')!;
    expect(asyncMod.loaded).toBe(false);
    expect(asyncMod.status).toBe('idle');
    expect(asyncMod.installed).toBe(true);
    expect(asyncMod.error).toBeUndefined();
    expect(asyncMod.resources.cpu).toBe(0);
    expect(asyncMod.resources.memory).toBe(0);
    expect(asyncMod.resources.disk).toBe(0);

    // 4. Transition to loading
    registry.updateModuleStatus('@superinstance/async', 'loading');
    expect(registry.getModuleState('@superinstance/async')!.status).toBe('loading');
    expect(registry.getModuleState('@superinstance/async')!.loaded).toBe(false);

    // 5. Transition to loaded
    registry.updateModuleStatus('@superinstance/async', 'loaded');
    expect(registry.getModuleState('@superinstance/async')!.status).toBe('loaded');
    expect(registry.getModuleState('@superinstance/async')!.loaded).toBe(true);
    expect(registry.getLoadedModules().length).toBe(1);

    // 6. Update resources
    registry.updateModuleResources('@superinstance/async', { cpu: 15, memory: 128 });
    expect(registry.getModuleState('@superinstance/async')!.resources.cpu).toBe(15);
    expect(registry.getModuleState('@superinstance/async')!.resources.memory).toBe(128);
    expect(registry.getModuleState('@superinstance/async')!.resources.disk).toBe(0); // unchanged

    // 7. Partial resource update
    registry.updateModuleResources('@superinstance/async', { disk: 256 });
    expect(registry.getModuleState('@superinstance/async')!.resources.cpu).toBe(15); // preserved
    expect(registry.getModuleState('@superinstance/async')!.resources.disk).toBe(256);

    // 8. Transition to error
    registry.updateModuleStatus('@superinstance/async', 'error', 'Module crashed');
    expect(registry.getModuleState('@superinstance/async')!.status).toBe('error');
    expect(registry.getModuleState('@superinstance/async')!.loaded).toBe(false);
    expect(registry.getModuleState('@superinstance/async')!.error).toBe('Module crashed');

    // 9. Statistics
    const stats = registry.getStatistics();
    expect(stats.total).toBe(2);
    expect(stats.foundation).toBe(1);
    expect(stats.feature).toBe(1);
    expect(stats.loaded).toBe(0); // async is in error state
    expect(stats.installed).toBe(2);

    // 10. Recover from error
    registry.updateModuleStatus('@superinstance/async', 'loaded');
    expect(registry.getModuleState('@superinstance/async')!.loaded).toBe(true);
    expect(registry.getModuleState('@superinstance/async')!.error).toBe('Module crashed'); // error still set (not cleared)

    // 11. Rescan preserves state
    await registry.scanPackagesDirectory();
    const repopulated = registry.getModuleState('@superinstance/async')!;
    expect(repopulated.loaded).toBe(true);
    expect(repopulated.resources.cpu).toBe(15);

    await fs.rm(tmpDir, { recursive: true });
  });

  it('multiple modules with mixed categories and statuses', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-mixed-'));

    // Create 3 foundation + 2 feature
    for (const name of ['async', 'validate', 'cache']) {
      const dir = path.join(tmpDir, name);
      await fs.mkdir(dir);
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: `@superinstance/${name}`, version: '1.0.0' }),
      );
    }
    for (const name of ['feature-a', 'feature-b']) {
      const dir = path.join(tmpDir, name);
      await fs.mkdir(dir);
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: `@superinstance/${name}`, version: '1.0.0' }),
      );
    }

    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();

    // Load some
    registry.updateModuleStatus('@superinstance/async', 'loaded');
    registry.updateModuleStatus('@superinstance/feature-a', 'loaded');
    registry.updateModuleStatus('@superinstance/cache', 'error', 'Cache corruption');

    // Error one then recover
    registry.updateModuleStatus('@superinstance/validate', 'error', 'Bad input');
    registry.updateModuleStatus('@superinstance/validate', 'loaded');

    const stats = registry.getStatistics();
    expect(stats.total).toBe(5);
    expect(stats.foundation).toBe(3);
    expect(stats.feature).toBe(2);
    expect(stats.loaded).toBe(3); // async, feature-a, validate
    expect(stats.installed).toBe(5);

    // Verify loaded modules list
    const loaded = registry.getLoadedModules();
    const loadedNames = loaded.map(m => m.id).sort();
    expect(loadedNames).toEqual([
      '@superinstance/async',
      '@superinstance/feature-a',
      '@superinstance/validate',
    ]);

    await fs.rm(tmpDir, { recursive: true });
  });
});

// === RESOURCE EDGE CASES ===

describe('resource update edge cases', () => {
  it('setting resources to zero is valid', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-zero-'));
    const modDir = path.join(tmpDir, 'mymod');
    await fs.mkdir(modDir);
    await fs.writeFile(
      path.join(modDir, 'package.json'),
      JSON.stringify({ name: '@superinstance/mymod', version: '1.0.0' }),
    );

    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();

    registry.updateModuleResources('@superinstance/mymod', { cpu: 0, memory: 0, disk: 0 });
    const mod = registry.getModuleState('@superinstance/mymod')!;
    expect(mod.resources.cpu).toBe(0);
    expect(mod.resources.memory).toBe(0);
    expect(mod.resources.disk).toBe(0);

    await fs.rm(tmpDir, { recursive: true });
  });

  it('resource update does not affect other modules', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const os = await import('os');

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'modreg-isolation-'));
    for (const name of ['mod-a', 'mod-b']) {
      const dir = path.join(tmpDir, name);
      await fs.mkdir(dir);
      await fs.writeFile(
        path.join(dir, 'package.json'),
        JSON.stringify({ name: `@superinstance/${name}`, version: '1.0.0' }),
      );
    }

    const registry = new ModuleRegistry(tmpDir);
    await registry.scanPackagesDirectory();

    registry.updateModuleResources('@superinstance/mod-a', { cpu: 99 });
    const modB = registry.getModuleState('@superinstance/mod-b')!;
    expect(modB.resources.cpu).toBe(0); // unchanged

    await fs.rm(tmpDir, { recursive: true });
  });
});
