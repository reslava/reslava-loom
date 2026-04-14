import chalk from 'chalk';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist/registry';

export async function listCommand(): Promise<void> {
  const registry = new ConfigRegistry();
  const looms = registry.listLooms();
  const active = registry.getActiveLoom();
  
  if (looms.length === 0) {
    console.log(chalk.yellow('No looms registered.'));
    console.log(chalk.gray(`  Run 'loom init' to create the default loom.`));
    console.log(chalk.gray(`  Run 'loom setup <name>' to create a named loom.`));
    return;
  }
  
  console.log(chalk.bold('\n🧵 Registered Looms\n'));
  
  for (const loom of looms) {
    const isActive = loom.path === active;
    const marker = isActive ? chalk.green('★') : ' ';
    const resolvedPath = registry.resolveLoomPath(loom.path);
    const exists = fs.existsSync(resolvedPath);
    
    const nameDisplay = isActive ? chalk.green.bold(loom.name) : loom.name;
    const pathDisplay = exists ? chalk.gray(resolvedPath) : chalk.red(`[missing] ${resolvedPath}`);
    
    console.log(`  ${marker} ${nameDisplay.padEnd(15)} ${pathDisplay}`);
  }
  
  console.log(chalk.gray('\n  ★ = active loom'));
}