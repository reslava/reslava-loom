import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function archiveItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const archiveRoot = path.join(workspaceRoot, 'loom', '.archive');

    try {
        if (node.contextValue === 'weave' && node.weaveId) {
            const src = path.join(workspaceRoot, 'loom', node.weaveId);
            const dst = path.join(archiveRoot, node.weaveId);
            await fs.ensureDir(archiveRoot);
            await fs.move(src, dst, { overwrite: false });
        } else if (node.contextValue?.startsWith('thread') && node.weaveId && node.threadId) {
            const src = path.join(workspaceRoot, 'loom', node.weaveId, node.threadId);
            const dst = path.join(archiveRoot, node.weaveId, node.threadId);
            await fs.ensureDir(path.join(archiveRoot, node.weaveId));
            await fs.move(src, dst, { overwrite: false });
        } else {
            const filePath = (node.doc as any)?._path as string | undefined;
            if (!filePath) { vscode.window.showErrorMessage('Cannot determine what to archive.'); return; }
            // Derive destination by replacing loom/ segment with loom/.archive/
            const loomDir = path.join(workspaceRoot, 'loom') + path.sep;
            if (!filePath.startsWith(loomDir)) { vscode.window.showErrorMessage('File is not inside loom/.'); return; }
            const rel = filePath.slice(loomDir.length);
            const dst = path.join(archiveRoot, rel);
            await fs.ensureDir(path.dirname(dst));
            await fs.move(filePath, dst, { overwrite: false });
        }
        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Archive failed: ${e.message}`);
    }
}
