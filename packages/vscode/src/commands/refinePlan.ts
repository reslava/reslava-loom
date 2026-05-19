import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { ContextSidebarProvider } from '../providers/contextSidebarProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function refinePlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode, contextSidebar?: ContextSidebarProvider): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const id = node?.doc?.id;
    if (!id) { vscode.window.showErrorMessage('Right-click a plan in the tree to refine it.'); return; }

    const contextIds = contextSidebar?.getSelectedIds() ?? [];

    if (await isClaudeInstalled()) {
        const ctxNote = contextIds.length > 0 ? ` Additional context doc ids: ${JSON.stringify(contextIds)}.` : '';
        await launchClaude(root, `Loom: Refine Plan`,
            `Loom refine plan task. planId="${id}".${ctxNote} Use the loom MCP server: use MCP tool loom_find_doc with id="${id}", read the plan and its parent design, update the plan steps table to reflect the current design, then use MCP tool loom_update_doc with id="${id}" and updated body. Do not use loom_refine_plan — sampling is unavailable in Claude Code CLI.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining plan…', cancellable: false },
                async () => {
                    result = await getMCP(root).callTool('loom_refine_plan', { id, ...(contextIds.length > 0 ? { context_ids: contextIds } : {}) });
                }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Plan refined (v${result?.version})`);
        } catch (e: any) {
            handleMcpError(e, treeProvider);
        }
    }
}
