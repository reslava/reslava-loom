import * as path from 'path';
import * as fs from 'fs-extra';
import { getActiveLoomRoot } from '../utils/workspaceUtils';
import { findMarkdownFiles } from '../utils/pathUtils';
import { loadDoc } from '../serializers/frontmatterLoader';
import { LinkIndex, createEmptyIndex, DocumentEntry, StepBlocker } from '../../../core/dist/linkIndex';
import { Document, PlanDoc } from '../../../core/dist/types';

export async function buildLinkIndex(): Promise<LinkIndex> {
    const loomRoot = getActiveLoomRoot();
    const threadsDir = path.join(loomRoot, 'threads');
    const index = createEmptyIndex();
    
    // If threads/ doesn't exist, return empty index
    if (!fs.existsSync(threadsDir)) {
        return index;
    }
    
    const allFiles = await findMarkdownFiles(threadsDir);
    
    for (const filePath of allFiles) {
        try {
            const doc = await loadDoc(filePath) as Document;
            const docId = doc.id;
            
            const entry: DocumentEntry = {
                path: filePath,
                type: doc.type,
                exists: true,
            };
            index.documents.set(docId, entry);
            
            if (doc.parent_id) {
                index.parent.set(docId, doc.parent_id);
            }
            
            if (doc.child_ids && doc.child_ids.length > 0) {
                for (const childId of doc.child_ids) {
                    if (!index.children.has(docId)) {
                        index.children.set(docId, new Set());
                    }
                    index.children.get(docId)!.add(childId);
                }
            }
            
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
            console.warn(`[buildLinkIndex] Skipping ${filePath}: ${(e as Error).message}`);
        }
    }
    
    return index;
}