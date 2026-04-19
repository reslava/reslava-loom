// ============================================================================
// Base Document
// ============================================================================
export { BaseDoc, DocumentType } from './entities/base';

// ============================================================================
// Entities
// ============================================================================
export { IdeaDoc, IdeaStatus } from './entities/idea';
export { DesignDoc, DesignStatus } from './entities/design';
export { PlanDoc, PlanStatus, PlanStep } from './entities/plan';
export { CtxDoc, CtxStatus } from './entities/ctx';
export { Thread, ThreadStatus, ThreadPhase } from './entities/thread';
export { LoomState, LoomMode } from './entities/state';

// ============================================================================
// Events
// ============================================================================
export { IdeaEvent } from './events/ideaEvents';
export { DesignEvent } from './events/designEvents';
export { PlanEvent } from './events/planEvents';
export { WorkflowEvent, DiagnosticEvent } from './events/workflowEvent';

// ============================================================================
// Reducers
// ============================================================================
export { ideaReducer } from './reducers/ideaReducer';
export { designReducer } from './reducers/designReducer';
export { planReducer } from './reducers/planReducer';

// ============================================================================
// Core Utilities
// ============================================================================
export { applyEvent } from './applyEvent';
export { getThreadStatus, getThreadPhase, isPlanStale, getStalePlans } from './derived';
export { createBaseFrontmatter, serializeFrontmatter } from './frontmatterUtils';
export { toKebabCaseId, ensureUniqueId, generateTempId, generatePermanentId } from './idUtils';
export { ConfigRegistry } from './registry';
export { parseStepsTable, generateStepsTable, updateStepsTableInContent } from './planTableUtils';
export { isStepBlocked, findNextStep } from './planUtils';
export { createEmptyIndex, LinkIndex, DocumentEntry, StepBlocker } from './linkIndex';
export {
    validateParentExists,
    getDanglingChildIds,
    validateDesignRole,
    validateStepBlockers,
    validateSinglePrimaryDesign,
    ValidationIssue
} from './validation';

// ============================================================================
// Filters
// ============================================================================
export { filterThreadsByStatus, filterThreadsByPhase, filterThreadsById } from './filters/threadFilters';
export { filterDocumentsByType, filterDocumentsByStatus, filterDocumentsByTitle } from './filters/documentFilters';
export { filterPlansByStaleness, filterPlansByTargetVersion, filterPlansWithBlockedSteps } from './filters/planFilters';
export { sortThreadsById, sortDocumentsByCreated, sortDocumentsByTitle } from './filters/sorting';

// ============================================================================
// Body Generators
// ============================================================================
export { generateIdeaBody } from './bodyGenerators/ideaBody';
export { generateDesignBody } from './bodyGenerators/designBody';
export { generatePlanBody } from './bodyGenerators/planBody';
export { generateCtxBody, CtxSummaryData } from './bodyGenerators/ctxBody';

// ============================================================================
// Shared Types
// ============================================================================
export { Document, DocumentStatus } from './entities/document';