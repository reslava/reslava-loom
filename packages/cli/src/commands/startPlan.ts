import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadThread } from '../../../fs/dist';
import { saveThread } from '../../../fs/dist';
import { getActiveLoomRoot } from '../../../fs/dist';

export async function startPlanCommand(planId: string): Promise<void> {
    try {
        const threadId = planId.split('-plan-')[0];
        if (!threadId) {
            throw new Error(`Invalid plan ID format. Expected "{threadId}-plan-###", got "${planId}"`);
        }

        const loomRoot = getActiveLoomRoot();
        const thread = await loadThread(loomRoot, threadId);
        const plan = thread.plans.find((p: any) => p.id === planId);
        
        if (!plan) {
            throw new Error(`Plan '${planId}' not found in thread '${threadId}'`);
        }

        const runEventWithDeps = (tid: string, evt: any) =>
            runEvent(tid, evt, { loadThread, saveThread, loomRoot });

        if (plan.status === 'draft') {
            await runEventWithDeps(threadId, { type: 'ACTIVATE_PLAN', planId });
            console.log(chalk.gray(`   Plan activated (draft → active)`));
        }

        await runEventWithDeps(threadId, { type: 'START_IMPLEMENTING_PLAN', planId });
        console.log(chalk.green(`🧵 START_PLAN applied to '${planId}'`));
        console.log(chalk.gray(`   Plan status changed to implementing.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to start plan: ${e.message}`));
        process.exit(1);
    }
}