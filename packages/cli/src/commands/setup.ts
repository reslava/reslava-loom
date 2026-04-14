import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import chalk from 'chalk';
import { ConfigRegistry } from '../../../core/dist/registry';

export async function setupCommand(name: string, options: { path?: string; switch?: boolean }): Promise<void> {
  const loomPath = options.path || path.join(os.homedir(), 'looms', name);
  
  // Check if directory already exists
  if (fs.existsSync(loomPath)) {
    console.error(chalk.yellow(`⚠️  Directory already exists: ${loomPath}`));
    console.error(chalk.gray(`   If you want to register an existing loom, use:`));
    console.error(chalk.gray(`   loom register ${name} --path ${loomPath}`));
    process.exit(1);
  }

  // Create directory structure
  fs.ensureDirSync(path.join(loomPath, '.loom', 'templates'));
  fs.ensureDirSync(path.join(loomPath, '.loom', 'prompts'));
  fs.ensureDirSync(path.join(loomPath, '.loom', 'schemas'));
  fs.ensureDirSync(path.join(loomPath, '.loom', 'cache'));
  fs.ensureDirSync(path.join(loomPath, 'chats'));
  fs.ensureDirSync(path.join(loomPath, 'threads'));
  fs.ensureDirSync(path.join(loomPath, 'references'));

  // Register in global registry
  const registry = new ConfigRegistry();
  try {
    registry.addLoom(name, loomPath);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.error(chalk.yellow(`⚠️  Loom '${name}' is already registered.`));
      console.error(chalk.gray(`   Use 'loom switch ${name}' to activate it.`));
      process.exit(1);
    }
    throw e;
  }
  
  const shouldSwitch = options.switch !== false;
  if (shouldSwitch) {
    registry.setActiveLoom(name);
    console.log(chalk.green(`🧵 Loom '${name}' created and activated at ${loomPath}`));
  } else {
    console.log(chalk.green(`🧵 Loom '${name}' created at ${loomPath}`));
    console.log(chalk.gray(`   Run 'loom switch ${name}' to activate it.`));
  }
}