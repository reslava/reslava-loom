import matter from 'gray-matter';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { Document } from '../../core/dist/types';

export class FileWriteError extends Error {
  constructor(public filePath: string, originalError: Error) {
    super(`Failed to write ${filePath}: ${originalError.message}`);
    this.name = 'FileWriteError';
  }
}

export class FilePermissionError extends Error {
  constructor(public filePath: string) {
    super(`Permission denied writing to ${filePath}`);
    this.name = 'FilePermissionError';
  }
}

export async function saveDoc(doc: Document, filePath: string): Promise<void> {
  const { content, _path, ...frontmatter } = doc as any;

  let bodyContent = content;
  if (doc.type === 'plan' && (doc as any).steps) {
    bodyContent = generateStepsTable((doc as any).steps, content);
  }

  const output = matter.stringify(bodyContent, frontmatter);

  await fs.ensureDir(path.dirname(filePath));

  // Use a temp file in the same directory to avoid cross-device issues
  const tempPath = path.join(
    path.dirname(filePath),
    `.loom-tmp-${Date.now()}-${path.basename(filePath)}.tmp`
  );

  try {
    await fs.writeFile(tempPath, output, { mode: 0o644 });
    
    try {
      await fs.rename(tempPath, filePath);
    } catch (renameErr: any) {
      // Cross-device rename not allowed – fallback to copy + delete
      if (renameErr.code === 'EXDEV') {
        await fs.copyFile(tempPath, filePath);
        await fs.remove(tempPath);
      } else {
        throw renameErr;
      }
    }
  } catch (e: any) {
    await fs.remove(tempPath).catch(() => {});
    
    if (e.code === 'EACCES' || e.code === 'EPERM') {
      throw new FilePermissionError(filePath);
    }
    if (e.code === 'ENOSPC') {
      throw new FileWriteError(filePath, new Error('Disk full'));
    }
    throw new FileWriteError(filePath, e);
  }
}

function generateStepsTable(steps: any[], originalContent: string): string {
  if (!steps.length) return originalContent;

  const header = '| Done | # | Step | Files touched | Blocked by |';
  const separator = '|---|---|---|---|---|';
  const rows = steps.map(s => {
    const done = s.done ? '✅' : '🔳';
    const files = s.files_touched?.length ? s.files_touched.join(', ') : '—';
    const blockers = s.blockedBy?.length ? s.blockedBy.join(', ') : '—';
    return `| ${done} | ${s.order} | ${s.description} | ${files} | ${blockers} |`;
  });

  const newTable = [header, separator, ...rows].join('\n');

  const stepsRegex = /# Steps\n\n([\s\S]*?)(?=\n---|\n##|$)/;
  if (stepsRegex.test(originalContent)) {
    return originalContent.replace(stepsRegex, `# Steps\n\n${newTable}`);
  }
  
  const goalRegex = /(# Goal\n[\s\S]*?)(?=\n---|\n##|$)/;
  if (goalRegex.test(originalContent)) {
    return originalContent.replace(goalRegex, `$1\n\n# Steps\n\n${newTable}`);
  }
  
  return `${originalContent}\n\n# Steps\n\n${newTable}`;
}