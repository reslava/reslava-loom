import { DocumentType } from './entities/base';

export interface DocumentEntry {
    path: string;
    type: DocumentType;
    exists: boolean;
    archived: boolean;
}

export interface StepBlocker {
    step: number;
    blockedBy: string[];
}

export interface LinkIndex {
    documents: Map<string, DocumentEntry>;
    children: Map<string, Set<string>>;
    parent: Map<string, string>;
    stepBlockers: Map<string, StepBlocker[]>;
}

export function createEmptyIndex(): LinkIndex {
    return {
        documents: new Map(),
        children: new Map(),
        parent: new Map(),
        stepBlockers: new Map(),
    };
}