import { describe, it, expect } from 'vitest';
import { LISTED_TOOLS } from './toolCatalog.js';
import { TOOL_CONTENT } from './toolContent.jsx';

describe('Tool FAQs Quality & Completeness (Phase 1A)', () => {
  it('every live listed tool has an entry in TOOL_CONTENT with at least 6 FAQs', () => {
    const underrepresented = [];

    LISTED_TOOLS.forEach((tool) => {
      const content = TOOL_CONTENT[tool.slug];
      if (!content || !content.faq || content.faq.length < 6) {
        underrepresented.push({
          slug: tool.slug,
          count: content?.faq?.length || 0,
        });
      }
    });

    expect(underrepresented, `Tools with fewer than 6 FAQs: ${JSON.stringify(underrepresented)}`).toEqual([]);
  });

  it('no tool has empty, trivial, or excessively short FAQ questions or answers', () => {
    const invalidFaqs = [];

    LISTED_TOOLS.forEach((tool) => {
      const content = TOOL_CONTENT[tool.slug];
      if (content?.faq) {
        content.faq.forEach(([q, a], idx) => {
          if (!q || q.trim().length < 10) {
            invalidFaqs.push({ slug: tool.slug, idx, issue: 'question too short', q });
          }
          if (!a || a.trim().length < 35) {
            invalidFaqs.push({ slug: tool.slug, idx, issue: 'answer too short', a });
          }
        });
      }
    });

    expect(invalidFaqs).toEqual([]);
  });

  it('no FAQ question is duplicated across tools', () => {
    const seen = new Map();
    const duplicates = [];

    LISTED_TOOLS.forEach((tool) => {
      const content = TOOL_CONTENT[tool.slug];
      if (content?.faq) {
        content.faq.forEach(([q]) => {
          const normalized = q.trim().toLowerCase().replace(/[?.,!]/g, '');
          if (seen.has(normalized)) {
            duplicates.push({
              question: q,
              tool1: seen.get(normalized),
              tool2: tool.slug,
            });
          } else {
            seen.set(normalized, tool.slug);
          }
        });
      }
    });

    expect(duplicates, `Duplicate questions found across tools: ${JSON.stringify(duplicates)}`).toEqual([]);
  });
});

