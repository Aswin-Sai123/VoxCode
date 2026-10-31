/**
 * Specification and Test for generateAdaptiveNextStep
 */

export const ADAPTIVE_ROUTING_MATRIX = {
    strong: {
        action: 'PROBE_TRADEOFF',
        difficultyDelta: +1,
        maxScaffoldLevel: 0,
        acknowledgments: [
            'Spot on.',
            'Right, makes total sense.',
            'Yeah, exactly.',
            'Good call on that architecture.'
        ],
        promptDirective: `
The candidate demonstrated strong understanding and technical correctness.
DO NOT repeat the question or praise excessively.
Acknowledge concisely, then probe a deeper architectural trade-off or increase system scale (e.g. 10x traffic, network partition, eventual consistency, race conditions, failover).
Keep to 1-3 spoken sentences.`
    },
    adequate: {
        action: 'CLARIFY_DEPTH',
        difficultyDelta: 0,
        maxScaffoldLevel: 0,
        acknowledgments: [
            'Right, fair enough.',
            'Okay, gotcha.',
            'Understood.',
            'Makes sense at a high level.'
        ],
        promptDirective: `
The candidate has the right high-level intuition but stayed on the surface.
Acknowledge the core concept, then ask a clarifying follow-up probing implementation depth, concrete mechanisms, or edge cases.
Do not answer for them. Keep to 1-3 spoken sentences.`
    },
    weak: {
        action: 'PROVIDE_HINT',
        difficultyDelta: -1,
        maxScaffoldLevel: 2,
        acknowledgments: [
            'Hmm, let\'s think through that.',
            'Fair enough, though consider...',
            'I see where you\'re coming from.',
            'Let\'s take a step back.'
        ],
        promptDirective: `
The candidate is struggling or provided an incomplete/flawed explanation.
DO NOT say "That is incorrect" or give away the solution.
Provide an incremental cognitive hint or simplify the system constraint (e.g. "Imagine we only have a single worker node with 1GB RAM").
Encourage them to reason through the simplified version. Keep to 1-3 spoken sentences.`
    },
    no_answer: {
        action: 'PIVOT_TOPIC',
        difficultyDelta: -1,
        maxScaffoldLevel: 3,
        acknowledgments: [
            'No worries at all!',
            'Totally fine, that\'s a niche area.',
            'All good, let\'s look at it from another angle.',
            'No problem, take a breather.'
        ],
        promptDirective: `
The candidate stated they don't know, gave silence, or gave an answer under 10 characters.
Warmly normalize it so they don't feel intimidated.
Offer either an intuitive real-world analogy OR gracefully pivot to an adjacent technology/topic from their resume or background.
Keep to 1-3 spoken sentences.`
    }
};

export function buildAdaptivePrompt({
    candidateAnswer,
    lastQuestion,
    currentCRI,
    signal,
    topic = 'Distributed Systems',
    companyName = 'Uber',
    roleTitle = 'Senior Backend Engineer',
    scaffoldLevel = 0,
    timingContext = null
}) {
    const routing = ADAPTIVE_ROUTING_MATRIX[signal] || ADAPTIVE_ROUTING_MATRIX.adequate;

    return `You are a Senior Engineering Lead at ${companyName} conducting a live technical interview for ${roleTitle}.
You are speaking to the candidate over voice. Follow HUMAN CONVERSATIONAL CADENCE:
- 1-3 sentences total (max 45 words).
- Use natural contractions ("you're", "it's", "let's").
- NEVER use markdown, bullet points, or lists.
- NEVER say robotic phrases like "Great question!" or "Thank you for that answer."

INTERVIEW CONTEXT:
Active Topic: ${topic}
Candidate Readiness Index (CRI): ${currentCRI.toFixed(1)}/10
Last Question Asked: "${lastQuestion}"
Candidate Answer: "${candidateAnswer}"
Signal: ${signal.toUpperCase()}
Current Scaffold Level: ${scaffoldLevel} (0=unassisted, 1=hint, 2=simplified, 3=pivot)

ROUTING DIRECTIVE:
${routing.promptDirective}

Generate ONLY a JSON response:
{
  "acknowledgment": "concise spoken acknowledgment prefix",
  "nextQuestion": "single focused question or scaffolded prompt",
  "message": "complete spoken response combining acknowledgment and question (under 45 words)",
  "adaptiveAction": "${routing.action}",
  "scaffoldLevel": ${signal === 'weak' ? scaffoldLevel + 1 : (signal === 'no_answer' ? 3 : 0)}
}`;
}

// Verification test
const testCases = [
    {
        name: 'Strong Answer on Redis Caching',
        lastQuestion: 'How would you prevent cache stampedes when a popular key expires?',
        candidateAnswer: 'We can use probabilistic early expiration like the XFetch algorithm, or use a distributed mutex like Redlock to ensure only one worker repopulates the cache while others read stale data.',
        currentCRI: 8.5,
        signal: 'strong'
    },
    {
        name: 'Adequate Answer on DB Indexing',
        lastQuestion: 'Why would a B-tree index be preferred over a hash index for range queries?',
        candidateAnswer: 'Because B-trees keep the keys sorted, so you can traverse leaf nodes to find a range, while hash maps can only do point lookups.',
        currentCRI: 6.5,
        signal: 'adequate'
    },
    {
        name: 'Weak Answer on Distributed Transactions',
        lastQuestion: 'How does Two-Phase Commit handle coordinator failure during the prepare phase?',
        candidateAnswer: 'I think the coordinator just restarts and asks everyone again, or the databases just commit anyway because they prepared.',
        currentCRI: 4.8,
        signal: 'weak'
    },
    {
        name: 'No Answer on Kafka Partitions',
        lastQuestion: 'How would you handle consumer group rebalancing when a broker crashes in Kafka?',
        candidateAnswer: 'Honestly, I haven\'t worked with Kafka consumer groups deeply, so I\'m not sure.',
        currentCRI: 5.2,
        signal: 'no_answer'
    }
];

console.log('Testing Adaptive Prompt Builder:');
for (const tc of testCases) {
    const prompt = buildAdaptivePrompt(tc);
    console.log(`\n=== SCENARIO: ${tc.name} (${tc.signal.toUpperCase()}) ===`);
    console.log(prompt.slice(0, 350) + '...\n');
}
