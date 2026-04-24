import * as vscode from 'vscode';
import { runEvent } from '@reslava-loom/app/dist/runEvent';
import { loadWeave, saveWeave } from '@reslava-loom/fs/dist';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function startPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const planId = node?.doc?.id ?? await vscode.window.showInputBox({
        prompt: 'Plan ID to start',
        placeHolder: 'e.g., payment-system-plan-001',
    });
    if (!planId) return;

    const weaveId = node?.weaveId ?? planId.split('-plan-')[0];
    if (!weaveId) {
        vscode.window.showErrorMessage(`Invalid plan ID format. Expected "{weaveId}-plan-###".`);
        return;
    }

    try {
        const loomRoot = workspaceRoot;
        const loadWeaveOrThrow = async (root: string, id: string) => {
            const weave = await loadWeave(root, id);
            if (!weave) throw new Error(`Weave '${id}' is empty or does not exist.`);
            return weave;
        };
        const runEventFn = (wid: string, evt: any) =>
            runEvent(wid, evt, { loadWeave: loadWeaveOrThrow, saveWeave, loomRoot });

        const weave = await loadWeaveOrThrow(loomRoot, weaveId);
        const plan = weave.threads.flatMap((t: any) => t.plans).find((p: any) => p.id === planId);
        if (!plan) {
            vscode.window.showErrorMessage(`Plan '${planId}' not found in weave '${weaveId}'.`);
            return;
        }

        if (plan.status === 'draft') {
            await runEventFn(weaveId, { type: 'ACTIVATE_PLAN', planId });
        }
        await runEventFn(weaveId, { type: 'START_IMPLEMENTING_PLAN', planId });

        vscode.window.showInformationMessage(`🧵 Plan started: ${planId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to start plan: ${e.message}`);
    }
}
