import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadWeave} from '../../../fs/dist';
import { saveWeave } from '../../../fs/dist';
import { getActiveLoomRoot, resolveWeaveIdForPlan } from '../../../fs/dist';

export async function startPlanCommand(planId: string): Promise<void> {
    try {
        const loomRoot = getActiveLoomRoot();
        const weaveId = await resolveWeaveIdForPlan(loomRoot, planId);
        
        const loadWeaveOrThrow = async (root: string, tid: string) => {
            const thread = await loadWeave(root, tid);
            if (!thread) throw new Error(`Thread '${tid}' is empty or does not exist.`);
            return thread;
        };

        const weave = await loadWeaveOrThrow(loomRoot, weaveId);
        const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === planId);

        if (!plan) {
            throw new Error(`Plan '${planId}' not found in weave '${weaveId}'`);
        }

        const runEventWithDeps = (tid: string, evt: any) =>
            runEvent(tid, evt, { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot });

        if (plan.status === 'draft') {
            await runEventWithDeps(weaveId, { type: 'ACTIVATE_PLAN', planId });
            console.log(chalk.gray(`   Plan activated (draft → active)`));
        }

        await runEventWithDeps(weaveId, { type: 'START_IMPLEMENTING_PLAN', planId });
        console.log(chalk.green(`🧵 START_PLAN applied to '${planId}'`));
        console.log(chalk.gray(`   Plan status changed to implementing.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to start plan: ${e.message}`));
        process.exit(1);
    }
}