/**
 * Module Registry - Discovers and manages all SuperInstance modules
 *
 * This module provides functionality to:
 * - Scan the packages directory for available modules
 * - Track module state (idle, loading, loaded, error)
 * - Monitor resource usage (CPU, memory, disk)
 * - Provide module statistics and filtering
 *
 * @module ModuleRegistry
 */

import { ModuleMetadata, ModuleState, ModuleResources } from '@/types/modules';

/**
 * Gets the packages path from environment variable or uses a default relative path
 * @returns The absolute or relative path to the packages directory
 */
function getPackagesPath(): string {
  // Check for environment variable first
  if (process.env.PACKAGES_PATH) {
    return process.env.PACKAGES_PATH;
  }

  // Default to relative path (works for monorepo setup)
  return '../packages';
}

/**
 * Registry for managing SuperInstance modules
 * Discovers modules from the packages directory and tracks their runtime state
 */
export class ModuleRegistry {
  /** Map of module ID to module state */
  private modules: Map<string, ModuleState> = new Map();

  /** File system path to the packages directory */
  private packagesPath: string;

  /**
   * Creates a new ModuleRegistry instance
   * @param packagesPath - Optional custom path to packages directory. Defaults to PACKAGES_PATH env var or '../packages'
   */
  constructor(packagesPath?: string) {
    this.packagesPath = packagesPath || getPackagesPath();
  }

  /**
   * Scans the packages directory and discovers all available modules
   *
   * Reads package.json files from each subdirectory in the packages path
   * and creates module state entries. Preserves existing runtime states
   * (loaded, status, resources) when rescanning.
   *
   * @returns Promise resolving to an array of all discovered module states
   */
  async scanPackagesDirectory(): Promise<ModuleState[]> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const entries = await fs.readdir(this.packagesPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden directories (like .git, .next, etc.)
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const packagePath = path.join(this.packagesPath, entry.name);
          const packageJsonPath = path.join(packagePath, 'package.json');

          try {
            const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
            const metadata: ModuleMetadata = JSON.parse(packageJsonContent);

            // Determine if it's a foundation or feature module
            const category: 'foundation' | 'feature' = this.isFoundationModule(metadata.name)
              ? 'foundation'
              : 'feature';

            // Preserve existing state if module already exists
            const existing = this.modules.get(metadata.name);
            const moduleState: ModuleState = {
              id: metadata.name,
              metadata,
              installed: true,
              loaded: existing?.loaded || false,
              resources: existing?.resources || this.getInitialResources(),
              status: existing?.status || 'idle',
              category,
              error: existing?.error,
            };

            this.modules.set(metadata.name, moduleState);
          } catch (error) {
            console.error(`Error reading package.json for ${entry.name}:`, error);
          }
        }
      }

      return Array.from(this.modules.values());
    } catch (error) {
      console.error('Error scanning packages directory:', error);
      return [];
    }
  }

  /**
   * Determines if a module is a foundation primitive
   *
   * Foundation primitives are core utility modules that other modules depend on.
   * These include async, validate, cache, events, config, storage, provider-base, and logger.
   *
   * @param name - The full package name (e.g., '@superinstance/async')
   * @returns True if the module is a foundation primitive, false otherwise
   */
  private isFoundationModule(name: string): boolean {
    const foundationModules = [
      '@superinstance/async',
      '@superinstance/validate',
      '@superinstance/cache',
      '@superinstance/events',
      '@superinstance/config',
      '@superinstance/storage',
      '@superinstance/provider-base',
      '@superinstance/logger',
    ];

    return foundationModules.some(fm => name.includes(fm.split('/')[1] || ''));
  }

  /**
   * Creates an initial resource usage object for a module
   *
   * @returns A new ModuleResources object with all values set to zero
   */
  private getInitialResources(): ModuleResources {
    return {
      cpu: 0,
      memory: 0,
      disk: 0,
      lastUpdate: new Date(),
    };
  }

  /**
   * Retrieves the current state of a specific module
   *
   * @param id - The module ID (package name)
   * @returns The module state if found, undefined otherwise
   */
  getModuleState(id: string): ModuleState | undefined {
    return this.modules.get(id);
  }

  /**
   * Retrieves all registered modules
   *
   * @returns An array of all module states
   */
  getAllModules(): ModuleState[] {
    return Array.from(this.modules.values());
  }

  /**
   * Retrieves modules filtered by category
   *
   * @param category - The category to filter by ('foundation' or 'feature')
   * @returns An array of module states matching the category
   */
  getModulesByCategory(category: 'foundation' | 'feature'): ModuleState[] {
    return this.getAllModules().filter(m => m.category === category);
  }

  /**
   * Retrieves all currently loaded modules
   *
   * @returns An array of module states where loaded is true
   */
  getLoadedModules(): ModuleState[] {
    return this.getAllModules().filter(m => m.loaded);
  }

  /**
   * Updates the status of a module
   *
   * @param id - The module ID
   * @param status - The new status ('idle', 'loading', 'loaded', or 'error')
   * @param error - Optional error message if status is 'error'
   */
  updateModuleStatus(id: string, status: ModuleState['status'], error?: string): void {
    const targetModule = this.modules.get(id);
    if (targetModule) {
      targetModule.status = status;
      targetModule.loaded = status === 'loaded';
      if (error) {
        targetModule.error = error;
      }
    }
  }

  /**
   * Updates the resource usage metrics for a module
   *
   * @param id - The module ID
   * @param resources - Partial resource values to update (cpu, memory, disk)
   */
  updateModuleResources(id: string, resources: Partial<ModuleResources>): void {
    const targetModule = this.modules.get(id);
    if (targetModule) {
      targetModule.resources = {
        ...targetModule.resources,
        ...resources,
        lastUpdate: new Date(),
      };
    }
  }

  /**
   * Calculates and returns module statistics
   *
   * @returns An object containing counts for total, foundation, feature, loaded, and installed modules
   */
  getStatistics() {
    const all = this.getAllModules();
    return {
      total: all.length,
      foundation: all.filter(m => m.category === 'foundation').length,
      feature: all.filter(m => m.category === 'feature').length,
      loaded: all.filter(m => m.loaded).length,
      installed: all.filter(m => m.installed).length,
    };
  }
}

