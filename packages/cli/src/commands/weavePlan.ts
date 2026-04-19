import chalk from 'chalk';
import { weavePlan } from '../../../app/dist/weavePlan';
import { loadThread } from '../../../fs/dist';
import { saveDoc } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weavePlanCommand(threadId: string, options: { title?: string; goal?: string }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const result = await weavePlan(
            { threadId, title: options.title, goal: options.goal },
            { loadThread, saveDoc, fs, loomRoot }
        );
        if (result.autoFinalizedDesign) {
            console.log(chalk.gray(`   Design auto-finalized`));
        }
        console.log(chalk.green(`🧵 Plan woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}