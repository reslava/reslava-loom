import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function promoteToPlanCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceId = node?.doc?.id;
    if (!sourceId) { vscode.window.showErrorMessage('Right-click a chat, idea, or design in the tree to promote it.'); return; }

    const toolArgs: Record<string, unknown> = { sourceId, targetType: 'plan' };

    const targetWeaveId = node?.weaveId ?? await vscode.window.showInputBox({ prompt: 'Target weave ID', placeHolder: 'e.g., my-feature' });
    if (!targetWeaveId) return;
    toolArgs['targetWeaveId'] = targetWeaveId;

    let targetThreadId = node?.threadId;
    if (!targetThreadId) {
        const input = await vscode.window.showInputBox({ prompt: 'Target thread ID (leave blank for weave-level)', placeHolder: 'e.g., auth-flow' });
        if (input === undefined) return;
        targetThreadId = input || undefined;
    }
    if (targetThreadId) toolArgs['targetThreadId'] = targetThreadId;

    if (await isClaudeInstalled()) {
        const sourceFilePath = (node?.doc as any)?._path as string | undefined;
        const readInstruction = sourceFilePath
            ? `Read the source file at "${sourceFilePath}" using the Read tool (not Bash, not loom_find_doc).`
            : `Use MCP tool loom_find_doc with id="${sourceId}" to get the file path, then read it with the Read tool.`;
        const threadArg = targetThreadId ? `, targetThreadId="${targetThreadId}"` : '';
        await launchClaude(root, `Loom: Promote to Plan`,
            `Loom promote to plan task. sourceId="${sourceId}", targetWeaveId="${targetWeaveId}"${threadArg}. ${readInstruction} Use MCP tool loom_create_plan with weaveId="${targetWeaveId}"${targetThreadId ? ` threadId="${targetThreadId}"` : ''}, then use MCP tool loom_update_doc with a plan steps table derived from the source. Do not use loom_promote — sampling is unavailable in Claude Code CLI. Do not invoke CLI commands via Bash.`
        );
    } else {
        try {
            let result: any;
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: Promoting to plan…', cancellable: false },
                async () => { result = await getMCP(root).callTool('loom_promote', toolArgs); }
            );
            treeProvider.refresh();
            if (result?.filePath) {
                const doc = await vscode.workspace.openTextDocument(result.filePath);
                await vscode.window.showTextDocument(doc, { preview: false });
            }
            vscode.window.showInformationMessage(`Plan created from ${sourceId}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Promote to plan failed: ${e.message}`);
        }
    }
}
