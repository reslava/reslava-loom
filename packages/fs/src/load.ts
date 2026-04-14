import matter from 'gray-matter';
import * as fs from 'fs-extra';
import { Document } from '../../core/dist/types';

export class FrontmatterParseError extends Error {
  constructor(
    public filePath: string,
    public rawFrontmatter: string,
    message: string
  ) {
    super(`Invalid frontmatter in ${filePath}: ${message}`);
    this.name = 'FrontmatterParseError';
  }
}

export async function loadDoc(filePath: string): Promise<Document> {
  const content = await fs.readFile(filePath, 'utf8');
  
  let parsed;
  try {
    parsed = matter(content);
  } catch (e) {
    throw new FrontmatterParseError(filePath, '', `YAML syntax error: ${(e as Error).message}`);
  }

  // Validate required fields
  const requiredFields = ['type', 'id', 'status', 'created', 'version'];
  for (const field of requiredFields) {
    if (parsed.data[field] === undefined) {
      throw new FrontmatterParseError(
        filePath,
        JSON.stringify(parsed.data),
        `Missing required field: ${field}`
      );
    }
  }

  const doc = {
    ...parsed.data,
    content: parsed.content,
    _path: filePath,
  } as Document;

  // Parse steps for plan documents
  if (doc.type === 'plan' && parsed.content) {
    doc.steps = parseStepsTable(parsed.content);
  }

  return doc;
}

function parseStepsTable(content: string): any[] {
  const steps: any[] = [];
  
  // Find the steps table: between "# Steps" and the next "---" or "##"
  const stepsMatch = content.match(/# Steps\n\n([\s\S]*?)(?=\n---|\n##|$)/);
  if (!stepsMatch) return steps;
  
  const table = stepsMatch[1];
  const lines = table.split('\n').filter(l => l.includes('|') && !l.includes('|---') && !l.includes('Done | #'));
  
  for (const line of lines) {
    const cols = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length < 5) continue;
    
    // Columns: Done, #, Step, Files touched, Blocked by
    const doneSymbol = cols[0];
    const order = parseInt(cols[1]);
    const description = cols[2];
    const filesTouched = cols[3] === '—' ? [] : cols[3].split(',').map(s => s.trim());
    const blockedByRaw = cols[4] || '—';
    
    const done = doneSymbol === '✅';
    const blockedBy = blockedByRaw === '—' ? [] : blockedByRaw.split(',').map(s => s.trim());
    
    steps.push({ order, description, done, files_touched: filesTouched, blockedBy });
  }
  
  return steps;
}