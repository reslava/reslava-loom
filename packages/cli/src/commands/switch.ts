import chalk from 'chalk';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist/registry';

export async function switchCommand(name: string): Promise<void> {
  const registry = new ConfigRegistry();
  const looms = registry.listLooms();
  const target = looms.find(l => l.name === name);
  
  if (!target) {
    console.error(chalk.red(`❌ Loom '${name}' not found.`));
    console.error(chalk.gray(`   Run 'loom list' to see registered looms.`));
    process.exit(1);
  }
  
  const resolvedPath = registry.resolveLoomPath(target.path);
  if (!fs.existsSync(resolvedPath)) {
    console.error(chalk.red(`❌ Loom path does not exist: ${resolvedPath}`));
    console.error(chalk.gray(`   The loom may have been moved or deleted.`));
    console.error(chalk.gray(`   Run 'loom list' to see missing looms.`));
    process.exit(1);
  }
  
  registry.setActiveLoom(name);
  console.log(chalk.green(`🧵 Switched to loom '${name}' (${resolvedPath})`));
}