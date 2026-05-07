import * as vscode from 'vscode';
import { getMCP } from '../mcp-client';
import { LoomTreeProvider } from '../tree/treeProvider';

export async function createReferenceCommand(treeProvider: LoomTreeProvider): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const title = await vscode.window.showInputBox({
        prompt: 'Reference title',
        placeHolder: 'e.g. Architecture',
    });
    if (!title) return;

    const description = await vscode.window.showInputBox({
        prompt: 'Short description (optional)',
        placeHolder: 'What does this reference cover?',
    }) || undefined;

    try {
        let result: any;
        const aiEnabled = vscode.workspace.getConfiguration('reslava-loom.ai').get<string>('apiKey')?.length ?? 0 > 0;

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Loom: Creating reference…', cancellable: false },
            async () => {
                result = await getMCP(root).callTool('loom_create_reference', {
                    title,
                    ...(description ? { description } : {}),
                }) as any;

                if (aiEnabled && result?.id) {
                    try {
                        result = await getMCP(root).callTool('loom_generate_reference', {
                            id: result.id,
                            ...(description ? { context_ids: [] } : {}),
                        }) as any;
                    } catch { /* sampling unavailable — leave empty body */ }
                }
            }
        );

        treeProvider.refresh();
        if (result?.filePath) {
            const doc = await vscode.workspace.openTextDocument(result.filePath);
            await vscode.window.showTextDocument(doc, { preview: false });
        }
        vscode.window.showInformationMessage(`Reference "${title}" created.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to create reference: ${e.message}`);
    }
}
