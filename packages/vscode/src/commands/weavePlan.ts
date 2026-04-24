import * as vscode from 'vscode';
import { weavePlan } from '@reslava-loom/app/dist/weavePlan';
import { loadWeave, saveDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weavePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = node?.weaveId ?? await vscode.window.showInputBox({
        prompt: 'Weave ID',
        placeHolder: 'e.g., payment-system',
    });
    if (!weaveId) return;

    // threadId from thread or design node
    let threadId = node?.threadId;
    if (!threadId) {
        threadId = await vscode.window.showInputBox({
            prompt: 'Thread ID (optional)',
            placeHolder: 'e.g., state-management — leave blank for loose plan',
        }) || undefined;
    }

    // When triggered from a design node, link the plan to that design
    const parentId = node?.doc?.type === 'design' ? node.doc.id : undefined;

    const customTitle = await vscode.window.showInputBox({
        prompt: 'Plan title (optional)',
        placeHolder: 'Leave blank to use thread ID',
    });

    const goal = await vscode.window.showInputBox({
        prompt: 'Goal (optional)',
        placeHolder: 'Brief description of what this plan implements',
    });

    try {
        const result = await weavePlan(
            { weaveId, title: customTitle || undefined, goal: goal || undefined, parentId, threadId },
            {
                loomRoot: workspaceRoot,
                loadWeave,
                saveDoc,
                fs,
            }
        );

        vscode.window.showInformationMessage(`🧵 Plan woven: ${result.id}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave plan: ${e.message}`);
    }
}
