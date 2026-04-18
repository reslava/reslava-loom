import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc;

export type DocumentStatus = IdeaDoc['status'] | DesignDoc['status'] | PlanDoc['status'] | CtxDoc['status'];