import * as vscode from 'vscode';
import { weaveIdea } from '@reslava-loom/app/dist/weaveIdea';
import { getActiveLoomRoot, saveDoc } from '@reslava-loom/fs/dist';
import { toKebabCaseId } from '@reslava-loom/core/dist';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveIdeaCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const title = await vscode.window.showInputBox({
        prompt: 'Idea title',
        placeHolder: 'e.g., Add Dark Mode',
    });
    if (!title) return;

    // weave (folder name): from node context or derive from title
    let weave = node?.weaveId;
    if (!weave) {
        weave = await vscode.window.showInputBox({
            prompt: 'Weave ID',
            placeHolder: 'e.g., payment-system',
        });
        if (!weave) return;
    }

    // threadId: from thread node context, or auto-generate from title
    const threadId: string | undefined = node?.threadId ?? toKebabCaseId(title);

    try {
        const result = await weaveIdea(
            { title, weave, threadId },
            {
                getActiveLoomRoot: () => workspaceRoot,
                saveDoc,
                fs,
            }
        );

        vscode.window.showInformationMessage(`🧵 Idea woven: ${result.tempId}`);
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to weave idea: ${e.message}`);
    }
}
