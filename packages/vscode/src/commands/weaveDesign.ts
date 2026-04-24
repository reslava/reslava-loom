import * as vscode from 'vscode';
import { weaveDesign } from '@reslava-loom/app/dist/weaveDesign';
import { saveDoc, loadDoc } from '@reslava-loom/fs/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveDesignCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
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

    // threadId from thread node, or prompt
    let threadId = node?.threadId;
    if (!threadId) {
        threadId = await vscode.window.showInputBox({
            prompt: 'Thread ID (optional)',
            placeHolder: 'e.g., state-management — leave blank for loose design',
        }) || undefined;
    }

    const customTitle = await vscode.window.showInputBox({
        prompt: 'Design title (optional)',
        placeHolder: 'Leave blank to use idea title or thread ID',
    });

    try {
        const result = await weaveDesign(
            { weaveId, title: customTitle || undefined, threadId },
            {
                getActiveLoomRoot: () => workspaceRoot,
                saveDoc,
                loadDoc,
                fs,
            }
        );

        if (result.autoFinalized) {
            vscode.window.showInformationMessage(`🧵 Idea auto-finalized. Design woven: ${result.id}`);
        } else {
            vscode.window.showInformationMessage(`🧵 Design woven: ${result.id}`);
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave design: ${e.message}`);
    }
}
