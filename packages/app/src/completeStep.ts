import { loadThread } from '../../fs/dist';
import { runEvent } from './runEvent';
import { PlanDoc } from '../../core/dist/entities/plan';
import { WorkflowEvent } from '../../core/dist/events/workflowEvent';

export interface CompleteStepInput {
    planId: string;
    step: number;
}

export interface CompleteStepDeps {
    loadThread: (loomRoot: string, threadId: string) => Promise<any>;
    runEvent: (threadId: string, event: WorkflowEvent) => Promise<any>;
    loomRoot: string;
}

export async function completeStep(
    input: CompleteStepInput,
    deps: CompleteStepDeps
): Promise<{ plan: PlanDoc; autoCompleted: boolean }> {
    const threadId = input.planId.split('-plan-')[0];
    if (!threadId) {
        throw new Error(`Invalid plan ID format. Expected "{threadId}-plan-###", got "${input.planId}"`);
    }

    const stepIndex = input.step - 1;

    const thread = await deps.loadThread(deps.loomRoot, threadId);
    const plan = thread.plans.find((p: any) => p.id === input.planId);
    
    if (!plan) {
        throw new Error(`Plan '${input.planId}' not found in thread '${threadId}'`);
    }

    if (plan.status !== 'implementing') {
        throw new Error(`Plan must be 'implementing' to complete steps. Current status: ${plan.status}`);
    }

    if (stepIndex < 0 || stepIndex >= plan.steps.length) {
        throw new Error(`Step ${input.step} does not exist. Plan has ${plan.steps.length} steps.`);
    }

    if (plan.steps[stepIndex].done) {
        throw new Error(`Step ${input.step} is already completed.`);
    }

    await deps.runEvent(threadId, { type: 'COMPLETE_STEP', planId: input.planId, stepIndex } as WorkflowEvent);

    const updatedThread = await deps.loadThread(deps.loomRoot, threadId);
    const updatedPlan = updatedThread.plans.find((p: any) => p.id === input.planId)!;
    const autoCompleted = updatedPlan.status === 'done';

    return { plan: updatedPlan, autoCompleted };
}