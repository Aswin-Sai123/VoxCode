import test from 'node:test';
import assert from 'node:assert/strict';
import { 
    generateOpeningGreeting, 
    preBakeQuestions, 
    generateConversationalReply, 
    generateNextInterviewStep 
} from '../src/services/ai.service.js';
import { 
    INTERVIEW_LIMITS, 
    buildInitialStateMachine, 
    applyStateActionToMachine 
} from '../src/utils/interviewStateMachine.js';

test('1. generateOpeningGreeting produces a micro-turn audio check under 15 words', async () => {
    // NODE_ENV=test forces callGemini to return null, asserting resilient fallback behavior
    const greeting = await generateOpeningGreeting({
        companyName: 'Razorpay',
        candidateName: 'Pratheek Sharma',
        roleTitle: 'SDE-2 Backend',
        voiceModel: 'edge-neural-prabhat'
    });

    assert.ok(greeting, 'Greeting object must be defined');
    assert.strictEqual(greeting.nextStage, 'CONCEPTUAL');
    assert.ok(greeting.message, 'Greeting message must be non-empty');
    
    // Check micro-turn audio check phrasing
    assert.match(greeting.message, /audible/i, 'Greeting must check audio audibility');
    assert.match(greeting.message, /Hey/i, 'Greeting should casually open conversation');

    // Word count check: strictly under 15 words
    const words = greeting.message.trim().split(/\s+/);
    assert.ok(words.length <= 15, `Opening greeting must be strictly under 15 words, got ${words.length}: "${greeting.message}"`);
});

test('2. preBakeQuestions produces concise Q1 audio check and Q2 self-intro request', async () => {
    const prebaked = await preBakeQuestions({
        companyName: 'Swiggy',
        candidateName: 'Pratheek',
        roleTitle: 'Backend Engineer',
        skills: ['Go', 'Kafka', 'Redis']
    });

    assert.ok(prebaked.q1, 'Q1 must be defined');
    assert.ok(prebaked.q2, 'Q2 must be defined');

    // Q1: Micro-turn audio check (<15 words)
    const q1Words = prebaked.q1.trim().split(/\s+/);
    assert.match(prebaked.q1, /audible/i);
    assert.ok(q1Words.length <= 15, `Q1 should be <= 15 words, got ${q1Words.length}`);

    // Q2: Self intro & candidate intro invitation (15-28 words)
    const q2Words = prebaked.q2.trim().split(/\s+/);
    assert.match(prebaked.q2, /lead engineer|rundown|building/i);
    assert.ok(q2Words.length <= 30, `Q2 should be <= 30 words, got ${q2Words.length}`);
});

test('3. generateNextInterviewStep handles Turn 1 audio confirmation by requesting project intro', async () => {
    // Candidate responds to "Am I audible?" with "Yes, loud and clear! How are you doing?"
    const result = await generateNextInterviewStep({
        companyName: 'Google India',
        roleTitle: 'Senior Software Engineer',
        transcript: [
            { role: 'ai', text: 'Hey Pratheek, hi! How are you doing? Am I audible?' }
        ],
        candidateMessage: 'Yes, loud and clear! Doing well, thanks.'
    });

    assert.ok(result.message, 'Response message must be defined');
    // Should introduce self and invite candidate to give a quick rundown of projects
    assert.match(result.message, /lead engineer|rundown|building/i);
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length <= 30, `Turn 2 message must be concise (<= 30 words), got ${words.length}`);
});

test('4. generateNextInterviewStep coding transition fallback requires verbal dry run', async () => {
    // Past coding phase trigger
    const result = await generateNextInterviewStep({
        companyName: 'Swiggy',
        roleTitle: 'Backend Engineer',
        transcript: [
            { role: 'ai', text: 'How do you handle Redis split brain?' },
            { role: 'candidate', text: 'We use redlock with consensus.' }
        ],
        candidateMessage: 'We can move to coding whenever you are ready.',
        timingContext: { isPastCodingPhase: true },
        currentStage: 'CONCEPTUAL'
    });

    assert.strictEqual(result.nextStage, 'CODING');
    assert.strictEqual(result.stateAction, 'TRANSITION_CODING');
    assert.ok(result.codingChallenge, 'Coding challenge must be provided');
    // Must require verbal dry run before coding
    assert.match(result.message, /verbally trace|trace two sample inputs|eviction case/i, 'Must instruct candidate to do verbal dry-run before writing code');
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length <= 30, `Coding transition prompt must be concise (<= 30 words), got ${words.length}`);
});

