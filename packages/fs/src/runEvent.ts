import { applyEvent } from '../../core/dist/applyEvent';
import { WorkflowEvent } from '../../core/dist/types';
import { loadThread } from './loadThread';
import { saveThread } from './saveThread';

/**
 * High‑level function that loads a thread, applies a workflow event,
 * and saves the updated thread back to disk.
 */
export async function runEvent(threadId: string, event: WorkflowEvent): Promise<void> {
  const thread = await loadThread(threadId);
  const updatedThread = applyEvent(thread, event);
  await saveThread(updatedThread);
}