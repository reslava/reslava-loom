import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs-extra';
import { getState } from '@reslava-loom/app/dist/getState';
import { loadThread, buildLinkIndex } from '@reslava-loom/fs/dist';
import { ConfigRegistry } from '@reslava-loom/core/dist/registry';
import { LoomState } from '@reslava-loom/core/dist/entities/state';
import { Thread } from '@reslava-loom/core/dist/entities/thread';
import { Document } from '@reslava-loom/core/dist/entities/document';
import { PlanDoc } from '@reslava-loom/core/dist/entities/plan';
import { getThreadStatus } from '@reslava-loom/core/dist/derived';

export interface TreeNode extends vscode.TreeItem {
    children?: TreeNode[];
    threadId?: string;
    doc?: Document;
}

export class LoomTreeProvider implements vscode.TreeDataProvider<TreeNode> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private state: LoomState | null = null;
    private workspaceRoot: string | undefined;

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
                loadThread: (root, threadId) => loadThread(root, threadId),
                buildLinkIndex: (root) => buildLinkIndex(root),
                registry,
                fs,
                workspaceRoot: this.workspaceRoot,
            });

            if (this.state.threads.length === 0) {
                return [this.messageNode('No threads found')];
            }

            return this.state.threads.map(t => this.createThreadNode(t));
        } catch (e: any) {
            console.error('🧵 Failed to load Loom state:', e);
            return [this.messageNode(`Error: ${e.message}`)];
        }
    }

    private messageNode(text: string): TreeNode {
        const node = new vscode.TreeItem(text, vscode.TreeItemCollapsibleState.None);
        node.contextValue = 'message';
        return node;
    }

    private createThreadNode(thread: Thread): TreeNode {
        const status = getThreadStatus(thread);
        const node = new vscode.TreeItem(thread.id, vscode.TreeItemCollapsibleState.Collapsed);
        node.description = status;
        node.iconPath = this.getThreadIcon(status);
        node.contextValue = 'thread';
        node.tooltip = `${thread.design.title} (v${thread.design.version})`;

        return {
            ...node,
            threadId: thread.id,
            children: this.getThreadChildren(thread),
        };
    }

    private getThreadChildren(thread: Thread): TreeNode[] {
        const children: TreeNode[] = [];

        children.push(this.createDocumentNode(thread.design, 'primary-design'));

        if (thread.supportingDesigns.length > 0) {
            children.push(this.createSectionNode(
                'Supporting Designs',
                thread.supportingDesigns.map(d => this.createDocumentNode(d, 'design'))
            ));
        }

        if (thread.plans.length > 0) {
            children.push(this.createSectionNode(
                'Plans',
                thread.plans.map(p => this.createPlanNode(p))
            ));
        }

        if (thread.idea) {
            children.push(this.createDocumentNode(thread.idea, 'idea'));
        }

        if (thread.contexts.length > 0) {
            children.push(this.createSectionNode(
                'Contexts',
                thread.contexts.map(c => this.createDocumentNode(c, 'ctx'))
            ));
        }

        return children;
    }

    private createSectionNode(label: string, children: TreeNode[]): TreeNode {
        const node = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Collapsed);
        node.contextValue = 'section';
        return { ...node, children };
    }

    private createDocumentNode(doc: Document, contextValue: string): TreeNode {
        const node = new vscode.TreeItem(doc.title || doc.id, vscode.TreeItemCollapsibleState.None);
        node.description = doc.status;
        node.iconPath = this.getDocumentIcon(doc.type);
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

        return { ...node, doc, children: [] };
    }

    private createPlanNode(plan: PlanDoc): TreeNode {
        const node = new vscode.TreeItem(plan.title || plan.id, vscode.TreeItemCollapsibleState.None);
        const doneSteps = plan.steps?.filter(s => s.done).length ?? 0;
        const totalSteps = plan.steps?.length ?? 0;
        node.description = plan.staled ? `${plan.status} ⚠️ stale` : plan.status;
        node.tooltip = `${plan.status} • ${doneSteps}/${totalSteps} steps`;
        node.iconPath = this.getPlanIcon(plan.status);
        node.contextValue = 'plan';

        const filePath = (plan as any)._path;
        if (filePath) {
            node.command = {
                command: 'vscode.open',
                title: 'Open Plan',
                arguments: [vscode.Uri.file(filePath)],
            };
        }

        return { ...node, doc: plan, children: [] };
    }

    private getThreadIcon(status: string): vscode.ThemeIcon {
        switch (status) {
            case 'IMPLEMENTING': return new vscode.ThemeIcon('sync~spin');
            case 'DONE':         return new vscode.ThemeIcon('pass-filled');
            case 'CANCELLED':    return new vscode.ThemeIcon('error');
            default:             return new vscode.ThemeIcon('folder');
        }
    }

    private getDocumentIcon(type: string): vscode.ThemeIcon {
        switch (type) {
            case 'design': return new vscode.ThemeIcon('file');
            case 'idea':   return new vscode.ThemeIcon('lightbulb');
            case 'ctx':    return new vscode.ThemeIcon('note');
            default:       return new vscode.ThemeIcon('file');
        }
    }

    private getPlanIcon(status: string): vscode.ThemeIcon {
        switch (status) {
            case 'implementing': return new vscode.ThemeIcon('sync~spin');
            case 'done':         return new vscode.ThemeIcon('pass-filled');
            case 'blocked':      return new vscode.ThemeIcon('warning');
            default:             return new vscode.ThemeIcon('list-flat');
        }
    }
}