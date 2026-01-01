'use client';

/**
 * Homepage - Dashboard for SuperInstance Core
 *
 * Displays an overview of all available modules with statistics and
 * provides quick access to load/unload functionality.
 *
 * @module app/page
 */

import { useState, useEffect } from 'react';
import { ModuleCard } from '@/components/module-card';
import { Package, Zap, HardDrive, Cpu } from 'lucide-react';
import { ModuleState } from '@/types/modules';
import Link from 'next/link';

export default function HomePage() {
  const [modules, setModules] = useState<ModuleState[]>([]);
  const [stats, setStats] = useState({ total: 0, loaded: 0, foundation: 0, feature: 0 });

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/modules');
      const data = await res.json();
      if (data.success) {
        setModules(data.modules);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handleLoad = async (moduleId: string) => {
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
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error loading module:', error);
      throw error;
    }
  };

  const handleUnload = async (moduleId: string) => {
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
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error unloading module:', error);
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SuperInstance Core
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Modular Toolkit Hub</p>
              </div>
            </div>
            <nav className="flex gap-4">
              <Link href="/catalog" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Catalog
              </Link>
              <Link href="/settings" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Modules</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.loaded}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <Cpu className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.foundation}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Foundation</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <HardDrive className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.feature}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Feature</p>
              </div>
            </div>
          </div>
        </div>

        {/* Module Grid */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Available Modules
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Browse and load SuperInstance modular toolkits
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              module={module}
              onLoad={handleLoad}
              onUnload={handleUnload}
            />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-12 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
          <p>SuperInstance Modular Toolkit Ecosystem</p>
          <p className="mt-1">{stats.total} independent packages • Pick what you need, ignore what you don't</p>
        </div>
      </footer>
    </div>
  );
}
