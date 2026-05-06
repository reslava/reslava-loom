import { findDocumentById, loadDoc, saveDoc } from '../../../fs/dist';
import { Document, parseStepsTable } from '../../../core/dist';

export const toolDef = {
    name: 'loom_update_doc',
    description: 'Update an existing document — replace its markdown body, set its status, or both. Frontmatter is preserved and version is incremented. Use this tool to update Loom docs — do not edit weave files directly.',
    inputSchema: {
        type: 'object' as const,
        properties: {
            id: { type: 'string', description: 'Document id to update' },
            content: { type: 'string', description: 'New markdown body (no frontmatter). Omit to leave body unchanged.' },
            status: { type: 'string', description: 'New status value (e.g. "done", "active", "draft"). Omit to leave status unchanged.' },
        },
        required: ['id'],
    },
};

export async function handle(root: string, args: Record<string, unknown>) {
    const id = args['id'] as string;
    const newContent = args['content'] as string | undefined;
    const newStatus = args['status'] as string | undefined;

    if (!newContent && !newStatus) {
        throw new Error('At least one of content or status must be provided');
    }

    const filePath = await findDocumentById(root, id);
    if (!filePath) {
        throw new Error(`Document not found: ${id}`);
    }

    const doc = await loadDoc(filePath) as Document;
    const content = newContent ?? (doc as any).content ?? '';
    const updated: Document = {
        ...doc,
        ...(newStatus ? { status: newStatus as any } : {}),
        version: doc.version + 1,
        updated: new Date().toISOString().split('T')[0],
        content,
        ...(doc.type === 'plan' ? { steps: parseStepsTable(content) } : {}),
    } as Document;

    await saveDoc(updated, filePath);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ id, filePath }) }] };
}
