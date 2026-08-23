/**
 * Generator for General Knowledge & Science Domain
 * Target: 700-900 nodes, 1500-2200 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateGeneralKnowledge() {
  const g = createGraphBuilder("General Knowledge", "Concept");

  // 1. Fundamental Physics Laws & Quantum Mechanics
  const physicsTheories = [
    ["Classical Mechanics", "Discipline", "FORMULATED_BY", "Isaac Newton", "PREDICTS", "Macroscopic Motion via F=ma"],
    ["Special Relativity", "Theory", "PROPOSED_BY", "Albert Einstein", "ESTABLISHES", "Equivalence of Mass and Energy via E=mc2"],
    ["General Relativity", "Theory", "DESCRIBES", "Gravity as Spacetime Curvature", "PREDICTS", "Gravitational Lensing and Black Holes"],
    ["Quantum Mechanics", "Theory", "DESCRIBES", "Wave-Particle Duality of Matter", "GOVERNED_BY", "Schrodinger Wave Equation"],
    ["Heisenberg Uncertainty Principle", "PhysicalLaw", "CONSTRAINS", "Simultaneous Precision of Position and Momentum", "FORBIDS", "Exact Deterministic Particle Trajectories"],
    ["Thermodynamics First Law", "PhysicalLaw", "STATES", "Conservation of Total Energy in Closed System", "PROHIBITS", "Perpetual Motion Machines of First Kind"],
    ["Thermodynamics Second Law", "PhysicalLaw", "STATES", "Entropy of Isolated System Always Increases", "DEFINES", "Arrow of Time and Thermal Irreversibility"],
    ["Maxwell Equations", "LawSet", "UNIFIES", "Electricity and Magnetism", "PREDICTS", "Electromagnetic Radiation at Speed of Light"],
    ["Standard Model of Particle Physics", "Framework", "CLASSIFIES", "Fundamental Fermions and Gauge Bosons", "INCLUDES", "Quarks, Leptons, and Higgs Boson"],
    ["Higgs Boson", "Particle", "MEDIATES", "Electroweak Symmetry Breaking", "CONFERS", "Inertial Mass to Fundamental Particles"],
  ];

  for (const row of physicsTheories) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in physical science.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Chemistry, Elements, Bonds & Organic Reactions
  const chemistryConcepts = [
    ["Periodic Table", "ClassificationSystem", "ORGANIZES", "Chemical Elements by Atomic Number", "STRUCTURED_INTO", "Periods and Groups"],
    ["Hydrogen", "Element", "CONTAINS", "Single Proton and Electron", "ACTS_AS", "Most Abundant Element in Universe"],
    ["Carbon", "Element", "POSSESSES", "Tetravalent Valence Electrons", "FORMS", "Backbone of All Organic Chemistry"],
    ["Oxygen", "Element", "EXHIBITS", "High Electronegativity", "DRIVES", "Cellular Respiration and Oxidation"],
    ["Silicon", "Element", "ACTS_AS", "Group 14 Semiconductor", "FORMS_BASIS_OF", "Modern Microelectronics"],
    ["Covalent Bond", "ChemicalBond", "SHARES", "Electron Pairs between Nonmetal Atoms", "CREATES", "Stable Molecules"],
    ["Ionic Bond", "ChemicalBond", "TRANSFERS", "Valence Electrons from Metal to Nonmetal", "FORMS", "Crystal Lattice Salts"],
    ["Hydrogen Bond", "IntermolecularForce", "ATTRACTS", "Dipolar Water Molecules", "EXPLAINS", "High Boiling Point and Surface Tension of Water"],
    ["Gibbs Free Energy", "ThermodynamicState", "DETERMINES", "Spontaneity of Chemical Reaction", "DRIVEN_BY", "Enthalpy and Entropy Balance (dG = dH - TdS)"],
    ["ATP (Adenosine Triphosphate)", "BioMolecule", "STORES", "High-Energy Phosphate Bonds", "ACTS_AS", "Universal Energy Currency of Living Cells"],
  ];

  for (const row of chemistryConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in chemistry.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. Astronomy, Astrophysics & Cosmology
  const astronomyConcepts = [
    ["Big Bang Theory", "CosmologyModel", "DESCRIBES", "Expansion of Universe from High-Density Singularity 13.8B Years Ago", "EVIDENCED_BY", "Cosmic Microwave Background (CMB) Radiation"],
    ["Dark Matter", "CosmicComponent", "ACCOUNTS_FOR", "27% of Universe Mass-Energy Content", "EXPLAINS", "Galactic Rotational Curve Anomalies"],
    ["Dark Energy", "CosmicComponent", "ACCOUNTS_FOR", "68% of Universe", "DRIVES", "Accelerating Metric Expansion of Space"],
    ["Supernova", "StellarEvent", "OCCURS_UPON", "Core Collapse of Massive Stars", "SYNTHESIZES", "Heavy Elements Beyond Iron via R-Process"],
    ["Black Hole", "AstrophysicalObject", "BOUNDED_BY", "Event Horizon", "POSSESSES", "Gravitational Field where Escape Velocity Exceeds Speed of Light"],
    ["Neutron Star / Pulsar", "StellarRemnant", "SUPPORTED_BY", "Neutron Degeneracy Pressure", "EXHIBITS", "Immense Magnetic Fields and Rapid Rotation"],
    ["Solar System", "PlanetarySystem", "ORBITS", "Milky Way Galactic Center", "CONTAINS", "Sun, 8 Planets, Asteroid Belt, and Kuiper Belt"],
    ["Earth", "Planet", "LOCATED_IN", "Circumstellar Habitable Goldilocks Zone", "HARBORS", "Liquid Oceans and Oxygen Atmosphere Supporting Life"],
    ["Mars", "Planet", "EXHIBITS", "Iron-Oxide Rust Surface and Olympus Mons", "INVESTIGATED_FOR", "Past Microbial Water Habitability"],
    ["Jupiter", "GasGiant", "DOMINATES", "Solar System Planetary Mass", "FEATURES", "Great Red Spot Anticyclonic Storm"],
  ];

  for (const row of astronomyConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in astronomy.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Earth Science, Geology & Climate Cycles
  const earthScience = [
    ["Plate Tectonics", "GeologicalTheory", "DESCRIBES", "Movement of Lithospheric Plates over Asthenosphere", "DRIVES", "Continental Drift, Earthquakes, and Volcanoes"],
    ["Atmosphere Layers", "PlanetarySystem", "DIVIDED_INTO", "Troposphere, Stratosphere, Mesosphere, Thermosphere, Exosphere", "PROTECTS", "Surface from Solar UV and Meteoroids"],
    ["Carbon Cycle", "BiogeochemicalCycle", "CIRCULATES", "Carbon between Atmosphere, Oceans, Biosphere, and Lithosphere", "REGULATES", "Global Planetary Climate Balance"],
    ["Hydrological Cycle", "EarthCycle", "TRANSPORTS", "Water via Evaporation, Condensation, Precipitation, and Runoff", "REPLENISHES", "Freshwater Aquifers"],
    ["Photosynthesis", "BiologicalProcess", "CONVERTS", "Carbon Dioxide and Water into Glucose and Oxygen", "POWERS", "Terrestrial and Marine Trophic Food Chains"],
  ];

  for (const row of earthScience) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in Earth system science.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 5. Biology, Genetics & Evolutionary Mechanisms
  const biologyConcepts = [
    ["DNA (Deoxyribonucleic Acid)", "Biomolecule", "ENCODES", "Genetic Instructions using A, T, C, G Nucleotides", "FORMS", "Double Helix Discovered by Watson, Crick, and Franklin"],
    ["CRISPR-Cas9", "Biotechnology", "GUIDES", "Targeted RNA-Guided Endonuclease Cleavage", "ENABLES", "Precise Genome Editing in Living Organisms"],
    ["Mitochondria", "CellOrganelle", "GENERATES", "ATP via Oxidative Phosphorylation", "ORIGINATED_VIA", "Endosymbiosis of Ancient Alphaproteobacteria"],
    ["Ribosome", "CellOrganelle", "TRANSLATES", "mRNA Codons into Polypeptide Amino Acid Chains", "CATALYZES", "Protein Synthesis"],
    ["Natural Selection", "EvolutionaryMechanism", "FAVORS", "Organisms with Advantageous Heritable Traits", "PROPOSED_BY", "Charles Darwin in 'On the Origin of Species'"],
    ["Immune System", "BiologicalSystem", "DEFENDS", "Host against Viral and Bacterial Pathogens", "COMPRISES", "Innate Macrophages and Adaptive T/B Lymphocytes"],
    ["Neuron", "CellType", "TRANSMITS", "Electrochemical Action Potentials", "COMMUNICATES_VIA", "Chemical Synapses and Neurotransmitters"],
  ];

  for (const row of biologyConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in biology.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 6. Mathematics, Calculus, Linear Algebra & Graph Theory
  const mathConcepts = [
    ["Calculus", "MathematicsBranch", "INVENTED_BY", "Isaac Newton and Gottfried Wilhelm Leibniz", "STUDIES", "Rates of Change (Derivatives) and Accumulations (Integrals)"],
    ["Linear Algebra", "MathematicsBranch", "STUDIES", "Vector Spaces, Matrices, and Linear Transformations", "FOUNDATION_OF", "Computer Graphics, Quantum Mechanics, and AI"],
    ["Eigenvalue Decomposition", "MathematicalTechnique", "FACTORS", "Square Matrix into Characteristic Eigenvectors and Scaling Factors", "POWERS", "Principal Component Analysis and Google PageRank"],
    ["Bayes' Theorem", "ProbabilityTheory", "UPDATES", "Prior Probability of Hypothesis Given Observed Evidence P(A|B)", "FOUNDATION_OF", "Bayesian Statistical Inference and Machine Learning"],
    ["Central Limit Theorem", "ProbabilityTheory", "STATES", "Sum of Independent Random Variables Converges to Normal Gaussian Distribution", "ENABLES", "Statistical Hypothesis Testing"],
    ["Graph Theory", "DiscreteMathematics", "STUDIES", "Topological Networks of Vertices and Edges", "ORIGINATED_BY", "Leonhard Euler in Seven Bridges of Konigsberg Problem"],
    ["Turing Machine", "TheoreticalComputerScience", "MODELS", "Universal Abstract Mathematical Computation", "DEFINED_BY", "Alan Turing in 1936 Halting Problem Paper"],
  ];

  for (const row of mathConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in mathematics.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 7. World History & Epochs
  const worldHistory = [
    ["Mesopotamian Civilization", "AncientEra", "PIONEERED", "Cuneiform Writing and Code of Hammurabi", "DEVELOPED_IN", "Tigris-Euphrates River Basin"],
    ["Ancient Egypt", "AncientEra", "CONSTRUCTED", "Pyramids of Giza and Sphinx", "NURTURED_BY", "Annual Nile River Inundation"],
    ["Classical Greece", "AncientEra", "BIRTHED", "Direct Athenian Democracy, Western Philosophy, and Theater", "INFLUENCED", "Hellenistic and Roman Civilizations"],
    ["Roman Empire", "AncientEra", "ESTABLISHED", "Roman Civil Law, Concrete Aqueducts, and Pax Romana", "EXPANDED_ACROSS", "Mediterranean Basin"],
    ["Islamic Golden Age (8th-14th C)", "HistoricalEra", "PRESERVED_AND_ADVANCED", "Algebra, Optics, Astronomy, and Medicine in House of Wisdom", "LED_BY", "Al-Khwarizmi, Ibn Sina, Al-Haytham, and Al-Ghazali"],
    ["European Renaissance", "HistoricalEra", "REVIVED", "Classical Humanism, Perspective Art, and Scientific Empiricism", "CATALYZED_BY", "Gutenberg Movable Type Printing Press in 1440"],
    ["Industrial Revolution", "HistoricalEra", "TRANSITIONED", "Agrarian Economy to Steam-Powered Mechanized Factories", "STARTED_IN", "18th Century Britain"],
    ["Digital Revolution / Information Age", "ModernEra", "TRANSFORMED", "Global Society via Transistors, Microprocessors, Internet, and AI", "ACCELERATED_BY", "Silicon Valley and World Wide Web"],
  ];

  for (const row of worldHistory) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} historical epoch.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
