import * as vscode from 'vscode';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function revealDocAfterCreate(
    treeProvider: LoomTreeProvider,
    treeView: vscode.TreeView<TreeNode>,
    filePath: string | undefined
): Promise<void> {
    if (!filePath) return;
    await treeProvider.waitForRefresh();
    const node = treeProvider.getNodeByFilePath(filePath);
    if (node) {
        treeView.reveal(node, { select: true, focus: false, expand: true });
    }
}
