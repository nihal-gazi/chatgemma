/**
 * Generator for Philosophy & Epistemology Knowledge Graph Domain
 * Target: 600-800 nodes, 1200-1800 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generatePhilosophy() {
  const g = createGraphBuilder("Philosophy", "Concept");

  // 1. Classical Ancient Philosophy & Foundations
  const ancientPhilosophy = [
    ["Socrates", "Philosopher", "PIONEERED", "Socratic Method (Elenchus Dialogue)", "FAMOUSLY_STATED", "'The Unexamined Life is Not Worth Living'"],
    ["Plato", "Philosopher", "PROPOSED", "Theory of Forms (Ideal Realm vs Shadow World)", "AUTHORED", "The Republic and Allegory of the Cave"],
    ["Aristotle", "Philosopher", "FORMULATED", "Four Causes (Material, Formal, Efficient, Final Teleology)", "FOUNDED", "Virtue Ethics and Syllogistic Deductive Logic"],
    ["Heraclitus", "PresocraticPhilosopher", "CHAMPIONED", "Doctrine of Eternal Flux and Logos ('You Cannot Step into the Same River Twice')", "EMPHASIZED", "Unity of Opposites"],
    ["Parmenides", "PresocraticPhilosopher", "ARGued", "Change is an Illusion and True Being is Indivisible, Timeless, and Static", "FOUNDATION_OF", "Western Monistic Metaphysics"],
    ["Epicureanism", "HellenisticSchool", "ADVOCATED", "Ataraxia (Tranquility) via Modest Pleasure and Freedom from Superstitious Fear", "FOUNDED_BY", "Epicurus"],
    ["Stoicism", "HellenisticSchool", "TAUGHT", "Living in Accordance with Nature and Cardinal Virtues (Wisdom, Courage, Justice, Temperance)", "LED_BY", "Zeno of Citium, Seneca, Epictetus, and Marcus Aurelius"],
  ];

  for (const row of ancientPhilosophy) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in classical philosophy.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Islamic Golden Age & Scholastic Treatises (Featuring Al-Ghazali & Ibn Rushd)
  const islamicScholastic = [
    ["Al-Ghazali", "IslamicPhilosopherTheologian", "AUTHORED", "Tafahut al-Falasifah (The Incoherence of the Philosophers)", "CRITIQUED", "Limits of Pure Aristotelian Rationalism in Metaphysics"],
    ["Tafahut al-Falasifah", "PhilosophicalTreatise", "ARTICULATES", "Occasionalist Epistemology and Skepticism of Inherent Physical Causality", "DEMONSTRATED", "Cotton Burning Next to Fire is Caused by Divine Will Not Intrinsic Fire Agency"],
    ["Ibn Rushd (Averroes)", "IslamicPhilosopher", "AUTHORED", "Tafahut al-Tafahut (The Incoherence of the Incoherence)", "DEFENDED", "Aristotelian Logic, Demonstrative Proof, and Harmonization of Reason and Revelation"],
    ["Ibn Sina (Avicenna)", "IslamicPhilosopherPolymath", "DEVISED", "Floating Man Thought Experiment", "AUTHORED", "The Book of Healing and The Canon of Medicine"],
    ["Al-Farabi (The Second Teacher)", "IslamicPhilosopher", "SYNTHESIZED", "Platonic Political Philosophy with Aristotelian Logic", "CONCEPTUALIZED", "The Virtuous City (Al-Madina al-Fadila)"],
    ["Thomas Aquinas", "ScholasticPhilosopher", "SYNTHESIZED", "Christian Theology with Aristotelian Metaphysics", "FORMULATED", "Five Proofs for the Existence of God (Quinque Viae) in Summa Theologiae"],
  ];

  for (const row of islamicScholastic) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} scholastic philosophy.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // Cross-link Al-Ghazali and Philosophy of Science
  g.addRelation("Al-Ghazali", "PREFIGURED", "David Hume's Problem of Induction", "Both demonstrated that regular conjunction of events does not logically prove necessary causal connection.");
  g.addRelation("Tafahut al-Falasifah", "INFLUENCED", "Skeptical Epistemology", "Demonstrated the vulnerability of overly rigid deductive metaphysical dogmas.");

  // 3. Early Modern Philosophy & Enlightenment Epistemology
  const earlyModern = [
    ["Rene Descartes", "RationalistPhilosopher", "INAUGURATED", "Modern Philosophy via Methodological Doubt ('Cogito, Ergo Sum')", "PROPOSED", "Cartesian Substance Dualism (Res Cogitans vs Res Extensa)"],
    ["Baruch Spinoza", "RationalistPhilosopher", "DEVELOPED", "Monistic Pantheism (Deus sive Natura - God or Nature as One Substance)", "EXPOUNDED_IN", "Ethics Demonstrated in Geometrical Order"],
    ["John Locke", "EmpiricistPhilosopher", "PROPOSED", "Tabula Rasa (Mind as a Blank Slate at Birth)", "FOUNDED", "Classical Political Liberalism and Social Contract"],
    ["David Hume", "EmpiricistPhilosopher", "DEMONSTRATED", "The Problem of Induction and The Is-Ought Guillotine", "AUTHORED", "A Treatise of Human Nature"],
    ["Immanuel Kant", "TranscendentalPhilosopher", "SYNTHESIZED", "Rationalism and Empiricism via Critique of Pure Reason", "FORMULATED", "The Categorical Imperative in Deontological Ethics"],
    ["G.W.F. Hegel", "IdealistPhilosopher", "DEVELOPED", "Dialectical Idealism (Thesis-Antithesis-Synthesis) and Absolute Spirit", "INFLUENCED", "Marxist Historical Materialism"],
  ];

  for (const row of earlyModern) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} early modern philosophy.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. 19th & 20th Century Existentialism, Pragmatism & Analytic Philosophy
  const modernPhilosophy = [
    ["Friedrich Nietzsche", "Philosopher", "PROCLAIMED", "The Death of God and The Will to Power", "INTRODUCED", "The Ubermensch (Overman) and Eternal Recurrence"],
    ["Soren Kierkegaard", "ExistentialistPhilosopher", "EXPLORED", "Angst, Despair, and The Leap of Faith", "FATHER_OF", "Christian Existentialism in 'Fear and Trembling'"],
    ["Jean-Paul Sartre", "ExistentialistPhilosopher", "ASSERTS", "'Existence Precedes Essence' and Humans are 'Condemned to be Free'", "AUTHORED", "Being and Nothingness (1943)"],
    ["Albert Camus", "AbsurdistPhilosopher", "ADDRESSED", "The Conflict between Human Desire for Meaning and Cold Silent Universe", "CONCLUDED", "In 'The Myth of Sisyphus': 'One must imagine Sisyphus happy'"],
    ["Ludwig Wittgenstein", "AnalyticPhilosopher", "TRANSFORMED", "Philosophy of Language in Tractatus Logico-Philosophicus and Philosophical Investigations", "STATED", "'Whereof one cannot speak, thereof one must be silent'"],
    ["Karl Popper", "PhilosopherOfScience", "ESTABLISHED", "Falsifiability Criterion for Scientific Demarcation", "CRITIQUED", "Authoritarian Historicism in 'The Open Society and Its Enemies'"],
    ["John Rawls", "PoliticalPhilosopher", "CONCEIVED", "The Veil of Ignorance and Original Position in 'A Theory of Justice'", "ESTABLISHED", "Justice as Fairness and Maximin Distribution"],
  ];

  for (const row of modernPhilosophy) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} modern philosophy.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 5. Eastern & Asian Philosophical Traditions
  const easternTraditions = [
    ["Advaita Vedanta (Adi Shankara)", "HinduPhilosophy", "ESTABLISHES", "Non-Duality between Atman (Individual Self) and Brahman (Ultimate Reality)", "REVEALS", "Maya (Illusion of Separation)"],
    ["Buddhism (Siddhartha Gautama)", "PhilosophicalTradition", "FOUNDED_ON", "Four Noble Truths and Noble Eightfold Path", "DISCLOSES", "Anatta (Non-Self), Anicca (Impermanence), and Dukkha (Suffering)"],
    ["Pratityasamutpada (Dependent Origination)", "BuddhistMetaphysics", "EXPLAINS", "All Phenomena Arise in Mutual Interdependence Without Independent Eternal Essence", "CENTRAL_TO", "Nagarjuna's Madhyamaka Emptiness (Sunyata)"],
    ["Taoism (Laozi / Zhuangzi)", "ChinesePhilosophy", "CHAMPIONS", "Wu Wei (Effortless Action in Harmony with Tao / The Way)", "EXPRESSED_IN", "Tao Te Ching and Zhuangzi Parables"],
    ["Confucianism (Confucius)", "EthicalPhilosophy", "EMPHASIZES", "Ren (Benevolence), Li (Ritual Propriety), and Xiao (Filial Piety)", "ORCHESTRATED", "Social Harmony and Governance in Imperial China"],
  ];

  for (const row of easternTraditions) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} Eastern tradition.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
