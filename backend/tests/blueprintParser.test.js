import assert from 'assert';
import { extractBlueprintDurationAndTimeline, getActivePhaseInfo } from '../src/utils/blueprintParser.js';

// Case 1: Universal format (45 mins)
const universal = `Role / Domain: Lead Engineer
Round Timeline & Phases:
1. Warmup (0-5 mins):
2. System Architecture (5-20 mins):
3. Problem Solving (20-40 mins):
4. Candidate Q&A & Wrap-Up (40-45 mins):`;

const r1 = extractBlueprintDurationAndTimeline(universal);
assert.strictEqual(r1.totalDurationMinutes, 45, 'Expected 45 mins from universal timeline');
assert.strictEqual(r1.timeline.length, 4, 'Expected 4 parsed phases');

// Case 2: Explicit duration text
const explicit = 'Technical Round\nTotal Duration: 60 minutes\nKey topics: Distributed Systems';
const r2 = extractBlueprintDurationAndTimeline(explicit);
assert.strictEqual(r2.totalDurationMinutes, 60, 'Expected 60 mins from explicit duration');

// Case 3: Hour format
const hour = 'Senior Backend Interview\nDuration: 1.5 hours';
const r3 = extractBlueprintDurationAndTimeline(hour);
assert.strictEqual(r3.totalDurationMinutes, 90, 'Expected 90 mins from 1.5 hours');

// Case 4: Active phase calculation & pacing
// At minute 2: Warmup
const p1 = getActivePhaseInfo(r1.timeline, 2, 45);
assert.strictEqual(p1.activePhase.phase, 'WARMUP');

// At minute 19: Near coding phase buffer
const p2 = getActivePhaseInfo(r1.timeline, 19, 45);
assert.strictEqual(p2.isNearCodingPhase, true, 'Minute 19 should be in coding buffer');

// At minute 21: Past coding phase
const p3 = getActivePhaseInfo(r1.timeline, 21, 45);
assert.strictEqual(p3.isPastCodingPhase, true, 'Minute 21 should be past coding start');

// At minute 40: Wrap-up phase
const p4 = getActivePhaseInfo(r1.timeline, 40, 45);
assert.strictEqual(p4.isNearWrapUp, true, 'Minute 40 should be wrap-up phase');

// At minute 44: Final closing
const p5 = getActivePhaseInfo(r1.timeline, 44, 45);
assert.strictEqual(p5.isFinalClosing, true, 'Minute 44 should be final closing');

console.log('ALL BLUEPRINT PARSER & TIMELINE PACING TESTS PASSED (100%)');
