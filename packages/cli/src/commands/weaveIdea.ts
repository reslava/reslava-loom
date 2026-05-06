import chalk from 'chalk';
import * as fs from 'fs-extra';
import { getActiveLoomRoot, saveDoc } from '../../../fs/dist';
import { weaveIdea } from '../../../app/dist/weaveIdea';

export async function weaveIdeaCommand(title: string, options: { weave?: string; thread?: string; loose?: boolean }): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const threadId = options.loose ? undefined : options.thread;
        const result = await weaveIdea(
            { title, weave: options.weave, threadId },
            { getActiveLoomRoot, saveDoc, fs }
        );
        console.log(chalk.green(`🧵 Idea woven at ${result.filePath}`));
        console.log(chalk.gray(`   ID: ${result.id}`));
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}
