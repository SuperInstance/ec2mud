/**
 * Global Not Found Page
 *
 * Displayed when a URL does not match any route in the application.
 * Provides a friendly 404 error page with navigation back to home.
 *
 * @module app/global-not-found
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */

import Link from 'next/link';
import { Package, Home } from 'lucide-react';

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-white dark:bg-slate-900 rounded-xl p-8 border border-slate-200 dark:border-slate-800 shadow-lg text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <Package className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          404
        </h1>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Page not found
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
