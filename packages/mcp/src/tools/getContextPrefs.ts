import { readContextPrefsEntry } from '../../../fs/dist';

export const toolDef = {
    name: 'loom_get_context_prefs',
    description:
        'Read the persisted sidebar CONTEXT overrides for a target doc from .loom/context-prefs.json. Returns { targetId, entry: { include, exclude } } (empty arrays when none are set).',
    inputSchema: {
        type: 'object' as const,
        properties: {
            targetId: { type: 'string', description: 'Target document id' },
        },
        required: ['targetId'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const targetId = args['targetId'] as string;
    if (!targetId) throw new Error('targetId is required');
    const entry = await readContextPrefsEntry(root, targetId);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ targetId, entry }) }] };
}
