import chalk from 'chalk';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist/registry';

export async function currentCommand(): Promise<void> {
  const registry = new ConfigRegistry();
  const active = registry.getActiveLoom();
  
  if (!active) {
    console.log(chalk.yellow('No active loom set.'));
    console.log(chalk.gray(`  Run 'loom list' to see registered looms.`));
    console.log(chalk.gray(`  Run 'loom switch <name>' to activate one.`));
    return;
  }
  
  const looms = registry.listLooms();
  const current = looms.find(l => l.path === active);
  const resolvedPath = registry.resolveLoomPath(active);
  const exists = fs.existsSync(resolvedPath);
  
  console.log(chalk.bold(`\n🧵 Active Loom\n`));
  console.log(`  Name: ${chalk.green(current?.name || 'unknown')}`);
  console.log(`  Path: ${exists ? chalk.gray(resolvedPath) : chalk.red(`[missing] ${resolvedPath}`)}`);
  
  if (!exists) {
    console.log(chalk.yellow(`\n  ⚠️  The active loom path does not exist.`));
    console.log(chalk.gray(`     Run 'loom switch <name>' to choose a different loom.`));
  }
}