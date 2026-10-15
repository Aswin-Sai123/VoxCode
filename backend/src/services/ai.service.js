// AI service powered by Google Gemini 2.5 Flash

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Generate the opening greeting and first question for the candidate
 */
export const generateOpeningGreeting = async ({ roleTitle, skills, experienceLevel, blueprint }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    const fallbackGreeting = {
        message: `Hello and welcome to your technical interview for the ${roleTitle || 'Developer'} role! I'm your AI interviewer today. Let's start with a foundational question to warm up: Can you briefly introduce your background and tell me what technical stack you feel most confident working with?`,
        nextStage: 'CONCEPTUAL'
    };

    if (!apiKey) return fallbackGreeting;

    const prompt = `You are "Vox AI", an expert, friendly technical interviewer conducting a live voice interview for a candidate.
Role: ${roleTitle}
Experience Level: ${experienceLevel}
Required Skills: ${skills && skills.length ? skills.join(', ') : 'Software Development'}
Company's Interview Blueprint:
"""
${blueprint || 'Focus on foundational concepts, practical knowledge, and core problem solving.'}
"""

Instructions:
1. Greet the candidate warmly and professionally (keep it to 2-3 sentences max).
2. State the role they are interviewing for.
3. Ask your FIRST conceptual/technical question based on the role, skills, and blueprint.
4. Keep the question spoken-friendly and concise (avoid giant paragraphs). Do NOT give any coding problem yet.

Output ONLY a JSON object with this exact shape:
{
  "message": "your greeting and first question here",
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
 * Handle subsequent candidate responses, evaluate answers, and transition to coding when appropriate
 */
export const generateNextInterviewStep = async ({
    roleTitle,
    skills,
    experienceLevel,
    blueprint,
    transcript,
    candidateMessage,
    currentStage,
    currentChallenge,
    conceptualQuestionsCount = 0
}) => {
    const apiKey = process.env.GEMINI_API_KEY;

    // Determine if it is time to transition to coding
    // Transition after 2-3 conceptual questions
    const shouldTransitionToCoding = currentStage === 'CONCEPTUAL' && conceptualQuestionsCount >= 2;

    const fallbackResponse = shouldTransitionToCoding
        ? {
            message: `Great explanation! Now let's move on to the hands-on coding part of the interview. I am opening your coding workspace on the right side of your screen. Please read the problem statement, write your solution, and explain your approach as you go.`,
            nextStage: 'CODING',
            codingChallenge: {
                title: 'Two Sum Problem',
                description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nAssume exactly one solution exists, and you may not use the same element twice.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]',
                starterCode: `function twoSum(nums, target) {\n    // Write your solution here\n    \n}\n\n// Test example\nconsole.log(twoSum([2, 7, 11, 15], 9));`,
                language: 'javascript'
            }
        }
        : {
            message: `Thank you for sharing that. Building on what you said, could you explain how you would handle error handling and performance optimization in a production environment?`,
            nextStage: currentStage || 'CONCEPTUAL',
            codingChallenge: null
        };

    if (!apiKey) return fallbackResponse;

    const formattedTranscript = transcript.map(t => `${t.role.toUpperCase()}: ${t.text}`).join('\n');

    let prompt = '';

    if (shouldTransitionToCoding) {
        prompt = `You are Vox AI, technical interviewer for ${roleTitle} (${experienceLevel}).
Company Blueprint:
"""
${blueprint || 'Assess core problem solving and DSA/practical coding.'}
"""

The candidate just answered conceptual question #${conceptualQuestionsCount}.
Candidate's latest answer: "${candidateMessage}"

Previous Conversation:
${formattedTranscript}

TASK:
1. Give a brief, encouraging 1-sentence comment acknowledging their answer.
2. Announce that you are now transitioning to the practical coding / problem-solving stage and opening their code workspace.
3. Generate a coding challenge appropriate for a ${experienceLevel} level candidate for ${roleTitle}, matching the blueprint.
4. Provide starter code in JavaScript.

Return ONLY a JSON object with this exact shape:
{
  "message": "Brief feedback + announcement opening the code editor",
  "nextStage": "CODING",
  "codingChallenge": {
    "title": "Short challenge title",
    "description": "Clear problem statement with examples and constraints",
    "starterCode": "function solution() {\\n    // Write your code here\\n}\\n\\nconsole.log(solution());",
    "language": "javascript"
  }
}`;
    } else if (currentStage === 'CODING') {
        prompt = `You are Vox AI, technical interviewer for ${roleTitle}.
The candidate is currently in the CODING round solving: "${currentChallenge?.title || 'Coding Problem'}".
Problem Description: "${currentChallenge?.description || ''}"

Candidate says / asks: "${candidateMessage}"

Previous Conversation:
${formattedTranscript}

TASK:
1. Respond naturally to the candidate. If they are explaining their approach, encourage them or ask a clarifying question about time/space complexity or edge cases.
2. If they ask for a hint, provide a small subtle hint without giving away the full code.
3. Keep response concise (2-4 sentences) and audio-friendly.

Return ONLY a JSON object with this exact shape:
{
  "message": "your response here",
  "nextStage": "CODING",
  "codingChallenge": null
}`;
    } else {
        // Still in conceptual stage
        prompt = `You are Vox AI, technical interviewer for ${roleTitle} (${experienceLevel}).
Skills: ${skills?.join(', ') || 'General Development'}
Company Blueprint:
"""
${blueprint || 'Ask relevant technical and architectural questions.'}
"""

The candidate just answered conceptual question #${conceptualQuestionsCount}.
Candidate said: "${candidateMessage}"

Previous Conversation:
${formattedTranscript}

TASK:
1. Give a brief, natural 1-sentence reaction to the candidate's answer.
2. Ask the NEXT conceptual question based on the role and company blueprint.
3. Keep it spoken-friendly and concise. Do NOT ask for code yet.

Return ONLY a JSON object with this exact shape:
{
  "message": "reaction + next question",
  "nextStage": "CONCEPTUAL",
  "codingChallenge": null
}`;
    }

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
                nextStage: parsed.nextStage || (shouldTransitionToCoding ? 'CODING' : currentStage),
                codingChallenge: parsed.codingChallenge || (shouldTransitionToCoding ? fallbackResponse.codingChallenge : null)
            };
        }
    } catch (err) {
        console.error('Gemini next step error:', err);
    }

    return fallbackResponse;
};
