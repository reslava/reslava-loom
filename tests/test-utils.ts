import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

/**
 * Root directory for all test looms.
 * Uses the system temp directory to avoid polluting the project.
 */
export const TEST_ROOT = path.join(os.tmpdir(), 'loom-tests');

/**
 * Run a `loom` command using the local CLI entry point.
 */
export function runLoom(
    args: string,
    cwd?: string
): { stdout: string; stderr: string; exitCode: number } {
    try {
        const stdout = execSync(`loom ${args}`, {
            cwd,
            encoding: 'utf8',
            stdio: 'pipe',
        });
        return { stdout, stderr: '', exitCode: 0 };
    } catch (e: any) {
        return {
            stdout: e.stdout?.toString() || '',
            stderr: e.stderr?.toString() || '',
            exitCode: e.status || 1,
        };
    }
}

/**
 * Create a fresh test loom directory.
 * Returns the absolute path to the new loom.
 */
export async function setupTestLoom(name: string): Promise<string> {
    const loomPath = path.join(TEST_ROOT, name);
    await fs.remove(loomPath);
    await fs.ensureDir(loomPath);
    return loomPath;
}

/**
 * Completely remove a test loom directory.
 */
export async function cleanupTestLoom(loomPath: string): Promise<void> {
    const maxRetries = 5;
    const delayMs = 300;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            await fs.remove(loomPath);
            return; // Success
        } catch (e: any) {
            if ((e.code === 'EBUSY' || e.code === 'EPERM') && i < maxRetries - 1) {
                // Wait and retry
                await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
            } else {
                // Last attempt or different error — rethrow
                throw e;
            }
        }
    }
}

/**
 * Create a minimal valid design document in a thread.
 */
export async function createDesignDoc(
    threadPath: string,
    threadId: string,
    options?: { role?: 'primary' | 'supporting'; status?: string }
): Promise<void> {
    const designPath = path.join(threadPath, `${threadId}-design.md`);
    const role = options?.role || 'primary';
    const status = options?.status || 'active';

    const frontmatter = {
        type: 'design',
        id: `${threadId}-design`,
        title: `${threadId} Design`,
        status,
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: null,
        child_ids: [],
        requires_load: [],
        role,
    };

    const content = `## Goal\n\nTest design for ${threadId}.\n\n## Context\n\nTest context.\n`;
    const output = `---\n${Object.entries(frontmatter)
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join('\n')}\n---\n\n${content}`;

    await fs.writeFile(designPath, output);
}

/**
 * Assert that a file contains a specific string.
 */
export function assertFileContains(filePath: string, expected: string): void {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes(expected)) {
        throw new Error(`File ${filePath} does not contain "${expected}"`);
    }
}

/**
 * Assert that a condition is true.
 */
export function assert(condition: boolean, message?: string): void {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}