// AI service powered by Google Gemini 2.5 Flash
// Configured to act as a realistic, unscripted Indian Senior Engineering Lead / Tech Interviewer

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Generate a natural, human opening greeting and ask the candidate for an introduction
 */
export const generateOpeningGreeting = async ({ companyName = 'our engineering team', candidateName = '', roleTitle = 'Software Engineer', skills = [], experienceLevel = 'Mid', blueprint = '' }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const fallbackGreeting = {
        message: `Hey${candidateName ? ' ' + candidateName : ''}! Thanks for taking the time to join today. I'm Rohan, one of the engineering leads here at ${companyName}. We're looking for a ${roleTitle} to join the team. Before we dive into technicals and coding, I'd love to know a bit about you—could you briefly introduce yourself, walk me through your journey, and share what kind of projects you've been working on recently?`,
        nextStage: 'CONCEPTUAL'
    };

    if (!apiKey) return fallbackGreeting;

    const prompt = `You are Rohan, a seasoned, sharp, and encouraging Senior Engineering Lead at ${companyName} conducting a live technical interview for a ${experienceLevel} level ${roleTitle} candidate${candidateName ? ' named ' + candidateName : ''}.
Required Tech Stack / Skills: ${skills && skills.length ? skills.join(', ') : 'Software Engineering'}
Company Blueprint: ${blueprint || 'Standard technical interview evaluating fundamentals, architecture, and coding.'}

INSTRUCTIONS FOR OPENING THE INTERVIEW:
1. Greet the candidate warmly and naturally like a real human tech lead from Bangalore / Hyderabad (e.g., "Hey, good morning/afternoon! Thanks for jumping on the call.").
2. Introduce yourself naturally by your first name (Rohan) and your role at ${companyName}.
3. NEVER say "I am Vox AI", "I am an AI interviewer", or mention automated platforms. You are the interviewer.
4. Ask the candidate to introduce themselves, their background, and what they've been building or working with recently.
5. Keep it conversational, spoken-friendly, and concise (under 3-4 sentences max). Do NOT jump into tricky technical questions or coding yet.

Return ONLY a JSON object with this exact shape:
{
  "message": "natural spoken opening greeting here",
  "nextStage": "CONCEPTUAL"
}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.85,
                    topP: 0.95
                }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
 * Handle subsequent candidate responses adaptively, like a real human interviewer:
 * - Listens and evaluates candidate answer dynamically
 * - Probes deeper on mistakes or weak answers
 * - Escalates to architectural / advanced questions on strong answers
 * - Dynamically transitions to coding when ready or requested
 * - Sees candidate editor code in real time
 */
export const generateNextInterviewStep = async ({
    companyName = 'the company',
    roleTitle = 'Software Engineer',
    skills = [],
    experienceLevel = 'Mid',
    blueprint = '',
    transcript = [],
    candidateMessage = '',
    currentStage = 'CONCEPTUAL',
    currentChallenge = null,
    currentCode = '',
    executionOutput = ''
}) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Check if candidate explicitly requested coding
    const candidateWantsCoding = /ready for code|ready to code|start coding|coding challenge|let('?s)? code|coding question|dsa/i.test(candidateMessage);
    
    // Count conceptual questions asked so far
    const conceptualCount = transcript.filter(t => t.role === 'ai').length;

    // Dynamic decision: transition if candidate asks OR after 2-3 genuine conceptual exchanges
    const shouldConsiderCoding = currentStage === 'CONCEPTUAL' && (candidateWantsCoding || conceptualCount >= 3);

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

    const fallbackResponse = shouldConsiderCoding
        ? {
            message: `Awesome, that gives me a clear sense of your background. Let's move into the hands-on coding part now. I've loaded a challenge in your workspace on the right. Take a look, tell me your initial thoughts, and we can discuss the approach before you implement.`,
            nextStage: 'CODING',
            codingChallenge: fallbackCodingChallenge
        }
        : {
            message: `Makes sense. Building on that, how would you approach error handling and performance bottlenecks in that kind of architecture?`,
            nextStage: currentStage || 'CONCEPTUAL',
            codingChallenge: null
        };

    if (!apiKey) return fallbackResponse;

    const formattedTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');

    const prompt = `You are Rohan, a seasoned, sharp, and encouraging Senior Engineering Lead at ${companyName} conducting a live technical interview for a ${experienceLevel} level ${roleTitle} candidate.

REQUIRED TECH STACK / SKILLS:
${skills && skills.length ? skills.join(', ') : 'Full Stack Engineering'}

COMPANY INTERVIEW BLUEPRINT:
${blueprint || 'Assess core problem solving, system fundamentals, and coding capability.'}

CURRENT INTERVIEW STATUS:
- Current Stage: ${currentStage} (either 'CONCEPTUAL' or 'CODING')
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
   - Use natural spoken language with authentic conversational cadence and occasional fillers ("Got it, yeah", "Makes sense, but tell me...", "Wait, hang on a second...", "Fair enough", "Nice, so why did you choose that approach?").
   - NEVER say "I am Vox AI", "As an AI language model", or act like a chatbot. You are Rohan, Senior Tech Lead.
   - NEVER follow a rigid script or repeat canned lines. Listen to what the candidate ACTUALLY said and react dynamically.
   - Keep your spoken replies concise (2-3 sentences max) so the conversation flows like a real voice call, not a lecture.

2. ADAPTIVE EVALUATION (CRITICAL):
   - Evaluate the candidate's answer quality on each turn:
     * IF ANSWER IS GOOD / STRONG:
       Acknowledge it naturally and probe deeper into trade-offs, edge cases, scale, or failure scenarios (e.g. "Got it. So how do you handle cache invalidation when data updates?", "Right, but what's the memory trade-off there?").
     * IF ANSWER IS VAGUE, SHALLOW, OR INCORRECT:
       Do NOT praise a wrong answer! React like a real interviewer:
       "Wait, hang on a sec—how would that work if the array is already sorted?", or "Hmm, not quite. Let's think about that again—what happens during a hash collision?"
     * IF CANDIDATE ASKS A QUESTION OR SAYS HELLO:
       Answer them directly, warmly, and authentically.
     * IF CANDIDATE ASKS TO CODE OR SAYS THEY ARE READY:
       Transition to the CODING stage immediately in your own spontaneous words!

3. STAGE MANAGEMENT & TRANSITIONS:
   - When in 'CONCEPTUAL' stage:
     * When you feel you've gotten enough signal about their core fundamentals (usually after 2-3 genuine technical exchanges), OR if the candidate asked to code:
       -> Decide to move to CODING!
       -> In your "message", invite them to the coding round in your OWN spontaneous words (e.g. tell them you'd love to see how they translate their logic into actual code, point them to the problem statement loaded on the left, and ask them to explain their initial thoughts before coding). NEVER repeat a fixed scripted line.
       -> Set "nextStage": "CODING".
       -> Generate a structured coding challenge tailored to ${experienceLevel} level and ${skills.join(', ')} with clear description, input/output formats, constraints, sample test cases with explanations, and clean starter code.
     * Otherwise:
       -> Continue the conceptual discussion naturally. Set "nextStage": "CONCEPTUAL" and "codingChallenge": null.
   
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.85,
                    topP: 0.95
                }
            })
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
