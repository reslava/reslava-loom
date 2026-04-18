import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread, Document, DesignDoc } from '../../../core/dist/types';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import { findMarkdownFiles } from '../utils/pathUtils';
import { resolveThreadPath } from '../utils/workspaceUtils';
import {
    validateParentExists,
    getDanglingChildIds,
    validateDesignRole,
    ValidationIssue
} from '../../../core/dist/validation';
import { buildLinkIndex } from './linkRepository';

export async function loadThread(threadId: string): Promise<Thread> {
    const threadPath = resolveThreadPath(threadId);
    if (!await fs.pathExists(threadPath)) {
        throw new Error(`Thread directory not found: ${threadPath}`);
    }
    
    const files = await findMarkdownFiles(threadPath);
    const docs: Document[] = [];
    
    for (const file of files) {
        try {
            docs.push(await loadDoc(file));
        } catch (e) {
            if (e instanceof FrontmatterParseError) {
                console.warn(`Skipping ${file}: ${e.message}`);
            } else {
                throw e;
            }
        }
    }
    
    const primaryDesign = docs.find(d => d.type === 'design' && (d as DesignDoc).role === 'primary') as DesignDoc | undefined;
    if (!primaryDesign) {
        throw new Error(`No primary design found for thread '${threadId}'`);
    }

    // Build a lightweight link index for validation
    const index = await buildLinkIndex();
    
    // Emit warnings for validation issues
    for (const doc of docs) {
        // Check parent_id
        if (doc.parent_id && !validateParentExists(doc, index)) {
            console.warn(`⚠️  [${doc.id}] Broken parent_id: ${doc.parent_id}`);
        }
        
        // Check child_ids
        const dangling = getDanglingChildIds(doc, index);
        for (const childId of dangling) {
            console.warn(`⚠️  [${doc.id}] Dangling child_id: ${childId}`);
        }
        
        // Check design role
        if (doc.type === 'design') {
            const roleIssue = validateDesignRole(doc as DesignDoc);
            if (roleIssue) {
                console.warn(`⚠️  [${doc.id}] ${roleIssue.message}`);
            }
        }
    }

    return {
        id: threadId,
        idea: docs.find(d => d.type === 'idea') as any,
        design: primaryDesign,
        supportingDesigns: docs.filter(d => d.type === 'design' && (d as DesignDoc).role !== 'primary') as DesignDoc[],
        plans: docs.filter(d => d.type === 'plan') as any,
        contexts: docs.filter(d => d.type === 'ctx') as any,
        allDocs: docs,
    };
}

function determinePathForDoc(doc: any, threadId: string): string {
    const threadPath = resolveThreadPath(threadId);
    switch (doc.type) {
        case 'idea': return path.join(threadPath, `${threadId}-idea.md`);
        case 'design': {
            if (doc.role === 'primary') return path.join(threadPath, `${threadId}-design.md`);
            return path.join(threadPath, `${doc.id}.md`);
        }
        case 'plan': return path.join(threadPath, 'plans', `${doc.id}.md`);
        case 'ctx': {
            if (doc.source_version !== undefined) return path.join(threadPath, `${threadId}-ctx.md`);
            return path.join(threadPath, 'ctx', `${doc.id}.md`);
        }
        default: throw new Error(`Unknown document type: ${doc.type}`);
    }
}

export async function saveThread(thread: Thread): Promise<void> {
    for (const doc of thread.allDocs) {
        let filePath = (doc as any)._path;
        if (!filePath) filePath = determinePathForDoc(doc, thread.id);
        await saveDoc(doc, filePath);
    }
}