/**
 * API Route: GET /api/modules
 *
 * Returns a list of all discovered SuperInstance modules with their
 * current states and aggregate statistics.
 *
 * @module api/modules
 */

import { NextResponse } from 'next/server';
import { getOrInitRegistry } from '@/lib/module-registry';

export const dynamic = 'force-dynamic';

/**
 * GET handler for /api/modules
 *
 * Scans the packages directory and returns all discovered modules
 * along with their current states and statistics.
 *
 * @returns JSON response with modules array and statistics
 */
export async function GET() {
  try {
    const registry = await getOrInitRegistry();
    const modules = registry.getAllModules();

    return NextResponse.json({
      success: true,
      modules,
      stats: registry.getStatistics(),
    });
  } catch (error) {
    console.error('Error fetching modules:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch modules',
      },
      { status: 500 }
    );
  }
}