test('5. generateConversationalReply enforces strict brevity and natural discourse markers', async () => {
    const reply = await generateConversationalReply({
        companyName: 'Razorpay',
        roleTitle: 'Backend Engineer',
        candidateMessage: 'We implemented transactional outbox using Postgres and Debezium CDC.',
        currentStage: 'CONCEPTUAL',
        nextQuestionBuffer: 'How do you handle message deduplication at the consumer end?'
    });

    assert.ok(reply.message, 'Message must be defined');
    // Must start with a natural discourse marker
    assert.match(reply.message, /^(Got it\.|Makes sense\.|Fair enough\.|Right|Okay, cool\.|Understood\.)/, 'Must begin with authentic discourse marker');
    const words = reply.message.trim().split(/\s+/);
    assert.ok(words.length <= 30, `Fast conversational reply must be <= 30 words, got ${words.length}: "${reply.message}"`);
});

test('6. interviewStateMachine supports 4 to 6 levels of deep threading', () => {
    assert.strictEqual(INTERVIEW_LIMITS.followUpsPerRootQuestion, 5, 'followUpsPerRootQuestion must be 5 to allow deep threading');
    
    let machine = buildInitialStateMachine({ skills: ['Distributed Systems', 'Databases'] });
    assert.strictEqual(machine.topics[0].followUpsOnCurrentRoot, 0);

    // Drill down level 1 to level 5 on the same root question
    for (let level = 1; level <= 5; level++) {
        machine = applyStateActionToMachine(machine, 'DRILL_DEEPER');
        assert.strictEqual(machine.activeTopicIndex, 0, `Topic must stay on index 0 during level ${level} drill-down`);
        assert.strictEqual(machine.topics[0].followUpsOnCurrentRoot, level, `Follow up count should be ${level}`);
    }

    // 6th drill down reaches cap and advances to next root question in topic
    machine = applyStateActionToMachine(machine, 'DRILL_DEEPER');
    assert.strictEqual(machine.topics[0].rootQuestionsAsked, 1, 'Should move to next root question after 5 follow-ups');
    assert.strictEqual(machine.topics[0].followUpsOnCurrentRoot, 0, 'Follow-up count resets on new root question');
});

test('7. generateNextInterviewStep handles candidate who introduces system in Turn 1 by initiating deep threading', async () => {
    const result = await generateNextInterviewStep({
        companyName: 'Razorpay',
        roleTitle: 'SDE-2 Backend',
        transcript: [
            { role: 'ai', text: 'Hey Pratheek, hi! How are you doing? Am I audible?' }
        ],
        candidateMessage: 'Yes audible! I am Pratheek, backend developer with 3 years experience. At my current job I designed a distributed payment ledger using Kafka and Redis.'
    });

    assert.ok(result.message, 'Response message must be defined');
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length <= 30, `Deep threading question must be <= 30 words, got ${words.length}: "${result.message}"`);
    // Should probe concurrency / race conditions
    assert.match(result.message, /race condition|concurrent|lock/i);
});

test('8. generateConversationalReply with empty buffer produces sharp fallback question', async () => {
    const reply = await generateConversationalReply({
        companyName: 'Swiggy',
        roleTitle: 'Backend Engineer',
        candidateMessage: 'We partitioned our Kafka topics by merchantId to guarantee order.',
        currentStage: 'CONCEPTUAL',
        nextQuestionBuffer: ''
    });

    assert.ok(reply.message);
    const words = reply.message.trim().split(/\s+/);
    assert.ok(words.length <= 25, `Reply with empty buffer should be <= 25 words, got ${words.length}: "${reply.message}"`);
    assert.match(reply.message, /race condition|concurrent/i);
});

test('9. Final closing phase concludes warmly and concisely under 25 words', async () => {
    const result = await generateNextInterviewStep({
        companyName: 'Google India',
        roleTitle: 'Staff Software Engineer',
        transcript: [
            { role: 'ai', text: 'Do you have any final questions for me?' },
            { role: 'candidate', text: 'No, that covers everything. Thanks for the great discussion!' }
        ],
        candidateMessage: 'Thanks so much Arjun!',
        timingContext: { isFinalClosing: true, remainingMinutes: 1 }
    });

    assert.strictEqual(result.nextStage, 'COMPLETED');
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length <= 25, `Closing message should be <= 25 words, got ${words.length}: "${result.message}"`);
});

test('10. generateNextInterviewStep acknowledges verbal dry-run tracing before coding', async () => {
    const result = await generateNextInterviewStep({
        companyName: 'Razorpay',
        roleTitle: 'Backend Engineer',
        currentStage: 'CODING',
        transcript: [
            { role: 'ai', text: 'Sounds good. I have placed a coding challenge on your screen. Before writing code, verbally trace two sample inputs and an eviction case for me.' }
        ],
        candidateMessage: 'For sample 1, put(1, 1). For sample 2, put(2, 2). If capacity is 2 and we put(3, 3), key 1 is evicted as the oldest.'
    });

    assert.strictEqual(result.nextStage, 'CODING');
    assert.match(result.message, /trace is solid|editor|talk me through/i, 'Must acknowledge verbal trace and prompt to start coding');
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length >= 15 && words.length <= 25, `Acknowledgment must be 15-25 words, got ${words.length}: "${result.message}"`);
});

