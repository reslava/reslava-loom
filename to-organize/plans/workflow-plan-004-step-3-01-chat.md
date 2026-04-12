# Step 3 — TreeProvider (Detailed Spec)

## 🎯 Goal

Implement a **dynamic, reactive tree view** that reflects your workflow system:

```
Workflow
 ├── Ideas
 ├── Designs
 ├── Plans
 └── Contexts
```

With:

* live filesystem sync
* grouping by type
* status indicators
* lazy loading (important later)
* command bindings (open, create, refresh)

---

# 🧠 Core Concept

TreeProvider is just a **projection layer**:

> Filesystem → Parsed Docs → Tree Nodes → VSCode View

So we separate concerns:

```
filesystem.ts   → reads files
parser.ts       → parses frontmatter
store.ts        → keeps in-memory state
treeProvider.ts → renders UI
```

---

# 📦 Data Model (IMPORTANT)

## Document Type

```ts
export type DocType = 'idea' | 'design' | 'plan' | 'ctx';
```

## Base Document

```ts
export interface BaseDoc {
  id: string;
  type: DocType;
  title: string;
  status: string;
  filePath: string;
  parent_id?: string | null;
  child_ids?: string[];
}
```

---

# 🌳 Tree Node Model

We do NOT expose raw docs directly.

```ts
export type TreeNodeType =
  | 'root'
  | 'group'
  | 'doc';

export interface TreeNode {
  type: TreeNodeType;
  label: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  doc?: BaseDoc;
  children?: TreeNode[];
}
```

---

# 🧱 Tree Structure

```
root
 ├── group: Ideas
 │    ├── doc
 │    ├── doc
 │
 ├── group: Designs
 ├── group: Plans
 └── group: Contexts
```

---

# ⚙️ TreeProvider Implementation

## 1. Class Skeleton

```ts
export class WorkflowTreeProvider implements vscode.TreeDataProvider<TreeNode> {

  private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined> =
    new vscode.EventEmitter<TreeNode | undefined>();

  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private store: WorkflowStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return this.toTreeItem(element);
  }

  getChildren(element?: TreeNode): Thenable<TreeNode[]> {
    if (!element) {
      return Promise.resolve(this.getRootNodes());
    }

    if (element.type === 'group') {
      return Promise.resolve(this.getDocsByType(element.label));
    }

    return Promise.resolve([]);
  }
}
```

---

# 🧩 2. Root Nodes

```ts
private getRootNodes(): TreeNode[] {
  return [
    this.createGroup('Ideas'),
    this.createGroup('Designs'),
    this.createGroup('Plans'),
    this.createGroup('Contexts'),
  ];
}

private createGroup(label: string): TreeNode {
  return {
    type: 'group',
    label,
    collapsibleState: vscode.TreeItemCollapsibleState.Expanded
  };
}
```

---

# 📂 3. Map Group → Docs

```ts
private getDocsByType(groupLabel: string): TreeNode[] {
  const typeMap: Record<string, DocType> = {
    'Ideas': 'idea',
    'Designs': 'design',
    'Plans': 'plan',
    'Contexts': 'ctx'
  };

  const type = typeMap[groupLabel];
  const docs = this.store.getDocsByType(type);

  return docs.map(doc => this.createDocNode(doc));
}
```

---

# 📄 4. Doc Node Creation

```ts
private createDocNode(doc: BaseDoc): TreeNode {
  return {
    type: 'doc',
    label: doc.title,
    doc,
    collapsibleState: vscode.TreeItemCollapsibleState.None
  };
}
```

---

# 🎨 5. TreeItem Mapping (UX Layer)

This is where it becomes powerful.

```ts
private toTreeItem(node: TreeNode): vscode.TreeItem {
  const item = new vscode.TreeItem(
    node.label,
    node.collapsibleState
  );

  if (node.type === 'group') {
    item.contextValue = 'group';
    item.iconPath = new vscode.ThemeIcon('folder');
  }

  if (node.type === 'doc' && node.doc) {
    item.contextValue = 'doc';

    item.description = node.doc.status;

    item.iconPath = this.getIconForDoc(node.doc);

    item.command = {
      command: 'workflow.openDoc',
      title: 'Open',
      arguments: [node.doc]
    };
  }

  return item;
}
```

---

# 🎯 6. Status-Based Icons

This gives immediate visual feedback.

```ts
private getIconForDoc(doc: BaseDoc): vscode.ThemeIcon {
  switch (doc.status) {
    case 'draft':
      return new vscode.ThemeIcon('circle-outline');
    case 'active':
      return new vscode.ThemeIcon('circle-filled');
    case 'done':
      return new vscode.ThemeIcon('check');
    case 'cancelled':
      return new vscode.ThemeIcon('close');
    default:
      return new vscode.ThemeIcon('file');
  }
}
```

---

# 🔄 7. Store Integration (CRITICAL)

TreeProvider MUST NOT read filesystem directly.

Instead:

```ts
class WorkflowStore {
  private docs: BaseDoc[] = [];

  getDocsByType(type: DocType): BaseDoc[] {
    return this.docs.filter(d => d.type === type);
  }

  setDocs(docs: BaseDoc[]) {
    this.docs = docs;
  }
}
```

---

# 🔁 8. Refresh Flow

```
File change → reload docs → update store → tree.refresh()
```

Example:

```ts
await loader.loadAllDocs();
treeProvider.refresh();
```

---

# ⚡ 9. Command Binding

In `extension.ts`:

```ts
const treeProvider = new WorkflowTreeProvider(store);

vscode.window.registerTreeDataProvider(
  'workflowView',
  treeProvider
);

context.subscriptions.push(
  vscode.commands.registerCommand(
    'workflow.openDoc',
    async (doc: BaseDoc) => {
      const uri = vscode.Uri.file(doc.filePath);
      await vscode.window.showTextDocument(uri);
    }
  )
);
```

---

# 🧠 10. Future-Proof Hooks (VERY IMPORTANT)

Design now so you don’t rewrite later.

### A. Nested Relationships

Later:

```
Design
 ├── Plan
 └── Plan
```

Add:

```ts
getChildren(element: TreeNode): Thenable<TreeNode[]> {
  if (element.type === 'doc') {
    return this.getChildDocs(element.doc);
  }
}
```

---

### B. Filtering / Search

Add later:

```ts
setFilter(filter: string)
```

---

### C. Multi-root workspace

Store becomes:

```ts
Map<workspaceFolder, docs[]>
```

---

# ⚠️ Common Pitfalls (Avoid These)

### ❌ 1. Parsing inside TreeProvider

→ will kill performance

### ❌ 2. Direct filesystem calls

→ breaks separation

### ❌ 3. Rebuilding everything on every click

→ only refresh when needed

### ❌ 4. Not using contextValue

→ you lose right-click menus later

---

# ✅ Final Mental Model

TreeProvider is:

> a **pure UI adapter over a clean store**

NOT:

* parser
* filesystem manager
* business logic

---

# 🚀 If you want next step

I can refine **Step 4: Filesystem + Loader** (which feeds this TreeProvider), or go even deeper into:

* drag & drop reordering
* parent/child visualization
* inline status editing
* tree performance optimization (very relevant soon)

Just tell me 👍
