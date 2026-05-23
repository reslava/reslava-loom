import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';

const exec = promisify(cp.exec);

export async function isClaudeInstalled(): Promise<boolean> {
    try {
        const cmd = process.platform === 'win32' ? 'where claude' : 'which claude';
        await exec(cmd);
        return true;
    } catch {
        return false;
    }
}

let _terminal: vscode.Terminal | undefined;

function getLoomTerminal(root: string): vscode.Terminal {
    if (_terminal && vscode.window.terminals.includes(_terminal)) {
        return _terminal;
    }
    _terminal = vscode.window.createTerminal({ name: 'Loom AI', cwd: root });
    return _terminal;
}

// Quote the prompt for the active VS Code shell (detected from vscode.env.shell,
// not process.platform — Git Bash on Windows uses POSIX quoting, not PowerShell).
function quotePrompt(prompt: string): string {
    const shell = (vscode.env.shell ?? '').toLowerCase();
    if (shell.includes('powershell') || shell.includes('pwsh')) {
        return `'${prompt.replace(/'/g, "''")}'`;       // PS: '' is literal '
    }
    if (shell.endsWith('cmd.exe') || shell.endsWith('\\cmd')) {
        return `"${prompt.replace(/"/g, '""')}"`;       // cmd: "" is literal "
    }
    // bash, zsh, sh, Git Bash, fish — POSIX single-quote with '\'' escape
    return `'${prompt.replace(/'/g, "'\\''")}'`;
}

export async function launchClaude(root: string, terminalName: string, prompt: string): Promise<void> {
    if (!(await isClaudeInstalled())) {
        const action = await vscode.window.showErrorMessage(
            'Claude Code CLI not found on PATH. Install it to use AI features.',
            'Open Install Page'
        );
        if (action === 'Open Install Page') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.anthropic.com/claude-code'));
        }
        return;
    }
    const terminal = getLoomTerminal(root);
    terminal.show();
    terminal.sendText(`echo "─── ${terminalName} ───"`);
    // Interactive mode: shows tool calls and progress as Claude works.
    // --dangerously-skip-permissions: suppresses MCP tool approval prompts.
    terminal.sendText(`claude --dangerously-skip-permissions ${quotePrompt(prompt)}`);
}
