import { DocumentType } from './entities/base';
import { DocumentStatus } from './entities/document';

/**
 * Base frontmatter fields present in all Loom documents.
 */
export interface BaseFrontmatter {
    type: DocumentType;
    id: string;
    title: string;
    status: DocumentStatus;
    created: string;
    version: number;
    tags: string[];
    parent_id: string | null;
    child_ids: string[];
    requires_load: string[];
}

/**
 * Creates the base frontmatter object for a new document.
 */
export function createBaseFrontmatter(
    type: DocumentType,
    id: string,
    title: string,
    parentId: string | null = null
): BaseFrontmatter {
    return {
        type,
        id,
        title,
        status: 'draft',
        created: new Date().toISOString().split('T')[0],
        version: 1,
        tags: [],
        parent_id: parentId,
        child_ids: [],
        requires_load: [],
    };
}

/**
 * Serializes a value for YAML frontmatter.
 * - Arrays become inline: [a, b, c]
 * - Strings are quoted only if they contain special characters
 */
function serializeValue(value: any): string {
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        return `[${value.map(v => serializeValue(v)).join(', ')}]`;
    }

    if (typeof value === 'string') {
        if (/[:#\n]/.test(value) || value.trim() !== value) {
            return `"${value.replace(/"/g, '\\"')}"`;
        }
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (value === null || value === undefined) {
        return 'null';
    }

    return JSON.stringify(value);
}

/**
 * Canonical key order for Loom frontmatter.
 */
const ORDERED_KEYS = [
    'type',
    'id',
    'title',
    'status',
    'created',
    'updated',
    'version',
    'design_version',
    'tags',
    'parent_id',
    'child_ids',
    'requires_load',
    'role',
    'target_release',
    'actual_release',
    'target_version',
    'source_version',
    'staled',
    'refined',
];

/**
 * Serializes a Loom frontmatter object into a deterministic YAML string.
 */
export function serializeFrontmatter(obj: Record<string, any>): string {
    const presentKeys = new Set(Object.keys(obj));
    const orderedPresent = ORDERED_KEYS.filter(k => presentKeys.has(k));
    const remaining = Object.keys(obj)
        .filter(k => !ORDERED_KEYS.includes(k))
        .sort();
    const keys = [...orderedPresent, ...remaining];

    const lines = keys.map(key => {
        const value = serializeValue(obj[key]);
        return `${key}: ${value}`;
    });

    return `---\n${lines.join('\n')}\n---`;
}