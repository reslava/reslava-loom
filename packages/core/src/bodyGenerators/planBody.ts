export function generatePlanBody(title: string, goal?: string, steps?: string[]): string {
    const goalSection = goal ? `\n${goal}\n` : '\n<!-- One paragraph: what this plan implements and why. -->\n';
    const today = new Date().toISOString().split('T')[0];

    const hasSteps = steps && steps.length > 0;
    const tableRows = hasSteps
        ? steps!.map((s, i) => `| \u{1F533} | ${i + 1} | ${s} | \`src/...\` | — |`).join('\n')
        : '| \u{1F533} | 1 | {Step description} | `src/...` | — |';
    const detailSections = hasSteps
        ? steps!.map((s, i) => `## Step ${i + 1} — ${s}\n\n<!-- Detailed spec. -->\n\n---`).join('\n\n')
        : '## Step 1 — {Step description}\n\n<!-- Detailed spec for Step 1. -->\n\n---';

    return `# Plan — ${title}

| | |
|---|---|
| **Created** | ${today} |
| **Status** | DRAFT |
| **Design** | \`{design-id}.md\` |
| **Target version** | {X.X.X} |

---

# Goal
${goalSection}---

# Steps

| Done | # | Step | Files touched | Blocked by |
|---|---|---|---|---|
${tableRows}

---

${detailSections}

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| \u{1F504} | In Progress |
| \u{1F533} | Pending |
| ❌ | Cancelled |
`;
}
