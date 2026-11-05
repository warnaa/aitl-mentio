import { defineVocabulary } from '../vocabulary';

export const StackTags = defineVocabulary(['typescript', 'react', 'python', 'ai-agents'], {
  typescript: 'TypeScript',
  react: 'React',
  python: 'Python',
  'ai-agents': 'AI agents',
});
export type StackTag = (typeof StackTags.values)[number];
