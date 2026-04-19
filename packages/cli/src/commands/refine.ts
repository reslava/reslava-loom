import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadThread } from '../../../fs/dist';
import { saveThread } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';

export async function refineCommand(threadId: string): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        await runEvent(threadId, { type: 'REFINE_DESIGN' }, { loadThread, saveThread, loomRoot });
        console.log(chalk.green(`🧵 REFINE_DESIGN applied to thread '${threadId}'`));
        console.log(chalk.gray(`   Design version incremented. Dependent plans marked stale.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to refine design: ${e.message}`));
        process.exit(1);
    }
}