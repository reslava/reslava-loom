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
    terminal.sendText(`echo "\\n─── ${terminalName} ───"`);
    terminal.sendText(`claude ${JSON.stringify(prompt)}`);
}
