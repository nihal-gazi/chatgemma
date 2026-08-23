/**
 * Generator for Arts, Music, Architecture & Cinema Knowledge Graph Domain
 * Target: 600-800 nodes, 1200-1800 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateArts() {
  const g = createGraphBuilder("Arts & Aesthetics", "Concept");

  // 1. Visual Art Movements & Eras
  const artMovements = [
    ["Italian Renaissance", "ArtMovement", "PIONEERED", "Linear Perspective and Humanist Realism", "EPITOMIZED_BY", "Leonardo da Vinci and Michelangelo"],
    ["Baroque Art", "ArtMovement", "EXAGGERATES", "Dramatic Chiaroscuro and Dynamic Motion", "LED_BY", "Caravaggio, Rembrandt, and Bernini"],
    ["Romanticism", "ArtMovement", "EMPHASIZES", "Intense Emotion, Sublime Nature, and Individual Imagination", "REPRESENTED_BY", "Caspar David Friedrich and J.M.W. Turner"],
    ["Impressionism", "ArtMovement", "CAPTURES", "Transient Effects of Light and Open-Air (Plein Air) Brushstrokes", "FOUNDED_BY", "Claude Monet, Edgar Degas, and Pierre-Auguste Renoir"],
    ["Post-Impressionism", "ArtMovement", "EXPANDS", "Emotional Symbolism and Geometric Color Planes", "PIONEERED_BY", "Vincent van Gogh, Paul Cezanne, and Paul Gauguin"],
    ["Cubism", "ArtMovement", "DECONSTRUCTS", "Subjects into Multiple Simultaneous Viewpoints and Geometric Facets", "INVENTED_BY", "Pablo Picasso and Georges Braque"],
    ["Surrealism", "ArtMovement", "EXPLORES", "Unconscious Dream Logic, Automatism, and Psychological Juxtaposition", "CHAMPIONED_BY", "Salvador Dali, Rene Magritte, and Andre Breton"],
    ["Bauhaus", "DesignMovement", "UNIFIES", "Craftsmanship, Fine Art, and Industrial Functionalism ('Form Follows Function')", "FOUNDED_BY", "Walter Gropius in Weimar Germany"],
    ["Abstract Expressionism", "ArtMovement", "EXPRESSES", "Spontaneous Action Painting and Vast Color Fields", "LED_BY", "Jackson Pollock and Mark Rothko"],
    ["Pop Art", "ArtMovement", "APPROPRIATES", "Mass Media Imagery, Advertising, and Commercial Silk-Screening", "PIONEERED_BY", "Andy Warhol and Roy Lichtenstein"],
  ];

  for (const row of artMovements) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in visual culture.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Masterpieces and Seminal Creators
  const masterpieces = [
    ["Mona Lisa (Leonardo da Vinci)", "Artwork", "USES", "Sfumato (Smoky Soft Transitions)", "EXHIBITS", "Enigmatic Subtle Expression in Louvre Museum"],
    ["The Starry Night (Vincent van Gogh)", "Artwork", "EXPRESSES", "Turbulent Emotional Swirls via Thick Impasto Oil Technique", "PAINTED_AT", "Saint-Paul Asylum in Saint-Remy"],
    ["Guernica (Pablo Picasso)", "Artwork", "DEPICTS", "Tragic Anti-War Agony of 1937 Basque Bombing in Monochromatic Cubism", "EXHIBITED_AT", "Museo Reina Sofia in Madrid"],
    ["The Persistence of Memory (Salvador Dali)", "Artwork", "JUXTAPOSES", "Melting Pocket Watches in Barren Desert Landscape", "SYMBOLISES", "Relativity of Time and Memory"],
    ["Girl with a Pearl Earring (Johannes Vermeer)", "Artwork", "EXEMPLIFIES", "Masterful Lapis Lazuli Pigment and Intimate Domestic Lighting", "LOCATED_AT", "Mauritshuis Museum in The Hague"],
    ["The Great Wave off Kanagawa (Hokusai)", "Artwork", "PIONEERED", "Ukiyo-e Woodblock Printing with Prussian Blue Pigment", "FRAMES", "Mount Fuji Behind Looming Cresting Tsunami"],
    ["The Night Watch (Rembrandt)", "Artwork", "DISPLAYS", "Masterful Tonal Chiaroscuro and Colleague Portrait Dynamism", "RESTS_IN", "Rijksmuseum Amsterdam"],
  ];

  for (const row of masterpieces) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} visual work.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. Music Theory, Harmony, Counterpoint & Forms
  const musicTheory = [
    ["Circle of Fifths", "MusicTheoryTool", "ORGANIZES", "12 Chromatic Pitches by Ascending Fifths / Descending Fourths", "REVEALS", "Key Signatures and Harmonic Modulation Routes"],
    ["Sonata-Allegro Form", "MusicalStructure", "DIVIDED_INTO", "Exposition, Development, and Recapitulation", "GOVERNS", "Classical Symphonies by Mozart and Beethoven"],
    ["Counterpoint (Fugue)", "CompositionalTechnique", "INTERWEAVES", "Independent Melodic Voices Polyphonically Subject to Strict Harmonic Rules", "PERFECTED_BY", "Johann Sebastian Bach in The Well-Tempered Clavier"],
    ["Dominant Seventh Chord (V7)", "HarmonicStructure", "CONTAINS", "Tension-Filled Tritone Interval between 3rd and 7th", "RESOLVES_TO", "Tonic (I) Chord in Authentic Cadence"],
    ["Twelve-Tone Technique (Serialism)", "ModernComposition", "ARRANGES", "All 12 Chromatic Pitches in Strict Non-Repeating Tone Rows", "DEVELOPED_BY", "Arnold Schoenberg and Second Viennese School"],
    ["Timbre (Tone Color)", "AcousticProperty", "DISTINGUISHES", "Sound Quality between Instruments Playing Same Pitch and Loudness", "DETERMINED_BY", "Harmonic Overtones and Spectral Envelope"],
    ["Polyrhythm / Syncopation", "RhythmTechnique", "SHIFTS", "Rhythmic Accents onto Weak Beats or Juxtaposes Conflicting Meters (3:2, 4:3)", "CENTRAL_TO", "African Music, Afro-Cuban Clave, and Jazz"],
  ];

  for (const row of musicTheory) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} musicological concept.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Architecture Styles, Structural Engineering & Milestones
  const architecture = [
    ["Classical Orders (Doric, Ionic, Corinthian)", "ArchitecturalGrammar", "STANDARDIZES", "Column Proportions, Fluting, and Entablatures", "CANONIZED_IN", "Parthenon and Roman Colosseum"],
    ["Gothic Architecture", "ArchitecturalStyle", "INTRODUCED", "Flying Buttresses, Pointed Arches, and Ribbed Vaults", "ENABLES", "Soaring Heights and Expansive Stained Glass Windows in Cathedrals"],
    ["Brunelleschi's Dome (Florence Cathedral)", "EngineeringMarvel", "CONSTRUCTED", "Without Wooden Centering Framework using Herringbone Brickwork", "INAUGURATED", "Renaissance Structural Engineering in 1436"],
    ["Brutalist Architecture", "ArchitecturalStyle", "EXPOSES", "Raw Unadorned Cast-in-Place Concrete (Beton Brut) and Monumental Geometric Masses", "LED_BY", "Le Corbusier, Alison and Peter Smithson"],
    ["Deconstructivism", "ArchitecturalStyle", "FRAGMENTES", "Rectilinear Conventional Geometry into Non-Euclidean Dynamic Curves", "CHAMPIONED_BY", "Frank Gehry (Guggenheim Bilbao) and Zaha Hadid"],
  ];

  for (const row of architecture) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} architectural system.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 5. Cinema, Photography & Visual Storytelling Grammar
  const cinemaConcepts = [
    ["Mise-en-Scène", "CinematicLanguage", "ENCOMPASSES", "Everything Placed Before Camera: Lighting, Set, Costumes, and Actor Blocking", "CREATES", "Subconscious Thematic Tone and Mood"],
    ["Kuleshov Effect (Montage Theory)", "EditingPsychology", "DEMONSTRATES", "Viewers Derive More Meaning from Interaction of Two Sequential Shots than Single Shot Alone", "FOUNDATION_OF", "Soviet Montage and Modern Editing"],
    ["Three-Point Lighting", "LightingSetup", "BALANCES", "Key Light, Fill Light, and Backlight (Rim Light)", "SEPARATES", "Subject from Background with Soft Dimensionality"],
    ["German Expressionism in Cinema", "FilmMovement", "UTILIZES", "Distorted Geometries, Heavy Shadows, and Psychotic Narratives", "EXEMPLIFIED_BY", "The Cabinet of Dr. Caligari and Metropolis (1927)"],
    ["Film Noir", "CinematicGenre", "FEATURES", "High-Contrast Low-Key Lighting (Chiaroscuro), Cynical Detectives, and Femme Fatale", "FLOURISHED_IN", "1940s-1950s Post-War Hollywood"],
    ["Rule of Thirds / Golden Spiral", "CompositionPrinciple", "ALIGNS", "Focal Points along Grid Intersections and Logarithmic Curves", "MAXIMIZES", "Natural Visual Balance and Dynamism in Painting/Photo"],
  ];

  for (const row of cinemaConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} visual grammar.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
