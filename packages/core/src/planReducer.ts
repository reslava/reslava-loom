import { PlanDoc, PlanEvent, PlanStep } from './types';

/**
 * Pure reducer for plan documents.
 * Applies a PlanEvent to a PlanDoc and returns the updated document.
 * Throws an error for invalid state transitions.
 */
export function planReducer(doc: PlanDoc, event: PlanEvent): PlanDoc {
    const updated = new Date().toISOString().split('T')[0];

    switch (event.type) {
        case 'CREATE_PLAN':
            return { ...doc, status: 'draft' };

        case 'ACTIVATE_PLAN':
            if (doc.status !== 'draft') {
                throw new Error(`Invalid transition: ACTIVATE_PLAN requires status 'draft', got '${doc.status}'`);
            }
            return { ...doc, status: 'active', updated };

        case 'START_IMPLEMENTING_PLAN':
            if (doc.status !== 'active') {
                throw new Error(`Invalid transition: START_IMPLEMENTING_PLAN requires status 'active', got '${doc.status}'`);
            }
            return { ...doc, status: 'implementing', updated };

        case 'COMPLETE_STEP': {
            if (doc.status !== 'implementing') {
                throw new Error(`Invalid transition: COMPLETE_STEP requires status 'implementing', got '${doc.status}'`);
            }

            const stepIndex = event.stepIndex;
            if (stepIndex < 0 || stepIndex >= doc.steps.length) {
                throw new Error(`Invalid step index: ${stepIndex}. Plan has ${doc.steps.length} steps.`);
            }

            const steps = doc.steps.map((step, idx): PlanStep => {
                if (idx === stepIndex) {
                    return { ...step, done: true };
                }
                return step;
            });

            const allDone = steps.every(s => s.done);
            const newStatus = allDone ? 'done' : doc.status;

            return {
                ...doc,
                steps,
                status: newStatus,
                updated,
            };
        }

        case 'FINISH_PLAN':
            if (doc.status !== 'implementing') {
                throw new Error(`Invalid transition: FINISH_PLAN requires status 'implementing', got '${doc.status}'`);
            }
            return { ...doc, status: 'done', updated };

        case 'BLOCK_PLAN':
            if (!['active', 'implementing'].includes(doc.status)) {
                throw new Error(`Invalid transition: BLOCK_PLAN requires status 'active' or 'implementing', got '${doc.status}'`);
            }
            return { ...doc, status: 'blocked', updated };

        case 'UNBLOCK_PLAN':
            if (doc.status !== 'blocked') {
                throw new Error(`Invalid transition: UNBLOCK_PLAN requires status 'blocked', got '${doc.status}'`);
            }
            // Return to 'active' (not 'implementing')—user must explicitly resume
            return { ...doc, status: 'active', updated };

        case 'CANCEL_PLAN':
            if (!['draft', 'active', 'implementing', 'blocked'].includes(doc.status)) {
                throw new Error(`Invalid transition: CANCEL_PLAN requires status 'draft', 'active', 'implementing', or 'blocked', got '${doc.status}'`);
            }
            return { ...doc, status: 'cancelled', updated };

        default:
            const _exhaustive: never = event;
            throw new Error(`Unknown event type: ${(event as any).type}`);
    }
}