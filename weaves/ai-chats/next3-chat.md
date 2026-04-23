# CHAT

## Rafa:
- Briefly: what is your honest & sincere opinion about loom? useful? will developers adopt it?
  

### Next 
1. weaves/core-engine/weave-and-thread-design.md
2. create tests 
3. polish & fix conforming tests result
4. prepare to release MVP v0.2.0

what you think?
     

## AI:

**Honest opinion on Loom:**

Yes — useful, but adoption is the hard part.

The core problem Loom solves is real and underserved: *teams lose the "why" behind implementation decisions.* PRs show what changed, git log shows when, but the reasoning — the options considered, the tradeoffs accepted, the decisions locked in — disappears into Slack threads and GitHub comments. Loom keeps that in markdown, co-located with the code, structured enough to be queryable by AI.

The `done doc` pattern you just added is the most genuinely novel thing here. AI-era development has a new problem: AI does the work but leaves no trail. Done docs fix that.

**Will developers adopt it?**

Risky. Developers are allergic to process overhead. The vocabulary alone is a barrier — weave, thread, plan, design, idea, ctx. New users will bounce if the first five minutes aren't smooth.

What tips it toward yes:
- VS Code extension = zero context switching. That removes the biggest friction point.
- `loom.doStep` + `loom.closePlan` is a workflow that doesn't exist anywhere else. That's defensible.
- Teams that have been burned by lost context (post-mortems, onboarding pain, "why did we build it this way?") will get the value immediately.

What tips it toward no:
- Solo devs and small teams doing fast iteration may feel it's premature formalism.
- GitHub Issues + Notion + Copilot is the incumbent stack. Loom has to be clearly better at something, not just different.

**My read:** Loom wins if the first-use experience is under 5 minutes from install to first AI-generated plan step. Right now it's probably 20+ minutes. That gap is where adoption will be lost or won.

---

**On the next steps:**

Item 1 (`weave-and-thread-design.md`) — already updated last session with the Case A/B thread split decisions. I'd mark that done unless there's something unresolved.

Item 2–3 (tests + polish) — **the right call and should come first.** The codebase has moved fast: `done` docs, `closePlan`, `doStep`, `completeStep`, file moves, entity changes. Without a test suite, every new feature risks breaking something silently. Specifically needs:
- `weaveRepository.loadWeave` loading done docs from `done/` subfolder
- `closePlan` use-case: plan moved, done doc created, plan status transitions
- `completeStep` auto-completion when all steps done

Item 4 (MVP v0.2.0) — achievable after items 2–3. What's the definition of "MVP done" for you? That would help scope the release.

**My recommendation:** go to tests next. Tell me which test file to start with (the existing ones are `multi-loom.test.ts`, `commands.test.ts`, `id-management.test.ts`, `weave-workflow.test.ts`) and I'll add the new cases.

## Rafa:
I agree. 
I think you know better than me which tests should be created and in what order.
Create a plan for creating tests than ensure all paths & commands behave as we designed.
Create a plan also to make tests inside vscode starting with a j:/temp empty loom.

### On adoption
For me as a solo developer, becuase I design this tool mainly for my own experience developing
https://github.com/reslava/nuget-package-reslava-result with you
- I hate chat window, uncorfortable, no history, can't search. So I create -chat (previously included in design docs)
- I like AI assistang but working with chat window, I lose the real developing workflow: idea, design, plan. I created done docs because developing with AI assistant also make you lose the history of decisions and implementation issues.
- I don't know if the rest of users feel the same than me. The AI chat era is a deviantion of good developing workflow practices. It is not AI related, is related of the way we use AI.

## AI:

**On adoption — you just articulated Loom's whole value proposition.**

The insight is precise: the problem isn't AI, it's the *interface*. Chat windows are optimized for conversation, not for development work. Developers adopted them because they were the only option, not because they're good. Loom's bet is that markdown-native, IDE-embedded, workflow-aware AI is the right interface — and the proof is that you built Loom *because you felt that pain yourself* on a real project.

That origin story is actually the clearest adoption pitch: "I built this because every AI-assisted session left me with no record of what was decided or why. Now I have done docs, chat docs, and a complete audit trail." That's relatable to any developer who has opened a 6-month-old project and found zero context about the choices made.

---

**Test plans — creating now.**

Two plans:

1. **`core-tests-plan-001`** — unit + integration tests for core, fs, app use-cases (extends existing ts-node test suite)
2. **`vscode-tests-plan-001`** — end-to-end tests using a real workspace at `j:/temp/loom` (app layer + eventual Extension Host)

Creating both plan docs now.

## Rafa:
- `weaves/core-engine/plans/core-tests-plan-001.md`
- `weaves/vscode-extension/plans/vscode-tests-plan-001.md`

## Rafa:

### reference docs & requires_load
For all AI integration, we always should know and provide all
`requires_load: []` of document being processed
and the weave, global -reference docs

we should include a kind of:
`when needed to be loaded` section in -reference docs
for the AI to know exact kind of tasks when need to read it
another loom filter could be:
`load_when: [idea, design, plan, implementing]`: meaning
   generating an idea, design, or plan or when implementing a plan
   this system filter will be used for loom to filter docs before passing them to AI

`-reference` should appear in vscode 
`requires_load` of any should be able to easyly filled up by UX

document references in `requires_load` should be only by id 

### Tokens
At least we should be aware if token consumption, it could be high at the beggining but we should have less tokens usage than usual AI chat windows driven workflow when loom projects advance

### AI API vs CLI subscription
Currently we are using API Key, but what happen for devs using subscriptions? Including them is easy?

### vscode polish
idea inline buttons shows `Weave Design` and `Promote To Design`, should only appear `Promote To Design`

### Loom terminology
You said: "The vocabulary alone is a barrier — weave, thread, plan, design, idea, ctx."
I asked you for Loom vocabulary for this project before changing it and you told me you like it.
Now you changed your opinion and this is confusing me.
Should we use developers terminology and change alll again when do the migration?

### Tutorial
We should design an incredible step by step tutorial than shows how easy, how fast, how intutive is the happy flow and end with an idea implemented having for context documentation.
Install -> Idea -> Design -> Plan -> Implement -> Done
- Install proccess should be extremely easy, just create a local loom.
- Idea -> Design -> Plan -> Implement -> Done. Create an idea that makes AI create a design that makes AI to create a plan with 2 steps, implement, close plan.
Must be so simple and short that we should include it in main README.md includingf a GIF animation-