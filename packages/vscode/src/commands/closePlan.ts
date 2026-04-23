import * as vscode from 'vscode';
import { closePlan } from '@reslava-loom/app/dist/closePlan';
import { loadWeave, saveDoc } from '@reslava-loom/fs/dist';
import { makeAIClient } from '../ai/makeAIClient';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';

export async function closePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const plan = node?.doc as PlanDoc | undefined;
    if (!plan || plan.type !== 'plan') {
        vscode.window.showErrorMessage('Select a plan node to close it.');
        return;
    }

    if (plan.status !== 'implementing' && plan.status !== 'done') {
        vscode.window.showErrorMessage(`Plan must be "implementing" or "done" to close. Current status: ${plan.status}`);
        return;
    }

    const notes = await vscode.window.showInputBox({
        prompt: 'Optional notes to include in the done doc (leave blank to skip)',
        placeHolder: 'e.g. Skipped step 3 due to scope change',
    });
    if (notes === undefined) return; // user cancelled

    try {
        const aiClient = makeAIClient();
        let result: { donePath: string; planId: string };

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: generating done doc…', cancellable: false },
            async () => {
                result = await closePlan(
                    { planId: plan.id, notes: notes || undefined },
                    { loadWeave, saveDoc, fs, aiClient, loomRoot: workspaceRoot }
                );
            }
        );

        treeProvider.refresh();
        const doc = await vscode.workspace.openTextDocument(result!.donePath);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage(`Plan closed — done doc saved.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Close Plan failed: ${e.message}`);
    }
}
