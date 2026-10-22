/** Default interview flow limits (backend-owned; LLM drives wording and grading). */
export const INTERVIEW_LIMITS = {
    topicCount: 3,
    rootQuestionsPerTopic: 3,
    followUpsPerRootQuestion: 3
};

/**
 * Build topic labels from assessment skills (simple names for UI + state tracking).
 */
export function buildTopicLabels(skills = []) {
    const list = (skills && skills.length ? skills : ['General Engineering']).slice(0, INTERVIEW_LIMITS.topicCount);
    while (list.length < INTERVIEW_LIMITS.topicCount) {
        list.push(list[list.length - 1] || 'General Engineering');
    }
    return list.map((skill, index) => ({
        key: `topic-${index}`,
        label: `${skill}`,
        skill,
        maxRootQuestions: INTERVIEW_LIMITS.rootQuestionsPerTopic,
        maxFollowUpsPerQuestion: INTERVIEW_LIMITS.followUpsPerRootQuestion,
        rootQuestionsAsked: 0,
        followUpsOnCurrentRoot: 0,
        currentRootQuestionIndex: 0,
        status: index === 0 ? 'active' : 'pending'
    }));
}

/**
 * Initial session state machine document stored on InterviewSession.
 */
export function buildInitialStateMachine({ skills = [], codingEnabled = true } = {}) {
    const topics = buildTopicLabels(skills);
    return {
        version: 1,
        phase: 'CONCEPTUAL',
        coding: {
            enabled: codingEnabled,
            entered: false
        },
        limits: {
            topicCount: INTERVIEW_LIMITS.topicCount,
            rootQuestionsPerTopic: INTERVIEW_LIMITS.rootQuestionsPerTopic,
            followUpsPerRootQuestion: INTERVIEW_LIMITS.followUpsPerRootQuestion
        },
        activeTopicIndex: 0,
        topics
    };
}

export function stateMachineToLegacyFields(stateMachine) {
    if (!stateMachine?.topics?.length) {
        return {
            topics: [],
            currentTopicIndex: 0,
            questionsInCurrentTopic: 0
        };
    }
    const topics = stateMachine.topics.map((t) => t.label);
    const idx = stateMachine.activeTopicIndex || 0;
    const active = stateMachine.topics[Math.min(idx, stateMachine.topics.length - 1)];
    const questionsInCurrentTopic =
        (active?.rootQuestionsAsked || 0) + (active?.followUpsOnCurrentRoot || 0);
    return {
        topics,
        currentTopicIndex: idx,
        questionsInCurrentTopic
    };
}

/**
 * Apply LLM stateAction to the stored state machine (counts only; no generated content).
 */
export function applyStateActionToMachine(stateMachine, stateAction) {
    if (!stateMachine?.topics?.length) return stateMachine;

    const sm = JSON.parse(JSON.stringify(stateMachine));
    const idx = sm.activeTopicIndex || 0;
    const topic = sm.topics[Math.min(idx, sm.topics.length - 1)];
    if (!topic) return sm;

    if (stateAction === 'DRILL_DEEPER') {
        const atFollowUpCap =
            topic.followUpsOnCurrentRoot >= sm.limits.followUpsPerRootQuestion;
        if (atFollowUpCap) {
            // Move to next root question within this topic
            topic.rootQuestionsAsked = Math.min(
                topic.rootQuestionsAsked + 1,
                sm.limits.rootQuestionsPerTopic
            );
            topic.followUpsOnCurrentRoot = 0;
            topic.currentRootQuestionIndex = topic.rootQuestionsAsked;

            // If all root questions for this topic are exhausted, auto-advance topic
            if (topic.rootQuestionsAsked >= sm.limits.rootQuestionsPerTopic) {
                topic.status = 'done';
                const nextIdx = Math.min(idx + 1, sm.topics.length - 1);
                if (nextIdx !== idx) {
                    sm.activeTopicIndex = nextIdx;
                    sm.topics.forEach((t, i) => {
                        if (i < nextIdx) t.status = 'done';
                        else if (i === nextIdx) t.status = 'active';
                        else t.status = 'pending';
                    });
                }
            }
        } else {
            topic.followUpsOnCurrentRoot = Math.min(
                topic.followUpsOnCurrentRoot + 1,
                sm.limits.followUpsPerRootQuestion
            );
        }
    } else if (stateAction === 'ADVANCE_TOPIC') {
        // First check: are there still root questions left in this topic?
        if (topic.rootQuestionsAsked < sm.limits.rootQuestionsPerTopic - 1) {
            // Advance to next root question within same topic (not next topic)
            topic.rootQuestionsAsked += 1;
            topic.followUpsOnCurrentRoot = 0;
            topic.currentRootQuestionIndex = topic.rootQuestionsAsked;
        } else {
            // All root questions exhausted — advance to next topic
            topic.status = 'done';
            topic.followUpsOnCurrentRoot = 0;
            const nextIdx = Math.min(idx + 1, sm.topics.length - 1);
            sm.activeTopicIndex = nextIdx;
            sm.topics.forEach((t, i) => {
                if (i < nextIdx) t.status = 'done';
                else if (i === nextIdx) t.status = 'active';
                else t.status = 'pending';
            });
        }
    }

    return sm;
}
