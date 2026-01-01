'use client';

/**
 * Settings Page - Configuration Management
 *
 * Provides UI for managing API keys and system settings.
 * API keys are stored locally in the browser's localStorage.
 *
 * @module app/settings
 */

import { useState, useEffect } from 'react';
import { Settings, Key, Server, Save, Eye, EyeOff, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface ApiConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  apiKey: string;
  baseUrl?: string;
  masked: boolean;
}

interface SystemConfig {
  maxModules: number;
  autoLoad: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export default function SettingsPage() {
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maxModules: 10,
    autoLoad: [],
    logLevel: 'info',
  });
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKey, setNewKey] = useState<{
    name: string;
    provider: ApiConfig['provider'];
    apiKey: string;
    baseUrl: string;
  }>({
    name: '',
    provider: 'openai',
    apiKey: '',
    baseUrl: '',
  });

  useEffect(() => {
    // Load saved configs from localStorage
    const savedConfigs = localStorage.getItem('api-configs');
    if (savedConfigs) {
      const configs = JSON.parse(savedConfigs);
      setApiConfigs(configs.map((c: any) => ({ ...c, masked: true })));
    }

    const savedSystem = localStorage.getItem('system-config');
    if (savedSystem) {
      setSystemConfig(JSON.parse(savedSystem));
    }
  }, []);

  const saveApiConfigs = (configs: ApiConfig[]) => {
    const toSave = configs.map(({ masked, ...rest }) => rest);
    localStorage.setItem('api-configs', JSON.stringify(toSave));
  };

  const toggleMask = (id: string) => {
    setApiConfigs(configs =>
      configs.map(c =>
        c.id === id ? { ...c, masked: !c.masked } : c
      )
    );
  };

  const addApiKey = () => {
    if (!newKey.name || !newKey.apiKey) return;

    const config: ApiConfig = {
      id: Date.now().toString(),
      name: newKey.name,
      provider: newKey.provider,
      apiKey: newKey.apiKey,
      baseUrl: newKey.baseUrl || undefined,
      masked: true,
    };

    const updated = [...apiConfigs, config];
    setApiConfigs(updated);
    saveApiConfigs(updated);
    setNewKey({ name: '', provider: 'openai', apiKey: '', baseUrl: '' });
    setShowNewKeyForm(false);
  };

  const removeApiKey = (id: string) => {
    const updated = apiConfigs.filter(c => c.id !== id);
    setApiConfigs(updated);
    saveApiConfigs(updated);
  };

  const saveSystemConfig = () => {
    localStorage.setItem('system-config', JSON.stringify(systemConfig));
    // Show success indication
    alert('Settings saved successfully!');
  };

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
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure your SuperInstance environment
                </p>
              </div>
            </div>
            <button
              onClick={saveSystemConfig}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* API Keys Section */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  API Keys
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manage your API keys for cloud providers
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {apiConfigs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No API keys configured yet</p>
              </div>
            ) : (
              apiConfigs.map(config => (
                <div
                  key={config.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center text-white font-semibold">
                    {config.provider.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-slate-100">{config.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {config.provider} {config.baseUrl && `• ${config.baseUrl}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded text-sm font-mono">
                      {config.masked ? '•'.repeat(24) : config.apiKey}
                    </code>
                    <button
                      onClick={() => toggleMask(config.id)}
                      className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {config.masked ? (
                        <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      )}
                    </button>
                    <button
                      onClick={() => removeApiKey(config.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {!showNewKeyForm ? (
              <button
                onClick={() => setShowNewKeyForm(true)}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <Plus className="w-5 h-5 text-slate-500" />
                <span className="text-slate-600 dark:text-slate-400">Add API Key</span>
              </button>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newKey.name}
                      onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                      placeholder="My OpenAI Key"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Provider
                    </label>
                    <select
                      value={newKey.provider}
                      onChange={(e) => setNewKey({ ...newKey, provider: e.target.value as any })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={newKey.apiKey}
                    onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {newKey.provider === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={newKey.baseUrl}
                      onChange={(e) => setNewKey({ ...newKey, baseUrl: e.target.value })}
                      placeholder="https://api.example.com"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={addApiKey}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Add Key
                  </button>
                  <button
                    onClick={() => {
                      setShowNewKeyForm(false);
                      setNewKey({ name: '', provider: 'openai', apiKey: '', baseUrl: '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* System Settings Section */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Server className="w-6 h-6 text-purple-500" />
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  System Settings
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Configure runtime behavior
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Max Concurrent Modules
              </label>
              <input
                type="number"
                value={systemConfig.maxModules}
                onChange={(e) => setSystemConfig({ ...systemConfig, maxModules: parseInt(e.target.value) || 1 })}
                min="1"
                max="50"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Maximum number of modules that can be loaded simultaneously
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Log Level
              </label>
              <select
                value={systemConfig.logLevel}
                onChange={(e) => setSystemConfig({ ...systemConfig, logLevel: e.target.value as any })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="debug">Debug</option>
                <option value="info">Info</option>
                <option value="warn">Warning</option>
                <option value="error">Error</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Controls the verbosity of system logs
              </p>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            About API Keys
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            API keys are stored locally in your browser and are never sent to any server other than the
            respective provider's API. Configure your keys here to enable cloud LLM features across all
            SuperInstance modules.
          </p>
        </section>
      </main>
    </div>
  );
}
