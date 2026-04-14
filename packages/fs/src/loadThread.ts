import * as path from 'path';
import * as fs from 'fs-extra';
import { Thread, Document, DesignDoc } from '../../core/dist/types';
import { loadDoc, FrontmatterParseError } from './load';
import { resolveThreadPath } from './utils';

/**
 * Recursively finds all Markdown files in a directory, excluding _archive.
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const result: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '_archive') {
      result.push(...await findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(fullPath);
    }
  }
  
  return result;
}

/**
 * Loads all documents for a given thread ID.
 * @throws If no primary design is found.
 */
export async function loadThread(threadId: string): Promise<Thread> {
  const threadPath = resolveThreadPath(threadId);
  
  if (!await fs.pathExists(threadPath)) {
    throw new Error(`Thread directory not found: ${threadPath}`);
  }

  const files = await findMarkdownFiles(threadPath);
  const docs: Document[] = [];

  for (const file of files) {
    try {
      const doc = await loadDoc(file);
      docs.push(doc);
    } catch (e) {
      if (e instanceof FrontmatterParseError) {
        console.warn(`Skipping ${file}: ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  const primaryDesign = docs.find(d => 
    d.type === 'design' && (d as DesignDoc).role === 'primary'
  ) as DesignDoc | undefined;

  if (!primaryDesign) {
    throw new Error(`No primary design found for thread '${threadId}' in ${threadPath}`);
  }

  const idea = docs.find(d => d.type === 'idea');
  const plans = docs.filter(d => d.type === 'plan');
  const contexts = docs.filter(d => d.type === 'ctx');
  const supportingDesigns = docs.filter(d => 
    d.type === 'design' && (d as DesignDoc).role !== 'primary'
  ) as DesignDoc[];

  return {
    id: threadId,
    idea: idea as any,
    design: primaryDesign,
    supportingDesigns,
    plans: plans as any,
    contexts: contexts as any,
    allDocs: docs,
  };
}