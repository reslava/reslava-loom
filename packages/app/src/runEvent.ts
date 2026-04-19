import { loadThread } from '../../fs/dist';
import { saveThread } from '../../fs/dist';
import { applyEvent } from '../../core/dist/applyEvent';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';
import { Thread } from '../../core/dist/entities/thread';

export interface RunEventDeps {
    loadThread: (loomRoot: string, threadId: string) => Promise<Thread>;
    saveThread: (loomRoot: string, thread: Thread) => Promise<void>;
    loomRoot: string;
}

export async function runEvent(
    threadId: string,
    event: WorkflowEvent,
    deps: RunEventDeps
): Promise<Thread> {
    const thread = await deps.loadThread(deps.loomRoot, threadId);
    const updatedThread = applyEvent(thread, event);
    await deps.saveThread(deps.loomRoot, updatedThread);
    return updatedThread;
}