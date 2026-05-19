import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { handleMcpError } from '../mcpErrorUtils';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function chatReplyCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const chatId = node?.doc?.id;
    if (!chatId) { vscode.window.showErrorMessage('Select a chat document in the Loom tree first.'); return; }

    const filePath = (node!.doc as any)._path as string | undefined;
    if (filePath) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
        await doc.save();
    }

    if (await isClaudeInstalled()) {
        await launchClaude(root, `Loom: Chat Reply`,
            `Loom chat reply task. chatId="${chatId}". Use the loom MCP server: use MCP tool loom_find_doc with id="${chatId}" to get the file path, read the chat file, understand the conversation, write a reply to the last user message, then use MCP tool loom_append_to_chat with id="${chatId}", role="ai", body="<your reply>". Do not use loom_generate_chat_reply — sampling is unavailable in Claude Code CLI.`
        );
    } else {
        try {
            await vscode.window.withProgress(
                { location: vscode.ProgressLocation.Notification, title: 'Loom: AI thinking…', cancellable: false },
                async () => { await getMCP(root).callTool('loom_generate_chat_reply', { chatId }); }
            );
            if (filePath) {
                const updated = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(updated, { preview: false, preserveFocus: false });
            }
        } catch (e: any) {
            handleMcpError(e, treeProvider);
        }
    }
}
