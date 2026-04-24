import chalk from 'chalk';
import { weaveDesign } from '../../../app/dist/weaveDesign';
import { getActiveLoomRoot, saveDoc, loadDoc } from '../../../fs/dist';
import * as fs from 'fs-extra';

export async function weaveDesignCommand(weaveId: string, options: { title?: string; thread?: string }): Promise<void> {
    try {
        const result = await weaveDesign(
            { weaveId, title: options.title, threadId: options.thread },
            { getActiveLoomRoot, saveDoc, loadDoc, fs }
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