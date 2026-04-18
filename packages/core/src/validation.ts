import { Document } from './entities/document';
import { DesignDoc } from './entities/design';
import { PlanDoc } from './entities/plan';
import { LinkIndex } from './linkIndex';

export interface ValidationIssue {
    documentId: string;
    severity: 'error' | 'warning';
    message: string;
}

export function validateParentExists(doc: Document, index: LinkIndex): boolean {
    if (!doc.parent_id) return true;
    const parent = index.documents.get(doc.parent_id);
    if (!parent) return false;
    return parent.exists || parent.archived;
}

export function getDanglingChildIds(doc: Document, index: LinkIndex): string[] {
    if (!doc.child_ids) return [];
    return doc.child_ids.filter(id => {
        const child = index.documents.get(id);
        if (!child) return true;
        return !child.exists && !child.archived;
    });
}

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

export function validateStepBlockers(plan: PlanDoc, index: LinkIndex): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!plan.steps) return issues;
    
    for (const step of plan.steps) {
        if (!step.blockedBy || step.blockedBy.length === 0) continue;
        
        for (const blocker of step.blockedBy) {
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
            
            issues.push({
                documentId: plan.id,
                severity: 'warning',
                message: `Step ${step.order}: unknown blocker format "${blocker}"`,
            });
        }
    }
    
    return issues;
}

export function validateSinglePrimaryDesign(docs: Document[]): ValidationIssue | null {
    const primaryDesigns = docs.filter(d => d.type === 'design' && (d as DesignDoc).role === 'primary');
    if (primaryDesigns.length === 0) {
        return {
            documentId: 'thread',
            severity: 'error',
            message: 'Thread has no primary design document.',
        };
    }
    if (primaryDesigns.length > 1) {
        const ids = primaryDesigns.map(d => d.id).join(', ');
        return {
            documentId: 'thread',
            severity: 'error',
            message: `Thread has multiple primary designs: ${ids}. Only one is allowed.`,
        };
    }
    return null;
}