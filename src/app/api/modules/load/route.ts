/**
 * API Route: POST /api/modules/load
 *
 * Loads a SuperInstance module into memory.
 * In the current implementation, this simulates module loading
 * and updates the module's status and resource metrics.
 *
 * @module api/modules/load
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrInitRegistry } from '@/lib/module-registry';

export const dynamic = 'force-dynamic';

/**
 * Request body for loading a module
 */
interface LoadModuleRequest {
  /** The module ID (package name) to load */
  moduleId: string;
}

/**
 * POST handler for /api/modules/load
 *
 * Loads a module by ID and updates its status to 'loaded'.
 * Simulates a 1-second load time and assigns random resource usage.
 *
 * @param request - Next.js request object
 * @returns JSON response with updated module state
 */
export async function POST(request: NextRequest) {
  try {
    const { moduleId } = await request.json() as LoadModuleRequest;

    if (!moduleId) {
      return NextResponse.json(
        { success: false, error: 'Module ID is required' },
        { status: 400 }
      );
    }

    const registry = await getOrInitRegistry();
    const targetModule = registry.getModuleState(moduleId);

    if (!targetModule) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 }
      );
    }

    // Check if already loaded
    if (targetModule.loaded) {
      return NextResponse.json({
        success: true,
        message: 'Module already loaded',
        module: targetModule,
      });
    }

    // Update status to loading
    registry.updateModuleStatus(moduleId, 'loading');

    // Simulate module loading (in real implementation, this would dynamically import the module)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update status to loaded
    registry.updateModuleStatus(moduleId, 'loaded');
    registry.updateModuleResources(moduleId, {
      cpu: Math.floor(Math.random() * 30) + 5,
      memory: Math.floor(Math.random() * 200) + 50,
    });

    const updatedModule = registry.getModuleState(moduleId);

    return NextResponse.json({
      success: true,
      message: `Module ${moduleId} loaded successfully`,
      module: updatedModule,
    });
  } catch (error) {
    console.error('Error loading module:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load module',
      },
      { status: 500 }
    );
  }
}
