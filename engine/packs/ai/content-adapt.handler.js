/**
 * ai/content-adapt — AI Content Adaptation
 *
 * Adapts content to target language levels using AI (OpenRouter).
 * Supports news adaptation, trending topic adaptation, and generic
 * content adaptation with vocabulary extraction and grammar notes.
 *
 * Ported from Mr-Computer/automations/argentine-spanish-bot/src/services/contentAdaptationService.js
 *
 * @module agi-graph/packs/ai/content-adapt
 */

/**
 * Simple in-memory cache
 * @type {Map<string, {data: any, timestamp: number}>}
 */
const cache = new Map();

/**
 * Simple hash for caching
 * @param {string} str
 * @returns {string}
 */
function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create adaptation prompt for AI
 * @param {string} content
 * @param {string} contentType
 * @param {string} targetLevel
 * @param {Object} options
 * @returns {string}
 */
function createAdaptationPrompt(content, contentType, targetLevel, options) {
  const typeLabels = {
    news: 'a news article',
    trending: 'a trending topic',
    general: 'educational content',
  };

  let prompt = `You are a language adaptation specialist. Adapt the following ${typeLabels[contentType] || 'content'} to ${targetLevel} level Spanish (Rioplatense dialect).\n\n`;

  prompt += `ORIGINAL CONTENT:\n${content}\n\n`;

  prompt += `REQUIREMENTS:\n`;
  prompt += `- Adapt vocabulary and grammar to ${targetLevel} level\n`;
  prompt += `- Use Rioplatense Spanish (vos instead of tú, local vocabulary)\n`;
  prompt += `- Keep the essential information\n`;
  prompt += `- Maximum 350-550 characters for the adapted text\n`;

  if (options.includeVocabulary !== false) {
    prompt += `- Extract 10 key vocabulary items with translations (es→ru)\n`;
  }
  if (options.includeGrammarNotes !== false) {
    prompt += `- Include 1-2 grammar notes relevant to the content\n`;
  }
  if (options.includeLesson !== false) {
    prompt += `- Create a micro-lesson (A1 level) inspired by the content\n`;
  }

  prompt += `\nOUTPUT FORMAT: JSON object with fields: adaptedContent, vocabulary (array of {es, ru}), grammarNotes (array of {concept, explanation}), lesson (object with title_es, focus, examples)\n`;

  return prompt;
}

/**
 * Parse structured AI response
 * @param {string} responseText
 * @returns {Object}
 */
function parseAiResponse(responseText) {
  // Try to extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch { /* fallback */ }
  }
  return { adaptedContent: responseText, vocabulary: [], grammarNotes: [] };
}

/**
 * Calculate complexity score for content
 * @param {string} content
 * @returns {number}
 */
function calculateComplexity(content) {
  const words = content.split(/\s+/);
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
  const sentenceCount = content.split(/[.!?]+/).filter(Boolean).length;
  const avgSentenceLength = words.length / sentenceCount;

  // Simple score 0-1 based on word and sentence length
  const score = Math.min(1, (avgWordLength / 10 + avgSentenceLength / 30) / 2);
  return Math.round(score * 100) / 100;
}

// ─── Handler Definition ────────────────────────────────────────────────

export default {
  type: 'ai/content-adapt',
  category: 'ai',
  icon: 'auto_fix_high',

  driver: {
    description: 'AI-powered content adaptation to target language levels with vocabulary extraction',
    inputs: [
      { name: 'content', type: 'string' },
    ],
    outputs: [
      { name: 'result', type: 'any' },
      { name: 'error', type: 'string' },
    ],
    params: {
      operation: { type: 'string', default: 'adapt', description: 'Operation: adapt | adapt-news | adapt-trending' },
      apiKey: { type: 'string', default: null, description: 'OpenRouter API key (or OPENROUTER_API_KEY env)' },
      model: { type: 'string', default: 'anthropic/claude-sonnet-4', description: 'AI model to use' },
      targetLevel: { type: 'string', default: 'A1', description: 'Target language level (A1, A2, B1, B2)' },
      // Content metadata
      title: { type: 'string', default: null, description: 'Content title (for news/trending)' },
      sourceUrl: { type: 'string', default: null, description: 'Source URL' },
      // Options
      includeVocabulary: { type: 'boolean', default: true, description: 'Include vocabulary extraction' },
      includeGrammarNotes: { type: 'boolean', default: true, description: 'Include grammar notes' },
      includeLesson: { type: 'boolean', default: true, description: 'Include micro-lesson' },
      // Rate limiting
      maxRetries: { type: 'int', default: 3, description: 'Maximum retry attempts' },
    },
  },

  lifecycle: {
    validate: (inputs, params) => {
      if (typeof inputs.content !== 'string' || inputs.content.length === 0) return false;
      const apiKey = params.apiKey || process.env.OPENROUTER_API_KEY;
      if (!apiKey) return false;
      return true;
    },

    cacheKey: (inputs, params) => {
      return `content-adapt:${params.operation}:${params.targetLevel}:${hashStr(inputs.content.slice(0, 200))}`;
    },

    execute: async (inputs, params) => {
      const { content } = inputs;
      const { operation, model, targetLevel, maxRetries } = params;
      const apiKey = params.apiKey || process.env.OPENROUTER_API_KEY;

      try {
        // Check cache
        const cacheKey = `${operation}:${hashStr(content.slice(0, 200))}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 3600000) {
          return { result: { ...cached.data, cached: true } };
        }

        // Determine content type
        const contentType = operation === 'adapt-news' ? 'news'
          : operation === 'adapt-trending' ? 'trending'
            : 'general';

        const fullContent = params.title
          ? `Title: ${params.title}\n\n${content}`
          : content;

        const prompt = createAdaptationPrompt(fullContent, contentType, targetLevel, {
          includeVocabulary: params.includeVocabulary,
          includeGrammarNotes: params.includeGrammarNotes,
          includeLesson: params.includeLesson,
        });

        // Make API request with retry
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
              }),
            });

            if (!response.ok) {
              lastError = `API error: HTTP ${response.status}`;
              if (attempt < maxRetries - 1) {
                await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                continue;
              }
              return { error: lastError };
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || '';

            const parsed = parseAiResponse(aiResponse);
            const complexity = calculateComplexity(content);

            const result = {
              original: content,
              adapted: parsed,
              contentType,
              targetLevel,
              complexity,
              model,
              sourceUrl: params.sourceUrl,
            };

            // Update cache
            cache.set(cacheKey, { data: result, timestamp: Date.now() });

            return { result };
          } catch (err) {
            lastError = err.message;
            if (attempt < maxRetries - 1) {
              await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
            }
          }
        }

        return { error: `content-adapt failed after ${maxRetries} attempts: ${lastError}` };
      } catch (err) {
        return { error: `content-adapt ${operation} failed: ${err.message}` };
      }
    },
  },
};
