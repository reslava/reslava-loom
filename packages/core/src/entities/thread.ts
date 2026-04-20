import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { Document } from './document';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE' | 'BLOCKED';
export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Thread {
    id: string;
    ideas: IdeaDoc[];
    designs: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    allDocs: Document[];
}

/**
 * Temporary helper to maintain backward compatibility during migration.
 * Returns the first design in the array (or the one with role: 'primary' if present).
 * @deprecated Will be removed in Phase 3.
 */
export function getPrimaryDesign(thread: Thread): DesignDoc | undefined {
    const primary = thread.designs.find(d => d.role === 'primary');
    return primary || thread.designs[0];
}