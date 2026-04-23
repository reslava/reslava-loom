import { IdeaDoc } from './idea';
import { DesignDoc } from './design';
import { PlanDoc } from './plan';
import { CtxDoc } from './ctx';
import { ChatDoc } from './chat';
import { DoneDoc } from './done';

export type Document = IdeaDoc | DesignDoc | PlanDoc | CtxDoc | ChatDoc | DoneDoc;

export type DocumentStatus = IdeaDoc['status'] | DesignDoc['status'] | PlanDoc['status'] | CtxDoc['status'] | ChatDoc['status'] | DoneDoc['status'];