import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { ContextSidebarProvider } from '../providers/contextSidebarProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function refineCommand(treeProvider: LoomTreeProvider, node?: TreeNode, contextSidebar?: ContextSidebarProvider): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const id = node?.doc?.id;
    if (!id) { vscode.window.showErrorMessage('Right-click a design in the tree to refine it.'); return; }

    const contextIds = contextSidebar?.getSelectedIds() ?? [];

    if (await isClaudeInstalled()) {
        const filePath = (node?.doc as any)?._path as string | undefined;
        const readInstruction = filePath
            ? `Read the design file at "${filePath}" using the Read tool (not Bash, not loom_find_doc).`
            : `Use MCP tool loom_find_doc with id="${id}" to get the file path, then read it with the Read tool.`;
        const ctxNote = contextIds.length > 0 ? ` Additional context doc ids: ${JSON.stringify(contextIds)}.` : '';
        await launchClaude(root, `Loom: Refine Design`,
            `Loom refine design task. designId="${id}".${ctxNote} ${readInstruction} Also read its parent idea. Rewrite the design body to reflect updates, then use MCP tool loom_update_doc with id="${id}" and updated body. Do not use loom_refine_design — sampling is unavailable in Claude Code CLI. Do not invoke CLI commands via Bash.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Refining design…', cancellable: false },
                async () => {
                    result = await getMCP(root).callTool('loom_refine_design', { id, ...(contextIds.length > 0 ? { context_ids: contextIds } : {}) });
                }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Design refined (v${result?.version})`);
        } catch (e: any) {
            handleMcpError(e, treeProvider);
        }
    }
}
