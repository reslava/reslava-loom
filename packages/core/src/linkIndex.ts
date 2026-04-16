import { DocumentType } from './types';

/**
 * Metadata about a document stored in the index.
 */
export interface DocumentEntry {
    /** Absolute filesystem path to the document. */
    path: string;
    /** Document type: 'idea', 'design', 'plan', or 'ctx'. */
    type: DocumentType;
    /** Whether the file exists on disk. */
    exists: boolean;
}

/**
 * A step-level dependency in a plan.
 */
export interface StepBlocker {
    /** The 1-indexed step number. */
    step: number;
    /** List of blockers: 'Step N' or 'plan-id'. */
    blockedBy: string[];
}

/**
 * The in-memory link index for fast relationship queries.
 */
export interface LinkIndex {
    /** Map of document ID to its metadata. */
    documents: Map<string, DocumentEntry>;
    /** Map of parent_id to set of child document IDs. */
    children: Map<string, Set<string>>;
    /** Map of document ID to its parent_id. */
    parent: Map<string, string>;
    /** Map of plan ID to its step blockers. */
    stepBlockers: Map<string, StepBlocker[]>;
}

/**
 * Creates an empty link index.
 */
export function createEmptyIndex(): LinkIndex {
    return {
        documents: new Map(),
        children: new Map(),
        parent: new Map(),
        stepBlockers: new Map(),
    };
}