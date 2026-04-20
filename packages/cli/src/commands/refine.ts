import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadThread } from '../../../fs/dist';
import { saveThread } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';

export async function refineCommand(threadId: string): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        
        const loadThreadOrThrow = async (root: string, tid: string) => {
            const thread = await loadThread(root, tid);
            if (!thread) throw new Error(`Thread '${tid}' is empty or does not exist.`);
            return thread;
        };

        await runEvent(threadId, { type: 'REFINE_DESIGN' }, { loadThread: loadThreadOrThrow, saveThread, loomRoot });
        console.log(chalk.green(`🧵 REFINE_DESIGN applied to thread '${threadId}'`));
        console.log(chalk.gray(`   Design version incremented. Dependent plans marked stale.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to refine design: ${e.message}`));
        process.exit(1);
    }
}