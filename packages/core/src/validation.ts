import { Document } from './entities/document';
import { PlanDoc } from './entities/plan';

import { LinkIndex } from './linkIndex';

export interface ValidationIssue {
    documentId: string;
    severity: 'error' | 'warning';
    message: string;
}

/**
 * Checks whether a document's parent_id exists in the link index.
 */
export function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    const parent = index.documents.get(doc.parent_id);
    if (!parent) return false;
    return parent.exists || parent.archived;
}

/**
 * Returns dangling child references via the backlink index.
 * child_ids is removed from frontmatter; children are derived from parent_id references.
 * This function is now a no-op — kept for API compatibility.
 */
export function getDanglingChildIds(_doc: Document, _index: LinkIndex): string[] {
    return [];
}

/**
 * Validates the step blockers within a plan.
 */
export function validateStepBlockers(plan: PlanDoc, index: LinkIndex): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!plan.steps) return issues;
    
    for (const step of plan.steps) {
        if (!step.blockedBy || step.blockedBy.length === 0) continue;
        
        for (const blocker of step.blockedBy) {
            // Internal step dependency: "Step N"
            if (blocker.startsWith('Step ')) {
                const stepNum = parseInt(blocker.replace('Step ', ''), 10);
                if (isNaN(stepNum) || stepNum < 1 || stepNum > plan.steps.length) {
                    issues.push({
                        documentId: plan.id,
                        severity: 'error',
                        message: `Step ${step.order}: invalid blocker "${blocker}"`,
                    });
                }
                continue;
            }
            
            // Cross‑plan dependency: plan ID
            if (blocker.includes('-plan-')) {
                if (!index.documents.has(blocker)) {
                    issues.push({
                        documentId: plan.id,
                        severity: 'warning',
                        message: `Step ${step.order}: blocked by missing plan "${blocker}"`,
                    });
                }
                continue;
            }
            
            // Unknown blocker format
            issues.push({
                documentId: plan.id,
                severity: 'warning',
                message: `Step ${step.order}: unknown blocker format "${blocker}"`,
            });
        }
    }
    
    return issues;
}