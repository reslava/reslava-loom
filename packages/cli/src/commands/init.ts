import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import chalk from 'chalk';
// Relative import to core
import { ConfigRegistry } from '../../../core/dist/registry';

export async function initCommand(options: { force?: boolean }): Promise<void> {
  const defaultPath = path.join(os.homedir(), 'looms', 'default');
  
  // Check if already exists
  if (fs.existsSync(defaultPath) && !options.force) {
    console.error(chalk.red(`❌ Loom already exists at ${defaultPath}`));
    console.error(chalk.gray('   Use --force to overwrite.'));
    process.exit(1);
  }

  // Create directory structure
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'templates'));
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'prompts'));
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'schemas'));
  fs.ensureDirSync(path.join(defaultPath, '.loom', 'cache'));
  fs.ensureDirSync(path.join(defaultPath, 'chats'));
  fs.ensureDirSync(path.join(defaultPath, 'threads'));
  fs.ensureDirSync(path.join(defaultPath, 'references'));

  // Register in global registry
  const registry = new ConfigRegistry();
  try {
    registry.addLoom('default', defaultPath);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      // Already registered – that's fine
    } else {
      throw e;
    }
  }
  registry.setActiveLoom('default');
  
  console.log(chalk.green(`🧵 Loom initialized at ${defaultPath}`));
  console.log(chalk.green(`   Active loom: default`));
}