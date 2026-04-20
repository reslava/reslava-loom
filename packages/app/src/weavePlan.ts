import * as fs from 'fs-extra';
import * as path from 'path';
import { loadThread } from '../../fs/dist';
import { saveDoc } from '../../fs/dist';
import { generatePlanId } from '../../core/dist/idUtils';
import { createBaseFrontmatter } from '../../core/dist/frontmatterUtils';
import { generatePlanBody } from '../../core/dist/bodyGenerators/planBody';
import { DesignDoc, PlanDoc } from '../../core/dist';
import { getPrimaryDesign } from '../../core/dist/entities/thread';

export interface WeavePlanInput {
    threadId: string;
    title?: string;
    goal?: string;
}

export interface WeavePlanDeps {
    loadThread: (loomRoot: string, threadId: string) => Promise<any>;
    saveDoc: typeof saveDoc;
    fs: typeof fs;
    loomRoot: string;
}

export async function weavePlan(
    input: WeavePlanInput,
    deps: WeavePlanDeps
): Promise<{ id: string; filePath: string; autoFinalizedDesign: boolean }> {
    const thread = await deps.loadThread(deps.loomRoot, input.threadId);
    const primaryDesign = getPrimaryDesign(thread);
    
    let design = primaryDesign;
    let autoFinalizedDesign = false;
    
    // If no design exists, create one (zero‑friction)
    if (!design) {
        const designTitle = `${input.threadId} Design`;
        const threadPath = path.join(deps.loomRoot, 'threads', input.threadId);
        
        const existingIds = new Set<string>();
        const entries = await deps.fs.readdir(threadPath);
        for (const entry of entries) {
            if (entry.endsWith('.md')) {
                existingIds.add(entry.replace('.md', ''));
            }
        }
        
        const designId = generatePermanentId(designTitle, 'design', existingIds);
        const frontmatter = createBaseFrontmatter('design', designId, designTitle, null);
        (frontmatter as any).role = 'primary';
        
        const content = generateDesignBody(designTitle, 'User');
        
        const designDoc: DesignDoc = {
            ...frontmatter,
            content,
        } as DesignDoc;
        
        const designPath = path.join(threadPath, `${designId}.md`);
        await deps.saveDoc(designDoc, designPath);
        
        design = designDoc;
        autoFinalizedDesign = true;
    }
    
    if (design && design.status !== 'done') {
        const updatedDesign: DesignDoc = {
            ...design,
            status: 'done',
            updated: new Date().toISOString().split('T')[0],
        };
        
        const designPath = (design as any)._path || path.join(deps.loomRoot, 'threads', input.threadId, `${design.id}.md`);
        await deps.saveDoc(updatedDesign, designPath);
        
        design = updatedDesign;
        autoFinalizedDesign = true;
    }
    
    const planTitle = input.title || `${input.threadId} Plan`;
    const existingPlanIds = thread.plans?.map((p: any) => p.id) || [];
    const planId = generatePlanId(input.threadId, existingPlanIds);
    
    const baseFrontmatter = createBaseFrontmatter('plan', planId, planTitle, design?.id || null);
    
    const doc: PlanDoc = {
        ...baseFrontmatter,
        type: 'plan',
        status: 'draft',
        design_version: design?.version || 1,
        target_version: (design as any)?.target_release || '0.1.0',
        steps: [],
        content: generatePlanBody(planTitle, input.goal),
    } as PlanDoc;
    
    const threadPath = path.join(deps.loomRoot, 'threads', input.threadId);
    const plansDir = path.join(threadPath, 'plans');
    await deps.fs.ensureDir(plansDir);
    
    const filePath = path.join(plansDir, `${planId}.md`);
    await deps.saveDoc(doc, filePath);
    
    return { id: planId, filePath, autoFinalizedDesign };
}

function generatePermanentId(title: string, type: string, existingIds: Set<string>): string {
    const baseId = `${title.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-')}-${type}`;
    if (!existingIds.has(baseId)) return baseId;
    let counter = 2;
    let candidate = `${baseId}-${counter}`;
    while (existingIds.has(candidate)) {
        counter++;
        candidate = `${baseId}-${counter}`;
    }
    return candidate;
}

function generateDesignBody(title: string, userName: string = 'User'): string {
    return `# ${title}

## Goal
<!-- What does this design solve? One paragraph. -->

## Context
<!-- Background, constraints, prior art, related designs. -->

# CHAT

## ${userName}:
<!-- Start here — describe the problem or idea to explore. -->
`;
}