import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';

export async function restoreItemCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    if (!node) return;

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) return;

    const archiveRoot = path.join(workspaceRoot, 'loom', '.archive');
    const loomDir = path.join(workspaceRoot, 'loom');

    try {
        // Determine the archived path from node._path or weave/thread structure
        let src: string;
        let dst: string;

        if (node.contextValue === 'weave' && node.weaveId) {
            src = path.join(archiveRoot, node.weaveId);
            dst = path.join(loomDir, node.weaveId);
        } else if (node.contextValue?.startsWith('thread') && node.weaveId && node.threadId) {
            src = path.join(archiveRoot, node.weaveId, node.threadId);
            dst = path.join(loomDir, node.weaveId, node.threadId);
        } else {
            const filePath = (node.doc as any)?._path as string | undefined;
            if (!filePath) { vscode.window.showErrorMessage('Cannot determine what to restore.'); return; }
            const archivePrefix = archiveRoot + path.sep;
            if (!filePath.startsWith(archivePrefix)) { vscode.window.showErrorMessage('Item is not in the archive.'); return; }
            const rel = filePath.slice(archivePrefix.length);
            src = filePath;
            dst = path.join(loomDir, rel);
        }

        if (!await fs.pathExists(src)) { vscode.window.showErrorMessage('Archive path not found.'); return; }
        await fs.ensureDir(path.dirname(dst));
        await fs.move(src, dst, { overwrite: false });

        // Clean up empty archive weave container dir if applicable
        if (node.weaveId && node.threadId) {
            const weaveArchiveDir = path.join(archiveRoot, node.weaveId);
            const remaining = await fs.readdir(weaveArchiveDir).catch(() => ['x']);
            if (remaining.length === 0) await fs.remove(weaveArchiveDir);
        }

        treeProvider.refresh();
    } catch (e: any) {
        vscode.window.showErrorMessage(`Restore failed: ${e.message}`);
    }
}
