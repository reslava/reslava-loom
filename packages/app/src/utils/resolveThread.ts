import { Weave } from '../../../core/dist/entities/weave';
import { Thread } from '../../../core/dist/entities/thread';

export function resolveThread(weave: Weave, planId: string): Thread | undefined {
    return weave.threads.find(t => t.plans.some(p => p.id === planId));
}
