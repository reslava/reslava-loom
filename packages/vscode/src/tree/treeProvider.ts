import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getState } from '@reslava-loom/app/dist/getState';
import { loadWeave, buildLinkIndex } from '@reslava-loom/fs/dist';
import { ConfigRegistry } from '@reslava-loom/core/dist/registry';
import { LoomState } from '@reslava-loom/core/dist/entities/state';
import { Weave } from '@reslava-loom/core/dist/entities/weave';
import { Document } from '@reslava-loom/core/dist/entities/document';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';
import { ChatDoc } from '@reslava-loom/core/dist/entities/chat';
import { DoneDoc } from '@reslava-loom/core/dist/entities/done';
import { getWeaveStatus } from '@reslava-loom/core/dist/derived';
import { ViewStateManager } from '../view/viewStateManager';
import { GroupingMode, ViewState } from '../view/viewState';
import { getDocumentIcon, getWeaveIcon, getPlanIcon } from '../icons';

export interface TreeNode extends vscode.TreeItem {
    children?: TreeNode[];
    weaveId?: string;
    doc?: Document;
}

export class LoomTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private state: LoomState | null = null;
    private workspaceRoot: string | undefined;

    constructor(private viewStateManager: ViewStateManager) {}

    setWorkspaceRoot(root: string | undefined): void {
        this.workspaceRoot = root;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
        return element;
    }

    async getChildren(element?: TreeNode): Promise<TreeNode[]> {
        if (!element) {
            return this.getRootChildren();
        }
        return element.children ?? [];
    }

    private async getRootChildren(): Promise<TreeNode[]> {
        if (!this.workspaceRoot) {
            return [this.messageNode('No workspace open')];
        }

        const loomDir = path.join(this.workspaceRoot, '.loom');
        if (!fs.existsSync(loomDir)) {
            return [this.messageNode('No .loom directory found in workspace')];
        }

        try {
            const registry = new ConfigRegistry();
            this.state = await getState({
                getActiveLoomRoot: () => this.workspaceRoot!,
                loadWeave: (root, weaveId) => loadWeave(root, weaveId),
                buildLinkIndex: (root) => buildLinkIndex(root),
                registry,
                fs,
                workspaceRoot: this.workspaceRoot,
            });

            if (this.state.weaves.length === 0) {
                return [this.messageNode('No weaves found')];
            }

            const viewState = this.viewStateManager.getState();
            const filtered = this.filterWeaves(this.state.weaves, viewState);
            return this.groupWeaves(filtered, viewState.grouping);
        } catch (e: any) {
            console.error('🧵 Failed to load Loom state:', e);
            return [this.messageNode(`Error: ${e.message}`)];
        }
    }

    private filterWeaves(weaves: Weave[], viewState: ViewState): Weave[] {
        const text = viewState.textFilter?.toLowerCase() ?? '';
        const statusFilter = viewState.statusFilter;

        return weaves
            .filter(w => viewState.showArchived || !w.id.startsWith('_'))
            .filter(w => {
                if (!text) return true;
                if (w.id.toLowerCase().includes(text)) return true;
                const allDocs = [...w.ideas, ...w.designs, ...w.plans, ...w.contexts, ...w.chats];
                return allDocs.some(d =>
                    d.id.toLowerCase().includes(text) ||
                    (d.title ?? '').toLowerCase().includes(text)
                );
            })
            .map(w => {
                if (!statusFilter.length) return w;
                return {
                    ...w,
                    ideas:    w.ideas.filter(d => statusFilter.includes(d.status)),
                    designs:  w.designs.filter(d => statusFilter.includes(d.status)),
                    plans:    w.plans.filter(d => statusFilter.includes(d.status)),
                    contexts: w.contexts,
                    chats:    w.chats,
                };
            })
            .filter(w => {
                if (!statusFilter.length) return true;
                return w.ideas.length + w.designs.length + w.plans.length + w.contexts.length + w.chats.length > 0;
            });
    }

    private groupWeaves(weaves: Weave[], grouping: GroupingMode): TreeNode[] {
        switch (grouping) {
            case 'type':
                return this.groupByType(weaves);
            case 'status':
                return this.groupByStatus(weaves);
            case 'release':
                return this.groupByRelease(weaves);
            case 'thread':
            default:
                return weaves.map(w => this.createWeaveNode(w));
        }
    }

    private groupByType(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {
            idea: [],
            design: [],
            plan: [],
            ctx: [],
        };
        for (const weave of weaves) {
            weave.ideas.forEach(i => groups.idea.push(i));
            weave.designs.forEach(d => groups.design.push(d));
            weave.plans.forEach(p => groups.plan.push(p));
            weave.contexts.forEach(c => groups.ctx.push(c));
        }
        return Object.entries(groups)
            .filter(([, docs]) => docs.length > 0)
            .map(([type, docs]) => this.createSectionNode(
                type.charAt(0).toUpperCase() + type.slice(1) + 's',
                docs.map(d => this.createDocumentNode(d, type))
            ));
    }

    private groupByStatus(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {};
        const allDocs: Document[] = [];
        for (const weave of weaves) {
            weave.ideas.forEach(i => allDocs.push(i));
            weave.designs.forEach(d => allDocs.push(d));
            weave.plans.forEach(p => allDocs.push(p));
            weave.contexts.forEach(c => allDocs.push(c));
        }
        for (const doc of allDocs) {
            if (!groups[doc.status]) groups[doc.status] = [];
            groups[doc.status].push(doc);
        }
        return Object.entries(groups).map(([status, docs]) =>
            this.createSectionNode(status, docs.map(d => this.createDocumentNode(d, d.type)))
        );
    }

    private groupByRelease(weaves: Weave[]): TreeNode[] {
        const groups: Record<string, Document[]> = {};
        for (const weave of weaves) {
            const primaryDesign = weave.designs[0];
            const release = (primaryDesign as any)?.target_release || 'unspecified';
            if (!groups[release]) groups[release] = [];
            if (primaryDesign) groups[release].push(primaryDesign);
            weave.plans.forEach(p => groups[release].push(p));
        }
        return Object.entries(groups).map(([release, docs]) =>
            this.createSectionNode(release === 'unspecified' ? 'No Release' : `v${release}`,
                docs.map(d => this.createDocumentNode(d, d.type)))
        );
    }

    private messageNode(text: string): TreeNode {
        const node = new vscode.TreeItem(text, vscode.TreeItemCollapsibleState.None);
        node.contextValue = 'message';
        return node;
    }

    private createWeaveNode(weave: Weave): TreeNode {
        const status = getWeaveStatus(weave);
        const node = new vscode.TreeItem(weave.id, vscode.TreeItemCollapsibleState.Collapsed);
        node.description = status;
        node.iconPath = getWeaveIcon(status);
        node.contextValue = 'weave';
        const primaryDesign = weave.designs[0];
        node.tooltip = primaryDesign ? `${primaryDesign.title} (v${primaryDesign.version})` : weave.id;

        return {
            ...node,
            weaveId: weave.id,
            children: this.getWeaveChildren(weave),
        };
    }

    private getWeaveChildren(weave: Weave): TreeNode[] {
        const children: TreeNode[] = [];

        if (weave.designs.length > 0) {
            const primaryDesign = weave.designs[0];
            children.push(this.createDocumentNode(primaryDesign, 'primary-design', weave.id));

            if (weave.designs.length > 1) {
                children.push(this.createSectionNode(
                    'Supporting Designs',
                    weave.designs.slice(1).map(d => this.createDocumentNode(d, 'design', weave.id))
                ));
            }
        }

        if (weave.plans.length > 0) {
            children.push(this.createSectionNode(
                'Plans',
                weave.plans.map(p => {
                    const doneDoc = ((weave as any).dones ?? [] as DoneDoc[]).find((d: DoneDoc) => d.parent_id === p.id);
                    return this.createPlanNode(p, weave.id, doneDoc);
                })
            ));
        }

        if (weave.ideas.length > 0) {
            children.push(this.createSectionNode(
                'Ideas',
                weave.ideas.map(i => this.createDocumentNode(i, 'idea', weave.id))
            ));
        }

        if (weave.contexts.length > 0) {
            children.push(this.createSectionNode(
                'Contexts',
                weave.contexts.map(c => this.createDocumentNode(c, 'ctx', weave.id))
            ));
        }

        if (weave.chats.length > 0) {
            children.push(this.createSectionNode(
                'Chats',
                weave.chats.map(c => this.createChatNode(c, weave.id))
            ));
        }

        return children;
    }

    private createSectionNode(label: string, children: TreeNode[]): TreeNode {
        const node = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'section';
        return { ...node, children };
    }

    private createDocumentNode(doc: Document, baseContextValue: string, weaveId?: string): TreeNode {
        const isTemp = doc.id.startsWith('new-');
        const contextValue = isTemp ? `${baseContextValue}-temp` : baseContextValue;
        const node = new vscode.TreeItem(doc.title || doc.id, vscode.TreeItemCollapsibleState.None);
        node.description = doc.status;
        node.iconPath = getDocumentIcon(doc.type);
        node.contextValue = contextValue;
        node.tooltip = `${doc.type} • ${doc.status}`;

        const filePath = (doc as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Document',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc, weaveId, children: [] };
    }

    private createChatNode(chat: ChatDoc, weaveId?: string): TreeNode {
        const node = new vscode.TreeItem(chat.title || chat.id, vscode.TreeItemCollapsibleState.None);
        node.description = chat.status;
        node.iconPath = new vscode.ThemeIcon('comment-discussion');
        node.contextValue = 'chat';
        node.tooltip = `chat • ${chat.status}`;

        const filePath = (chat as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Chat',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc: chat, weaveId, children: [] };
    }

    private createPlanNode(plan: PlanDoc, weaveId?: string, doneDoc?: DoneDoc): TreeNode {
        const hasDone = !!doneDoc;
        const node = new vscode.TreeItem(plan.title || plan.id, hasDone ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
        const doneSteps = plan.steps?.filter(s => s.done).length ?? 0;
        const totalSteps = plan.steps?.length ?? 0;
        const nextStep = plan.steps?.find(s => !s.done);
        const progress = `${doneSteps}/${totalSteps}`;
        if (plan.staled) {
            node.description = `${plan.status} ⚠️ stale`;
        } else if (nextStep && plan.status === 'implementing') {
            const label = nextStep.description.length > 35
                ? nextStep.description.slice(0, 35) + '…'
                : nextStep.description;
            node.description = `${progress} · Step ${nextStep.order}: ${label}`;
        } else {
            node.description = `${progress} · ${plan.status}`;
        }
        node.tooltip = nextStep
            ? `${plan.status} • ${progress} steps\nNext: Step ${nextStep.order} — ${nextStep.description}`
            : `${plan.status} • ${progress} steps`;
        node.iconPath = getPlanIcon(plan.status);
        node.contextValue = `plan-${plan.status}`;

        const filePath = (plan as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Plan',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        const children: TreeNode[] = doneDoc ? [this.createDoneDocNode(doneDoc, weaveId)] : [];
        return { ...node, doc: plan, weaveId, children };
    }

    private createDoneDocNode(done: DoneDoc, weaveId?: string): TreeNode {
        const node = new vscode.TreeItem(done.title || done.id, vscode.TreeItemCollapsibleState.None);
        node.description = 'final';
        node.iconPath = new vscode.ThemeIcon('check-all');
        node.contextValue = 'done';
        node.tooltip = `done doc — ${done.id}`;

        const filePath = (done as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Done Doc',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc: done, weaveId, children: [] };
    }
}