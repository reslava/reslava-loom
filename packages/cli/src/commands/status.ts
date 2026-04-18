import chalk from 'chalk';
import { getState } from '../../../app/dist/getState';
import { getActiveLoomRoot, loadThread, buildLinkIndex } from '../../../fs/dist';
import { ConfigRegistry } from '../../../core/dist/registry';
import * as fs from 'fs-extra';
import { Thread } from '../../../core/dist/entities/thread';
import { getThreadStatus, getThreadPhase } from '../../../core/dist/derived';
import { PlanDoc } from '../../../core/dist/entities/plan';
import { LinkIndex } from '../../../core/dist/linkIndex';
import { buildLinkIndex as buildIndex } from '../../../fs/dist';

function colorStatus(status: string): string {
    switch (status) {
        case 'DONE': return chalk.green(status);
        case 'IMPLEMENTING': return chalk.blue(status);
        case 'ACTIVE': return chalk.yellow(status);
        case 'CANCELLED': return chalk.red(status);
        default: return status;
    }
}

function isStepBlocked(step: { order: number; blockedBy: string[] }, plan: PlanDoc, index: LinkIndex): boolean {
    if (!step.blockedBy || step.blockedBy.length === 0) return false;

    for (const blocker of step.blockedBy) {
        const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
        if (stepMatch) {
            const stepNum = parseInt(stepMatch[1], 10);
            const targetStep = plan.steps?.find(s => s.order === stepNum);
            if (targetStep && !targetStep.done) return true;
            continue;
        }

        if (blocker.includes('-plan-')) {
            const planEntry = index.documents.get(blocker);
            if (!planEntry) return true;
            if (!planEntry.exists) return true;
            return true;
        }
    }

    return false;
}

function findNextStep(plan: PlanDoc, index: LinkIndex): { order: number; description: string } | null {
    if (!plan.steps) return null;

    for (const step of plan.steps) {
        if (step.done) continue;
        if (!isStepBlocked(step, plan, index)) {
            return { order: step.order, description: step.description };
        }
    }

    return null;
}

function displayPlanDetails(plan: PlanDoc, index: LinkIndex): void {
    const steps = plan.steps || [];
    const doneCount = steps.filter(s => s.done).length;

    console.log(`\n📋 Active Plan: ${plan.id}`);
    console.log(`   Status: ${plan.status}`);
    console.log(`   Progress: ${doneCount}/${steps.length} steps done\n`);
    console.log('   Steps:');

    for (const step of steps) {
        let symbol: string;
        if (step.done) {
            symbol = '✅';
        } else if (isStepBlocked(step, plan, index)) {
            symbol = '🔒';
        } else {
            symbol = '🔳';
        }

        console.log(`   ${symbol} ${step.order}. ${step.description}`);
        
        if (!step.done && isStepBlocked(step, plan, index)) {
            const blockers = step.blockedBy.join(', ');
            console.log(`      ⚠️ Blocked by: ${blockers}`);
        }
    }

    const nextStep = findNextStep(plan, index);
    if (nextStep) {
        console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
    } else {
        const blockedSteps = steps.filter(s => !s.done && isStepBlocked(s, plan, index));
        if (blockedSteps.length > 0) {
            console.log(chalk.yellow(`\n   ⚠️ All remaining steps are blocked.`));
        } else if (steps.every(s => s.done)) {
            console.log(chalk.green(`\n   🎉 All steps complete!`));
        }
    }
}

export async function statusCommand(
    threadId?: string,
    options?: { verbose?: boolean; json?: boolean; tokens?: boolean }
): Promise<void> {
    try {
        const registry = new ConfigRegistry();
        const state = await getState({ getActiveLoomRoot, loadThread, buildLinkIndex, registry, fs });

        if (options?.json) {
            console.log(JSON.stringify(state, null, 2));
            return;
        }

        if (threadId) {
            const thread = state.threads.find(t => t.id === threadId);
            if (!thread) {
                console.error(chalk.red(`❌ Thread '${threadId}' not found.`));
                process.exit(1);
            }

            const status = getThreadStatus(thread);
            const phase = getThreadPhase(thread);

            console.log(chalk.bold(`\n🧵 Thread: ${thread.id}`));
            console.log(`   Status: ${colorStatus(status)}`);
            console.log(`   Phase:  ${phase}`);
            console.log(`   Design: ${thread.design.title} (v${thread.design.version})`);
            console.log(`   Plans:  ${thread.plans.length} (${thread.plans.filter(p => p.status === 'done').length} done)`);

            const activePlan = thread.plans.find(
                p => p.status === 'implementing' || p.status === 'active'
            );

            if (activePlan && options?.verbose) {
                const index = await buildIndex();
                displayPlanDetails(activePlan, index);
            }

            if (activePlan && !options?.verbose) {
                const index = await buildIndex();
                const nextStep = findNextStep(activePlan, index);
                if (nextStep) {
                    console.log(chalk.gray(`\n   💡 Next step: Step ${nextStep.order} — ${nextStep.description}`));
                }
            }
            return;
        }

        // List all threads
        console.log(chalk.bold(`\n🧵 Loom: ${state.loomName} (${state.mode})\n`));
        if (state.threads.length === 0) {
            console.log(chalk.yellow('No threads found.'));
            return;
        }

        for (const t of state.threads) {
            const status = getThreadStatus(t);
            console.log(`  ${t.id.padEnd(25)} ${colorStatus(status)}`);
        }
    } catch (e: any) {
        console.error(chalk.red(`❌ ${e.message}`));
        process.exit(1);
    }
}