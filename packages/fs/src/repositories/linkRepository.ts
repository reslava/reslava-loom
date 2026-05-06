import * as path from 'path';
import * as fs from 'fs-extra';
import { findMarkdownFiles } from '../utils/pathUtils';
import { loadDoc } from '../serializers/frontmatterLoader';
import { LinkIndex, createEmptyIndex, DocumentEntry, StepBlocker } from '../../../core/dist/linkIndex';
import { Document } from '../../../core/dist/entities/document';
import { PlanDoc } from '../../../core/dist/entities/plan';

const RESERVED_SUBDIR_NAMES = new Set(['plans', 'done', 'ai-chats', 'ctx', 'refs', '.archive', 'chats']);

function extractThreadId(filePath: string, weavesDir: string): string | undefined {
    const rel = path.relative(weavesDir, filePath);
    const parts = rel.split(path.sep);
    // parts[0]=weaveId, parts[1]=possible threadId, parts[2+]=rest
    if (parts.length < 3) return undefined;
    const candidate = parts[1];
    if (RESERVED_SUBDIR_NAMES.has(candidate) || candidate.endsWith('.md')) return undefined;
    return candidate;
}

function addBacklink(index: LinkIndex, targetId: string, sourceId: string): void {
    const list = index.backlinks.get(targetId) ?? [];
    if (!list.includes(sourceId)) list.push(sourceId);
    index.backlinks.set(targetId, list);
}

export async function buildLinkIndex(loomRoot: string): Promise<LinkIndex> {
    const threadsDir = path.join(loomRoot, 'loom');
    const index = createEmptyIndex();

    if (!fs.existsSync(threadsDir)) {
        return index;
    }

    const allFiles = await findMarkdownFiles(threadsDir);

    for (const filePath of allFiles) {
        try {
            const doc = await loadDoc(filePath) as Document & { slug?: string };
            const docId = doc.id;
            const threadId = extractThreadId(filePath, threadsDir);

            const entry: DocumentEntry = {
                path: filePath,
                type: doc.type,
                exists: true,
                archived: filePath.includes('.archive'),
                threadId,
            };

            // Primary lookup maps
            index.documents.set(docId, entry);
            index.byId.set(docId, filePath);

            // Slug index — reference docs only
            if (doc.type === 'reference' && doc.slug) {
                index.bySlug.set(doc.slug, docId);
            }

            // Parent relationship
            if (doc.parent_id) {
                index.parent.set(docId, doc.parent_id);
                // Populate legacy children map from parent_id (not child_ids)
                if (!index.children.has(doc.parent_id)) {
                    index.children.set(doc.parent_id, new Set());
                }
                index.children.get(doc.parent_id)!.add(docId);
                // Backlinks
                addBacklink(index, doc.parent_id, docId);
            }

            // requires_load backlinks (slugs resolve after full pass — deferred below)
            // Store raw requires_load on a temp side-channel keyed by docId.
            // We resolve slugs in the second pass after bySlug is fully built.
            (index as any).__requiresLoad ??= new Map<string, string[]>();
            if (doc.requires_load && doc.requires_load.length > 0) {
                (index as any).__requiresLoad.set(docId, doc.requires_load);
            }

            // Plan step blockers
            if (doc.type === 'plan') {
                const planDoc = doc as PlanDoc;
                const blockers: StepBlocker[] = [];

                if (planDoc.steps) {
                    for (const step of planDoc.steps) {
                        if (step.blockedBy && step.blockedBy.length > 0) {
                            blockers.push({ step: step.order, blockedBy: step.blockedBy });
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

    // Second pass: resolve requires_load slugs/ids to backlinks now that bySlug is complete.
    const requiresLoadMap: Map<string, string[]> = (index as any).__requiresLoad ?? new Map();
    for (const [sourceId, entries] of requiresLoadMap) {
        for (const entry of entries) {
            const targetId = index.bySlug.get(entry) ?? (index.byId.has(entry) ? entry : null);
            if (targetId) {
                addBacklink(index, targetId, sourceId);
            }
        }
    }
    delete (index as any).__requiresLoad;

    return index;
}

function removeDocumentFromIndex(index: LinkIndex, docId: string): void {
    index.documents.delete(docId);
    index.byId.delete(docId);
    // Remove from bySlug
    for (const [slug, id] of index.bySlug) {
        if (id === docId) index.bySlug.delete(slug);
    }
    // Remove backlinks emitted by this doc
    for (const list of index.backlinks.values()) {
        const i = list.indexOf(docId);
        if (i !== -1) list.splice(i, 1);
    }
    index.backlinks.delete(docId);
    index.parent.delete(docId);
    index.children.delete(docId);
    for (const childSet of index.children.values()) childSet.delete(docId);
    index.stepBlockers.delete(docId);
}

export async function updateIndexForFile(
    index: LinkIndex,
    loomRoot: string,
    filePath: string,
    event: 'create' | 'change' | 'delete'
): Promise<void> {
    const weavesDir = path.join(loomRoot, 'loom');
    // Use the id from frontmatter when available; fall back to filename for deletes.
    let docId = path.basename(filePath, '.md');
    // For existing entries, find the canonical id from byId (reverse lookup).
    for (const [id, p] of index.byId) {
        if (p === filePath) { docId = id; break; }
    }
    removeDocumentFromIndex(index, docId);

    if (event === 'delete') {
        index.documents.set(docId, { path: filePath, type: 'idea', exists: false, archived: filePath.includes('.archive') });
        return;
    }

    try {
        const doc = await loadDoc(filePath) as Document & { slug?: string };
        const id = doc.id;
        const threadId = extractThreadId(filePath, weavesDir);

        index.documents.set(id, { path: filePath, type: doc.type, exists: true, archived: filePath.includes('.archive'), threadId });
        index.byId.set(id, filePath);

        if (doc.type === 'reference' && doc.slug) {
            index.bySlug.set(doc.slug, id);
        }

        if (doc.parent_id) {
            index.parent.set(id, doc.parent_id);
            if (!index.children.has(doc.parent_id)) index.children.set(doc.parent_id, new Set());
            index.children.get(doc.parent_id)!.add(id);
            addBacklink(index, doc.parent_id, id);
        }

        if (doc.requires_load) {
            for (const entry of doc.requires_load) {
                const targetId = index.bySlug.get(entry) ?? (index.byId.has(entry) ? entry : null);
                if (targetId) addBacklink(index, targetId, id);
            }
        }

        if (doc.type === 'plan') {
            const planDoc = doc as PlanDoc;
            const blockers: StepBlocker[] = [];
            if (planDoc.steps) {
                for (const step of planDoc.steps) {
                    if (step.blockedBy && step.blockedBy.length > 0) {
                        blockers.push({ step: step.order, blockedBy: step.blockedBy });
                    }
                }
            }
            if (blockers.length > 0) index.stepBlockers.set(id, blockers);
        }
    } catch (e) {
        index.documents.set(docId, { path: filePath, type: 'idea', exists: false, archived: filePath.includes('.archive') });
    }
}
