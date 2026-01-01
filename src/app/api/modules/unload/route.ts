/**
 * API Route: POST /api/modules/unload
 *
 * Unloads a previously loaded SuperInstance module from memory.
 *
 * @module api/modules/unload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrInitRegistry } from '@/lib/module-registry';

export const dynamic = 'force-dynamic';

/**
 * Request body for unloading a module
 */
interface UnloadModuleRequest {
  /** The module ID (package name) to unload */
  moduleId: string;
}

/**
 * POST handler for /api/modules/unload
 *
 * Unloads a module by ID and resets its status to 'idle'
 * with zero resource usage.
 *
 * @param request - Next.js request object
 * @returns JSON response with updated module state
 */
export async function POST(request: NextRequest) {
  try {
    const { moduleId } = await request.json() as UnloadModuleRequest;

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

    // Check if not loaded
    if (!targetModule.loaded) {
      return NextResponse.json({
        success: true,
        message: 'Module already unloaded',
        module: targetModule,
      });
    }

    // Update status to idle (unloaded)
    registry.updateModuleStatus(moduleId, 'idle');
    registry.updateModuleResources(moduleId, { cpu: 0, memory: 0 });

    const updatedModule = registry.getModuleState(moduleId);

    return NextResponse.json({
      success: true,
      message: `Module ${moduleId} unloaded successfully`,
      module: updatedModule,
    });
  } catch (error) {
    console.error('Error unloading module:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unload module',
      },
      { status: 500 }
    );
  }
}
