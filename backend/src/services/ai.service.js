// AI service powered by Google Gemini
// Configured to act as a realistic, unscripted Senior Engineering Lead / Tech Interviewer

const GEMINI_MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

/**
 * Resilient multi-model Gemini caller with automatic fallback across high-quota models
 */
const callGemini = async (body) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    for (const model of GEMINI_MODELS) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.error) {
                console.warn(`[Gemini] Model ${model} error ${data.error.code}: ${data.error.message?.slice(0, 90)}. Trying next candidate...`);
                continue;
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
                return text;
            }
        } catch (err) {
            console.warn(`[Gemini] Model ${model} exception:`, err.message);
        }
    }
    return null;
};

/**
 * Generate a natural, human opening greeting and ask the candidate for an introduction
 */
export const generateOpeningGreeting = async ({ 
    companyName = 'our engineering team', 
    candidateName = '', 
    roleTitle = 'Software Engineer', 
    skills = [], 
    experienceLevel = 'Mid', 
    blueprint = '',
    candidateResume = '',
    interviewFormat = 'FULL_INTERVIEW'
}) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const fallbackGreeting = {
        message: `Hey${candidateName ? ' ' + candidateName : ''}! Thanks for taking the time to join today. I'm Rohan, one of the engineering leads here at ${companyName}. We're looking for a ${roleTitle} to join the team. ${candidateResume ? "I was just reviewing your resume and projects." : ""} Before we dive into deep technicals, I'd love to know a bit about you—could you briefly introduce yourself, walk me through your journey, and share what kind of projects you've been building recently?`,
        nextStage: 'CONCEPTUAL'
    };

    if (!apiKey) return fallbackGreeting;

    const prompt = `You are a seasoned, sharp, and encouraging Senior Engineering Lead at ${companyName} conducting a live technical interview for a ${experienceLevel} level ${roleTitle} candidate${candidateName ? ' named ' + candidateName : ''}.
Required Tech Stack / Skills: ${skills && skills.length ? skills.join(', ') : 'Software Engineering'}
Company Blueprint: ${blueprint || 'Standard technical interview evaluating fundamentals, architecture, and coding.'}

CANDIDATE RESUME & PROJECTS CONTEXT:
${candidateResume ? candidateResume : '(No resume provided yet — ask candidate to introduce themselves and highlight recent projects)'}

INTERVIEW ROUND FORMAT:
${interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY' ? 'Project Discussion & Technical Architecture Round (No live coding). Focus on in-depth project discussion, system architecture, and past technical decisions.' : 'Full Technical Loop (Technical & Project Discussion, followed later by hands-on coding).'}

INSTRUCTIONS FOR OPENING THE INTERVIEW:
1. Greet the candidate warmly and naturally like a real human tech lead (e.g., "Hey, good morning/afternoon! Thanks for jumping on the call.").
2. Introduce yourself naturally by your first name (e.g. Rohan or Alex) and your role at ${companyName}.
3. If the candidate has resume/projects listed above:
   - Enthusiastically reference one of their specific projects or technologies! (e.g. "I was just checking out your resume and noticed your work on [ProjectName] using [Tech]—before we get into deep architecture, tell me a bit about your journey and what you built there.")
   - If no resume is provided, ask them to introduce themselves and share what kind of projects they've been working on recently.
4. NEVER say "I am Vox AI", "I am an AI interviewer", or mention automated platforms. You are the interviewer.
5. Keep it conversational, spoken-friendly, and concise (under 3-4 sentences max). Do NOT jump into tricky algorithmic questions or coding yet.

Return ONLY a JSON object with this exact shape:
{
  "message": "natural spoken opening greeting here",
  "nextStage": "CONCEPTUAL"
}`;

    try {
        const text = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.85,
                topP: 0.95
            }
        });

        if (text) {
            const parsed = JSON.parse(text);
            return {
                message: parsed.message || fallbackGreeting.message,
                nextStage: 'CONCEPTUAL'
            };
        }
    } catch (err) {
        console.error('Gemini opening greeting error:', err);
    }

    return fallbackGreeting;
};

/**
 * Handle subsequent candidate responses adaptively:
 * - Listens and evaluates candidate answer dynamically
 * - Probes deep into candidate's real resume projects, architectural choices, and failure handling
 * - Supports Project Discussion & Technical Architecture only rounds (stops at technicals without coding)
 * - Decides when (and if) to transition to coding
 * - Sees candidate editor code in real time
 */
