export { newsSource, newsAdapter } from './newsAdapter';
export {
  NEWS_FRESHNESS,
  NEWS_DUPLICATE_STATUS,
  DEFAULT_NEWS_RULES,
  classifyNewsFreshness
} from './newsRules';
export {
  enrichNewsEvidence,
  classifyNewsDuplicates,
  summarizeNewsIntelligence
} from './newsIntelligence';export { ingestNewsSources } from './newsPipeline';
export { verifyNewsEvidence, verificationSummary } from '../verification';
