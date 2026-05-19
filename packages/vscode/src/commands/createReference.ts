import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function createReferenceCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const title = await vscode.window.showInputBox({ prompt: 'Reference title', placeHolder: 'e.g. Architecture' });
    if (!title) return;

    const description = await vscode.window.showInputBox({ prompt: 'Short description (optional)', placeHolder: 'What does this reference cover?' }) || undefined;

    try {
        const result = await getMCP(root).callTool('loom_create_reference', { title, ...(description ? { description } : {}) }) as any;
        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        if (result?.id) {
            if (await isClaudeInstalled()) {
                await launchClaude(root, `Loom: Generate Reference`,
                    `Loom generate reference task. referenceId="${result.id}", title="${title}"${description ? `, description="${description}"` : ''}. Use the loom MCP server: loom_update_doc(id="${result.id}", body="<reference content about ${title}>"). Do not call loom_generate_reference — sampling is unavailable in Claude Code CLI.`
                );
            } else {
                try {
                    await getMCP(root).callTool('loom_generate_reference', { id: result.id });
                } catch { /* sampling unavailable — leave empty body */ }
            }
        }
        vscode.window.showInformationMessage(`Reference "${title}" created.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create reference: ${e.message}`);
    }
}
