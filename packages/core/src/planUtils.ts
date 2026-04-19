import { PlanDoc } from './entities/plan';
import { LinkIndex } from './linkIndex';

/**
 * Determines whether a plan step is currently blocked.
 *
 * @param step - The step to evaluate.
 * @param plan - The parent plan document.
 * @param index - The link index for resolving cross‑plan dependencies.
 * @returns True if the step is blocked by an incomplete internal step or a missing/incomplete external plan.
 */
export function isStepBlocked(
    step: { order: number; blockedBy: string[] },
    plan: PlanDoc,
    index: LinkIndex
): boolean {
    if (!step.blockedBy || step.blockedBy.length === 0) return false;

    for (const blocker of step.blockedBy) {
        // Internal step dependency: "Step N"
        const stepMatch = blocker.match(/^Step\s+(\d+)$/i);
        if (stepMatch) {
            const stepNum = parseInt(stepMatch[1], 10);
            const targetStep = plan.steps?.find(s => s.order === stepNum);
            if (targetStep && !targetStep.done) return true;
            continue;
        }

        // Cross‑plan dependency: plan ID
        if (blocker.includes('-plan-')) {
            const planEntry = index.documents.get(blocker);
            if (!planEntry) return true;           // Plan doesn't exist
            if (!planEntry.exists) return true;    // Plan file missing
            // Cannot check status without loading the plan; assume it's blocking if not done
            return true;
        }
    }

    return false;
}

/**
 * Finds the next unblocked, incomplete step in a plan.
 *
 * @param plan - The plan document to search.
 * @param index - The link index for resolving blockers.
 * @returns The next step, or null if all remaining steps are blocked or complete.
 */
export function findNextStep(
    plan: PlanDoc,
    index: LinkIndex
): { order: number; description: string } | null {
    if (!plan.steps) return null;

    for (const step of plan.steps) {
        if (step.done) continue;
        if (!isStepBlocked(step, plan, index)) {
            return { order: step.order, description: step.description };
        }
    }

    return null;
}