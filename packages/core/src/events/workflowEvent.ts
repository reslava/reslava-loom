import { IdeaEvent } from './ideaEvents';
import { DesignEvent } from './designEvents';
import { PlanEvent } from './planEvents';

export type DiagnosticEvent =
    | { type: 'CHECK_THREAD' }
    | { type: 'SUMMARIZE_CONTEXT' };

export type WorkflowEvent = IdeaEvent | DesignEvent | PlanEvent | DiagnosticEvent;