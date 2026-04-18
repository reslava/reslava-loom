import { getActiveLoomRoot } from '../../fs/dist';
import { loadThread } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { ConfigRegistry } from '../../core/dist/registry';
import { LoomState, LoomMode } from '../../core/dist/entities/state';
import { Thread } from '../../core/dist/entities/thread';
import { getThreadStatus } from '../../core/dist/derived';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface GetStateDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadThread: typeof loadThread;
    buildLinkIndex: typeof buildLinkIndex;
    registry: ConfigRegistry;
    fs: typeof fs;
}

/**
 * Retrieves the complete derived state of the active loom.
 *
 * @param deps - Filesystem, thread loading, and registry dependencies.
 * @returns A promise resolving to the full LoomState.
 */
export async function getState(deps: GetStateDeps): Promise<LoomState> {
    const loomRoot = deps.getActiveLoomRoot();
    const registry = deps.registry;
    
    // Determine mode and loom name
    const isMono = registry.isMonoLoom();
    const mode: LoomMode = isMono ? 'mono' : 'multi';
    const loomName = isMono ? '(local)' : (registry.getActiveLoomName() || 'unknown');
    
    // Load all threads
    const threadsDir = path.join(loomRoot, 'threads');
    const threads: Thread[] = [];
    
    if (deps.fs.existsSync(threadsDir)) {
        const entries = await deps.fs.readdir(threadsDir);
        for (const entry of entries) {
            const threadPath = path.join(threadsDir, entry);
            const stat = await deps.fs.stat(threadPath);
            if (stat.isDirectory() && entry !== '_archive') {
                try {
                    const thread = await deps.loadThread(entry);
                    threads.push(thread);
                } catch (e) {
                    // Skip invalid threads; they will be reported by validate
                }
            }
        }
    }
    
    // Build link index for statistics
    const index = await deps.buildLinkIndex();
    
    // Calculate summary statistics
    const totalThreads = threads.length;
    const activeThreads = threads.filter(t => getThreadStatus(t) === 'ACTIVE').length;
    const implementingThreads = threads.filter(t => getThreadStatus(t) === 'IMPLEMENTING').length;
    const doneThreads = threads.filter(t => getThreadStatus(t) === 'DONE').length;
    const totalPlans = threads.reduce((sum, t) => sum + t.plans.length, 0);
    const stalePlans = threads.reduce((sum, t) => sum + t.plans.filter(p => p.staled).length, 0);
    
    let blockedSteps = 0;
    for (const thread of threads) {
        for (const plan of thread.plans) {
            if (plan.steps) {
                for (const step of plan.steps) {
                    if (!step.done && step.blockedBy && step.blockedBy.length > 0) {
                        blockedSteps++;
                    }
                }
            }
        }
    }
    
    return {
        loomRoot,
        mode,
        loomName,
        threads,
        generatedAt: new Date().toISOString(),
        summary: {
            totalThreads,
            activeThreads,
            implementingThreads,
            doneThreads,
            totalPlans,
            stalePlans,
            blockedSteps,
        },
    };
}