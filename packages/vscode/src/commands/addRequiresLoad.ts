import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getMCP } from '../mcp-client';
import { TreeNode } from '../tree/treeProvider';

export async function addRequiresLoadCommand(node?: TreeNode): Promise<void> {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) { vscode.window.showErrorMessage('No workspace open.'); return; }

    const docId = node?.doc?.id;
    if (!docId) { vscode.window.showErrorMessage('Select an idea, design, or plan first.'); return; }

    const refsDir = path.join(root, 'loom', 'refs');
    let files: string[];
    try {
        files = fs.readdirSync(refsDir).filter(f => f.endsWith('.md'));
    } catch {
        vscode.window.showErrorMessage('No loom/refs/ directory found.');
        return;
    }

    const items: vscode.QuickPickItem[] = [];
    for (const file of files) {
        try {
            const content = fs.readFileSync(path.join(refsDir, file), 'utf8');
            const titleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
            const idMatch = content.match(/^id:\s*(\S+)/m);
            const title = titleMatch?.[1] ?? file.replace(/-reference\.md$/, '');
            const id = idMatch?.[1] ?? file.replace('.md', '');
            items.push({ label: title, description: file, detail: id });
        } catch { /* skip unreadable files */ }
    }

    if (items.length === 0) {
        vscode.window.showInformationMessage('No reference docs found in loom/refs/.');
        return;
    }

    const currentRequiresLoad: string[] = (node?.doc as any)?.requires_load ?? [];
    const selected = await vscode.window.showQuickPick(items, {
        canPickMany: true,
        placeHolder: 'Select references to add to requires_load',
    });

    if (!selected?.length) return;

    const selectedIds = selected.map(s => s.detail ?? '').filter(Boolean);
    const merged = [...new Set([...currentRequiresLoad, ...selectedIds])];

    try {
        await getMCP(root).callTool('loom_update_doc', { id: docId, requires_load: merged });
        vscode.window.showInformationMessage(`Added ${selectedIds.length} reference(s) to requires_load.`);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Failed to update requires_load: ${e.message}`);
    }
}
