import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread } from '../../../core/dist/entities/thread';
import { Document } from '../../../core/dist/entities/document';
import { DesignDoc } from '../../../core/dist/entities/design';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import { resolveThreadPath } from '../utils/workspaceUtils';
import { findMarkdownFiles } from '../utils/pathUtils';
import {
    validateParentExists,
    getDanglingChildIds,
    validateDesignRole,
    validateSinglePrimaryDesign
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
            docs.push(await loadDoc(file) as Document);
        } catch (e) {
            if (e instanceof FrontmatterParseError) {
                console.warn(`Skipping ${file}: ${e.message}`);
            } else {
                throw e;
            }
        }
    }
    
    const primaryDesigns = docs.filter(d => d.type === 'design' && (d as DesignDoc).role === 'primary') as DesignDoc[];
    
    if (primaryDesigns.length === 0) {
        throw new Error(`No primary design found for thread '${threadId}'`);
    }
    if (primaryDesigns.length > 1) {
        const ids = primaryDesigns.map(d => d.id).join(', ');
        throw new Error(`Thread '${threadId}' has multiple primary designs: ${ids}`);
    }
    
    const primaryDesign = primaryDesigns[0];
    const index = await buildLinkIndex();
    
    for (const doc of docs) {
        if (doc.parent_id && !validateParentExists(doc, index)) {
            console.warn(`⚠️  [${doc.id}] Broken parent_id: ${doc.parent_id}`);
        }
        
        const dangling = getDanglingChildIds(doc, index);
        for (const childId of dangling) {
            console.warn(`⚠️  [${doc.id}] Dangling child_id: ${childId}`);
        }
        
        if (doc.type === 'design') {
            const roleIssue = validateDesignRole(doc as DesignDoc);
            if (roleIssue) {
                console.warn(`⚠️  [${doc.id}] ${roleIssue.message}`);
            }
        }
    }

    const primaryIssue = validateSinglePrimaryDesign(docs);
    if (primaryIssue) {
        console.warn(`⚠️  [${threadId}] ${primaryIssue.message}`);
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