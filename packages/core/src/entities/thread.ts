import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { Document } from './document';

export type ThreadStatus = 'CANCELLED' | 'IMPLEMENTING' | 'ACTIVE' | 'DONE';

export type ThreadPhase = 'ideating' | 'designing' | 'planning' | 'implementing';

export interface Thread {
    id: string;
    idea?: IdeaDoc;
    design: DesignDoc;
    supportingDesigns: DesignDoc[];
    plans: PlanDoc[];
    contexts: CtxDoc[];
    allDocs: Document[];
}