test('11. generateNextInterviewStep provides bite-sized Socratic scaffolding when candidate is stuck', async () => {
    const result = await generateNextInterviewStep({
        companyName: 'Swiggy',
        roleTitle: 'Backend Engineer',
        currentStage: 'CODING',
        transcript: [
            { role: 'ai', text: 'Go ahead and start implementing in the editor.' }
        ],
        candidateMessage: 'I am stuck on how to get O(1) eviction and lookup together in JavaScript. Not sure where to start.'
    });

    assert.strictEqual(result.nextStage, 'CODING');
    assert.match(result.message, /break this down|data structures/i, 'Must provide Socratic scaffolding');
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length >= 15 && words.length <= 25, `Socratic hint must be 15-25 words, got ${words.length}: "${result.message}"`);
});

test('12. generateNextInterviewStep probes production follow-ups on completed code', async () => {
    const result = await generateNextInterviewStep({
        companyName: 'Google India',
        roleTitle: 'Senior Software Engineer',
        currentStage: 'CODING',
        currentCode: 'class LRUCache { ... 100 lines of implementation ... }',
        executionOutput: 'All 3 test cases passed successfully.',
        transcript: [
            { role: 'ai', text: 'Go ahead and start implementing in the editor.' },
            { role: 'candidate', text: 'I completed the class and all test cases pass.' }
        ],
        candidateMessage: 'The implementation is done and verified.'
    });

    assert.strictEqual(result.nextStage, 'CODING');
    assert.match(result.message, /race condition|concurrent|capacity is zero|TTL/i, 'Must probe production follow-up');
    const words = result.message.trim().split(/\s+/);
    assert.ok(words.length >= 15 && words.length <= 25, `Follow-up must be 15-25 words, got ${words.length}: "${result.message}"`);
});

test('13. generateConversationalReply prevents double discourse markers and enforces 15-25 words', async () => {
    const reply = await generateConversationalReply({
        companyName: 'Razorpay',
        roleTitle: 'Backend Engineer',
        candidateMessage: 'We use Redis Redlock for distributed synchronization.',
        currentStage: 'CONCEPTUAL',
        nextQuestionBuffer: 'Makes sense. During a network partition when Redis drops or primary fails over, how do you handle split-brain locks?'
    });

    assert.ok(reply.message);
    // Should NOT say "Got it. Makes sense." or "Makes sense. Makes sense."
    const doubleMarker = /^(Got it|Makes sense|Fair enough|Right|Okay, cool|Understood)\.\s+(Got it|Makes sense|Fair enough|Right|Okay, cool|Understood)\./i.test(reply.message);
    assert.strictEqual(doubleMarker, false, `Must not duplicate discourse markers: "${reply.message}"`);
    const words = reply.message.trim().split(/\s+/);
    assert.ok(words.length >= 15 && words.length <= 25, `Fast reply must be 15-25 words, got ${words.length}: "${reply.message}"`);
});

test('14. generateConversationalReply discards stale intro buffer on later turns', async () => {
    const reply = await generateConversationalReply({
        companyName: 'Swiggy',
        roleTitle: 'Backend Engineer',
        candidateMessage: 'We partitioned Kafka by merchant ID for ordered delivery.',
        currentStage: 'CONCEPTUAL',
        recentTranscript: [
            { role: 'ai', text: 'Hey Pratheek, hi! How are you doing? Am I audible?' },
            { role: 'candidate', text: 'Yes loud and clear!' },
            { role: 'ai', text: 'Awesome, loud and clear. I am Arjun... could you give a quick rundown of what you built?' },
            { role: 'candidate', text: 'I built an order dispatch microservice.' }
        ],
        // Stale buffer that leaked from turn 1:
        nextQuestionBuffer: "Awesome, loud and clear. I'm Arjun, lead engineer here at Swiggy. Could you give a quick one-minute rundown of what you've been building recently?"
    });

    assert.ok(reply.message);
    assert.doesNotMatch(reply.message, /rundown|what you've been building/i, 'Must discard stale intro buffer on Turn 3+');
    assert.match(reply.message, /race condition|concurrent/i, 'Must fallback to technical deep threading');
    const words = reply.message.trim().split(/\s+/);
    assert.ok(words.length >= 15 && words.length <= 25, `Word count must be 15-25 words, got ${words.length}: "${reply.message}"`);
});

test('15. InterviewSession schema includes voiceModel, nextQuestionBuffer, prebaked, and trainingSignals', async () => {
    const { InterviewSession } = await import('../src/models/interviewSession.model.js');
    const schemaPaths = InterviewSession.schema.paths;
    
    assert.ok(schemaPaths.voiceModel, 'voiceModel must be defined in InterviewSession schema');
    assert.ok(schemaPaths.nextQuestionBuffer, 'nextQuestionBuffer must be defined in InterviewSession schema');
    assert.ok(schemaPaths.prebaked, 'prebaked must be defined in InterviewSession schema');
    assert.ok(schemaPaths.trainingSignals, 'trainingSignals must be defined in InterviewSession schema');
});

