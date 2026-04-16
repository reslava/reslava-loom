import * as path from 'path';
import { loadDoc } from './load';
import { LinkIndex, DocumentEntry, StepBlocker } from '../../core/dist/linkIndex';
import { Document, PlanDoc } from '../../core/dist/types';

/**
 * Updates the link index incrementally when a single file is created, changed, or deleted.
 * This avoids the cost of a full rebuild on every file change.
 *
 * @param index - The current link index to mutate.
 * @param filePath - Absolute path to the changed file.
 * @param event - 'create', 'change', or 'delete'.
 */
export async function updateIndexForFile(
    index: LinkIndex,
    filePath: string,
    event: 'create' | 'change' | 'delete'
): Promise<void> {
    const docId = path.basename(filePath, '.md');

    // 1. Remove all existing entries for this document
    removeDocumentFromIndex(index, docId);

    if (event === 'delete') {
        // Mark as non-existent but keep an entry for orphan detection
        index.documents.set(docId, {
            path: filePath,
            type: 'idea', // Placeholder, will be overridden if recreated
            exists: false,
        });
        return;
    }

    // 2. For create/change, reload the document and re-index
    try {
        const doc = await loadDoc(filePath) as Document;

        // Add document entry
        const entry: DocumentEntry = {
            path: filePath,
            type: doc.type,
            exists: true,
        };
        index.documents.set(docId, entry);

        // Index parent relationship
        if (doc.parent_id) {
            index.parent.set(docId, doc.parent_id);
        }

        // Index children relationships
        if (doc.child_ids && doc.child_ids.length > 0) {
            for (const childId of doc.child_ids) {
                if (!index.children.has(docId)) {
                    index.children.set(docId, new Set());
                }
                index.children.get(docId)!.add(childId);
            }
        }

        // Index step blockers for plans
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
        // Document is invalid (e.g., bad frontmatter); mark as non-existent
        index.documents.set(docId, {
            path: filePath,
            type: 'idea',
            exists: false,
        });
    }
}

/**
 * Removes all traces of a document from the index.
 */
function removeDocumentFromIndex(index: LinkIndex, docId: string): void {
    // Remove from documents map
    index.documents.delete(docId);

    // Remove from parent map
    index.parent.delete(docId);

    // Remove from children map (both as key and as values in other sets)
    index.children.delete(docId);
    for (const childSet of index.children.values()) {
        childSet.delete(docId);
    }

    // Remove from stepBlockers map
    index.stepBlockers.delete(docId);
}