export const generateNextInterviewStep = async ({
    companyName = 'the company',
    roleTitle = 'Software Engineer',
    skills = [],
    experienceLevel = 'Mid',
    blueprint = '',
    candidateResume = '',
    interviewFormat = 'FULL_INTERVIEW',
    transcript = [],
    candidateMessage = '',
    currentStage = 'CONCEPTUAL',
    currentChallenge = null,
    currentCode = '',
    executionOutput = '',
    topics = [],
    currentTopicIndex = 0,
    questionsInCurrentTopic = 0
}) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const isProjectOnly = interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY';

    // Resolve active topics curriculum
    const activeTopics = (topics && topics.length > 0) ? topics : [
        `${skills[0] || 'Software'} Architecture & Core Runtime Mechanics`,
        `${skills[1] || 'System'} Design, Concurrency & Data Flow`,
        'Scalability Trade-offs, Edge Cases & Performance Bottlenecks'
    ];
    const safeTopicIndex = Math.min(Math.max(currentTopicIndex, 0), activeTopics.length - 1);
    const activeTopic = activeTopics[safeTopicIndex];

    // Check if candidate explicitly requested coding (only applicable in full interview)
    const candidateWantsCoding = !isProjectOnly && /ready for code|ready to code|start coding|coding challenge|let('?s)? code|coding question|dsa|switch to code/i.test(candidateMessage);
    
    // Count conceptual questions asked so far
    const conceptualCount = transcript.filter(t => t.role === 'ai').length;

    // In project-only round: wrap up after 4-5 thorough exchanges
    const shouldConsiderConcluding = isProjectOnly && currentStage === 'CONCEPTUAL' && conceptualCount >= 4;

    // In full interview: transition rule: transition if candidate requests OR after 2-3 genuine conceptual exchanges
    const shouldConsiderCoding = !isProjectOnly && currentStage === 'CONCEPTUAL' && (candidateWantsCoding || conceptualCount >= 3 || (safeTopicIndex >= activeTopics.length - 1 && questionsInCurrentTopic >= 1));

    const fallbackCodingChallenge = {
        title: 'Two Sum & Optimization',
        difficulty: 'Medium',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
        functionDescription: 'Complete the twoSum function in the editor below. It should return an array of two integers representing the zero-indexed positions of the two numbers that add up to target.',
        inputFormat: 'The function receives two parameters: an array of integers `nums` and an integer `target`.',
        constraints: [
            '2 <= nums.length <= 10^4',
            '-10^9 <= nums[i] <= 10^9',
            '-10^9 <= target <= 10^9',
            'Only one valid answer exists.'
        ],
        outputFormat: 'Return an array of two integers [index1, index2].',
        sampleTestCases: [
            {
                input: 'nums = [2, 7, 11, 15], target = 9',
                expectedOutput: '[0, 1]',
                explanation: 'Because nums[0] + nums[1] == 2 + 7 == 9, we return [0, 1].'
            },
            {
                input: 'nums = [3, 2, 4], target = 6',
                expectedOutput: '[1, 2]',
                explanation: 'Because nums[1] + nums[2] == 2 + 4 == 6, we return [1, 2].'
            }
        ],
        starterCode: `function twoSum(nums, target) {\n    // Write your solution here\n    \n}\n\n// Test example\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
        language: 'javascript'
    };

    // Heuristic evaluation for offline / fallback execution
    const wordCount = candidateMessage.trim().split(/\s+/).length;
    const hasTechnicalKeywords = /complexity|thread|memory|async|event loop|index|cache|hash|pointer|latency|scale|partition|transaction|closure|prototype|stack|heap|cpu|io/i.test(candidateMessage);
    const fallbackCorrectness = hasTechnicalKeywords ? Math.min(88, 72 + Math.min(16, wordCount)) : 72;
    const fallbackDepth = hasTechnicalKeywords ? Math.min(84, 66 + Math.min(18, wordCount)) : 65;

    const fallbackEvaluation = {
        correctness: fallbackCorrectness,
        depth: fallbackDepth,
        critique: hasTechnicalKeywords 
            ? `Candidate addressed core concepts with reasonable technical accuracy. Good awareness of performance/architecture terminology.`
            : `Candidate provided a high-level explanation. Could provide deeper insight into memory overhead and concurrency edge-cases.`
    };

    let fallbackResponse;
    if (shouldConsiderConcluding) {
        fallbackResponse = {
            message: `That wraps up our project and architectural discussion for today! You gave very thorough explanations of your design tradeoffs and ownership. We'll review your notes with the hiring team. Thanks for your time!`,
            nextStage: 'COMPLETED',
            stateAction: 'ADVANCE_TOPIC',
            targetTopicIndex: safeTopicIndex,
            answerEvaluation: fallbackEvaluation,
            codingChallenge: null
        };
    } else if (shouldConsiderCoding) {
        fallbackResponse = {
            message: `Awesome, that gives me a clear sense of your background. Let's move into the hands-on coding part now. I've loaded a challenge in your workspace on the right. Take a look, tell me your initial thoughts, and we can discuss the approach before you implement.`,
            nextStage: 'CODING',
            stateAction: 'TRANSITION_CODING',
            targetTopicIndex: safeTopicIndex,
            answerEvaluation: fallbackEvaluation,
            codingChallenge: fallbackCodingChallenge
        };
    } else {
        fallbackResponse = {
            message: (questionsInCurrentTopic >= 1 && safeTopicIndex < activeTopics.length - 1)
                ? `Makes sense. Let's shift gears to our next topic: ${activeTopics[safeTopicIndex + 1]}. How do you reason about concurrency bottlenecks and state management in high-throughput environments?`
                : `Got it. But let's dig one level deeper into ${activeTopic}: what happens at the memory or I/O level if that component receives sudden 10x traffic spikes?`,
            nextStage: currentStage || 'CONCEPTUAL',
            stateAction: (questionsInCurrentTopic >= 1 && safeTopicIndex < activeTopics.length - 1) ? 'ADVANCE_TOPIC' : 'DRILL_DEEPER',
            targetTopicIndex: (questionsInCurrentTopic >= 1 && safeTopicIndex < activeTopics.length - 1) ? safeTopicIndex + 1 : safeTopicIndex,
            answerEvaluation: fallbackEvaluation,
            codingChallenge: null
        };
    }

    if (!apiKey) return fallbackResponse;

    const formattedTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');

    const prompt = `You are Rohan, Principal Engineering Director and Senior Technical Bar Raiser at ${companyName} conducting a live technical interview for a ${experienceLevel}-level ${roleTitle}.

=== TECHNICAL ASSESSMENT CURRICULUM (ORDERED TOPICS) ===
Total Topics: ${activeTopics.length}
${activeTopics.map((t, i) => `${i + 1}. ${t}${i === safeTopicIndex ? ' <-- [CURRENTLY EVALUATING]' : ''}`).join('\n')}

ACTIVE TOPIC: "${activeTopic}" (Topic ${safeTopicIndex + 1} of ${activeTopics.length})
Questions Asked So Far On This Topic: ${questionsInCurrentTopic}
Total Conceptual Questions in Session: ${conceptualCount}
Candidate's Latest Message: "${candidateMessage}"

CANDIDATE RESUME & PROJECTS CONTEXT:
${candidateResume ? candidateResume : '(No resume attached — evaluate based on candidate answers in transcript)'}

INTERVIEW ROUND FORMAT:
${isProjectOnly ? 'PROJECT & TECHNICAL ARCHITECTURE ONLY (No live coding round). Probe deeply into the candidate resume projects, architecture decisions, trade-offs, and scalability. Conclude the interview when sufficient signal is gathered.' : 'FULL TECHNICAL LOOP (Project / Conceptual Discussion, followed later by hands-on Monaco coding challenge).'}

=== CANDIDATE LIVE WORKSPACE ===
Current Stage: ${currentStage} (either 'CONCEPTUAL', 'CODING', or 'COMPLETED')
Editor Code:
"""
${currentCode || '(Starter code / no code written)'}
"""
Execution Output / Terminal:
"""
${executionOutput || '(No terminal output)'}
"""

=== CONVERSATION TRANSCRIPT ===
${formattedTranscript}

=== STATE-MACHINE & ADAPTIVE EVALUATION INSTRUCTIONS ===
1. EVALUATE THE CANDIDATE'S LATEST ANSWER:
   - "correctness" (0-100): Is their technical logic accurate? Does it have conceptual bugs or misconceptions?
   - "depth" (0-100): Is it high-level buzzwords/superficial (depth < 60) or do they understand the under-the-hood engine mechanics, I/O bottlenecks, memory footprint, and algorithmic trade-offs (depth >= 75)?
   - "critique": 1-2 sentence blunt, honest appraisal of what was strong vs what was missing or incorrect.

2. STATE MACHINE DECISION ("stateAction"):
   - "DRILL_DEEPER": If their answer was shallow, vague, or had misconceptions on "${activeTopic}" AND questionsInCurrentTopic < 2:
     -> In your spoken message, interject naturally like a real Principal Engineer ("Wait, hang on a second...", "Fair, but what happens when...", "Let's unpack that...") and probe the specific technical blind spot!
   - "ADVANCE_TOPIC": If they gave a strong, deep answer (depth >= 70, correctness >= 70) OR if questionsInCurrentTopic >= 1:
     -> Acknowledge their strong point in 1 sentence, and segue directly into the next topic in order!
   - STAGE TRANSITIONS:
     * If this is a PROJECT & TECHNICAL ONLY round (isProjectOnly = true):
       - DO NOT trigger CODING!
       - After 4-5 thorough project exchanges, conclude the interview politely:
         -> Set "nextStage": "COMPLETED"
         -> Set "stateAction": "ADVANCE_TOPIC"
         -> Give a warm wrap-up message thanking them for walking through their architecture.
     * If this is a FULL INTERVIEW round:
       - If all topics have been tested, or conceptualCount >= 3, or the candidate explicitly asks to code:
         -> Set "nextStage": "CODING".
         -> Set "stateAction": "TRANSITION_CODING".
         -> Invite them naturally to the coding round and generate the structured coding challenge!

3. IN 'CODING' STAGE:
   - Actively observe their code in the editor and terminal outputs.
   - If they ran code with errors, guide them toward the bug.
   - If they wrote working code, probe Big-O Time & Space complexity and edge cases.
   - Set "nextStage": "CODING", "stateAction": "IN_CODING", "codingChallenge": null.

Return ONLY a JSON object with this exact shape:
{
  "message": "spoken interviewer response (2-3 sentences max, natural conversational cadence)",
  "answerEvaluation": {
    "correctness": 85,
    "depth": 78,
    "critique": "Candidate correctly explained the mechanism, but omitted concurrent mutation edge cases."
  },
  "stateAction": "ADVANCE_TOPIC" | "DRILL_DEEPER" | "TRANSITION_CODING",
  "targetTopicIndex": ${safeTopicIndex},
  "nextStage": "CONCEPTUAL" | "CODING" | "COMPLETED",
  "codingChallenge": {
    "title": "Problem Title",
    "difficulty": "Easy" | "Medium" | "Hard",
    "description": "Problem description",
    "functionDescription": "Detailed function signature and expectations",
    "inputFormat": "Input format",
    "constraints": ["Constraint 1", "Constraint 2"],
    "outputFormat": "Return value description",
    "sampleTestCases": [
      {
        "input": "e.g. nums = [2, 7, 11, 15], target = 9",
        "expectedOutput": "e.g. [0, 1]",
        "explanation": "Brief explanation"
      }
    ],
    "starterCode": "function solution() {\\n    // Write code here\\n}",
    "language": "javascript"
  }
}`;

    try {
        const text = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.85,
                topP: 0.95
            }
        });

        if (text) {
            const parsed = JSON.parse(text);
            return {
                message: parsed.message || fallbackResponse.message,
                nextStage: parsed.nextStage || (shouldConsiderCoding ? 'CODING' : currentStage),
                stateAction: parsed.stateAction || fallbackResponse.stateAction,
                targetTopicIndex: typeof parsed.targetTopicIndex === 'number' ? parsed.targetTopicIndex : safeTopicIndex,
                answerEvaluation: parsed.answerEvaluation || fallbackEvaluation,
                codingChallenge: parsed.codingChallenge || (parsed.nextStage === 'CODING' ? fallbackCodingChallenge : null)
            };
        }
    } catch (err) {
        console.error('Gemini next step error:', err);
    }

    return fallbackResponse;
};

/**
 * Parse resume text using Gemini to extract structured projects, tech stack, and summary
 */
export const parseResumeProjects = async (resumeText) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !resumeText || !resumeText.trim()) {
        return {
            summary: resumeText ? resumeText.slice(0, 300) : '',
            skills: [],
            projects: []
        };
    }

    const prompt = `You are an expert technical recruiter and resume parser.
Extract the key technical projects, core skills, and a brief technical profile summary from the following resume text:

RESUME TEXT:
"""
${resumeText}
"""

Return ONLY a JSON object with this exact shape:
{
  "summary": "2-3 sentence overview of candidate's technical specialization and years of experience",
  "skills": ["Language1", "Framework1", "Database1"],
  "projects": [
    {
      "title": "Project Name",
      "techStack": ["React", "Node.js", "Redis"],
      "description": "1-2 sentence description of what the candidate built and the key engineering challenges addressed."
    }
  ]
}`;

    try {
        const text = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });

        if (text) {
            return JSON.parse(text);
        }
    } catch (err) {
        console.error('Error parsing resume with Gemini:', err);
    }

    return {
        summary: resumeText.slice(0, 300),
        skills: [],
        projects: []
    };
};

