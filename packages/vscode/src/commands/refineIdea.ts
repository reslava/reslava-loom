import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function refineIdeaCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const id = node?.doc?.id;
    if (!id) { vscode.window.showErrorMessage('Right-click an idea in the tree to refine it.'); return; }

    if (await isClaudeInstalled()) {
        await launchClaude(root, `Loom: Refine Idea`,
            `Loom refine idea task. ideaId="${id}". Use the loom MCP server: use MCP tool loom_find_doc with id="${id}", read the idea and any parent docs, rewrite the idea body with improvements, then use MCP tool loom_update_doc with id="${id}" and refined body. Do not use loom_refine_idea — sampling is unavailable in Claude Code CLI.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining idea…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_refine_idea', { id }); }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Idea refined (v${result?.version})`);
        } catch (e: any) {
            handleMcpError(e, treeProvider);
        }
    }
}
