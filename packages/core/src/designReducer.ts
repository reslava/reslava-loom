import { DesignDoc, DesignEvent } from './types';

/**
 * Pure reducer for design documents.
 * Applies a DesignEvent to a DesignDoc and returns the updated document.
 * Throws an error for invalid state transitions.
 */
export function designReducer(doc: DesignDoc, event: DesignEvent): DesignDoc {
    const updated = new Date().toISOString().split('T')[0];

    switch (event.type) {
        case 'CREATE_DESIGN':
            return { ...doc, status: 'draft' };

        case 'ACTIVATE_DESIGN':
            if (doc.status !== 'draft') {
                throw new Error(`Invalid transition: ACTIVATE_DESIGN requires status 'draft', got '${doc.status}'`);
            }
            return { ...doc, status: 'active', updated };

        case 'CLOSE_DESIGN':
            if (doc.status !== 'active') {
                throw new Error(`Invalid transition: CLOSE_DESIGN requires status 'active', got '${doc.status}'`);
            }
            return { ...doc, status: 'closed', updated };

        case 'REOPEN_DESIGN':
            if (doc.status !== 'closed') {
                throw new Error(`Invalid transition: REOPEN_DESIGN requires status 'closed', got '${doc.status}'`);
            }
            return { ...doc, status: 'active', updated };

        case 'REFINE_DESIGN':
            if (!['active', 'closed', 'done'].includes(doc.status)) {
                throw new Error(`Invalid transition: REFINE_DESIGN requires status 'active', 'closed', or 'done', got '${doc.status}'`);
            }
            return {
                ...doc,
                status: 'active',
                version: doc.version + 1,
                refined: true,
                updated,
            };

        case 'FINALISE_DESIGN':
            if (doc.status !== 'active') {
                throw new Error(`Invalid transition: FINALISE_DESIGN requires status 'active', got '${doc.status}'`);
            }
            return { ...doc, status: 'done', updated };

        case 'CANCEL_DESIGN':
            if (!['draft', 'active', 'closed'].includes(doc.status)) {
                throw new Error(`Invalid transition: CANCEL_DESIGN requires status 'draft', 'active', or 'closed', got '${doc.status}'`);
            }
            return { ...doc, status: 'cancelled', updated };

        default:
            // TypeScript exhaustiveness check
            const _exhaustive: never = event;
            throw new Error(`Unknown event type: ${(event as any).type}`);
    }
}