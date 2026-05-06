import * as vscode from 'vscode';
import { LoomTreeProvider, TreeNode } from '../tree/treeProvider';
import { TokenEstimatorService } from '../services/tokenEstimatorService';
import { getMCP } from '../mcp-client';

interface ContextEntry {
    id: string;
    label: string;
    type: string;
    filePath?: string;
    pinned: boolean;
    loaded: boolean;
}

type SectionItem =
    | { kind: 'section'; label: string }
    | { kind: 'doc'; entry: ContextEntry }
    | { kind: 'total'; label: string };

export class ContextSidebarProvider implements vscode.TreeDataProvider<SectionItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SectionItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private pinned: ContextEntry[] = [];
    private optIn: ContextEntry[] = [];

    constructor(
        private treeProvider: LoomTreeProvider,
        private estimator: TokenEstimatorService,
    ) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getSelectedIds(): string[] {
        return [
            ...this.pinned.filter(e => e.loaded).map(e => e.id),
            ...this.optIn.filter(e => e.loaded).map(e => e.id),
        ];
    }

    private tokenCount(entry: ContextEntry): number {
        if (!entry.filePath) return 0;
        try {
            const fs = require('fs') as typeof import('fs');
            const content = fs.readFileSync(entry.filePath, 'utf8');
            return this.estimator.estimate(content);
        } catch { return 0; }
    }

    private sectionTokens(entries: ContextEntry[]): number {
        return entries.filter(e => e.loaded).reduce((sum, e) => sum + this.tokenCount(e), 0);
    }

    async onSelectionChanged(node: TreeNode | undefined): Promise<void> {
        this.pinned = [];
        this.optIn = [];
        this.refresh();

        if (!node) return;

        const state = this.treeProvider.getState();
        if (!state) return;
        const root = this.treeProvider.getLoomRoot();
        if (!root) return;

        const { weaveId, threadId } = node;
        if (!weaveId) return;

        const weave = state.weaves.find(w => w.id === weaveId);
        if (!weave) return;

        const thread = threadId ? weave.threads.find(t => t.id === threadId) : undefined;

        const rawPinned: ContextEntry[] = [];
        const rawOptIn: ContextEntry[] = [];

        if (thread) {
            if (thread.idea) rawPinned.push(this.entry(thread.idea as any, true));
            if (thread.design) rawPinned.push(this.entry(thread.design as any, true));
            const activePlan = thread.plans.find((p: any) => p.status === 'implementing');
            if (activePlan) rawPinned.push(this.entry(activePlan as any, true));
            this.collectCtxDocs(rawPinned, weave as any, state as any);
            for (const chat of thread.chats) rawOptIn.push({ ...this.entry(chat as any, false), loaded: false });
            for (const ref of thread.refDocs) rawOptIn.push({ ...this.entry(ref as any, false), loaded: false });
        } else {
            this.collectCtxDocs(rawPinned, weave as any, state as any);
        }

        this.pinned = rawPinned;
        this.optIn = rawOptIn;
        this.refresh();

        // Async: resolve file paths via MCP, then refresh with token estimates
        const allEntries = [...this.pinned, ...this.optIn];
        await Promise.all(allEntries.map(async (entry) => {
            try {
                const result = await getMCP(root).callTool('loom_find_doc', { id: entry.id }) as any;
                entry.filePath = result?.filePath;
            } catch { /* leave filePath undefined */ }
        }));

        this.refresh();
    }

    private entry(doc: { id: string; title: string; type: string }, pinned: boolean): ContextEntry {
        return { id: doc.id, label: doc.title, type: doc.type, pinned, loaded: true };
    }

    private collectCtxDocs(entries: ContextEntry[], weave: any, state: any): void {
        const weaveCtx = weave?.allDocs?.find((d: any) => d.type === 'ctx');
        if (weaveCtx) entries.push(this.entry(weaveCtx, true));
        const globalCtx = state.globalDocs?.find((d: any) => d.type === 'ctx');
        if (globalCtx) entries.push(this.entry(globalCtx, true));
    }

    toggle(id: string): void {
        const inPinned = this.pinned.find(e => e.id === id);
        if (inPinned) { inPinned.loaded = !inPinned.loaded; this.refresh(); return; }
        const inOptIn = this.optIn.find(e => e.id === id);
        if (inOptIn) { inOptIn.loaded = !inOptIn.loaded; this.refresh(); }
    }

    openDoc(id: string): void {
        const all = [...this.pinned, ...this.optIn];
        const entry = all.find(e => e.id === id);
        if (entry?.filePath) {
            vscode.workspace.openTextDocument(entry.filePath).then(doc => {
                vscode.window.showTextDocument(doc, { preview: false });
            });
        }
    }

    getTreeItem(item: SectionItem): vscode.TreeItem {
        if (item.kind === 'section') {
            const node = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
            node.contextValue = 'section';
            return node;
        }

        if (item.kind === 'total') {
            const node = new vscode.TreeItem(item.label, vscode.TreeItemCollapsibleState.None);
            node.contextValue = 'total';
            node.iconPath = new vscode.ThemeIcon('dashboard');
            return node;
        }

        const { entry } = item;
        const tokens = this.tokenCount(entry);
        const tokenStr = entry.filePath ? this.estimator.format(tokens) : '…';
        const node = new vscode.TreeItem(entry.label, vscode.TreeItemCollapsibleState.None);
        node.description = `${entry.type}  ${entry.loaded ? tokenStr : ''}`;
        node.tooltip = `${entry.label} (${entry.type}${entry.filePath ? ', ' + tokenStr + ' tokens' : ''})`;
        node.contextValue = entry.loaded ? 'loadedDoc' : 'unloadedDoc';
        node.iconPath = entry.loaded
            ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
            : new vscode.ThemeIcon('circle-outline');
        node.command = {
            command: 'loom.context.openDoc',
            title: 'Open',
            arguments: [entry.id],
        };
        return node;
    }

    getChildren(element?: SectionItem): SectionItem[] {
        if (element) return [];

        const items: SectionItem[] = [];

        const pinnedTokens = this.sectionTokens(this.pinned);
        const optInTokens = this.sectionTokens(this.optIn);
        const totalTokens = pinnedTokens + optInTokens;

        if (this.pinned.length > 0) {
            const pinnedStr = this.pinned.some(e => e.filePath) ? `  ${this.estimator.format(pinnedTokens)}` : '';
            items.push({ kind: 'section', label: `Pinned${pinnedStr}` });
            for (const entry of this.pinned) items.push({ kind: 'doc', entry });
        }

        if (this.optIn.length > 0) {
            const optInStr = this.optIn.some(e => e.filePath) ? `  ${this.estimator.format(optInTokens)}` : '';
            items.push({ kind: 'section', label: `Opt-in${optInStr}` });
            for (const entry of this.optIn) items.push({ kind: 'doc', entry });
        }

        if (this.pinned.length > 0 || this.optIn.length > 0) {
            const totalStr = (this.pinned.some(e => e.filePath) || this.optIn.some(e => e.filePath))
                ? this.estimator.format(totalTokens)
                : '…';
            items.push({ kind: 'total', label: `Total: ${totalStr}` });
        }

        if (items.length === 0) {
            items.push({ kind: 'section', label: 'Select a node to see context' });
        }

        return items;
    }
}
