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
    executionOutput = ''
}) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const isProjectOnly = interviewFormat === 'PROJECT_AND_TECHNICAL_ONLY';
    
    // Count conceptual questions asked so far
    const conceptualCount = transcript.filter(t => t.role === 'ai').length;

    // In full interview: interviewer decides to transition after 2-3 genuine exchanges
    const shouldConsiderCoding = !isProjectOnly && currentStage === 'CONCEPTUAL' && conceptualCount >= 3;

    // In project-only round: wrap up after 4-5 thorough exchanges
    const shouldConsiderConcluding = isProjectOnly && currentStage === 'CONCEPTUAL' && conceptualCount >= 4;

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

    let fallbackResponse;
    if (shouldConsiderConcluding) {
        fallbackResponse = {
            message: `That wraps up our project and architectural discussion for today! You gave very thorough explanations of your design tradeoffs and ownership. We'll review your notes with the hiring team. Thanks for your time!`,
            nextStage: 'COMPLETED',
            codingChallenge: null
        };
    } else if (shouldConsiderCoding) {
        fallbackResponse = {
            message: `Awesome, that gives me a clear sense of your background and project ownership. Let's move into the hands-on coding part now. I've unlocked the challenge in your workspace on the right. Take a look, tell me your initial thoughts, and we can discuss the approach before you implement.`,
            nextStage: 'CODING',
            codingChallenge: fallbackCodingChallenge
        };
    } else {
        fallbackResponse = {
            message: `Makes sense. Building on that project, how did you handle data consistency and failure recovery under peak traffic?`,
            nextStage: currentStage || 'CONCEPTUAL',
            codingChallenge: null
        };
    }

    if (!apiKey) return fallbackResponse;

    const formattedTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');

    const prompt = `You are a seasoned, sharp, and encouraging Senior Engineering Lead at ${companyName} conducting a live technical interview for a ${experienceLevel} level ${roleTitle} candidate.

REQUIRED TECH STACK / SKILLS:
${skills && skills.length ? skills.join(', ') : 'Full Stack Engineering'}

COMPANY INTERVIEW BLUEPRINT:
${blueprint || 'Assess core problem solving, system fundamentals, and coding capability.'}

CANDIDATE RESUME & PROJECTS CONTEXT:
${candidateResume ? candidateResume : '(No resume attached — evaluate based on candidate answers in transcript)'}

INTERVIEW ROUND FORMAT:
${isProjectOnly ? 'PROJECT & TECHNICAL ARCHITECTURE ONLY (No live coding round). Probe deeply into the candidate resume projects, architecture decisions, trade-offs, and scalability. Conclude the interview when sufficient signal is gathered.' : 'FULL TECHNICAL LOOP (Project / Conceptual Discussion, followed later by hands-on Monaco coding challenge).'}

CURRENT INTERVIEW STATUS:
- Current Stage: ${currentStage} (either 'CONCEPTUAL', 'CODING', or 'COMPLETED')
- Conceptual Exchanges So Far: ${conceptualCount}
- Candidate Message Just Now: "${candidateMessage}"
- Candidate's Current Code in Editor:
"""
${currentCode || '(Editor has starter code / no code written yet)'}
"""
- Candidate's Latest Code Execution Output / Terminal Error:
"""
${executionOutput || '(No code execution output yet)'}
"""

FULL CONVERSATION TRANSCRIPT:
${formattedTranscript}

YOUR CORE BEHAVIORS & RULES:
1. TALK LIKE A REAL HUMAN TECH INTERVIEWER ON A LIVE VIDEO CALL:
   - Use natural spoken language with authentic conversational cadence and micro-reactions ("Ah, gotcha.", "Yeah, makes sense.", "Right, right.", "Hmm, wait a sec...", "Fair point, but tell me...", "Interesting—why that trade-off?").
   - NEVER say "I am Vox AI", "As an AI language model", or act like a chatbot.
   - Listen to what the candidate ACTUALLY said and react dynamically.
   - Keep your spoken replies concise and punchy (2-3 short sentences max): Sentence 1 reacts naturally to what they said, Sentence 2 probes a sharp, specific technical detail.

2. RESUME & PROJECT DEEP DIVE:
   - If candidate's resume/projects are provided above, actively probe their real architectural decisions:
     * "In your project [X], why did you choose that particular database/queue over alternatives?"
     * "How did you measure latency percentiles (P99) or handle race conditions in that service?"
     * "What was the most difficult production outage or bug you faced on that system, and how did you resolve it?"

3. INTERVIEWER DECIDES STAGE TRANSITIONS (CANDIDATE NEVER FORCES CODING):
   - When in 'CONCEPTUAL' stage:
     * If this is a PROJECT & TECHNICAL ONLY round (isProjectOnly = true):
       - Do NOT give a coding challenge!
       - After 4-5 thorough project exchanges, conclude the interview politely:
         -> Set "nextStage": "COMPLETED"
         -> Give a warm wrap-up message thanking them for walking through their architecture.
     * If this is a FULL INTERVIEW round:
       - You (the interviewer) decide when you have enough signal on their project background (usually after 3-4 solid exchanges).
       - When YOU are ready, introduce the coding challenge in your own spontaneous words:
         -> Set "nextStage": "CODING"
         -> Generate a structured coding challenge tailored to ${experienceLevel} level and ${skills.join(', ')}.
     * Otherwise:
       - Continue the conceptual/project dialogue naturally. Set "nextStage": "CONCEPTUAL" and "codingChallenge": null.

4. WHEN IN 'CODING' STAGE:
   - Inspect "Candidate's Current Code in Editor" and execution outputs.
   - Offer nudges, discuss Big-O complexities, and evaluate edge cases.
   - Set "nextStage": "CODING" and "codingChallenge": null.

   
   - When in 'CODING' stage:
     * YOU CAN ACTIVELY SEE THEIR CODE!
     * If they ask "can you see my code?" or ask for feedback:
       Inspect "Candidate's Current Code in Editor". Reference their actual variable names, functions, or loops.
     * If they ran code with errors in "Candidate's Latest Code Execution Output":
       Give a sharp, friendly nudge: "Take a look at line X—looks like you're accessing an index out of bounds when the loop terminates."
     * If they finished writing code and ask to discuss:
       Ask about Big-O Time & Space Complexity or an edge case (e.g., negative numbers, empty input, huge dataset).
     * Set "nextStage": "CODING" and "codingChallenge": null.

Return ONLY a JSON object with this exact shape:
{
  "message": "Your natural spoken response (2-3 sentences max)",
  "nextStage": "CONCEPTUAL" or "CODING",
  "codingChallenge": {
    "title": "Title of problem",
    "difficulty": "Easy" or "Medium" or "Hard",
    "description": "Clear problem statement paragraph",
    "functionDescription": "Detailed function signature and parameter expectations",
    "inputFormat": "Description of input format",
    "constraints": ["Constraint 1", "Constraint 2", "Constraint 3"],
    "outputFormat": "Description of return value format",
    "sampleTestCases": [
      {
        "input": "e.g. nums = [2, 7, 11, 15], target = 9",
        "expectedOutput": "e.g. [0, 1]",
        "explanation": "Brief explanation of why this output matches"
      },
      {
        "input": "e.g. nums = [3, 2, 4], target = 6",
        "expectedOutput": "e.g. [1, 2]",
        "explanation": "Brief explanation"
      }
    ],
    "starterCode": "function solution() {\\n    // Write your code here\\n}",
    "language": "javascript"
  } // or null if staying in CONCEPTUAL or already in CODING
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

