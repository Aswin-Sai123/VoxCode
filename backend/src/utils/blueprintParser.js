/**
 * Utility to extract interview duration, timeline, and phase breakdown from an interview blueprint.
 * Supports:
 * - Range-based phases (e.g. "Warmup (0-5 mins)", "Coding (20-40 mins)", "Wrap-Up (40-45 mins)")
 * - Explicit duration statements (e.g. "Total Duration: 45 minutes", "Duration: 60 mins", "1 hour")
 * - Dynamic proportional timelines when time is specified without phase breakdowns
 */

export function extractBlueprintDurationAndTimeline(blueprintText, experienceLevel = 'Mid') {
    // Dynamic duration baseline tailored to seniority
    const defaultForLevel = (/staff|principal|lead/i.test(experienceLevel)) ? 60 : (/senior/i.test(experienceLevel)) ? 45 : 30;

    if (!blueprintText || typeof blueprintText !== 'string') {
        return { 
            totalDurationMinutes: defaultForLevel, 
            timeline: buildDefaultTimeline(defaultForLevel, true, experienceLevel), 
            source: 'default' 
        };
    }

    const text = blueprintText;
    let detectedDuration = null;
    let timeline = [];

    // 1. Check for range-based phases: e.g. "(0-5 mins)", "5 - 20 minutes", "20-40 mins", "40-45 mins"
    const rangeRegex = /(\d+)\s*[-–—to]+\s*(\d+)\s*(?:mins?|minutes?|m\b)/gi;
    let match;
    const ranges = [];
    while ((match = rangeRegex.exec(text)) !== null) {
        const start = parseInt(match[1], 10);
        const end = parseInt(match[2], 10);
        if (!isNaN(start) && !isNaN(end) && end > start && end <= 300) {
            ranges.push({ start, end });
        }
    }

    if (ranges.length > 0) {
        const maxEnd = Math.max(...ranges.map(r => r.end));
        if (maxEnd >= 10 && maxEnd <= 240) {
            detectedDuration = maxEnd;
        }
    }

    // 2. Check for explicit total duration statements: e.g. "Total Duration: 45 minutes", "Duration: 60 mins"
    if (!detectedDuration) {
        const explicitRegex = /(?:total\s+)?(?:round\s+|interview\s+|assessment\s+)?(?:duration|length|time)\s*[:=]\s*(\d+)\s*(?:mins?|minutes?)/i;
        const expMatch = text.match(explicitRegex);
        if (expMatch) {
            const mins = parseInt(expMatch[1], 10);
            if (mins >= 5 && mins <= 240) detectedDuration = mins;
        }
    }

    if (!detectedDuration) {
        const hourRegex = /(?:duration|length|time)\s*[:=]\s*(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)/i;
        const hrMatch = text.match(hourRegex);
        if (hrMatch) {
            const hrs = parseFloat(hrMatch[1]);
            const mins = Math.round(hrs * 60);
            if (mins >= 15 && mins <= 240) detectedDuration = mins;
        }
    }

    if (!detectedDuration) {
        const standaloneHourRegex = /\b(1(?:\.5)?|2)\s*(?:hrs?|hours?)\s+(?:technical\s+)?(?:interview|round|assessment)\b/i;
        const sMatch = text.match(standaloneHourRegex);
        if (sMatch) {
            const hrs = parseFloat(sMatch[1]);
            detectedDuration = Math.round(hrs * 60);
        }
    }

    const finalDuration = detectedDuration || ((/staff|principal|lead/i.test(experienceLevel)) ? 60 : (/senior/i.test(experienceLevel)) ? 45 : 30);

    // 3. Parse explicit phase lines if present
    const lines = text.split('\n');
    const phaseLines = [];
    lines.forEach(line => {
        const trimmed = line.trim();
        if (/^(?:\d+[.)]|[A-Z][.)]|Phase\s+\d+|Round\s+\d+)/i.test(trimmed)) {
            const timeMatch = trimmed.match(/(\d+)\s*[-–—to]+\s*(\d+)\s*(?:mins?|minutes?|m\b)/i);
            if (timeMatch) {
                const s = parseInt(timeMatch[1], 10);
                const e = parseInt(timeMatch[2], 10);
                const title = trimmed
                    .replace(/\s*\(\d+\s*[-–—to]+\s*\d+\s*(?:mins?|minutes?|m\b)\)\s*[:.]?/i, '')
                    .replace(/^[0-9.\-) \s]+/, '')
                    .trim();
                
                let phaseType = 'TECHNICAL';
                if (/warmup|intro|background|experience/i.test(title)) phaseType = 'WARMUP';
                else if (/architecture|deep-dive|system|design|scalability/i.test(title)) phaseType = 'ARCHITECTURE';
                else if (/coding|problem\s*solving|monaco|dsa|algorithm|implementation/i.test(title)) phaseType = 'CODING';
                else if (/wrap-up|wrapup|q&a|debrief|questions/i.test(title)) phaseType = 'WRAPUP';

                phaseLines.push({
                    phase: phaseType,
                    title: title || `Phase ${phaseLines.length + 1}`,
                    startMinute: s,
                    endMinute: e,
                    durationMinutes: e - s
                });
            }
        }
    });

    const isCoding = !/zero live coding|no coding|pure architecture|behavioral only/i.test(text);

    if (phaseLines.length >= 2) {
        timeline = phaseLines;
    } else {
        timeline = buildDefaultTimeline(finalDuration, isCoding);
    }

    return {
        totalDurationMinutes: finalDuration,
        timeline,
        codingRoundEnabled: isCoding,
        source: detectedDuration ? 'blueprint' : 'default'
    };
}

