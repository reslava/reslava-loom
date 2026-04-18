import { Thread } from './entities/thread';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';
import { ThreadStatus, ThreadPhase } from './entities/thread';

export function getThreadStatus(thread: Thread): ThreadStatus {
    const allDocs = thread.allDocs;

    if (allDocs.some(d => d.status === 'cancelled')) {
        return 'CANCELLED';
    }
    if (allDocs.some(d => d.type === 'plan' && d.status === 'implementing')) {
        return 'IMPLEMENTING';
    }
    if (allDocs.some(d => d.status === 'active' || d.status === 'draft')) {
        return 'ACTIVE';
    }
    const plans = allDocs.filter(d => d.type === 'plan') as PlanDoc[];
    if (plans.length > 0 && plans.every(p => p.status === 'done')) {
        return 'DONE';
    }
    return 'ACTIVE';
}

export function getThreadPhase(thread: Thread): ThreadPhase {
    const { idea, design, plans } = thread;

    if (plans.some(p => p.status === 'implementing' || p.status === 'done')) {
        return 'implementing';
    }
    if (plans.length > 0) {
        return 'planning';
    }
    if (design) {
        return 'designing';
    }
    return 'ideating';
}

export function isPlanStale(plan: PlanDoc, design: DesignDoc): boolean {
    return plan.design_version < design.version;
}

export function getStalePlans(thread: Thread): PlanDoc[] {
    return thread.plans.filter(p => isPlanStale(p, thread.design));
}