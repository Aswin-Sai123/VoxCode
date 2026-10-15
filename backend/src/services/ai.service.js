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
                generationConfig: { responseMimeType: 'application/json' }
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
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nAssume exactly one solution exists, and you may not use the same element twice.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\n\nConstraints:\n- 2 <= nums.length <= 10^4\n- Only one valid answer exists.',
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
1. TALK LIKE A REAL HUMAN TECH INTERVIEWER:
   - Use natural spoken language ("Got it", "Fair enough", "Yeah, makes sense", "Wait, hang on a second...", "Interesting, so why did you choose that?").
   - NEVER say "I am Vox AI", "As an AI language model", or act like a bot. You are Rohan, a lead engineer.
   - NEVER follow a rigid script. Listen to what the candidate ACTUALLY said and react dynamically.
   - Keep your replies concise (2-4 sentences max) so the conversation flows like a real voice call.

2. ADAPTIVE EVALUATION (CRITICAL):
   - Evaluate the candidate's answer quality on each turn:
     * IF ANSWER IS GOOD / STRONG: Acknowledge it quickly and push to a deeper, more challenging follow-up (e.g. edge-cases, scale, trade-offs, concurrency).
     * IF ANSWER IS VAGUE, SHALLOW, OR INCORRECT (e.g. they say React uses C++, or confuse threads and processes, or give a nonsense answer):
       Do NOT just say "Great!" and ignore it! React like a real interviewer:
       "Wait, you mentioned C++ there—how does C++ relate to React's Virtual DOM in JavaScript? Could you clarify what you meant?" or "Hmm, not quite. Let's think about that again..."
     * IF CANDIDATE ASKS A QUESTION (e.g. "Can you explain this problem?", "Can you see my code?", "Hello?"):
       Answer them directly and warmly.
     * IF CANDIDATE ASKS TO CODE OR SAYS THEY ARE READY:
       Transition immediately to the CODING stage!

3. STAGE MANAGEMENT:
   - When in 'CONCEPTUAL' stage:
     * If you've had 2-3 genuine exchanges and feel you have enough initial signal, OR if the candidate explicitly wants to code (${candidateWantsCoding ? 'CANDIDATE EXPLICITLY ASKED TO CODE' : 'not yet requested'}):
       -> Transition to 'CODING' stage!
       -> Say: "Great, let's jump into some hands-on problem solving now. I've set up a problem in your coding workspace on the right. Take a look, walk me through your approach, and let's code it out."
       -> Set "nextStage": "CODING".
       -> Generate a realistic coding challenge tailored to ${experienceLevel} level and ${skills.join(', ')} with clear description, constraints, and clean JavaScript starter code.
     * Otherwise:
       -> Continue the conceptual discussion naturally. Set "nextStage": "CONCEPTUAL" and "codingChallenge": null.
   
   - When in 'CODING' stage:
     * YOU CAN SEE THEIR CODE!
     * If the candidate asks "can you see my code?" or asks about their logic:
       Look at "Candidate's Current Code in Editor" above. Mention specific functions, variables, loops, or logic they wrote.
     * If their code has errors in "Candidate's Latest Code Execution Output":
       Give a subtle hint guiding them to the line or logic causing the issue.
     * If they finished writing code:
       Ask about Time & Space Complexity (Big-O) or test an edge case (empty array, negative numbers, nulls).
     * Set "nextStage": "CODING" and "codingChallenge": null.

Return ONLY a JSON object with this exact shape:
{
  "message": "Your natural spoken response (2-4 sentences max)",
  "nextStage": "CONCEPTUAL" or "CODING",
  "codingChallenge": {
    "title": "Title of problem",
    "description": "Clear problem statement with examples and constraints",
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
                generationConfig: { responseMimeType: 'application/json' }
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
