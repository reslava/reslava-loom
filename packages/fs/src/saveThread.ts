import * as path from 'path';
import { Thread, Document } from '../../core/dist/types';
import { saveDoc } from './save';
import { resolveThreadPath } from './utils';

/**
 * Determines the correct filesystem path for a document based on its type and ID.
 */
function determinePathForDoc(doc: Document, threadId: string): string {
  const threadPath = resolveThreadPath(threadId);
  
  switch (doc.type) {
    case 'idea':
      return path.join(threadPath, `${threadId}-idea.md`);
    case 'design': {
      const designDoc = doc as any;
      if (designDoc.role === 'primary') {
        return path.join(threadPath, `${threadId}-design.md`);
      }
      return path.join(threadPath, `${doc.id}.md`);
    }
    case 'plan':
      return path.join(threadPath, 'plans', `${doc.id}.md`);
    case 'ctx': {
      const ctxDoc = doc as any;
      if (ctxDoc.source_version !== undefined) {
        return path.join(threadPath, `${threadId}-ctx.md`);
      }
      return path.join(threadPath, 'ctx', `${doc.id}.md`);
    }
    default:
      // Runtime safeguard
      const unknownDoc = doc as any;
      throw new Error(`Unknown document type: ${unknownDoc.type || 'undefined'}`);
  }
}

/**
 * Persists all documents in a thread to the filesystem.
 */
export async function saveThread(thread: Thread): Promise<void> {
  for (const doc of thread.allDocs) {
    let filePath = (doc as any)._path;
    
    if (!filePath) {
      filePath = determinePathForDoc(doc, thread.id);
    }
    
    await saveDoc(doc, filePath);
  }
}