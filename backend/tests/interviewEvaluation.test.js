import assert from 'assert';
import { generateAiEvaluation } from '../src/services/evaluation.service.js';
import { generateNextInterviewStep } from '../src/services/ai.service.js';

async function runTests() {
    console.log('Testing Interview & Evaluation Pipeline...');

    // 1. Test candidate questions asked & company history context in evaluation
    const mockTranscript = [
        { role: 'ai', text: 'Hey Alex, welcome! Could you describe your experience with high throughput message queues?' },
        { role: 'candidate', text: 'I designed a distributed Kafka pipeline processing 50k events/sec with idempotent consumers, schema registry, and dead letter queues to ensure zero data loss.' },
        { role: 'ai', text: 'That is solid. We have reached the wrap-up phase. Do you have any questions for me about the team?' },
        { role: 'candidate', text: 'How does the engineering team handle on-call rotations and production incident post-mortems?' },
        { role: 'ai', text: 'We maintain a blameless post-mortem culture with a primary and secondary weekly rotation. PagerDuty alerts are strictly tuned with SLO budgets so engineers rarely get paged off-hours.' }
    ];

    const companyHistory = {
        priorInterviewsCount: 1,
        trajectorySummary: 'Candidate completed Round 1 screening with score 82/100.',
        priorScores: [{ overall: 82, date: new Date('2026-10-01'), roleTitle: 'Backend Engineer', verdict: 'Hire' }]
    };

    const keyCompetencies = ['Distributed Systems', 'Kafka & Streaming', 'Production Incident Management', 'Communication'];

    const evalResult = await generateAiEvaluation({
        roleTitle: 'Senior Backend Engineer',
        companyName: 'Stripe',
        experienceLevel: 'Senior',
        transcript: mockTranscript,
        codingChallenge: { title: 'Event Deduplication' },
        codeSubmission: { language: 'javascript', code: 'function deduplicate(events) { return [...new Set(events)]; }' },
        testCaseResults: [{ input: 'events = [1, 2, 2]', expectedOutput: '[1, 2]', actualOutput: '[1, 2]', passed: true, executionTime: '0.04s' }],
        blueprint: 'Senior role rubric: evaluate messaging concurrency, fault tolerance, and communication.',
        roundSummary: 'Distributed Systems & Live Implementation',
        keyCompetencies,
        skills: ['Kafka', 'Node.js', 'Distributed Systems'],
        companyHistory
    });

    console.log('Evaluation result verdict:', evalResult.verdict);
    console.log('Evaluation overall score:', evalResult.scores.overall);
    console.log('Questions asked by candidate:', evalResult.candidateQuestionsAsked);
    console.log('Role rubrics feedback count:', evalResult.roleRubricsFeedback?.length);

    // Assertions
    assert(evalResult.scores.overall > 0, 'Overall score should be > 0');
    assert(evalResult.candidateQuestionsAsked && evalResult.candidateQuestionsAsked.length > 0, 'Should extract candidate question asked');
    assert.strictEqual(evalResult.candidateQuestionsAsked[0].question, 'How does the engineering team handle on-call rotations and production incident post-mortems?');
    assert(evalResult.candidateQuestionsAsked[0].interviewerAnswer.length > 0, 'Interviewer answer should be captured');
    assert(evalResult.candidateQuestionsAsked[0].analysis.length > 0, 'Analysis of question should be present');

    // Assert company history
    assert.strictEqual(evalResult.companyHistoryContext.priorInterviewsCount, 1);
    assert(evalResult.companyHistoryContext.trajectorySummary.includes('Round 1'));

    // Assert role rubrics feedback
    assert(Array.isArray(evalResult.roleRubricsFeedback), 'Role rubrics feedback should be an array');
    assert.strictEqual(evalResult.roleRubricsFeedback.length, keyCompetencies.length);
    for (const r of evalResult.roleRubricsFeedback) {
        assert(keyCompetencies.includes(r.competency), `Competency ${r.competency} should match keyCompetencies`);
        assert(['EXCEEDS_EXPECTATIONS', 'MEETS_EXPECTATIONS', 'BELOW_EXPECTATIONS'].includes(r.status));
        assert(typeof r.score === 'number' && r.score >= 0 && r.score <= 100);
        assert(r.feedback && r.feedback.length > 0);
    }

    // 2. Test candidate asking questions during interview turn (AI response)
    const nextStep = await generateNextInterviewStep({
        companyName: 'Stripe',
        roleTitle: 'Staff Backend Engineer',
        skills: ['Distributed Systems', 'Kafka'],
        experienceLevel: 'Senior',
        transcript: mockTranscript.slice(0, 3),
        candidateMessage: 'What does your continuous deployment pipeline look like for microservices?'
    });

    console.log('Interviewer response to candidate question:', nextStep.message);
    assert(nextStep.message && nextStep.message.length > 20, 'Interviewer must answer candidate question');
    assert(/stripe|team|deploy|pipeline|ci\/cd|service/i.test(nextStep.message), 'Interviewer answer must reference company engineering practices');

    console.log('ALL INTERVIEW & EVALUATION PIPELINE TESTS PASSED (100%)');
}

runTests().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