/**
 * Builds proportional timeline when explicit ranges are not in the blueprint
 */
export function buildDefaultTimeline(totalMinutes = 30, isCoding = true) {
    const total = Math.max(10, Math.min(240, Number(totalMinutes) || 30));
    if (isCoding) {
        const warmupEnd = Math.max(3, Math.round(total * 0.12));
        const archEnd = Math.max(warmupEnd + 5, Math.round(total * 0.45));
        const codingEnd = Math.max(archEnd + 10, Math.round(total * 0.88));
        return [
            { phase: 'WARMUP', title: 'Warmup & Production Experience', startMinute: 0, endMinute: warmupEnd, durationMinutes: warmupEnd },
            { phase: 'ARCHITECTURE', title: 'System Architecture & Technical Deep-Dive', startMinute: warmupEnd, endMinute: archEnd, durationMinutes: archEnd - warmupEnd },
            { phase: 'CODING', title: 'Problem Solving & Live Coding', startMinute: archEnd, endMinute: codingEnd, durationMinutes: codingEnd - archEnd },
            { phase: 'WRAPUP', title: 'Candidate Q&A & Wrap-Up', startMinute: codingEnd, endMinute: total, durationMinutes: total - codingEnd }
        ];
    } else {
        const warmupEnd = Math.max(3, Math.round(total * 0.15));
        const archEnd = Math.max(warmupEnd + 10, Math.round(total * 0.85));
        return [
            { phase: 'WARMUP', title: 'Warmup & Production Experience', startMinute: 0, endMinute: warmupEnd, durationMinutes: warmupEnd },
            { phase: 'ARCHITECTURE', title: 'System Architecture & Engineering Scalability', startMinute: warmupEnd, endMinute: archEnd, durationMinutes: archEnd - warmupEnd },
            { phase: 'WRAPUP', title: 'Candidate Q&A & Wrap-Up', startMinute: archEnd, endMinute: total, durationMinutes: total - archEnd }
        ];
    }
}

/**
 * Determine the active phase, buffer boundaries, and next transition cues from a timeline and elapsed time
 */
export function getActivePhaseInfo(timeline = [], elapsedMinutes = 0, totalDurationMinutes = 30) {
    const total = totalDurationMinutes || 30;
    const elapsed = Math.max(0, elapsedMinutes);
    const remaining = Math.max(0, total - elapsed);

    // Locate coding phase if present
    const codingPhase = timeline.find(p => p.phase === 'CODING');
    const codingStartMinute = codingPhase ? codingPhase.startMinute : Math.round(total * 0.45);
    const codingEndMinute = codingPhase ? codingPhase.endMinute : Math.round(total * 0.88);

    // Locate wrap-up phase if present
    const wrapUpPhase = timeline.find(p => p.phase === 'WRAPUP');
    const wrapUpStartMinute = wrapUpPhase ? wrapUpPhase.startMinute : Math.round(total * 0.88);

    // Find current active phase in timeline
    let active = timeline.find(p => elapsed >= p.startMinute && elapsed < p.endMinute);
    if (!active) {
        if (elapsed >= (timeline[timeline.length - 1]?.startMinute || total)) {
            active = timeline[timeline.length - 1] || { phase: 'WRAPUP', title: 'Candidate Q&A & Wrap-Up', startMinute: wrapUpStartMinute, endMinute: total };
        } else {
            active = timeline[0] || { phase: 'WARMUP', title: 'Warmup & Introduction', startMinute: 0, endMinute: 5 };
        }
    }

    // Buffer logic: ±2 minutes transition window
    const isNearCodingPhase = Boolean(codingPhase) && elapsed >= (codingStartMinute - 2) && elapsed < codingEndMinute;
    const isPastCodingPhase = Boolean(codingPhase) && elapsed >= codingStartMinute;
    const isNearWrapUp = remaining <= 6 || elapsed >= (wrapUpStartMinute - 1);
    const isFinalClosing = remaining <= 2;

    return {
        activePhase: active,
        activePhaseTitle: active.title || 'Technical Discussion',
        codingStartMinute,
        codingEndMinute,
        wrapUpStartMinute,
        remainingMinutes: remaining,
        elapsedMinutes: elapsed,
        totalDurationMinutes: total,
        isNearCodingPhase,
        isPastCodingPhase,
        isNearWrapUp,
        isFinalClosing
    };
}
