import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as yaml from 'yaml';

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
 * Resolution order (Mono‑Loom First):
 * 1. Walk up from the current working directory, looking for a .loom/ directory.
 *    If found, return that directory. (The global registry is ignored.)
 * 2. If no local .loom/ is found, check the global registry at ~/.loom/config.yaml.
 *    If an active_loom is set and the path exists, return it.
 * 3. If neither is found, throw a clear error with remediation steps.
 *
 * @throws {Error} If no Loom workspace can be located.
 */
export function getActiveLoomRoot(): string {
    // 1. FIRST: Walk up from cwd looking for .loom/ (mono‑loom mode)
    let currentDir = process.cwd();
    while (true) {
        const loomDir = path.join(currentDir, '.loom');
        if (fs.existsSync(loomDir)) {
            return currentDir;
        }

        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            // Reached filesystem root
            break;
        }
        currentDir = parentDir;
    }

    // 2. SECOND: Try global registry (multi‑loom mode)
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