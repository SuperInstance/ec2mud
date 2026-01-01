/**
 * Module type definitions for SuperInstance Core App
 *
 * This module contains TypeScript interfaces and types for representing
 * SuperInstance modules, their metadata, state, and resource usage.
 *
 * @module types/modules
 */

/**
 * Metadata extracted from a module's package.json file
 *
 * Contains standard NPM package metadata fields.
 */
export interface ModuleMetadata {
  /** The package name (e.g., '@superinstance/async') */
  name: string;
  /** Semantic version string */
  version: string;
  /** Brief description of the module's purpose */
  description: string;
  /** Author name or contact */
  author?: string;
  /** SPDX license identifier */
  license?: string;
  /** Production dependency map */
  dependencies: Record<string, string>;
  /** Development dependency map */
  devDependencies?: Record<string, string>;
  /** Entry point for CommonJS imports */
  main?: string;
  /** Module export map for different conditions */
  exports?: Record<string, string>;
  /** Search keywords for npm registry */
  keywords?: string[];
  /** Project homepage URL */
  homepage?: string;
  /** Repository information */
  repository?: {
    type: string;
    url: string;
  };
}

/**
 * Resource usage metrics for a loaded module
 *
 * Tracks simulated or actual resource consumption.
 */
export interface ModuleResources {
  /** CPU usage as a percentage (0-100) */
  cpu: number;
  /** Memory usage in megabytes */
  memory: number;
  /** Disk usage in megabytes */
  disk: number;
  /** Timestamp of last resource update */
  lastUpdate: Date;
}

/**
 * Complete state information for a module
 *
 * Combines static metadata with dynamic runtime state.
 */
export interface ModuleState {
  /** Unique module identifier (package name) */
  id: string;
  /** Static package metadata from package.json */
  metadata: ModuleMetadata;
  /** Whether the module is installed locally */
  installed: boolean;
  /** Whether the module is currently loaded in memory */
  loaded: boolean;
  /** Current resource usage metrics */
  resources: ModuleResources;
  /** Current operational status */
  status: 'idle' | 'loading' | 'loaded' | 'error';
  /** Error message if status is 'error' */
  error?: string;
  /** Module category for organization */
  category: 'foundation' | 'feature';
}

/**
 * Possible operational states for a module
 */
export type ModuleStatus = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * Filter criteria for browsing modules
 */
export interface ModuleFilter {
  /** Filter by module category */
  category?: 'foundation' | 'feature' | 'all';
  /** Filter by operational status */
  status?: ModuleStatus;
  /** Search query for name/description matching */
  search?: string;
}

/**
 * Resource update event payload
 */
export interface ResourceUpdate {
  /** ID of the module being updated */
  moduleId: string;
  /** New resource values */
  resources: ModuleResources;
  /** When the update occurred */
  timestamp: Date;
}

/**
 * Aggregate resource statistics
 */
export interface TotalResources {
  /** Total CPU usage across all modules */
  cpu: number;
  /** Total memory usage across all modules */
  memory: number;
  /** Total disk usage across all modules */
  disk: number;
  /** Number of currently loaded modules */
  loadedModules: number;
  /** Total number of available modules */
  totalModules: number;
}
