import { Weave } from './entities/weave';
import { WorkflowEvent } from './events/workflowEvent';
import { DesignDoc } from './entities/design';
import { PlanDoc } from './entities/plan';
import { designReducer } from './reducers/designReducer';
import { planReducer } from './reducers/planReducer';

export function applyEvent(weave: Weave, event: WorkflowEvent): Weave {
    const updatedDocs = [...weave.allDocs];
    let designUpdated = false;
    let updatedDesignId: string | null = null;
    let newDesignVersion: number | null = null;

    for (let i = 0; i < updatedDocs.length; i++) {
        const doc = updatedDocs[i];

        if (doc.type === 'design') {
            const designDoc = doc as DesignDoc;
            if (event.type === 'REFINE_DESIGN') {
                const updated = designReducer(designDoc, event);
                updatedDocs[i] = updated;
                designUpdated = true;
                updatedDesignId = designDoc.id;
                newDesignVersion = updated.version;
            } else if (
                ['ACTIVATE_DESIGN', 'CLOSE_DESIGN', 'REOPEN_DESIGN', 'FINALISE_DESIGN', 'CANCEL_DESIGN'].includes(event.type)
            ) {
                updatedDocs[i] = designReducer(designDoc, event as any);
            }
        }

        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const eventPlanId = (event as any).planId;
            if (eventPlanId && planDoc.id !== eventPlanId) continue;

            if (
                ['ACTIVATE_PLAN', 'START_IMPLEMENTING_PLAN', 'COMPLETE_STEP', 'FINISH_PLAN', 'BLOCK_PLAN', 'UNBLOCK_PLAN', 'CANCEL_PLAN'].includes(event.type)
            ) {
                updatedDocs[i] = planReducer(planDoc, event as any);
            }
        }
    }

    // Mark child plans stale if their parent design was refined
    if (designUpdated && updatedDesignId && newDesignVersion) {
        for (let i = 0; i < updatedDocs.length; i++) {
            const doc = updatedDocs[i];
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                if (planDoc.parent_id === updatedDesignId) {
                    updatedDocs[i] = {
                        ...planDoc,
                        staled: true,
                        updated: new Date().toISOString().split('T')[0],
                    };
                }
            }
        }
    }

    const ideas = updatedDocs.filter(d => d.type === 'idea') as any[];
    const designs = updatedDocs.filter(d => d.type === 'design') as DesignDoc[];
    const plans = updatedDocs.filter(d => d.type === 'plan') as PlanDoc[];
    const dones = updatedDocs.filter(d => d.type === 'done') as any[];
    const contexts = updatedDocs.filter(d => d.type === 'ctx') as any[];
    const chats = updatedDocs.filter(d => d.type === 'chat') as any[];

    return {
        id: weave.id,
        ideas,
        designs,
        plans,
        dones,
        contexts,
        chats,
        allDocs: updatedDocs,
    };
}