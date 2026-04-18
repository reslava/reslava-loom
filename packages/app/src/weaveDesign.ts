import * as fs from 'fs-extra';
import * as path from 'path';
import { getActiveLoomRoot } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generatePermanentId } from '../../core/dist';
import { createBaseFrontmatter } from '../../core/dist';
import { generateDesignBody } from '../../core/dist';
import { DesignDoc } from '../../core/dist';

export interface WeaveDesignInput {
    threadId: string;
    title?: string;
}

export interface WeaveDesignDeps {
    getActiveLoomRoot: typeof getActiveLoomRoot;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
}

interface IdeaInfo {
    id: string;
    title: string;
    status: string;
    filePath: string;
    content: string;
}

/**
 * Finds any idea document in the thread directory (temporary or finalized).
 */
async function findIdeaFile(threadPath: string, deps: WeaveDesignDeps): Promise<IdeaInfo | null> {
    const entries = await deps.fs.readdir(threadPath, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith('-idea.md')) continue;
        
        const ideaPath = path.join(threadPath, entry.name);
        const content = await deps.fs.readFile(ideaPath, 'utf8');
        const idMatch = content.match(/^id:\s*["']?(.+?)["']?\s*$/m);
        const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        const statusMatch = content.match(/^status:\s*["']?(.+?)["']?\s*$/m);
        
        return {
            id: idMatch ? idMatch[1] : path.basename(entry.name, '.md'),
            title: titleMatch ? titleMatch[1] : path.basename(entry.name, '-idea.md'),
            status: statusMatch ? statusMatch[1] : 'draft',
            filePath: ideaPath,
            content,
        };
    }
    return null;
}

/**
 * Finalizes a temporary idea in-place and returns the new permanent ID and title.
 */
async function finalizeIdea(
    idea: IdeaInfo,
    threadPath: string,
    deps: WeaveDesignDeps
): Promise<{ newId: string; title: string }> {
    const existingIds = new Set<string>();
    const entries = await deps.fs.readdir(threadPath);
    for (const entry of entries) {
        if (entry.endsWith('.md')) {
            existingIds.add(entry.replace('.md', ''));
        }
    }
    existingIds.delete(idea.id);
    
    const permanentId = generatePermanentId(idea.title, 'idea', existingIds);
    const updated = new Date().toISOString().split('T')[0];
    
    let newContent = idea.content
        .replace(/^id:\s*["']?.+?["']?\s*$/m, `id: ${permanentId}`)
        .replace(/^status:\s*["']?.+?["']?\s*$/m, `status: active`)
        .replace(/^updated:\s*["']?.+?["']?\s*$/m, `updated: ${updated}`);
    
    if (!newContent.includes('updated:')) {
        newContent = newContent.replace(/^(created:.*)$/m, `$1\nupdated: ${updated}`);
    }
    
    const newPath = path.join(threadPath, `${permanentId}.md`);
    await deps.fs.writeFile(newPath, newContent);
    await deps.fs.remove(idea.filePath);
    
    return { newId: permanentId, title: idea.title };
}

/**
 * Creates a new design document from an existing idea.
 * If the idea is not yet finalized, it is automatically finalized first.
 *
 * @param input - The thread ID and optional custom title.
 * @param deps - Filesystem and document saving dependencies.
 * @returns A promise resolving to the design ID, file path, and auto‑finalize flag.
 */
export async function weaveDesign(
    input: WeaveDesignInput,
    deps: WeaveDesignDeps
): Promise<{ id: string; filePath: string; autoFinalized: boolean }> {
    const loomRoot = deps.getActiveLoomRoot();
    const threadPath = path.join(loomRoot, 'threads', input.threadId);
    
    await deps.fs.ensureDir(threadPath);
    
    const idea = await findIdeaFile(threadPath, deps);
    if (!idea) {
        throw new Error(`No idea found in thread '${input.threadId}'. Run 'loom weave idea' first.`);
    }
    
    let ideaId = idea.id;
    let ideaTitle = idea.title;
    let autoFinalized = false;
    
    if (ideaId.startsWith('new-')) {
        const finalized = await finalizeIdea(idea, threadPath, deps);
        ideaId = finalized.newId;
        ideaTitle = finalized.title;
        autoFinalized = true;
    }
    
    const designTitle = input.title || ideaTitle;
    
    const existingIds = new Set<string>();
    const entries = await deps.fs.readdir(threadPath);
    for (const entry of entries) {
        if (entry.endsWith('.md')) {
            existingIds.add(entry.replace('.md', ''));
        }
    }
    
    const permanentId = generatePermanentId(designTitle, 'design', existingIds);
    const frontmatter = createBaseFrontmatter('design', permanentId, designTitle, ideaId);
    (frontmatter as any).role = 'primary';
    
    const content = generateDesignBody(designTitle, 'User');
    
    const doc: DesignDoc = {
        ...frontmatter,
        content,
    } as DesignDoc;
    
    const filePath = path.join(threadPath, `${permanentId}.md`);
    await deps.saveDoc(doc, filePath);
    
    return { id: permanentId, filePath, autoFinalized };
}