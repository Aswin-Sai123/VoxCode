/**
 * Candidate Profile Tracker
 * File: backend/src/utils/candidateProfileTracker.js
 * 
 * Tracks real-time candidate proficiency across interview topics, calculating
 * Exponential Moving Average (EMA) topic scores, rolling depth/communication averages,
 * Candidate Readiness Index (CRI), performance signals, and weak topics.
 */

/**
 * Computes incremental rolling average
 * @param {number} currentAvg 
 * @param {number} nextVal 
 * @param {number} count 
 * @returns {number}
 */
export function rollingAvg(currentAvg = 0, nextVal = 0, count = 1) {
    if (count <= 1) {
        return Number(Number(nextVal || 0).toFixed(2));
    }
    const safeCurrent = typeof currentAvg === 'number' ? currentAvg : 0;
    const safeNext = typeof nextVal === 'number' ? nextVal : 0;
    const nextAvg = ((safeCurrent * (count - 1)) + safeNext) / count;
    return Number(nextAvg.toFixed(2));
}

/**
 * Calculates Composite Candidate Readiness Index (CRI) on a 0-10 scale
 * Weighted: 45% topic mastery, 35% technical depth, 20% communication
 * @param {Object} profile 
 * @returns {number}
 */
export function calculateCandidateReadinessIndex(profile = {}) {
    const topicScores = Object.values(profile.topicScores || {});
    const avgTopicScore = topicScores.length > 0
        ? topicScores.reduce((sum, score) => sum + (typeof score === 'number' ? score : 0), 0) / topicScores.length
        : 0;

    const technicalDepth = typeof profile.technicalDepth === 'number' ? profile.technicalDepth : 0;
    const communicationScore = typeof profile.communicationScore === 'number' ? profile.communicationScore : 0;

    const composite = (avgTopicScore * 0.45) + (technicalDepth * 0.35) + (communicationScore * 0.20);
    return Number(Math.max(0, Math.min(10, composite)).toFixed(2));
}

/**
 * Estimates overall candidate level (0-10) for adaptive question difficulty
 * @param {Object} session 
 * @returns {number}
 */
export function estimateCandidateLevel(session = {}) {
    if (session?.candidateProfile) {
        const cri = session.candidateProfile.candidateReadinessIndex || session.candidateProfile.cri;
        if (typeof cri === 'number' && cri > 0) return cri;
    }

    if (Array.isArray(session?.microScores) && session.microScores.length > 0) {
        const validScores = session.microScores.filter(m => typeof m.score === 'number');
        if (validScores.length > 0) {
            const sum = validScores.reduce((acc, m) => acc + m.score, 0);
            return Number((sum / validScores.length).toFixed(2));
        }
    }

    return 5.0; // Balanced default level
}

/**
 * Updates running candidate profile with a newly evaluated micro-score
 * @param {Object} session - InterviewSession object or document
 * @param {string} topicKey - Subject or competency key
 * @param {Object} microScore - Single answer micro-score object
 * @returns {Object} updated candidate profile
 */
export function updateCandidateProfile(session, topicKey = 'General', microScore = {}) {
    if (!session) {
        throw new Error('Session is required for updateCandidateProfile');
    }

    const safeTopicKey = (topicKey || 'General').trim();
    const scoreVal = typeof microScore.score === 'number' ? Math.max(0, Math.min(10, microScore.score)) : 0;

    const dimensions = microScore.dimensions || {};
    const commDim = typeof dimensions.communication === 'number'
        ? Math.max(0, Math.min(10, dimensions.communication))
        : scoreVal;
    const depthDim = typeof dimensions.depth === 'number'
        ? Math.max(0, Math.min(10, dimensions.depth))
        : scoreVal;

    // Initialize or load profile
    if (!session.candidateProfile) {
        session.candidateProfile = {
            topicScores: {},
            overallSignal: 'unknown',
            communicationScore: 0,
            technicalDepth: 0,
            responseCount: 0,
            weakTopics: [],
            cri: 0,
            candidateReadinessIndex: 0
        };
    }

    const profile = session.candidateProfile;
    if (!profile.topicScores || typeof profile.topicScores !== 'object') {
        profile.topicScores = {};
    }

    // 1. Exponential Moving Average (EMA) with alpha = 0.4 on topic score
    const alpha = 0.4;
    const previousTopicScore = profile.topicScores[safeTopicKey];
    if (previousTopicScore !== undefined && typeof previousTopicScore === 'number') {
        profile.topicScores[safeTopicKey] = Number((alpha * scoreVal + (1 - alpha) * previousTopicScore).toFixed(2));
    } else {
        profile.topicScores[safeTopicKey] = Number(scoreVal.toFixed(2));
    }

    // 2. Rolling averages for communication and technical depth
    profile.responseCount = (profile.responseCount || 0) + 1;
    profile.communicationScore = rollingAvg(profile.communicationScore, commDim, profile.responseCount);
    profile.technicalDepth = rollingAvg(profile.technicalDepth, depthDim, profile.responseCount);

    // 3. Overall average and signal determination
    const topicValues = Object.values(profile.topicScores);
    const avgScore = topicValues.length > 0
        ? topicValues.reduce((sum, s) => sum + s, 0) / topicValues.length
        : 0;

    if (profile.responseCount === 0 || topicValues.length === 0) {
        profile.overallSignal = 'unknown';
    } else if (avgScore >= 7.5) {
        profile.overallSignal = 'strong';
    } else if (avgScore >= 5.0) {
        profile.overallSignal = 'adequate';
    } else {
        profile.overallSignal = 'weak';
    }

    // 4. Identify weak topics (score < 6.0)
    profile.weakTopics = Object.keys(profile.topicScores).filter(
        key => typeof profile.topicScores[key] === 'number' && profile.topicScores[key] < 6.0
    );

    // 5. Composite CRI
    const cri = calculateCandidateReadinessIndex(profile);
    profile.cri = cri;
    profile.candidateReadinessIndex = cri;

    // Notify Mongoose of Mixed type modification if applicable
    if (typeof session.markModified === 'function') {
        session.markModified('candidateProfile');
        session.markModified('candidateProfile.topicScores');
        session.markModified('candidateProfile.weakTopics');
    }

    return profile;
}

export default {
    updateCandidateProfile,
    calculateCandidateReadinessIndex,
    estimateCandidateLevel,
    rollingAvg
};

