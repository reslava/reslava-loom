import chalk from 'chalk';
import { listLooms } from '../../../app/dist/list';
import * as fs from 'fs-extra';
import { ConfigRegistry } from '../../../core/dist/registry';

export async function listCommand(): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const looms = await listLooms({ fs, registry });
        
        if (looms.length === 0) {
            console.log(chalk.yellow('No looms registered.'));
            console.log(chalk.gray(`  Run 'loom init' to create the default loom.`));
            console.log(chalk.gray(`  Run 'loom setup <name>' to create a named loom.`));
            return;
        }
        
        console.log(chalk.bold('\n🧵 Registered Looms\n'));
        for (const loom of looms) {
            const marker = loom.isActive ? chalk.green('★') : ' ';
            const nameDisplay = loom.isActive ? chalk.green.bold(loom.name) : loom.name;
            const pathDisplay = loom.exists ? chalk.gray(loom.path) : chalk.red(`[missing] ${loom.path}`);
            console.log(`  ${marker} ${nameDisplay.padEnd(15)} ${pathDisplay}`);
        }
        console.log(chalk.gray('\n  ★ = active loom'));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}