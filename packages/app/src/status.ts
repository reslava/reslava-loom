import { getActiveLoomRoot } from '../../fs/dist';
import { loadThread } from '../../fs/dist';
import { buildLinkIndex } from '../../fs/dist';
import { getThreadStatus, getThreadPhase } from '../../core/dist';
import { LinkIndex } from '../../core/dist/linkIndex';
import { PlanDoc } from '../../core/dist/entities/plan';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface StatusInput {
    threadId?: string;
    verbose?: boolean;
    json?: boolean;
    tokens?: boolean;
}

export interface StatusDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    loadThread: typeof loadThread;
    buildLinkIndex: typeof buildLinkIndex;
    fs: typeof fs;
}

export interface ThreadStatusResult {
    id: string;
    status: string;
    phase: string;
    designVersion: number;
    designTitle: string;
    planCount: number;
    plansDone: number;
    activePlan?: {
        id: string;
        status: string;
        stepsDone: number;
        stepsTotal: number;
        steps: Array<{
            order: number;
            description: string;
            done: boolean;
            blockedBy: string[];
        }>;
    };
}

export async function status(
    input: StatusInput,
    deps: StatusDeps
): Promise<{ single?: ThreadStatusResult; list?: Array<{ id: string; status: string }> }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const index = await deps.buildLinkIndex();

    if (input.threadId) {
        const thread = await deps.loadThread(input.threadId);
        const threadStatus = getThreadStatus(thread);
        const phase = getThreadPhase(thread);
        const activePlan = thread.plans.find(p => p.status === 'implementing' || p.status === 'active');

        const result: ThreadStatusResult = {
            id: thread.id,
            status: threadStatus,
            phase,
            designVersion: thread.design.version,
            designTitle: thread.design.title,
            planCount: thread.plans.length,
            plansDone: thread.plans.filter(p => p.status === 'done').length,
        };

        if (activePlan) {
            const steps = activePlan.steps || [];
            const stepsDone = steps.filter(s => s.done).length;
            result.activePlan = {
                id: activePlan.id,
                status: activePlan.status,
                stepsDone,
                stepsTotal: steps.length,
                steps: steps.map(s => ({
                    order: s.order,
                    description: s.description,
                    done: s.done,
                    blockedBy: s.blockedBy || [],
                })),
            };
        }

        return { single: result };
    }

    // List all threads
    if (!deps.fs.existsSync(threadsDir)) {
        return { list: [] };
    }

    const entries = await deps.fs.readdir(threadsDir);
    const list: Array<{ id: string; status: string }> = [];

    for (const entry of entries) {
        const threadPath = path.join(threadsDir, entry);
        const stat = await deps.fs.stat(threadPath);
        if (stat.isDirectory() && entry !== '_archive') {
            try {
                const thread = await deps.loadThread(entry);
                list.push({ id: entry, status: getThreadStatus(thread) });
            } catch {
                list.push({ id: entry, status: 'INVALID' });
            }
        }
    }

    return { list };
}