# CHAT

## Rafa:
since I started the project there are so many docs and becuase it has been a manual work and evolve many times, now there is confusing what's next setp

I am going to enumerate some ideas or questions pending:

1. defered ideas 

_archive/
├── cancelled/
├── chats/
├── deferred/
│   ├── cli-error-standardization-idea.md
│   ├── deferred-work-command-idea.md
│   ├── evaluate-yaml-library-idea.md
│   ├── fast-plan-idea.md
│   ├── json-output-idea.md
│   ├── link-index-cache-idea.md
│   ├── loom-cleanup-idea.md
│   ├── loom-doctor-idea.md
│   ├── memory-fs-adapter-idea.md
│   ├── meta-plan-idea.md
│   ├── mono-multi-command-clarity-idea.md
│   ├── new-chat-doc-type-idea.md
│   ├── plan-step-id-idea.md
│   ├── section-templates-idea.md
│   ├── strict-workflow-mode-idea.md
│   ├── thread-based-archive-filtering-idea.md
│   ├── vscode-loom-switcher-design.md
│   └── vscode-loom-switcher-idea.md
└── superseeded/    

2. pending designs in weaves/

note: many of them could be obsolete, or already done

3. future idea: doc and plan step status -> defered?

4. weaves -> threads `weave-and-thread-design.md`

5. icons: i created an icon set svg color for tree, inline buttons and toolbar and for activity bar (b & w) and for weave implementing (replace spin)

6. promoteToIdea, promoteToDesign, promoteToPlan, refineIdea, refineDesign, refinePlan, summarize weave or thread? (-ctx)

7. future: ai change model?

8. review `.loom/workflow.yml` still has 
  type: design
  role: primary  

9. check creation constrains
  1 weave - M chats - X threads
  1 thread - 1 idea - 1 design - N plans 

10. chats under weave or under thread? how to show chats in tree?

11. check extension install 

12. mono-loom tests

13. how to move to weaveXXX/done? flat? all ideas designs, plans mixed ?

14. tree sort
    
15. Test a real chain of commands to veryfy the results

### TODO:
in my opinion we could do:
6, 8, 9, 15, 4

someday, when we finish the basic functionality, we should verify defered ideas and pending designs 

let me know what you think?

## AI:

Your instinct is right — the doc landscape has gotten messy, and it's worth stepping back. Here's my honest read of your list before picking what to do:

---

### What I agree on (your TODO: 6, 8, 9, 15, 4)

**6 — promoteToIdea / promoteToDesign / promoteToPlan / refineIdea / refineDesign / refinePlan / summarize**
This is the most valuable thing to build next. We have `promoteIdea` working. The natural extension:
- `promoteToDesign` — promote a chat or idea into a design doc
- `refineIdea` / `refineDesign` — AI reads the doc and proposes improvements
- `summarize` already exists as a command; we may just need to wire it up better

This unlocks the full AI-assisted authoring loop. High value, low risk.

**8 — Fix `.loom/workflow.yml`**
Quick fix. The `type: design` / `role: primary` fields there are stale scaffolding. Should be fixed so it doesn't confuse future tooling.

**9 — Check creation constraints (1 weave → M chats → X threads; 1 thread → 1 idea → 1 design → N plans)**
This is a design clarification, not code. Right now the extension doesn't enforce the `thread` level — it treats weaves as the atomic unit. We need to decide: do we add threads now (see item 4) or keep the flat-weave model and defer threads?

**15 — Test a real chain of commands**
Agreed. Before adding more features, we should walk the full golden path: chatNew → chatReply → promoteIdea → open idea → finalize. There are likely small rough edges we'd catch immediately. Low effort, high confidence.

**4 — weaves → threads (`weave-and-thread-design.md`)**
This is the biggest structural change. Worth doing, but it will touch the entire file layout and every command. I'd put this last in the group — do 6, 8, 15 first, then tackle 4 as a focused refactor.

---

### What I'd defer (not on your list, but noting it)

- **1 (deferred ideas)** — Review after basic functionality is solid. Many of those ideas may be superseded.
- **2 (pending designs)** — Same: audit pass later.
- **3 (deferred status for steps)** — Good idea, easy to add once the step model is stable.
- **5 (icons)** — Nice to have; unblock when the icon assets are ready.
- **7 (AI model switch)** — One setting change; defer.
- **10 (chats under weave or thread)** — Blocked by decision on item 4.
- **11 (extension install)** — Do this alongside item 15 (golden path test).
- **12 (mono-loom tests)** — Worth doing but not blocking.
- **13 (move to done/)** — Workflow housekeeping; can script it later.
- **14 (tree sort)** — UX polish; defer.

