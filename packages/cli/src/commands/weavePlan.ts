import chalk from 'chalk';
import { weavePlan } from '../../../app/dist/weavePlan';
import { loadWeave, saveDoc } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weavePlanCommand(weaveId: string, options: { title?: string; goal?: string; thread?: string }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const result = await weavePlan(
            { weaveId, title: options.title, goal: options.goal, threadId: options.thread },
            { loadWeave, saveDoc, fs, loomRoot }
        );
        console.log(chalk.green(`🧵 Plan woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}