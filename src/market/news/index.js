export { newsSource, newsAdapter, createNewsSource } from './newsAdapter.js';
export {
  NEWS_FRESHNESS,
  NEWS_DUPLICATE_STATUS,
  DEFAULT_NEWS_RULES,
  classifyNewsFreshness
} from './newsRules.js';
export {
  enrichNewsEvidence,
  classifyNewsDuplicates,
  summarizeNewsIntelligence
} from './newsIntelligence.js';export { ingestNewsSources } from './newsPipeline.js';
export { verifyNewsEvidence, verificationSummary } from '../verification/index.js';