/**
 * Global registry persistence for Next.js serverless environment
 *
 * In Next.js development mode, hot module reloading can reset module-level state.
 * We use Node.js global to persist the registry instance across requests.
 */
declare global {
  /** Global registry instance that persists across requests */
  var _superInstanceRegistry: ModuleRegistry | undefined;
  /** Promise that resolves when initial package scan completes */
  var _superInstanceInitPromise: Promise<ModuleState[]> | undefined;
}

/**
 * Gets or creates the global registry instance
 *
 * Uses Node.js global object to maintain a singleton registry across
 * serverless function invocations in development.
 *
 * @returns The global ModuleRegistry instance
 */
const getGlobalRegistry = (): ModuleRegistry => {
  if (!global._superInstanceRegistry) {
    global._superInstanceRegistry = new ModuleRegistry();
  }
  return global._superInstanceRegistry;
};

/**
 * Gets the global registry instance without initialization
 *
 * Use this when you need to access the registry but don't need to ensure
 * the packages have been scanned.
 *
 * @returns The global ModuleRegistry instance
 */
export function getRegistry(): ModuleRegistry {
  return getGlobalRegistry();
}

/**
 * Gets the global registry and ensures packages are scanned
 *
 * This is the preferred way to access the registry in API routes as it
 * guarantees the packages directory has been scanned before returning.
 *
 * @returns Promise resolving to the initialized ModuleRegistry instance
 */
export async function getOrInitRegistry(): Promise<ModuleRegistry> {
  const registry = getGlobalRegistry();
  if (!global._superInstanceInitPromise) {
    global._superInstanceInitPromise = registry.scanPackagesDirectory();
  }
  await global._superInstanceInitPromise;
  return registry;
}
