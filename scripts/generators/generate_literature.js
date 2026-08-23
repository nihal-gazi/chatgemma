/**
 * Generator for Literature, Narrative Tropes & Rhetoric Knowledge Graph Domain
 * Target: 600-800 nodes, 1200-1800 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateLiterature() {
  const g = createGraphBuilder("Literature & Rhetoric", "Concept");

  // 1. Narrative Architecture & Story Structures
  const narrativeStructures = [
    ["The Hero's Journey (Monomyth / Campbell)", "NarrativeFramework", "TRACES", "Protagonist from Ordinary World to Abyss and Return Transformed", "POPULARIZED_BY", "Joseph Campbell in 'The Hero with a Thousand Faces'"],
    ["Freytag's Pyramid", "DramaticStructure", "MAPS", "Exposition, Inciting Incident, Rising Action, Climax, Falling Action, and Denouement", "GOVERNS", "Classic 5-Act Dramatic Plays"],
    ["Three-Act Structure", "ScreenwritingModel", "DIVIDES", "Setup (25%), Confrontation (50%), and Resolution (25%)", "PUNCTUATED_BY", "Plot Points 1 and 2 and Midpoint Shift"],
    ["In Medias Res", "NarrativeTechnique", "OPENS", "Story in the Middle of Action Prior to Exposition", "EMPLOYED_IN", "Homer's Iliad and Epic Poetry"],
    ["The Dan Harmon Story Circle", "NarrativeFramework", "CONDENSES", "Hero's Journey into 8 Rhythmic Human Beats: You, Need, Go, Search, Find, Take, Return, Change", "USED_IN", "Modern TV and Episodic Writing"],
  ];

  for (const row of narrativeStructures) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} storytelling model.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Narrative Devices, Literary Tropes & Plots
  const literaryDevices = [
    ["Chekhov's Gun", "DramaturgicalPrinciple", "MANDATES", "Every Element Introduced (like a Gun on the Wall) Must Serve Inevitable Plot Purpose", "FORMULATED_BY", "Anton Chekhov"],
    ["Unreliable Narrator", "PointOfViewDevice", "COMPROMISES", "Truth of Story Due to Narrator's Madness, Deception, Bias, or Naivety", "EXEMPLIFIED_IN", "Nabokov's 'Pale Fire' and Agatha Christie's 'Roger Ackroyd'"],
    ["The Red Herring", "PlotDevice", "MISLEADS", "Audience and Investigators toward False Clues and Dead Ends", "ESSENTIAL_TO", "Mystery and Thriller Fiction"],
    ["Dramatic Irony", "RhetoricalDevice", "OCCURS_WHEN", "Audience Knows Critical Truth that Characters Remain Ignorant Of", "CREATES", "Suspense and Tragic Anticipation (e.g. Oedipus Rex)"],
    ["Deus Ex Machina", "PlotDevice", "RESOLVES", "Seemingly Hopeless Conflict via Abrupt Unearned Divine/External Intervention", "CRITIQUED_AS", "Weak Narrative Contrivance"],
    ["Stream of Consciousness", "LiteraryTechnique", "RENDERS", "Unfiltered Flow of Interior Monologue, Sensation, and Wandering Thought", "PIONEERED_BY", "James Joyce and Virginia Woolf"],
    ["The MacGuffin", "PlotDevice", "DRIVES", "Protagonist Motivation and Conflict While Being Inherently Arbitrary", "COINED_BY", "Alfred Hitchcock"],
    ["The Rashomon Effect", "NarrativeStructure", "PRESENTS", "Same Central Event from Conflicting Contradictory Subjective Eyewitness Perspectives", "ORIGINATED_IN", "Akira Kurosawa's 'Rashomon' (Ryunosuke Akutagawa's Stories)"],
  ];

  for (const row of literaryDevices) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} narrative device.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. World Literary Canon & Seminal Masterpieces
  const literaryClassics = [
    ["The Iliad & The Odyssey (Homer)", "EpicPoem", "EXPLORES", "Wrath of Achilles and Odysseus's 10-Year Nostos Return to Ithaca", "FOUNDATION_OF", "Western Literary Tradition"],
    ["The Divine Comedy (Dante Alighieri)", "EpicPoem", "JOURNEYS", "Through Inferno, Purgatorio, and Paradiso in Terza Rima", "ESTABLISHED", "Tuscan Dialect as Standard Italian"],
    ["Don Quixote (Miguel de Cervantes)", "PicaresqueNovel", "SATIRIZES", "Chivalric Romances through Deluded Knight and Sancho Panza", "RECOGNIZED_AS", "First Modern European Novel (1605)"],
    ["Hamlet (William Shakespeare)", "Tragedy", "DELIBERATES", "Existential Inaction and Revenge Soliloquy ('To be or not to be')", "REPRESENTS", "Peak Elizabethan Tragedy in 1601"],
    ["Crime and Punishment (Fyodor Dostoevsky)", "PsychologicalNovel", "ANATOMIZES", "Raskolnikov's Utilitarian Guilt and Spiritual Redemption in St. Petersburg", "CRITIQUES", "Rationalist Extraordinary-Man Theory"],
    ["War and Peace (Leo Tolstoy)", "EpicNovel", "INTERWEAVES", "Napoleonic Invasion of Russia with Historic Determinism and Aristocratic Lives", "EXEMPLIFIES", "Russian Literary Realism"],
    ["The Metamorphosis (Franz Kafka)", "ModernistNovella", "DEPICTS", "Gregor Samsa Waking Up Transformed into a Monstrous Vermin", "COINED", "The Term 'Kafkaesque' for Alienating Absurdity"],
    ["Ulysses (James Joyce)", "ModernistNovel", "PARALLELS", "Homeric Odyssey in Single Day (June 16, 1904) in Dublin", "EXPANDED", "Modernist Linguistic Horizon and Interiority"],
    ["One Hundred Years of Solitude (Gabriel Garcia Marquez)", "MagicalRealism", "CHRONICLES", "Seven Generations of Buendia Family in Macondo", "POPULARIZED", "Latin American Magical Realism Boom"],
    ["1984 (George Orwell)", "DystopianNovel", "WARNS_AGAINST", "Totalitarian Surveillance, Thoughtcrime, and Newspeak Language Degradation", "COINED", "'Big Brother is Watching You'"],
    ["Frankenstein (Mary Shelley)", "GothicSciFi", "WARNS_AGAINST", "Unfettered Scientific Hubris and Abused Created Consciousness", "INAUGURATED", "Modern Science Fiction in 1818"],
  ];

  for (const row of literaryClassics) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} literary classic.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Rhetoric, Poetics & Figurative Language
  const rhetoricConcepts = [
    ["Metaphor", "FigurativeLanguage", "ASSERTS", "Direct Non-Literal Identity between Two Concepts ('Time is a Thief')", "CREATES", "Deep Cognitive Conceptual Transfer"],
    ["Simile", "FigurativeLanguage", "COMPARES", "Two Explicitly Dissimilar Things using 'Like' or 'As'", "ILLUMINATES", "Surprising Shared Resonance"],
    ["Synecdoche", "Trope", "USES", "A Part to Represent the Whole ('All Hands on Deck')", "DISTINGUISHED_FROM", "Metonymy"],
    ["Metonymy", "Trope", "SUBSTITUTES", "An Associated Attribute for the Entity ('The Pen is Mightier than the Sword')", "CONDENSES", "Complex Symbolic Institutions"],
    ["Allegory", "NarrativeForm", "EXTENDS", "Metaphorical Narrative Where Characters and Events Embody Abstract Moral/Political Ideas", "EXEMPLIFIED_IN", "Plato's Cave and Orwell's Animal Farm"],
    ["Iambic Pentameter", "PoeticMeter", "CONSISTS_OF", "Five Metric Feet of Unstressed followed by Stressed Syllables (da-DUM da-DUM)", "HEART_OF", "Shakespearean Sonnets and Blank Verse"],
  ];

  for (const row of rhetoricConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} rhetorical device.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
