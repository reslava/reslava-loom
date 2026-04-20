import { Thread } from './entities/thread';
import { WorkflowEvent } from './events/workflowEvent';
import { DesignDoc } from './entities/design';
import { PlanDoc } from './entities/plan';
import { designReducer } from './reducers/designReducer';
import { planReducer } from './reducers/planReducer';
import { getPrimaryDesign } from './entities/thread';

export function applyEvent(thread: Thread, event: WorkflowEvent): Thread {
    const updatedDocs = [...thread.allDocs];
    let designUpdated = false;
    let newDesignVersion: number | null = null;
    
    const primaryDesign = getPrimaryDesign(thread);

    for (let i = 0; i < updatedDocs.length; i++) {
        const doc = updatedDocs[i];

        if (doc.type === 'design') {
            const designDoc = doc as DesignDoc;
            if (event.type === 'REFINE_DESIGN' && primaryDesign && designDoc.id === primaryDesign.id) {
                const updated = designReducer(designDoc, event);
                updatedDocs[i] = updated;
                designUpdated = true;
                newDesignVersion = updated.version;
            } else if (
                ['ACTIVATE_DESIGN', 'CLOSE_DESIGN', 'REOPEN_DESIGN', 'FINALISE_DESIGN', 'CANCEL_DESIGN'].includes(event.type) &&
                primaryDesign && designDoc.id === primaryDesign.id
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

    if (designUpdated && newDesignVersion && primaryDesign) {
        for (let i = 0; i < updatedDocs.length; i++) {
            const doc = updatedDocs[i];
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                if (planDoc.parent_id === primaryDesign.id) {
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
    const contexts = updatedDocs.filter(d => d.type === 'ctx') as any[];

    return {
        id: thread.id,
        ideas,
        designs,
        plans,
        contexts,
        allDocs: updatedDocs,
    };
}