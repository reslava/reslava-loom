const { designReducer } = require('./dist/designReducer');
const { planReducer } = require('./dist/planReducer');
const { applyEvent } = require('./dist/applyEvent');
const { getThreadStatus, getThreadPhase, isPlanStale, getStalePlans } = require('./dist/derived');

// ===== Setup =====
console.log('🧵 REslava Loom — Core Engine Tests\n');

// ===== Design Reducer Tests =====
console.log('📐 Testing designReducer...');

let designDoc = {
    type: 'design',
    id: 'test-design',
    title: 'Test Design',
    status: 'draft',
    created: '2026-04-14',
    version: 1,
    tags: [],
    parent_id: null,
    child_ids: [],
    requires_load: [],
    content: '',
    role: 'primary',
};

designDoc = designReducer(designDoc, { type: 'ACTIVATE_DESIGN' });
console.log('  ✅ ACTIVATE_DESIGN:', designDoc.status === 'active');

designDoc = designReducer(designDoc, { type: 'REFINE_DESIGN' });
console.log('  ✅ REFINE_DESIGN:', designDoc.version === 2 && designDoc.refined === true);

// Test invalid transition
let caught = false;
try {
    designReducer({ ...designDoc, status: 'done' }, { type: 'ACTIVATE_DESIGN' });
} catch (e) {
    caught = true;
}
console.log('  ✅ Invalid transition blocked:', caught);

// ===== Plan Reducer Tests =====
console.log('\n📋 Testing planReducer...');

const basePlan = {
    type: 'plan',
    id: 'test-plan-001',
    title: 'Test Plan',
    status: 'draft',
    created: '2026-04-14',
    version: 1,
    design_version: 1,
    target_version: '0.1.0',
    tags: [],
    parent_id: 'test-design',
    child_ids: [],
    requires_load: [],
    content: '',
    steps: [
        { order: 1, description: 'Step 1', done: false, files_touched: [], blockedBy: [] },
        { order: 2, description: 'Step 2', done: false, files_touched: [], blockedBy: [] },
        { order: 3, description: 'Step 3', done: false, files_touched: [], blockedBy: [] },
    ],
};

// Activation
let planDoc = planReducer(basePlan, { type: 'ACTIVATE_PLAN' });
console.log('  ✅ ACTIVATE_PLAN:', planDoc.status === 'active');

// Start implementing
planDoc = planReducer(planDoc, { type: 'START_IMPLEMENTING_PLAN' });
console.log('  ✅ START_IMPLEMENTING_PLAN:', planDoc.status === 'implementing');

// Block the plan (while implementing)
let blockedPlan = planReducer(planDoc, { type: 'BLOCK_PLAN' });
console.log('  ✅ BLOCK_PLAN:', blockedPlan.status === 'blocked');

// Unblock
let unblockedPlan = planReducer(blockedPlan, { type: 'UNBLOCK_PLAN' });
console.log('  ✅ UNBLOCK_PLAN:', unblockedPlan.status === 'active');

// Restart implementing
let implementingPlan = planReducer(unblockedPlan, { type: 'START_IMPLEMENTING_PLAN' });

// Complete steps
implementingPlan = planReducer(implementingPlan, { type: 'COMPLETE_STEP', stepIndex: 0 });
console.log('  ✅ COMPLETE_STEP (step 1):', implementingPlan.steps[0].done === true);
console.log('     Status still implementing:', implementingPlan.status === 'implementing');

implementingPlan = planReducer(implementingPlan, { type: 'COMPLETE_STEP', stepIndex: 1 });
let completedPlan = planReducer(implementingPlan, { type: 'COMPLETE_STEP', stepIndex: 2 });
console.log('  ✅ All steps done → plan done:', completedPlan.status === 'done');

// Test invalid COMPLETE_STEP on done plan
caught = false;
try {
    planReducer(completedPlan, { type: 'COMPLETE_STEP', stepIndex: 0 });
} catch (e) {
    caught = true;
}
console.log('  ✅ Cannot complete step on done plan:', caught);

// ===== ApplyEvent Orchestrator Tests =====
console.log('\n🎛️ Testing applyEvent orchestrator...');

const freshPlan = planReducer(basePlan, { type: 'ACTIVATE_PLAN' });

const thread = {
    id: 'test-thread',
    design: designDoc,
    supportingDesigns: [],
    plans: [freshPlan],
    contexts: [],
    allDocs: [designDoc, freshPlan],
};

const refinedThread = applyEvent(thread, { type: 'REFINE_DESIGN' });
console.log('  ✅ REFINE_DESIGN on thread:', refinedThread.design.version === 3);
console.log('  ✅ Child plan marked stale:', refinedThread.plans[0].staled === true);

// ===== Derived State Tests =====
console.log('\n📊 Testing derived state...');

// Test thread status - ACTIVE
const activeThread = {
    id: 'test-thread',
    design: designDoc,
    plans: [],
    allDocs: [designDoc],
};
console.log('  ✅ ACTIVE thread:', getThreadStatus(activeThread) === 'ACTIVE');

// Test thread status - IMPLEMENTING
const implementingPlanForThread = { ...freshPlan, status: 'implementing' };
const implementingThread = {
    id: 'test-thread',
    design: designDoc,
    plans: [implementingPlanForThread],
    allDocs: [designDoc, implementingPlanForThread],
};
console.log('  ✅ IMPLEMENTING thread:', getThreadStatus(implementingThread) === 'IMPLEMENTING');

// Test thread status - CANCELLED
const cancelledDesign = { ...designDoc, status: 'cancelled' };
const cancelledThread = {
    id: 'test-thread',
    design: cancelledDesign,
    plans: [],
    allDocs: [cancelledDesign],
};
console.log('  ✅ CANCELLED thread:', getThreadStatus(cancelledThread) === 'CANCELLED');

// Test thread phase
const designingPhase = { design: designDoc, plans: [] };
console.log('  ✅ designing phase:', getThreadPhase(designingPhase) === 'designing');

const planningPhase = { design: designDoc, plans: [freshPlan] };
console.log('  ✅ planning phase:', getThreadPhase(planningPhase) === 'planning');

const implementingPhase = { design: designDoc, plans: [implementingPlanForThread] };
console.log('  ✅ implementing phase:', getThreadPhase(implementingPhase) === 'implementing');

// Test stale detection
const stalePlan = { ...freshPlan, design_version: 1 };
const updatedDesign = { ...designDoc, version: 2 };
console.log('  ✅ isPlanStale:', isPlanStale(stalePlan, updatedDesign) === true);
console.log('  ✅ getStalePlans:', getStalePlans({ plans: [stalePlan], design: updatedDesign }).length === 1);

console.log('\n✨ All tests passed!');