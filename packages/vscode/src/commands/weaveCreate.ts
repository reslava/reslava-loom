import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function weaveCreateCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
        vscode.window.showErrorMessage('No workspace open.');
        return;
    }

    const weaveId = await vscode.window.showInputBox({
        prompt: 'Weave ID',
        placeHolder: 'e.g., payment-system',
        validateInput: v => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v) ? null : 'Use kebab-case (lowercase, hyphens)',
    });
    if (!weaveId) return;

    const weavePath = path.join(workspaceRoot, 'loom', weaveId);
    if (await fs.pathExists(weavePath)) {
        vscode.window.showWarningMessage(`Weave '${weaveId}' already exists.`);
        return;
    }

    await fs.ensureDir(weavePath);
    await fs.ensureDir(path.join(weavePath, 'chats'));
    await treeProvider.waitForRefresh();
    const node = treeProvider.getNodeByWeaveId(weaveId);
    if (node) treeView.reveal(node, { select: true, focus: true, expand: false });
}
