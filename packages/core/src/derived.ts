import { Weave, WeaveStatus, WeavePhase } from './entities/weave';
import { Thread, ThreadStatus } from './entities/thread';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';

export function getWeaveStatus(weave: Weave): WeaveStatus {
    const plans = weave.threads.flatMap(t => t.plans);

    if (plans.some(p => p.status === 'implementing')) return 'IMPLEMENTING';
    if (plans.length > 0 && weave.allDocs.every(d => d.status === 'done')) return 'DONE';
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) return 'ACTIVE';
    if (plans.some(p => p.status === 'blocked')) return 'BLOCKED';
    return 'ACTIVE';
}

export function getWeavePhase(weave: Weave): WeavePhase {
    const plans = weave.threads.flatMap(t => t.plans);
    const hasDesign = weave.threads.some(t => t.design != null);

    if (plans.some(p => p.status === 'implementing' || p.status === 'done')) return 'implementing';
    if (plans.length > 0) return 'planning';
    if (hasDesign) return 'designing';
    return 'ideating';
}

export function isPlanStale(plan: PlanDoc, design: DesignDoc): boolean {
    return plan.design_version < design.version;
}

export function getStalePlans(weave: Weave): PlanDoc[] {
    return weave.threads.flatMap(thread => {
        if (!thread.design) return [];
        return thread.plans.filter(p => isPlanStale(p, thread.design!));
    });
}

export function getThreadStatus(thread: Thread): ThreadStatus {
    const plans = thread.plans;

    if (plans.some(p => p.status === 'implementing')) return 'IMPLEMENTING';
    if (plans.length > 0 && thread.allDocs.every(d => d.status === 'done')) return 'DONE';
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) return 'ACTIVE';
    if (plans.some(p => p.status === 'blocked')) return 'BLOCKED';
    return 'ACTIVE';
}
