const ADJECTIVES = [
  'swift', 'quiet', 'amber', 'lunar', 'crisp', 'bold', 'vivid', 'calm',
  'bright', 'deep', 'noble', 'keen', 'lucid', 'stark', 'gentle', 'wild',
  'fresh', 'clear', 'steady', 'vivid', 'cool', 'warm', 'sharp', 'soft',
  'rapid', 'still', 'pale', 'dark', 'light', 'grand', 'humble', 'brisk',
];

const NOUNS = [
  'horizon', 'atlas', 'forge', 'stack', 'vertex', 'nexus', 'prism', 'cipher',
  'harbor', 'beacon', 'delta', 'echo', 'pulse', 'spark', 'grove', 'meadow',
  'summit', 'crest', 'drift', 'flux', 'orbit', 'canyon', 'ridge', 'stream',
  'garden', 'studio', 'lab', 'vault', 'port', 'field', 'path', 'trail',
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Generates a short, memorable project name without calling an LLM. */
export function generateRandomProjectName(): string {
  const adj = pick(ADJECTIVES);
  const noun = pick(NOUNS);
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${adj}-${noun}-${suffix}`;
}
