/**
 * Generator for Culture, Anthropology & World Mythology Knowledge Graph Domain
 * Target: 600-800 nodes, 1200-1800 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateCulture() {
  const g = createGraphBuilder("Culture & Mythology", "Concept");

  // 1. Comparative World Mythologies & Pantheons
  const worldMythologies = [
    ["Prometheus", "GreekMythologyFigure", "STOLE", "Fire from Mount Olympus to Give to Humanity", "PUNISHED_BY", "Zeus via Eternal Liver Regrowth on Caucasus Rock"],
    ["Yggdrasil (The World Tree)", "NorseCosmology", "CONNECTS", "The Nine Realms (Asgard, Midgard, Helheim, Jotunheim...)", "SUSTAINS", "Cosmic Order Until the Onset of Ragnarok"],
    ["Ragnarok", "NorseEschatology", "FORETELLS", "The Twilight and Destruction of the Gods in Battle Against Surtr, Fenrir, and Jormungandr", "LEADS_TO", "Rebirth of Green New World"],
    ["The Feather of Ma'at", "EgyptianMythology", "WEIGHS", "The Human Heart Against Truth and Cosmic Balance in the Underworld Hall of Two Truths", "SUPERVISED_BY", "Anubis and Thoth"],
    ["Epic of Gilgamesh", "MesopotamianMythology", "CHRONICLES", "King of Uruk's Quest for Immortality Following the Tragic Death of Companion Enkidu", "CONSTITUTES", "Earliest Surviving Epic Literature (2100 BCE)"],
    ["The Mahabharata", "HinduEpic", "EXPLORES", "Dharma, Duty, and Kurukshetra War between Pandavas and Kauravas", "CONTAINS", "The Bhagavad Gita Dialogue between Krishna and Arjuna"],
    ["Quetzalcoatl (The Feathered Serpent)", "MesoamericanMythology", "SERVES_AS", "Creator Deity of Wind, Venus, Dawn, Priesthood, and Learning", "VENERATED_ACROSS", "Teotihuacan and Aztec Tenochtitlan"],
  ];

  for (const row of worldMythologies) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in world mythology.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Anthropological Systems, Rites of Passage & Social Frameworks
  const anthropology = [
    ["Rites of Passage (Arnold van Gennep)", "AnthropologicalConcept", "STRUCTURED_INTO", "Three Phases: Separation, Liminality, and Incorporation", "MARKS", "Transitions between Critical Social Identity Stages"],
    ["Liminality (Victor Turner)", "AnthropologicalConcept", "DESCRIBES", "Threshold State of Ambiguity, In-Betweenness, and Communitas", "EXPERIENCED_DURING", "Initiations, Pilgrimages, and Festivals"],
    ["The Gift Economy (Marcel Mauss)", "EconomicAnthropology", "ANALYZES", "Triad of Obligations: To Give, To Receive, and To Reciprocate", "FORMS", "Social Cohesion and Moral Contracts in Pre-Market Societies"],
    ["Totemism (Levi-Strauss)", "CulturalAnthropology", "STRUCTURATES", "Social Clans through Symbolic Kinship with Animal and Plant Spirits", "EXPLAINS", "Structuralist Cognitive Classification of Nature"],
    ["Oral Tradition", "CulturalTransmission", "TRANSMITS", "Mythology, History, Law, and Genealogies across Generations Without Writing", "UTILIZES", "Rhythmic Mnemonic Formulas and Epic Poetry"],
  ];

  for (const row of anthropology) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} anthropological structure.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. Cultural Festivals, Rituals & Symbolic Traditions
  const culturalFestivals = [
    ["Diwali (Festival of Lights)", "CulturalFestival", "CELEBRATES", "Triumph of Light over Darkness and Good over Evil", "OBSERVED_ACROSS", "Hindu, Jain, and Sikh Traditions via Clay Diyas and Rangoli"],
    ["Dia de los Muertos (Day of the Dead)", "CulturalFestival", "HONORS", "Deceased Ancestors via Marigold Ofrenda Altars and Sugar Skulls (Calaveras)", "ROOTED_IN", "Mexican Indigenous Aztec and Catholic Syncretism"],
    ["Lunar New Year (Spring Festival)", "CulturalFestival", "MARKS", "Turn of the Traditional Lunisolar Calendar with Dragon Dances and Red Envelopes (Hongbao)", "CELEBRATED_ACROSS", "China, Korea (Seollal), Vietnam (Tet)"],
    ["Carnival of Venice", "CulturalTradition", "FEATURES", "Intricate Commedia dell'arte Porcelain Masks (Bauta, Volto)", "ORIGINATED_AS", "Pre-Lenten Celebration Erasing Social Class Distinctions"],
    ["Hanami (Cherry Blossom Viewing)", "JapaneseCulturalTradition", "REFLECTS_ON", "Mono no Aware (The Pathos and Transient Beauty of Impermanence)", "GATHERS", "Families beneath Blooming Sakura Trees in Spring"],
    ["Ramadan & Eid al-Fitr", "IslamicTradition", "PRACTICES", "Dawn-to-Sunset Fasting (Sawm), Spiritual Self-Purification, and Charity (Zakat)", "CULMINATES_IN", "Joyous Communal Feast of Eid al-Fitr"],
  ];

  for (const row of culturalFestivals) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} global festival.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Linguistic Evolution & Language Families
  const linguistics = [
    ["Indo-European Language Family", "LinguisticFamily", "ORIGINATED_FROM", "Proto-Indo-European (PIE) in Pontic-Caspian Steppe", "SPANS", "English, Spanish, Hindi, Russian, Persian, Sanskrit, Latin, and Greek"],
    ["Sino-Tibetan Language Family", "LinguisticFamily", "COMPRISES", "Sinitic (Mandarin, Cantonese) and Tibeto-Burman Languages", "SPOKEN_BY", "Over 1.4 Billion People"],
    ["Sapir-Whorf Hypothesis (Linguistic Relativity)", "LinguisticTheory", "PROPOSES", "Structure of a Language Shapes or Influences Speakers' Worldview and Cognitive Categorization", "STUDIED_IN", "Color Perception, Spatial Orientation, and Grammar"],
    ["Cuneiform & Hieroglyphics", "AncientWritingSystem", "TRANSITIONED", "Pictographic Tokens to Phonetic Logograms", "PRESERVED", "Earliest Law, Literature, and Astronomical Records"],
  ];

  for (const row of linguistics) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} linguistic system.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
