/**
 * search-engine.js
 * Offline Search Engine & Relevance Matcher.
 * Retrieves factual context, chapters, and page citations without external APIs or internet.
 * Designed modularly so a local LLM/ONNX runtime can easily replace or augment it.
 */

const SearchEngine = (() => {
  const SCORE_THRESHOLD = 0.25;
  const Utils = typeof window !== 'undefined' && window.Utils ? window.Utils : (typeof require !== 'undefined' ? require('./utils.js') : null);

  /**
   * Search within a module for the best answering paragraph/section.
   * @param {Object} module The active module object
   * @param {string} query The user question
   * @returns {Object} { found: boolean, text: string, source: string, confidence: number }
   */
  function searchModule(module, query) {
    if (!module || !query) {
      return {
        found: false,
        text: 'Silakan pilih modul pembelajaran dan ketik pertanyaan yang ingin kamu tanyakan.',
        source: null,
        confidence: 0
      };
    }

    const trimmedQuery = query.trim();
    const queryNorm = Utils.normalizeText(trimmedQuery);
    const queryKeywords = Utils.extractKeywords(trimmedQuery);

    // 1. Check for summary intent
    const isSummaryIntent = /^(rangkum|ringkas|rangkuman|ringkasan|kesimpulan|ikhtisar|inti\s+materi)/i.test(trimmedQuery) ||
      (queryKeywords.length === 1 && ['rangkum', 'ringkas', 'rangkuman', 'ringkasan'].includes(queryKeywords[0]));

    if (isSummaryIntent) {
      return {
        found: true,
        text: module.summary || 'Rangkuman materi untuk modul ini belum dikompilasi.',
        source: `${module.displayName} - Rangkuman Inti`,
        confidence: 1.0,
        isSummary: true
      };
    }

    if (queryKeywords.length === 0) {
      return {
        found: false,
        text: `Pertanyaanmu terlalu singkat atau tidak mengandung kata kunci yang spesifik. Coba ketik pertanyaan yang lebih lengkap mengenai ${module.displayName}.`,
        source: null,
        confidence: 0
      };
    }

    // 2. Score sections / paragraphs
    const sections = module.sections || [];
    let bestScore = 0;
    let bestSection = null;

    for (const section of sections) {
      const score = calculateRelevance(queryNorm, queryKeywords, section);
      if (score > bestScore) {
        bestScore = score;
        bestSection = section;
      }
    }

    // Check if score satisfies threshold
    if (bestSection && bestScore >= SCORE_THRESHOLD) {
      // Format citation nicely: e.g. "Sumber: Modul_02_Biologi... - Bab 3, Hal. 14"
      const babStr = bestSection.bab ? `${bestSection.bab}` : '';
      const halStr = bestSection.hal ? `Hal. ${bestSection.hal}` : '';
      let sourceTag = module.displayName;
      if (babStr && halStr) {
        sourceTag += ` - ${babStr}, ${halStr}`;
      } else if (babStr) {
        sourceTag += ` - ${babStr}`;
      } else if (halStr) {
        sourceTag += ` - ${halStr}`;
      }

      return {
        found: true,
        text: bestSection.content,
        source: sourceTag,
        confidence: bestScore
      };
    }

    // Also check general chapters / summary as a secondary fallback if query matches chapter titles
    if (module.chapters && module.chapters.length > 0) {
      for (const ch of module.chapters) {
        const chNorm = Utils.normalizeText(ch.title);
        const matchCount = queryKeywords.filter(k => chNorm.includes(k)).length;
        if (matchCount >= 2 || (queryKeywords.length === 1 && chNorm.includes(queryKeywords[0]))) {
          return {
            found: true,
            text: `Topik ini dibahas pada Bab ${ch.num}: "${ch.title}" (Halaman ${ch.page}). Silakan ajukan pertanyaan yang lebih terperinci mengenai bahasan tersebut.`,
            source: `${module.displayName} - Bab ${ch.num}, Hal. ${ch.page}`,
            confidence: 0.5
          };
        }
      }
    }

    // Strict non-hallucination requirement:
    // If not found in module, respond clearly that information is not available in the module.
    return {
      found: false,
      text: `Maaf, informasi mengenai "${trimmedQuery}" belum tersedia dalam materi ${module.fullName || module.displayName}. Coba tanyakan konsep lain yang tercakup dalam modul ini.`,
      source: null,
      confidence: bestScore
    };
  }

  /**
   * Relevance scoring algorithm combining exact phrase match, keyword overlap,
   * topic title weight, and Dice coefficient.
   */
  function calculateRelevance(queryNorm, queryKeywords, section) {
    let score = 0;
    const contentNorm = Utils.normalizeText(section.content);
    const topicNorm = Utils.normalizeText(section.topic || '');
    const sectionKeywords = section.keywords || [];

    // Exact phrase matching in content
    if (contentNorm.includes(queryNorm)) {
      score += 2.0;
    }

    // Match keywords against content
    let keywordHits = 0;
    queryKeywords.forEach(kw => {
      // Content check
      if (contentNorm.includes(kw)) {
        keywordHits += 1.0;
      }
      // Topic title bonus
      if (topicNorm.includes(kw)) {
        keywordHits += 1.5;
      }
      // Section metadata keywords bonus
      if (sectionKeywords.some(sk => sk.toLowerCase().includes(kw) || kw.includes(sk.toLowerCase()))) {
        keywordHits += 1.2;
      }
    });

    // If no keywords matched and phrase did not match, return 0 to prevent false positives
    if (keywordHits === 0 && !contentNorm.includes(queryNorm)) {
      return 0;
    }

    const keywordRatio = keywordHits / (queryKeywords.length * 1.5);
    score += keywordRatio * 1.5;

    // Fuzzy bigram similarity with topic
    const topicSimilarity = Utils.diceCoefficient(queryNorm, topicNorm);
    score += topicSimilarity * 1.0;

    return score;
  }

  return {
    searchModule,
    calculateRelevance,
    SCORE_THRESHOLD
  };
})();

if (typeof window !== 'undefined') {
  window.SearchEngine = SearchEngine;
}
if (typeof module !== 'undefined') {
  module.exports = SearchEngine;
}
