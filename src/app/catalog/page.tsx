'use client';

/**
 * Module Catalog Page
 *
 * Displays all available SuperInstance modules with search and filtering capabilities.
 * Users can browse modules by category, search by name or description, and load/unload modules.
 */

import { useState, useEffect, useCallback } from 'react';
import { ModuleState } from '@/types/modules';
import { Search, Package, Filter, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CatalogPage() {
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [filteredModules, setFilteredModules] = useState<ModuleState[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'foundation' | 'feature'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'loaded' | 'idle'>('all');

  useEffect(() => {
    fetchModules();
  }, []);

  useEffect(() => {
    let filtered = [...modules];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.metadata.name.toLowerCase().includes(query) ||
        m.metadata.description?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(m => m.category === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'loaded') {
      filtered = filtered.filter(m => m.loaded);
    } else if (statusFilter === 'idle') {
      filtered = filtered.filter(m => !m.loaded);
    }

    setFilteredModules(filtered);
  }, [modules, searchQuery, categoryFilter, statusFilter]);

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/modules');
      const data = await res.json();
      if (data.success) {
        setModules(data.modules || []);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleLoad = useCallback(async (moduleId: string) => {
    if (loadingStates[moduleId]) return;
    setLoadingStates(prev => ({ ...prev, [moduleId]: true }));

    try {
      const res = await fetch('/api/modules/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchModules();
      } else {
        console.error('Failed to load module:', data.error);
      }
    } catch (error) {
      console.error('Error loading module:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [moduleId]: false }));
    }
  }, [loadingStates]);

  const handleUnload = useCallback(async (moduleId: string) => {
    if (loadingStates[moduleId]) return;
    setLoadingStates(prev => ({ ...prev, [moduleId]: true }));

    try {
      const res = await fetch('/api/modules/unload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchModules();
      } else {
        console.error('Failed to unload module:', data.error);
      }
    } catch (error) {
      console.error('Error unloading module:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [moduleId]: false }));
    }
  }, [loadingStates]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Module Catalog
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Browse all {modules.length} available modules
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search & Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search modules by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
              >
                <option value="all">All Categories</option>
                <option value="foundation">Foundation</option>
                <option value="feature">Feature</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
            >
              <option value="all">All Status</option>
              <option value="loaded">Active</option>
              <option value="idle">Idle</option>
            </select>
          </div>

          {/* Results count */}
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            Showing {filteredModules.length} of {modules.length} modules
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    module.category === 'foundation'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      module.category === 'foundation'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`} />
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    module.category === 'foundation'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  }`}>
                    {module.category}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 ${
                  module.loaded ? 'text-green-500' : 'text-slate-400'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  <span className="text-xs font-medium">
                    {module.loaded ? 'Active' : 'Idle'}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {module.metadata.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                {module.metadata.description || 'No description available'}
              </p>

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-500 mb-4">
                <span>v{module.metadata.version}</span>
                <span>{module.metadata.license || 'MIT'}</span>
              </div>

              {/* Dependencies */}
              {module.metadata.dependencies && Object.keys(module.metadata.dependencies).length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Dependencies:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(module.metadata.dependencies)
                      .filter(([name]) => name.startsWith('@superinstance/'))
                      .slice(0, 3)
                      .map(([name]) => (
                        <span key={name} className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                          {name.replace('@superinstance/', '')}
                        </span>
                      ))}
                    {Object.keys(module.metadata.dependencies).filter(n => n.startsWith('@superinstance/')).length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                        +{Object.keys(module.metadata.dependencies).filter(n => n.startsWith('@superinstance/')).length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {module.loaded ? (
                  <button
                    onClick={() => handleUnload(module.id)}
                    disabled={loadingStates[module.id]}
                    className="flex-1 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Unload
                  </button>
                ) : (
                  <button
                    onClick={() => handleLoad(module.id)}
                    disabled={loadingStates[module.id]}
                    className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load Module
                  </button>
                )}
                <a
                  href={`https://www.npmjs.com/package/${module.metadata.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Docs
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredModules.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              No modules found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
