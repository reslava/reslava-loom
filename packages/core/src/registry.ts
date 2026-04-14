import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';

export interface LoomEntry {
  name: string;
  path: string;        // Relative to ~/.loom/, normalized with forward slashes
  created: string;     // ISO timestamp
}

export interface LoomRegistry {
  active_loom: string | null;
  looms: LoomEntry[];
}

const CONFIG_DIR = path.join(os.homedir(), '.loom');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.yaml');

// Normalize to forward slashes for cross-platform consistency
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

export class ConfigRegistry {
  private registry: LoomRegistry;

  constructor() {
    this.registry = this.load();
  }

  private load(): LoomRegistry {
    if (!fs.existsSync(CONFIG_PATH)) {
      return { active_loom: null, looms: [] };
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    return yaml.parse(content) || { active_loom: null, looms: [] };
  }

  private save(): void {
    fs.ensureDirSync(CONFIG_DIR);
    fs.writeFileSync(CONFIG_PATH, yaml.stringify(this.registry));
  }

  getActiveLoom(): string | null {
    return this.registry.active_loom;
  }

  setActiveLoom(name: string): void {
    const loom = this.registry.looms.find(l => l.name === name);
    if (!loom) {
      throw new Error(`Loom '${name}' not found`);
    }
    this.registry.active_loom = loom.path;  // Already normalized
    this.save();
  }

  addLoom(name: string, customPath?: string): void {
    let relativePath: string;
    if (customPath) {
      relativePath = path.relative(CONFIG_DIR, customPath);
    } else {
      relativePath = path.join('..', 'looms', name);
    }
    relativePath = normalizePath(relativePath);
    
    const existing = this.registry.looms.find(l => l.name === name);
    if (existing) {
      throw new Error(`Loom '${name}' already exists`);
    }
    this.registry.looms.push({
      name,
      path: relativePath,
      created: new Date().toISOString(),
    });
    this.save();
  }

  removeLoom(name: string): void {
    const index = this.registry.looms.findIndex(l => l.name === name);
    if (index === -1) {
      throw new Error(`Loom '${name}' not found`);
    }
    this.registry.looms.splice(index, 1);
    // If the removed loom was active, clear active_loom
    const removedLoom = this.registry.looms[index];
    if (this.registry.active_loom === removedLoom?.path) {
      this.registry.active_loom = null;
    }
    this.save();
  }

  listLooms(): LoomEntry[] {
    return this.registry.looms;
  }

  resolveLoomPath(relativePath: string): string {
    return path.resolve(CONFIG_DIR, relativePath);
  }
}