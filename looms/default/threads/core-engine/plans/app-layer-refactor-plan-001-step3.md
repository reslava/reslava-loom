Rafa, yes—**Step 3** is exactly that: refactoring `runEvent.ts` and `saveThread.ts` to remove orchestration logic from the `fs` layer. This will leave `fs` as a pure infrastructure adapter.

Let's weave it.

---

### 🔍 Current State Analysis

| File | Current Responsibility | Problem |
|------|----------------------|---------|
| `packages/fs/src/runEvent.ts` | Loads thread, applies event via `applyEvent`, saves thread. | Orchestration (load → transform → save) lives in infrastructure layer. |
| `packages/fs/src/saveThread.ts` | Iterates over documents, determines paths, calls `saveDoc`. | Mix of path resolution (infrastructure) and coordination (orchestration). |

### 🎯 Target State

- **`runEvent` logic** moves to an `app/` use‑case: `app/src/runEvent.ts`.
- **`saveThread`** remains in `fs` but becomes a simple function that saves a `Thread` object without any business logic.

---

### 📄 Step 3.1: Create `app/src/runEvent.ts`

```typescript
import { loadThread } from '../../fs/dist/loadThread';
import { saveThread } from '../../fs/dist/saveThread';
import { applyEvent, WorkflowEvent } from '../../core/dist/applyEvent';
import { Thread } from '../../core/dist/types';

export interface RunEventDeps {
    loadThread: typeof loadThread;
    saveThread: typeof saveThread;
}

export async function runEvent(
    threadId: string,
    event: WorkflowEvent,
    deps: RunEventDeps
): Promise<Thread> {
    const thread = await deps.loadThread(threadId);
    const updatedThread = applyEvent(thread, event);
    await deps.saveThread(updatedThread);
    return updatedThread;
}
```

---

### 📄 Step 3.2: Refactor `packages/fs/src/runEvent.ts`

Replace its content with a re‑export that delegates to the `app` use‑case, or delete it entirely and update all callers to use `app/runEvent`. For a clean break, we'll **delete** `fs/src/runEvent.ts` and update the CLI commands to import from `app`.

---

### 📄 Step 3.3: Simplify `packages/fs/src/saveThread.ts`

```typescript
import * as path from 'path';
import { Thread } from '../../core/dist/types';
import { saveDoc } from './save';
import { resolveThreadPath } from './utils';

function determinePathForDoc(doc: any, threadId: string): string {
    const threadPath = resolveThreadPath(threadId);
    
    switch (doc.type) {
        case 'idea':
            return path.join(threadPath, `${threadId}-idea.md`);
        case 'design': {
            const designDoc = doc as any;
            if (designDoc.role === 'primary') {
                return path.join(threadPath, `${threadId}-design.md`);
            }
            return path.join(threadPath, `${doc.id}.md`);
        }
        case 'plan':
            return path.join(threadPath, 'plans', `${doc.id}.md`);
        case 'ctx': {
            const ctxDoc = doc as any;
            if (ctxDoc.source_version !== undefined) {
                return path.join(threadPath, `${threadId}-ctx.md`);
            }
            return path.join(threadPath, 'ctx', `${doc.id}.md`);
        }
        default:
            throw new Error(`Unknown document type: ${(doc as any).type || 'undefined'}`);
    }
}

export async function saveThread(thread: Thread): Promise<void> {
    for (const doc of thread.allDocs) {
        let filePath = (doc as any)._path;
        
        if (!filePath) {
            filePath = determinePathForDoc(doc, thread.id);
        }
        
        await saveDoc(doc, filePath);
    }
}
```

---

### 📄 Step 3.4: Update CLI Commands That Used `runEvent`

Commands that currently import `runEvent` from `fs` must now import from `app` and pass dependencies.

**Example: `packages/cli/src/commands/refine.ts`**

```typescript
import chalk from 'chalk';
import { runEvent } from '../../../app/dist/runEvent';
import { loadThread } from '../../../fs/dist/loadThread';
import { saveThread } from '../../../fs/dist/saveThread';

export async function refineCommand(threadId: string): Promise<void> {
    try {
        await runEvent(threadId, { type: 'REFINE_DESIGN' }, { loadThread, saveThread });
        console.log(chalk.green(`🧵 REFINE_DESIGN applied to thread '${threadId}'`));
        console.log(chalk.gray(`   Design version incremented. Dependent plans marked stale.`));
    } catch (e: any) {
        console.error(chalk.red(`❌ Failed to refine design: ${e.message}`));
        process.exit(1);
    }
}
```

**Files to update:**
- `cli/src/commands/refine.ts`
- `cli/src/commands/startPlan.ts`
- `cli/src/commands/completeStep.ts` (already updated in Step 2)

---

### 📦 Build and Test

```bash
./scripts/build-all.sh
loom refine-design blocker-test
loom status blocker-test --verbose
```

All commands should continue to work exactly as before.

---

### 🧵 After Step 3 Completes

We will have:
- `fs` as a pure infrastructure layer (no orchestration).
- `app` containing the `runEvent` and `completeStep` use‑cases.
- A clear pattern for migrating the remaining CLI commands.

Let me know when you're ready to proceed, Rafa. 🧵✨