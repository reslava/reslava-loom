import { BaseDoc } from './base';

export type DoneStatus = 'final';

export interface DoneDoc extends BaseDoc<DoneStatus> {
    type: 'done';
    status: DoneStatus;
}
