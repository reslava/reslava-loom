import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as yaml from 'yaml';
import { ConfigRegistry } from '../../../core/dist';

export interface LoomEntry {
    name: string;
    path: string;
    created: string;
}

export interface LoomRegistry {
    active_loom: string | null;
    looms: LoomEntry[];
}

/**
 * Resolves the absolute path to the currently active Loom workspace root.
 *
 * Resolution order:
 * 1. Walk up from current working directory looking for .loom/.
 * 2. Check global registry (~/.loom/config.yaml) for active_loom. 
 * 3. Throw a helpful error if neither is found.
 */
export function getActiveLoomRoot(): string {
    // 1. FIRST, walk up from cwd looking for .loom/ (mono‑loom mode)
    let currentDir = process.cwd();
    while (true) {
        const loomDir = path.join(currentDir, '.loom');
        if (fs.existsSync(loomDir)) {
            return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) break;
        currentDir = parentDir;
    }

    // 2. SECOND, try global registry (multi‑loom mode)
    const registryPath = path.join(os.homedir(), '.loom', 'config.yaml');
    if (fs.existsSync(registryPath)) {
        const registryContent = fs.readFileSync(registryPath, 'utf8');
        const registry = yaml.parse(registryContent) as LoomRegistry | null;
        if (registry?.active_loom) {
            const configDir = path.dirname(registryPath);
            const activePath = path.resolve(configDir, registry.active_loom);
            if (fs.existsSync(activePath)) {
                return activePath;
            }
        }
    }    

    // 3. No loom found
    throw new Error(
        'No Loom workspace found.\n\n' +
        'If you are in a project that uses Loom, ensure it has a .loom/ directory.\n' +
        'If you want to create a new Loom workspace, run:\n' +
        '  loom init\n' +
        'If you have multiple looms, ensure one is active:\n' +
        '  loom list\n' +
        '  loom switch <name>'
    );
}

export function resolveThreadPath(threadId: string): string {
    const loomRoot = getActiveLoomRoot();
    return path.join(loomRoot, 'threads', threadId);
}

export async function ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
}

export function generatePlanId(threadId: string, existingPlanIds: string[]): string {
    const prefix = `${threadId}-plan-`;
    const numbers = existingPlanIds
        .map(p => p.match(/-plan-(\d+)\.md$/)?.[1])
        .filter(Boolean)
        .map(Number);
    const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
}