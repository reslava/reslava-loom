import * as vscode from 'vscode';
import * as fs from 'fs';

interface CacheEntry { tokens: number; mtime: number; }

export class TokenEstimatorService {
    private cache = new Map<string, CacheEntry>();

    constructor(context: vscode.ExtensionContext) {
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(doc => {
                this.cache.delete(doc.uri.fsPath);
            })
        );
    }

    estimate(content: string): number {
        return Math.ceil(content.length / 4);
    }

    async estimateFromFile(filePath: string): Promise<number> {
        try {
            const stat = fs.statSync(filePath);
            const mtime = stat.mtimeMs;
            const cached = this.cache.get(filePath);
            if (cached && cached.mtime === mtime) return cached.tokens;
            const content = fs.readFileSync(filePath, 'utf8');
            const tokens = Math.ceil(content.length / 4);
            this.cache.set(filePath, { tokens, mtime });
            return tokens;
        } catch {
            return 0;
        }
    }

    format(tokens: number): string {
        return tokens >= 1000 ? `~${(tokens / 1000).toFixed(1)}k` : `~${tokens}`;
    }
}
