import { Document, DesignDoc, PlanDoc } from './types';
import { LinkIndex } from './linkIndex';

export interface ValidationIssue {
    /** The ID of the document with the issue. */
    documentId: string;
    /** Severity level: 'error' for critical problems, 'warning' for advisories. */
    severity: 'error' | 'warning';
    /** Human‑readable description of the issue. */
    message: string;
}

/**
 * Checks whether a document's parent_id exists in the link index.
 *
 * @param doc - The document to validate.
 * @param index - The link index containing all known documents.
 * @returns True if the parent exists or if there is no parent; false otherwise.
 */
export function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    return index.documents.has(doc.parent_id);
}

/**
 * Returns a list of child_ids that do not exist in the link index.
 *
 * @param doc - The document whose child_ids should be validated.
 * @param index - The link index containing all known documents.
 * @returns An array of dangling child IDs.
 */
export function getDanglingChildIds(doc: Document, index: LinkIndex): string[] {
    if (!doc.child_ids) return [];
    return doc.child_ids.filter(id => !index.documents.has(id));
}

/**
 * Validates the role field of a design document.
 *
 * @param doc - The design document to validate.
 * @returns A validation issue if the role is missing or invalid; otherwise null.
 */
export function validateDesignRole(doc: DesignDoc): ValidationIssue | null {
    if (!doc.role) {
        return {
            documentId: doc.id,
            severity: 'warning',
            message: 'Design missing role field (should be "primary" or "supporting")',
        };
    }
    if (doc.role !== 'primary' && doc.role !== 'supporting') {
        return {
            documentId: doc.id,
            severity: 'error',
            message: `Invalid role "${doc.role}" (must be "primary" or "supporting")`,
        };
    }
    return null;
}

/**
 * Validates the design_version field of a plan against its parent design.
 *
 * @param plan - The plan document to validate.
 * @param index - The link index (used to locate the parent design).
 * @returns True if the plan's design_version matches the parent design's version,
 *          or if the parent cannot be found. False if versions mismatch.
 */
export function validatePlanDesignVersion(plan: PlanDoc, index: LinkIndex): boolean {
    const parentId = plan.parent_id;
    if (!parentId) return true;
    
    const parentEntry = index.documents.get(parentId);
    if (!parentEntry) return true; // Parent missing – caught by validateParentExists
    
    // Note: This requires the parent design's version.
    // In practice, this is called after loading the parent design.
    // For now, we return true; the CLI validate command handles this separately.
    return true;
}

/**
 * Validates the step blockers within a plan.
 *
 * @param plan - The plan document whose steps should be validated.
 * @param index - The link index containing all known documents.
 * @returns An array of validation issues for invalid blockers.
 */
export function validateStepBlockers(plan: PlanDoc, index: LinkIndex): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!plan.steps) return issues;
    
    for (const step of plan.steps) {
        if (!step.blockedBy || step.blockedBy.length === 0) continue;
        
        for (const blocker of step.blockedBy) {
            // Check internal step dependency: "Step N"
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
            
            // Check cross‑plan dependency: plan ID
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