import * as path from 'path';
import * as fs from 'fs-extra';
import { Weave } from '../../../core/dist/entities/weave';
import { Document } from '../../../core/dist/entities/document';
import { DesignDoc } from '../../../core/dist/entities/design';
import { IdeaDoc } from '../../../core/dist/entities/idea';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { CtxDoc } from '../../../core/dist/entities/ctx';
import { ChatDoc } from '../../../core/dist/entities/chat';
import { DoneDoc } from '../../../core/dist/entities/done';
import { loadDoc, FrontmatterParseError } from '../serializers/frontmatterLoader';
import { saveDoc } from '../serializers/frontmatterSaver';
import { findMarkdownFiles } from '../utils/pathUtils';
import { resolveWeavePath } from '../utils/workspaceUtils';
import {
    validateParentExists,
    getDanglingChildIds,
} from '../../../core/dist/validation';
import { LinkIndex } from '../../../core/dist/linkIndex';

/**
 * Loads a weave by its ID.
 *
 * @param loomRoot - The absolute path to the loom root.
 * @param weaveId - The weave identifier.
 * @param index - Optional pre‑built link index for validation warnings.
 * @returns A promise resolving to the Weave, or null if the folder is empty.
 */
export async function loadWeave(loomRoot: string, weaveId: string, index?: LinkIndex): Promise<Weave | null> {
    const weavePath = resolveWeavePath(weaveId, loomRoot);
    if (!await fs.pathExists(weavePath)) {
        throw new Error(`Weave directory not found: ${weavePath}`);
    }
    
    const files = await findMarkdownFiles(weavePath);
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
    
    // Empty folder is not a weave
    if (docs.length === 0) {
        return null;
    }
    
    const ideas = docs.filter(d => d.type === 'idea') as IdeaDoc[];
    const designs = docs.filter(d => d.type === 'design') as DesignDoc[];
    const plans = docs.filter(d => d.type === 'plan') as PlanDoc[];
    const dones = docs.filter(d => d.type === 'done') as DoneDoc[];
    const contexts = docs.filter(d => d.type === 'ctx') as CtxDoc[];
    const chats = docs.filter(d => d.type === 'chat') as ChatDoc[];
    
    // Validation warnings (if index provided)
    if (index) {
        for (const doc of docs) {
            if (doc.parent_id && !validateParentExists(doc, index)) {
                console.warn(`⚠️  [${doc.id}] Broken parent_id: ${doc.parent_id}`);
            }
            const dangling = getDanglingChildIds(doc, index);
            for (const childId of dangling) {
                console.warn(`⚠️  [${doc.id}] Dangling child_id: ${childId}`);
            }
        }
        
        // Warn if multiple designs exist (informational)
        if (designs.length > 1) {
            console.warn(`⚠️  [${weaveId}] Multiple designs found.`);
        }
    }

    return {
        id: weaveId,
        ideas,
        designs,
        plans,
        dones,
        contexts,
        chats,
        allDocs: docs,
    };
}

function determinePathForDoc(doc: any, loomRoot: string, weaveId: string): string {
    const weavePath = resolveWeavePath(weaveId, loomRoot);
    switch (doc.type) {
        case 'idea': return path.join(weavePath, `${weaveId}-idea.md`);
        case 'design': return path.join(weavePath, `${doc.id}.md`);
        case 'plan': return path.join(weavePath, 'plans', `${doc.id}.md`);
        case 'ctx': {
            if (doc.source_version !== undefined) return path.join(weavePath, `${weaveId}-ctx.md`);
            return path.join(weavePath, 'ctx', `${doc.id}.md`);
        }
        case 'done': return path.join(weavePath, 'done', `${doc.id}.md`);
        default: throw new Error(`Unknown document type: ${doc.type}`);
    }
}

export async function saveWeave(loomRoot: string, weave: Weave): Promise<void> {
    for (const doc of weave.allDocs) {
        let filePath = (doc as any)._path;
        if (!filePath) filePath = determinePathForDoc(doc, loomRoot, weave.id);
        await saveDoc(doc, filePath);
    }
}