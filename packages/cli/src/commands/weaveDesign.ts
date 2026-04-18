import chalk from 'chalk';
import { weaveDesign } from '../../../app/dist';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weaveDesignCommand(threadId: string, options: { title?: string }): Promise<void> {
    try {
        const result = await weaveDesign(
            { threadId, title: options.title },
            { getActiveLoomRoot, saveDoc, fs }
        );
        if (result.autoFinalized) {
            console.log(chalk.gray(`   Idea auto-finalized`));
        }
        console.log(chalk.green(`🧵 Design woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}