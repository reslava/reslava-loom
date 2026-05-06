import { BaseDoc } from './base';

export type ReferenceStatus = 'active' | 'archived';

export interface ReferenceDoc extends BaseDoc<ReferenceStatus> {
    type: 'reference';
    status: ReferenceStatus;
    /** Stable kebab-case identifier used in requires_load and filenames. */
    slug: string;
    /** Reserved — future load-phase filter. */
    loadWhen?: string | null;
}
