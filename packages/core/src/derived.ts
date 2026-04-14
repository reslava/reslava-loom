import { Thread, ThreadStatus, ThreadPhase, PlanDoc, DesignDoc } from './types';

/**
 * Computes the derived status of a thread based on its documents.
 */
export function getThreadStatus(thread: Thread): ThreadStatus {
    const allDocs = thread.allDocs;

    // Any document cancelled → thread cancelled
    if (allDocs.some(d => d.status === 'cancelled')) {
        return 'CANCELLED';
    }

    // Any plan implementing → thread implementing
    if (allDocs.some(d => d.type === 'plan' && d.status === 'implementing')) {
        return 'IMPLEMENTING';
    }

    // Any document active or draft → thread active
    if (allDocs.some(d => d.status === 'active' || d.status === 'draft')) {
        return 'ACTIVE';
    }

    // All plans done → thread done
    const plans = allDocs.filter(d => d.type === 'plan') as PlanDoc[];
    if (plans.length > 0 && plans.every(p => p.status === 'done')) {
        return 'DONE';
    }

    // Fallback
    return 'ACTIVE';
}

/**
 * Computes the derived phase of a thread based on its documents.
 */
export function getThreadPhase(thread: Thread): ThreadPhase {
    const { idea, design, plans } = thread;

    // Any plan implementing or done → implementing phase
    if (plans.some(p => p.status === 'implementing' || p.status === 'done')) {
        return 'implementing';
    }

    // Any plan exists (draft, active, blocked) → planning phase
    if (plans.length > 0) {
        return 'planning';
    }

    // Design exists → designing phase
    if (design) {
        return 'designing';
    }

    // Only idea exists → ideating phase
    return 'ideating';
}

/**
 * Determines if a plan is stale relative to its parent design.
 */
export function isPlanStale(plan: PlanDoc, design: DesignDoc): boolean {
    return plan.design_version < design.version;
}

/**
 * Returns all stale plans in a thread.
 */
export function getStalePlans(thread: Thread): PlanDoc[] {
    return thread.plans.filter(p => isPlanStale(p, thread.design));
}