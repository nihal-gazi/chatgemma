/**
 * Pre-loaded Default General Knowledge Graph for ChatGemma
 * Unified bundling of all 9 curated knowledge domains.
 */

import commonSenseData from "./common_sense.json" with { type: "json" };
import aiSpecializedData from "./ai_specialized.json" with { type: "json" };
import generalKnowledgeData from "./general_knowledge.json" with { type: "json" };
import electronicsData from "./electronics.json" with { type: "json" };
import artsData from "./arts.json" with { type: "json" };
import lifeLessonsData from "./life_lessons.json" with { type: "json" };
import literatureData from "./literature.json" with { type: "json" };
import philosophyData from "./philosophy.json" with { type: "json" };
import cultureData from "./culture.json" with { type: "json" };

export const KNOWLEDGE_DOMAINS = {
  COMMON_SENSE: "Common Sense",
  AI_SPECIALIZED: "Artificial Intelligence",
  GENERAL_KNOWLEDGE: "General Knowledge",
  ELECTRONICS: "Electronics",
  ARTS: "Arts & Aesthetics",
  LIFE_LESSONS: "Life Lessons & Mental Models",
  LITERATURE: "Literature & Rhetoric",
  PHILOSOPHY: "Philosophy",
  CULTURE: "Culture & Mythology",
};

export const DEFAULT_PRELOADED_DATASETS = [
  commonSenseData,
  aiSpecializedData,
  generalKnowledgeData,
  electronicsData,
  artsData,
  lifeLessonsData,
  literatureData,
  philosophyData,
  cultureData,
];

export const PRELOADED_STATS = {
  totalDomains: 9,
  totalEntities: 5682,
  totalRelations: 4597,
  domainBreakdown: {
  "common_sense": {
    "totalEntities": 1064,
    "totalRelations": 699
  },
  "ai_specialized": {
    "totalEntities": 709,
    "totalRelations": 578
  },
  "general_knowledge": {
    "totalEntities": 684,
    "totalRelations": 574
  },
  "electronics": {
    "totalEntities": 570,
    "totalRelations": 464
  },
  "arts": {
    "totalEntities": 620,
    "totalRelations": 540
  },
  "life_lessons": {
    "totalEntities": 522,
    "totalRelations": 444
  },
  "literature": {
    "totalEntities": 507,
    "totalRelations": 434
  },
  "philosophy": {
    "totalEntities": 502,
    "totalRelations": 424
  },
  "culture": {
    "totalEntities": 504,
    "totalRelations": 440
  }
},
};
