/**
 * REslava Loom — Core TypeScript Types
 * 
 * This file defines the foundational data structures for documents, threads,
 * workflow events, and derived state used throughout the Loom system.
 */

// ============================================================================
// Document Types & Statuses
// ============================================================================

export type DocumentType = 'idea' | 'design' | 'plan' | 'ctx';

export type IdeaStatus = 'draft' | 'active' | 'done' | 'cancelled';
export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';
export type PlanStatus = 'draft' | 'active' | 'implementing' | 'done' | 'blocked' | 'cancelled';
export type CtxStatus = 'draft' | 'active' | 'done' | 'cancelled';

export type DocumentStatus = IdeaStatus | DesignStatus | PlanStatus | CtxStatus;

// ============================================================================
// Base Document Interface
// ============================================================================

export interface BaseDoc {
    /** Document type: 'idea', 'design', 'plan', or 'ctx' */
    type: DocumentType;

    /** Unique identifier (kebab-case, e.g., 'payment-system-design') */
    id: string;

    /** Human-readable title */
    title: string;

    /** Current workflow status */
    status: DocumentStatus;

    /** Creation date in YYYY-MM-DD format */
    created: string;

    /** Last updated date in YYYY-MM-DD format (optional) */
    updated?: string;

    /** Document version (integer, incremented on refinement) */
    version: number;

    /** Array of tags for categorization */
    tags: string[];

    /** ID of parent document (null for root documents) */
    parent_id: string | null;

    /** Array of child document IDs */
    child_ids: string[];

    /** Documents that must be loaded for AI context */
    requires_load: string[];

    /** Raw markdown content (excluded from frontmatter) */
    content: string;

    /** Internal: absolute filesystem path */
    _path?: string;
}

// ============================================================================
// Specific Document Types
// ============================================================================

export interface IdeaDoc extends BaseDoc {
    type: 'idea';
    status: IdeaStatus;
}

export interface DesignDoc extends BaseDoc {
    type: 'design';
    status: DesignStatus;

    /** Role of this design: 'primary' (anchor) or 'supporting' */
    role?: 'primary' | 'supporting';

    /** Target app release version */
    target_release?: string;

    /** Actual release version when shipped */
    actual_release?: string | null;

    /** Flag indicating this design was refined */
    refined?: boolean;
}

export interface PlanStep {
    /** Step order (1-indexed) */
    order: number;

    /** Step description */
    description: string;

    /** Completion status */
    done: boolean;

    /** Files touched by this step */
    files_touched: string[];

    /** Dependencies: '—', 'Step N', or 'plan-id' */
    blockedBy: string[];
}

export interface PlanDoc extends BaseDoc {
    type: 'plan';
    status: PlanStatus;

    /** Version of the parent design this plan was created against */
    design_version: number;

    /** Target app version for this plan */
    target_version: string;

    /** Flag indicating the plan is stale (design_version < design.version) */
    staled?: boolean;

    /** Array of plan steps */
    steps: PlanStep[];
}

export interface CtxDoc extends BaseDoc {
    type: 'ctx';
    status: CtxStatus;

    /** Version of the source design when this summary was generated */
    source_version?: number;
}

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc;

// ============================================================================
// Thread Aggregate
// ============================================================================

export interface Thread {
    /** Thread ID (derived from primary design's id, minus '-design') */
    id: string;

    /** Optional precursor idea document */
    idea?: IdeaDoc;

    /** Required primary design document (anchor) */
    design: DesignDoc;

    /** Supporting design documents */
    supportingDesigns: DesignDoc[];

    /** Implementation plans */
    plans: PlanDoc[];

    /** Context summaries and checkpoints */
    contexts: CtxDoc[];

    /** All documents belonging to this thread */
    allDocs: Document[];
}

// ============================================================================
// Derived Thread State
// ============================================================================

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE';

export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';

// ============================================================================
// Workflow Events
// ============================================================================

export type IdeaEvent =
    | { type: 'ACTIVATE_IDEA' }
    | { type: 'COMPLETE_IDEA' }
    | { type: 'CANCEL_IDEA' };

export type DesignEvent =
    | { type: 'CREATE_DESIGN' }
    | { type: 'ACTIVATE_DESIGN' }
    | { type: 'CLOSE_DESIGN' }
    | { type: 'REOPEN_DESIGN' }
    | { type: 'REFINE_DESIGN' }
    | { type: 'FINALISE_DESIGN' }
    | { type: 'CANCEL_DESIGN' };

export type PlanEvent =
    | { type: 'CREATE_PLAN' }
    | { type: 'ACTIVATE_PLAN' }
    | { type: 'START_IMPLEMENTING_PLAN' }
    | { type: 'COMPLETE_STEP'; stepIndex: number; planId?: string }
    | { type: 'FINISH_PLAN' }
    | { type: 'BLOCK_PLAN' }
    | { type: 'UNBLOCK_PLAN' }
    | { type: 'CANCEL_PLAN' };

export type DiagnosticEvent =
    | { type: 'CHECK_THREAD' }
    | { type: 'SUMMARIZE_CONTEXT' };

export type WorkflowEvent = IdeaEvent | DesignEvent | PlanEvent | DiagnosticEvent;

// ============================================================================
// Link Index Types (for relationship tracking)
// ============================================================================

export interface DocumentEntry {
    path: string;
    type: DocumentType;
    exists: boolean;
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