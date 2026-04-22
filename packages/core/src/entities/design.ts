import { BaseDoc } from './base';

export type DesignStatus = 'draft' | 'active' | 'closed' | 'done' | 'cancelled';

export interface DesignDoc extends BaseDoc<DesignStatus> {
    type: 'design';
    status: DesignStatus;
    target_release?: string;
    actual_release?: string | null;
    refined?: boolean;
}