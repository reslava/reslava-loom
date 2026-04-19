import * as vscode from 'vscode';
import { LoomTreeProvider } from './tree/treeProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('🧵 Loom extension activated');

    const treeProvider = new LoomTreeProvider();
    const treeView = vscode.window.createTreeView('loom.threads', {
        treeDataProvider: treeProvider,
        showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // ── Helper ───────────────────────────────────────────────────────────────
    function syncAndRefresh(): void {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        treeProvider.setWorkspaceRoot(root);
        treeProvider.refresh();
    }

    // ── Commands ─────────────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.commands.registerCommand('loom.refresh', syncAndRefresh)
    );

    // ── Workspace changes ────────────────────────────────────────────────────
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => syncAndRefresh())
    );

    // ── File watcher ─────────────────────────────────────────────────────────
    const watcher = vscode.workspace.createFileSystemWatcher('**/threads/**/*.md');
    const debouncedRefresh = debounce(() => treeProvider.refresh(), 300);
    context.subscriptions.push(watcher.onDidCreate(debouncedRefresh));
    context.subscriptions.push(watcher.onDidChange(debouncedRefresh));
    context.subscriptions.push(watcher.onDidDelete(debouncedRefresh));
    context.subscriptions.push(watcher);

    // ── Initial load ─────────────────────────────────────────────────────────
    // setImmediate lets VS Code finish initializing workspace state before we
    // read workspaceFolders for the first time.
    setImmediate(() => syncAndRefresh());
}

export function deactivate() {}

function debounce(fn: () => void, ms: number): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(fn, ms);
    };
}
