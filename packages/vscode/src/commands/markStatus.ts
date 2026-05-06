import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

async function setDocStatus(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    node: TreeNode | undefined,
    status: 'done' | 'active'
): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const resolved = node ?? treeView.selection[0] as TreeNode | undefined;
    const docId = resolved?.doc?.id;
    if (!docId) { vscode.window.showErrorMessage('Select a document node first.'); return; }

    try {
        await getMCP(root).callTool('loom_update_doc', { id: docId, status });
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to mark ${status}: ${e.message}`);
    }
}

export function markDoneCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    return setDocStatus(treeProvider, treeView, node, 'done');
}

export function markActiveCommand(treeProvider: LoomTreeProvider, treeView: vscode.TreeView<TreeNode>, node?: TreeNode): Promise<void> {
    return setDocStatus(treeProvider, treeView, node, 'active');
}
