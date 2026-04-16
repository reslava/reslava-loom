import * as path from 'path';
import { loadDoc } from './load';
import { getActiveLoomRoot } from './utils';
import { LinkIndex, createEmptyIndex, DocumentEntry, StepBlocker } from '../../core/dist/linkIndex';
import { Document, PlanDoc } from '../../core/dist/types';
import { findMarkdownFiles } from './pathUtils';

/**
 * Builds a complete LinkIndex by scanning all documents in the active loom.
 */
export async function buildLinkIndex(): Promise<LinkIndex> {
    const loomRoot = getActiveLoomRoot();
    const index = createEmptyIndex();
    
    const allFiles = await findMarkdownFiles(loomRoot);
    
    for (const filePath of allFiles) {
        try {
            const doc = await loadDoc(filePath) as Document;
            const docId = doc.id;
            
            // 1. Add document entry
            const entry: DocumentEntry = {
                path: filePath,
                type: doc.type,
                exists: true,
            };
            index.documents.set(docId, entry);
            
            // 2. Index parent relationship
            if (doc.parent_id) {
                index.parent.set(docId, doc.parent_id);
            }
            
            // 3. Index children relationships
            if (doc.child_ids && doc.child_ids.length > 0) {
                for (const childId of doc.child_ids) {
                    if (!index.children.has(docId)) {
                        index.children.set(docId, new Set());
                    }
                    index.children.get(docId)!.add(childId);
                }
            }
            
            // 4. Index step blockers for plans
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                const blockers: StepBlocker[] = [];
                
                if (planDoc.steps) {
                    for (const step of planDoc.steps) {
                        if (step.blockedBy && step.blockedBy.length > 0) {
                            blockers.push({
                                step: step.order,
                                blockedBy: step.blockedBy,
                            });
                        }
                    }
                }
                
                if (blockers.length > 0) {
                    index.stepBlockers.set(docId, blockers);
                }
            }
        } catch (e) {
            // Skip documents with invalid frontmatter; they will be flagged by validate
            console.warn(`[buildLinkIndex] Skipping ${filePath}: ${(e as Error).message}`);
        }
    }
    
    return index;
}