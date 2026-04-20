import { Thread, ThreadStatus, ThreadPhase, getPrimaryDesign } from './entities/thread';
import { PlanDoc } from './entities/plan';
import { DesignDoc } from './entities/design';

export function getThreadStatus(thread: Thread): ThreadStatus {
    const allDocs = thread.allDocs;
    const plans = thread.plans;
    
    // 1. Implementing wins over everything
    if (plans.some(p => p.status === 'implementing')) {
        return 'IMPLEMENTING';
    }
    
    // 2. All documents done -> thread done (must have at least one plan)
    if (plans.length > 0 && allDocs.every(d => d.status === 'done')) {
        return 'DONE';
    }
    
    // 3. Any plan active or draft?
    if (plans.some(p => p.status === 'active' || p.status === 'draft')) {
        return 'ACTIVE';
    }
    
    // 4. Any plan blocked?
    if (plans.some(p => p.status === 'blocked')) {
        return 'BLOCKED';
    }
    
    // 5. Fallback
    return 'ACTIVE';
}

export function getThreadPhase(thread: Thread): ThreadPhase {
    const plans = thread.plans;
    const primaryDesign = getPrimaryDesign(thread);
    
    if (plans.some(p => p.status === 'implementing' || p.status === 'done')) {
        return 'implementing';
    }
    if (plans.length > 0) {
        return 'planning';
    }
    if (primaryDesign) {
        return 'designing';
    }
    return 'ideating';
}

export function isPlanStale(plan: PlanDoc, design: DesignDoc): boolean {
    return plan.design_version < design.version;
}

export function getStalePlans(thread: Thread): PlanDoc[] {
    const primaryDesign = getPrimaryDesign(thread);
    if (!primaryDesign) return [];
    return thread.plans.filter(p => isPlanStale(p, primaryDesign));
}