---

### Suggested order

1. **15** — Golden path test (find real gaps)
2. ✅ **8** — Fix `workflow.yml` (5 minutes)
3. **9** — Settle the weave/thread constraint question (design decision, then code if needed)
4. ✅ **6** — `promoteToDesign`, `refineIdea/Design`, and fill out the AI command palette
5. **4** — weaves → threads refactor

Does that order feel right, or do you want to reorder?

Next: waiting for direction.

## Rafa:
Yes, I think the same.

About commands names (I am Spanish and sometimes I am not sure of semantics)
promoteToIdea: only a chat can be promoted to a new idea
promoteToDesign: a chat or an idea can be promoted to a new design
promoteToPlan: a chat, an idea and a design can be promoted to a new plan
refineIdea, refineDesign, refinePlan: update the doc, version++, stale childs
sumarize: should we be able to generate context for a chat, a weave, a thread?

I see you used name `promoteIdea` to generate an idea from a chat, which name is more semantically correct for this action `promoteIdea` or `promoteToIdea` ?

let me know what you think 
let me know if we missed some important command not yet implemented or that needs to be reviewed?

## AI:

### On command names

Your definitions are semantically tight. Let me map them out:

| Action | Source doc(s) | Creates |
|--------|--------------|---------|
| `promoteToIdea` | chat | new idea doc |
| `promoteToDesign` | chat, idea | new design doc |
| `promoteToPlan` | chat, idea, design | new plan doc |
| `refineIdea` | idea | updates idea, version++ |
| `refineDesign` | design | updates design, version++, stales child plans |
| `refinePlan` | plan | updates plan steps |
| `summarize` | chat, weave, thread | generates `-ctx.md` |

**`promoteIdea` vs `promoteToIdea`:**

`promoteToIdea` is more correct in English. "Promote **to** idea" says what the destination is. `promoteIdea` reads as "promote the idea" (as if the idea already exists). Since we're creating a new doc of a different type, the `To` makes the direction explicit.

I'd rename: `promoteIdea` → `promoteToIdea`, `chatReply` stays as-is (it's an action, not a type transition).

---

### Commands audit — what's missing or needs review

**Implemented:**
- `chatNew` ✅
- `chatReply` ✅
- `promoteIdea` ✅ (rename to `promoteToIdea`)
- `weaveIdea`, `weaveDesign`, `weavePlan` ✅
- `finalize` ✅
- `rename` ✅
- `refineDesign` ✅ (via `REFINE_DESIGN` event)
- `startPlan`, `completeStep` ✅
- `validate` ✅
- `summarise` ✅ (exists but may need AI wiring — currently template-based?)

**Missing (new):**
- `promoteToDesign` — not yet built
- `promoteToPlan` — not yet built
- `refineIdea` — not yet built (no reducer for idea refinement)
- `refinePlan` — not yet built

**Needs review:**
- `summarise` — is it AI-powered yet or still a stub? If stub, it should use `aiClient` the same way `chatReply` does.
- `finalize` — does it handle `idea → draft → active` correctly and update the tree?
- `weaveDesign` with `parent_id` — does it correctly link to the source idea?

**Not yet decided:**
- `archiveWeave` / `archiveDoc` — move to `_archive/`
- `moveToThread` — blocked on weaves→threads decision

The most impactful missing ones are `promoteToDesign` and `refineIdea` — they complete the vertical slice for a single doc type before moving to plan promotion.

Next: waiting for direction on whether to rename `promoteIdea` → `promoteToIdea` and which command to build next.

## Rafa:
- Create a design with all agreed here `weaves/core-engine/` 
- Create a plan here `weaves/core-engine/plans/` 

## AI:

Done:

- **Design:** `weaves/core-engine/ai-command-palette-design.md` — captures all command definitions, naming rule (`promoteToIdea` not `promoteIdea`), summarize scope, and all implementation decisions.
- **Plan:** `weaves/core-engine/plans/ai-command-palette-plan-001.md` — 11 steps: rename, promoteToDesign, promoteToPlan, refineIdea, refinePlan, wire summarize, build+test.

Next: waiting for `go` to start Step 1 (rename `promoteIdea` → `promoteToIdea`), or direction to reorder.