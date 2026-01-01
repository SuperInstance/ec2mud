'use client';

/**
 * ModuleCard Component
 *
 * A React component that displays a module's information and provides
 * controls for loading/unloading the module and viewing documentation.
 *
 * @module ModuleCard
 */

import { useState } from 'react';
import { ModuleState } from '@/types/modules';
import { cn } from '@/lib/utils';
import { Package, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Props for the ModuleCard component
 */
interface ModuleCardProps {
  /** The module state to display */
  module: ModuleState;
  /** Callback function invoked when the user clicks the Load button */
  onLoad?: (id: string) => Promise<void>;
  /** Callback function invoked when the user clicks the Unload button */
  onUnload?: (id: string) => Promise<void>;
}

/**
 * Returns the appropriate status icon based on module status
 *
 * @param status - The current module status
 * @returns A React element representing the status icon
 */
function getStatusIcon(status: ModuleState['status']) {
  switch (status) {
    case 'loaded':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'loading':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Loader2 className="w-4 h-4 text-slate-400" />;
  }
}

/**
 * Returns human-readable status text
 *
 * @param status - The current module status
 * @returns A string describing the status
 */
function getStatusText(status: ModuleState['status']) {
  switch (status) {
    case 'loaded':
      return 'Active';
    case 'loading':
      return 'Loading...';
    case 'error':
      return 'Error';
    default:
      return 'Idle';
  }
}

/**
 * Returns a category badge component
 *
 * @param category - The module category ('foundation' or 'feature')
 * @returns A React element representing the category badge
 */
function getCategoryBadge(category: 'foundation' | 'feature') {
  if (category === 'foundation') {
    return (
      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
        Foundation
      </span>
    );
  }
  return (
    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
      Feature
    </span>
  );
}

/**
 * ModuleCard Component
 *
 * Displays a module with its metadata, status, resource usage, and action buttons.
 * Manages local state for loading/unloading animations and error display.
 */
export function ModuleCard({ module, onLoad, onUnload }: ModuleCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [localModule, setLocalModule] = useState(module);

  /**
   * Handles the module load action
   */
  const handleLoad = async () => {
    if (isLoading || localModule.loaded) return;
    setIsLoading(true);
    setLocalModule({ ...localModule, status: 'loading' });
    try {
      await onLoad?.(localModule.id);
      setLocalModule({ ...localModule, status: 'loaded', loaded: true });
    } catch (error) {
      setLocalModule({ ...localModule, status: 'error', error: error instanceof Error ? error.message : 'Failed to load' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the module unload action
   */
  const handleUnload = async () => {
    if (isLoading || !localModule.loaded) return;
    setIsLoading(true);
    try {
      await onUnload?.(localModule.id);
      setLocalModule({ ...localModule, status: 'idle', loaded: false, resources: { cpu: 0, memory: 0, disk: 0, lastUpdate: new Date() } });
    } catch (error) {
      setLocalModule({ ...localModule, status: 'error', error: error instanceof Error ? error.message : 'Failed to unload' });
    } finally {
      setIsLoading(false);
    }
  };

  const npmUrl = `https://www.npmjs.com/package/${localModule.metadata.name}`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            localModule.category === 'foundation'
              ? "bg-blue-100 dark:bg-blue-900/30"
              : "bg-purple-100 dark:bg-purple-900/30"
          )}>
            <Package className={cn(
              "w-5 h-5",
              localModule.category === 'foundation'
                ? "text-blue-600 dark:text-blue-400"
                : "text-purple-600 dark:text-purple-400"
            )} />
          </div>
          {getCategoryBadge(localModule.category)}
        </div>
        <div className="flex items-center gap-1.5">
          {getStatusIcon(localModule.status)}
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {getStatusText(localModule.status)}
          </span>
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {localModule.metadata.name}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
        {localModule.metadata.description}
      </p>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mb-4">
        <span>v{localModule.metadata.version}</span>
        <span>{localModule.metadata.license || 'MIT'}</span>
      </div>

      {/* Resource Usage */}
      {localModule.loaded && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">CPU</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{localModule.resources.cpu}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${localModule.resources.cpu}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">Memory</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{localModule.resources.memory} MB</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(localModule.resources.memory / 10, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {localModule.loaded ? (
          <button
            onClick={handleUnload}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unload
          </button>
        ) : (
          <button
            onClick={handleLoad}
            disabled={isLoading || localModule.status === 'loading'}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {localModule.status === 'loading' ? 'Loading...' : 'Load Module'}
          </button>
        )}
        <a
          href={npmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-center"
        >
          Docs
        </a>
      </div>

      {/* Error State */}
      {localModule.status === 'error' && localModule.error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{localModule.error}</p>
        </div>
      )}
    </div>
  );
}
