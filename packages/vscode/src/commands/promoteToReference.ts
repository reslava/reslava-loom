import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { isClaudeInstalled, launchClaude } from './claudeTerminal';

export async function promoteToReferenceCommand(treeProvider: LoomTreeProvider, node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const sourceDoc = node?.doc;
    if (!sourceDoc) { vscode.window.showErrorMessage('Right-click a refs chat to promote it to a reference.'); return; }

    const titleInput = await vscode.window.showInputBox({ prompt: 'Reference title', value: sourceDoc.title, placeHolder: 'e.g. Architecture' });
    if (!titleInput) return;

    try {
        const result = await getMCP(root).callTool('loom_create_reference', { title: titleInput }) as any;
        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        if (result?.id) {
            if (await isClaudeInstalled()) {
                await launchClaude(root, `Loom: Generate Reference`,
                    `Loom generate reference task. referenceId="${result.id}", sourceId="${sourceDoc.id}". Use the loom MCP server: loom_find_doc(id="${sourceDoc.id}") → read the source doc → loom_update_doc(id="${result.id}", body="<reference content derived from source>"). Do not call loom_generate_reference — sampling is unavailable in Claude Code CLI.`
                );
            } else {
                try {
                    await getMCP(root).callTool('loom_generate_reference', { id: result.id });
                } catch { /* sampling unavailable — leave empty body */ }
            }
        }
        vscode.window.showInformationMessage(`Reference "${titleInput}" created.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Promote to reference failed: ${e.message}`);
    }
}
