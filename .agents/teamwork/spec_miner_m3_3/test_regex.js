import { cleanTextForSpeech } from '../../../backend/src/services/tts.service.js';

export const SENTENCE_REGEX = /(?:[^.!?]|\.(?!\s|$)|(?<=\b(?:e\.g|i\.e|etc|vs|dr|mr|ms))\.)+(?:[.!?]+['"’”\)\]\}]*(?:\s+|$)|$)/gi;

export function splitIntoSentences(text) {
    const clean = cleanTextForSpeech(text);
    if (!clean) return [];
    const matches = clean.match(SENTENCE_REGEX);
    if (!matches || matches.length === 0) return [clean];
    return matches.map(s => s.trim()).filter(Boolean);
}

const additionalEdgeCases = [
  'Visit https://github.com/voxcode/repo.git for docs. It is open source.',
  'Contact dev.team@voxcode.ai for details. They respond quickly.',
  'I was thinking... Maybe we should shard by user_id? That would balance partitions.',
  'Version 1.0.0-alpha.1 was released! Did you test it?',
  'SQL vs. NoSQL: which one provides better consistency?',
  'He shouted, "Stop!" Then he continued.',
  'A',
  'A.',
  'A. B. C.',
  'Is 0.05ms achievable? Yes, with Redis.',
  'We use C# and ASP.NET Core 8.0 on Azure. It performs well.',
  'The function is `array.prototype.map()` in JavaScript. Have you used it?'
];

for (const tc of additionalEdgeCases) {
  const res = splitIntoSentences(tc);
  console.log('INPUT:', JSON.stringify(tc));
  console.log('OUTPUT:', res);
  console.log('---');
}
