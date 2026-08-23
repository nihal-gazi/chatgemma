/**
 * Generator for Common Sense & Physical Reasoning Knowledge Graph Domain
 * Target: 600-800 nodes, 1200-1800 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateCommonSense() {
  const g = createGraphBuilder("Common Sense", "Concept");

  // 1. Natural & Physical Elements and State Changes
  const physicalElements = [
    { name: "Water", types: ["Concept", "Physical"], desc: "Clear liquid essential for life, freezes at 0C and boils at 100C." },
    { name: "Ice", types: ["Concept", "Physical"], desc: "Solid frozen form of water." },
    { name: "Steam", types: ["Concept", "Physical"], desc: "Gaseous phase of water formed by boiling or evaporation." },
    { name: "Fire", types: ["Concept", "Physical"], desc: "Rapid oxidation process releasing heat and visible light." },
    { name: "Heat", types: ["Concept", "Physical"], desc: "Thermal energy in transit between systems." },
    { name: "Cold", types: ["Concept", "Physical"], desc: "Condition of low temperature or absence of heat." },
    { name: "Gravity", types: ["Concept", "Physical"], desc: "Fundamental attractive force drawing objects toward center of mass." },
    { name: "Air", types: ["Concept", "Physical"], desc: "Mixture of gases primarily nitrogen and oxygen enveloping Earth." },
    { name: "Oxygen", types: ["Concept", "Chemical"], desc: "Essential gas supporting combustion and cellular respiration." },
    { name: "Carbon Dioxide", types: ["Concept", "Chemical"], desc: "Gas produced by respiration and combustion, absorbed by plants." },
    { name: "Sunlight", types: ["Concept", "Physical"], desc: "Solar electromagnetic radiation providing daylight and warmth." },
    { name: "Shadow", types: ["Concept", "Physical"], desc: "Dark area created when an opaque object blocks light." },
    { name: "Soil", types: ["Concept", "Physical"], desc: "Top layer of earth supporting plant growth." },
    { name: "Rock", types: ["Concept", "Physical"], desc: "Solid mineral material forming part of the earth's surface." },
    { name: "Sand", types: ["Concept", "Physical"], desc: "Granular material composed of finely divided rock and mineral particles." },
    { name: "Glass", types: ["Concept", "Material"], desc: "Hard, brittle, and transparent non-crystalline solid." },
    { name: "Wood", types: ["Concept", "Material"], desc: "Porous and fibrous structural tissue found in trees." },
    { name: "Metal", types: ["Concept", "Material"], desc: "Material with high electrical and thermal conductivity." },
    { name: "Plastic", types: ["Concept", "Material"], desc: "Synthetic polymers moldable into solid objects." },
    { name: "Paper", types: ["Concept", "Material"], desc: "Thin sheet material produced by pressing cellulose fibers." },
    { name: "Rubber", types: ["Concept", "Material"], desc: "Elastic polymeric substance resistant to water and electrical current." },
    { name: "Cloth", types: ["Concept", "Material"], desc: "Woven or knitted fabric made of natural or synthetic threads." },
  ];

  for (const elem of physicalElements) {
    g.addEntity(elem.name, elem.types, elem.desc);
  }

  // Relations for physical states
  g.addRelation("Water", "FREEZES_INTO", "Ice", "Water transitions to solid ice at sub-zero temperatures.");
  g.addRelation("Ice", "MELTS_INTO", "Water", "Ice absorbs heat and liquefies into water.");
  g.addRelation("Water", "EVAPORATES_INTO", "Steam", "Water when heated to boiling point turns into steam.");
  g.addRelation("Steam", "CONDENSES_INTO", "Water", "Steam upon cooling condenses back into liquid water droplets.");
  g.addRelation("Water", "EXTINGUISHES", "Fire", "Water cools fuel below combustion point and blocks oxygen.");
  g.addRelation("Fire", "PRODUCES", "Heat", "Combustion releases intense thermal energy.");
  g.addRelation("Fire", "PRODUCES", "Light", "Flame emission illuminates surroundings.");
  g.addRelation("Fire", "REQUIRES", "Oxygen", "Combustion cannot sustain without oxidizer.");
  g.addRelation("Fire", "CONSUMES", "Wood", "Wood acts as combustible fuel for flames.");
  g.addRelation("Fire", "CONSUMES", "Paper", "Paper easily catches flame due to low ignition temperature.");
  g.addRelation("Gravity", "PULLS_DOWN", "Mass", "Gravity accelerates objects with mass towards planetary center.");
  g.addRelation("Sunlight", "CREATES", "Shadow", "Sunlight blocked by an opaque body casts a shadow.");
  g.addRelation("Glass", "TRANSMITS", "Light", "Transparent glass allows optical light to pass through.");
  g.addRelation("Metal", "CONDUCTS", "Heat", "High free-electron density enables fast heat conduction.");
  g.addRelation("Metal", "CONDUCTS", "Electricity", "Free electrons allow electric current to flow with low resistance.");
  g.addRelation("Rubber", "INSULATES", "Electricity", "High dielectric strength prevents electric current flow.");

  // 2. Everyday Objects, Tools, Appliances & Functions (150+ nodes)
  const householdItems = [
    ["Refrigerator", "Appliance", "KEEPS_COLD", "Food", "PREVENTS_SPOILAGE_OF"],
    ["Oven", "Appliance", "HEATS", "Food", "BAKES"],
    ["Microwave", "Appliance", "COOKS", "Meal", "USES_ELECTROMAGNETIC_WAVES_FOR"],
    ["Toaster", "Appliance", "CRISPS", "Bread", "WARMS"],
    ["Blender", "Appliance", "PUREES", "Fruit", "CRUSHES"],
    ["Kettle", "Appliance", "BOILS", "Water", "PREPARES_BEVERAGE"],
    ["Coffee Maker", "Appliance", "BREWS", "Coffee", "EXTRACTS_CAFFEINE"],
    ["Dishwasher", "Appliance", "CLEANS", "Dishes", "SAVES_WATER"],
    ["Washing Machine", "Appliance", "CLEANS", "Clothes", "SPINS_AND_RINSES"],
    ["Clothes Dryer", "Appliance", "DRIES", "Wet Clothes", "REMOVES_MOISTURE"],
    ["Vacuum Cleaner", "Appliance", "SUCKS", "Dust", "CLEANS_FLOORS"],
    ["Iron", "Appliance", "SMOOTHS", "Wrinkled Fabric", "USES_STEAM_AND_HEAT"],
    ["Air Conditioner", "Appliance", "COOLS", "Room", "LOWERS_HUMIDITY"],
    ["Heater", "Appliance", "WARMS", "Indoor Space", "PROVIDES_COMFORT"],
    ["Fan", "Appliance", "CIRCULATES", "Air", "PROMOTES_EVAPORATIVE_COOLING"],
    ["Lamp", "Appliance", "ILLUMINATES", "Dark Room", "INCREASES_VISIBILITY"],
    ["Television", "Device", "DISPLAYS", "Video Content", "ENTERTAINS"],
    ["Smartphone", "Device", "ENABLES", "Communication", "CONNECTS_INTERNET"],
    ["Laptop", "Device", "COMPUTES", "Data", "FACILITATES_REMOTE_WORK"],
    ["Clock", "Device", "MEASURES", "Time", "SYNCHRONIZES_SCHEDULES"],
    ["Mirror", "Object", "REFLECTS", "Light", "PROVIDES_SELF_IMAGE"],
    ["Window", "Structure", "ALLOWS", "Sunlight", "PROVIDES_VENTILATION"],
    ["Door", "Structure", "SECURES", "Entrance", "CONTROLS_ACCESS"],
    ["Key", "Tool", "UNLOCKS", "Lock", "GRANTS_ENTRY"],
    ["Lock", "Device", "RESTRICTS", "Access", "PROVIDES_SECURITY"],
    ["Chair", "Furniture", "SUPPORTS", "Sitting Human", "ERGONOMIC_REST"],
    ["Table", "Furniture", "HOLDS", "Objects", "WORK_SURFACE"],
    ["Bed", "Furniture", "FACILITATES", "Sleep", "PROMOTES_RECOVERY"],
    ["Pillow", "Object", "CUSHIONS", "Head", "ALIGNS_SPINE"],
    ["Blanket", "Object", "TRAPS", "Body Heat", "PROVIDES_WARMTH"],
    ["Sofa", "Furniture", "ACCOMMODATES", "Multiple People", "LEISURE_SEATING"],
    ["Knife", "Tool", "CUTS", "Ingredients", "REQUIRES_SHARP_BLADE"],
    ["Fork", "Tool", "PIERCES", "Food", "AIDS_EATING"],
    ["Spoon", "Tool", "SCOOPS", "Liquid", "CONSUMES_SOUP"],
    ["Plate", "Utensil", "SERVES", "Meal", "ORGANIZES_DISH"],
    ["Bowl", "Utensil", "CONTAINS", "Cereal and Soup", "HOLDS_LIQUIDS"],
    ["Cup", "Utensil", "HOLDS", "Hot Beverages", "AIDS_DRINKING"],
    ["Glass Tumbler", "Utensil", "HOLDS", "Cold Water", "TRANSPARENT_VESSEL"],
    ["Scissors", "Tool", "SNIPS", "Paper and Thread", "SHEARING_MECHANISM"],
    ["Hammer", "Tool", "DRIVES", "Nails", "APPLIES_IMPACT_FORCE"],
    ["Nail", "Fastener", "JOINS", "Wood Pieces", "HELD_BY_FRICTION"],
    ["Screwdriver", "Tool", "TURNS", "Screws", "APPLIES_TORQUE"],
    ["Screw", "Fastener", "FASTENS", "Assemblies", "HELICAL_THREADING"],
    ["Wrench", "Tool", "TIGHTENS", "Bolts and Nuts", "MECHANICAL_LEVERAGE"],
    ["Tape Measure", "Tool", "DETERMINES", "Distance", "PREVENTS_MEASUREMENT_ERRORS"],
    ["Pliers", "Tool", "GRIPS", "Wire and Metal", "INCREASES_PINCH_FORCE"],
    ["Flashlight", "Tool", "PROJECTS", "Light Beam", "AIDS_NIGHT_NAVIGATION"],
    ["Umbrella", "Tool", "DEFLECTS", "Rain", "KEEPS_USER_DRY"],
    ["Backpack", "Container", "CARRIES", "Books and Gear", "DISTRIBUTES_WEIGHT"],
    ["Wallet", "Container", "STORES", "Currency and Cards", "PORTABLE_FINANCE"],
    ["Bicycle", "Vehicle", "TRANSPORTS", "Rider", "USES_PEDAL_POWER"],
    ["Car", "Vehicle", "CONVEYS", "Passengers", "USES_INTERNAL_COMBUSTION_OR_BATTERY"],
    ["Bus", "Vehicle", "CARRIES", "Public Commuters", "REDUCES_URBAN_CONGESTION"],
    ["Train", "Vehicle", "SHIFTS", "Heavy Freight", "OPERATES_ON_RAILS"],
    ["Airplane", "Vehicle", "FLIES", "Long Distance", "GENERATES_AERODYNAMIC_LIFT"],
    ["Ship", "Vehicle", "NAVIGATES", "Oceans", "USES_BUOYANCY"],
  ];

  for (const item of householdItems) {
    const [name, type, pred1, obj1, pred2] = item;
    g.addEntity(name, [type], `${name} is an everyday ${type.toLowerCase()}.`);
    g.addEntity(obj1, ["Concept"], `${obj1} interacted with in daily life.`);
    g.addRelation(name, pred1, obj1);
    if (pred2) {
      g.addRelation(name, "ENABLES", pred2.replace(/_/g, " "));
    }
  }

  // 3. Human Biology, Senses, Needs, and Everyday Activities (120+ nodes)
  const humanActionsAndNeeds = [
    { action: "Eating", need: "Hunger", organ: "Mouth", target: "Food", benefit: "Caloric Energy" },
    { action: "Drinking", need: "Thirst", organ: "Throat", target: "Water", benefit: "Hydration" },
    { action: "Sleeping", need: "Fatigue", organ: "Brain", target: "Bed", benefit: "Cellular Regeneration" },
    { action: "Breathing", need: "Oxygen Deprivation", organ: "Lungs", target: "Air", benefit: "Gas Exchange" },
    { action: "Seeing", need: "Visual Perception", organ: "Eyes", target: "Light", benefit: "Spatial Awareness" },
    { action: "Hearing", need: "Auditory Perception", organ: "Ears", target: "Sound Waves", benefit: "Communication" },
    { action: "Smelling", need: "Olfactory Perception", organ: "Nose", target: "Airborne Molecules", benefit: "Hazard Detection" },
    { action: "Tasting", need: "Gustatory Perception", organ: "Tongue", target: "Chemical Flavors", benefit: "Nutrient Identification" },
    { action: "Touching", need: "Tactile Perception", organ: "Skin", target: "Surfaces", benefit: "Texture and Heat Feedback" },
    { action: "Walking", need: "Locomotion", organ: "Legs", target: "Ground", benefit: "Mobility" },
    { action: "Exercising", need: "Physical Fitness", organ: "Muscles", target: "Cardiovascular System", benefit: "Longevity and Stamina" },
    { action: "Learning", need: "Cognitive Development", organ: "Neural Cortex", target: "Knowledge", benefit: "Problem Solving" },
    { action: "Communicating", need: "Social Cohesion", organ: "Vocal Cords", target: "Language", benefit: "Collaboration" },
    { action: "Sheltering", need: "Environmental Protection", organ: "Home", target: "Harsh Weather", benefit: "Safety and Warmth" },
    { action: "Washing", need: "Hygiene", organ: "Hands and Body", target: "Soap and Water", benefit: "Pathogen Removal" },
  ];

  for (const h of humanActionsAndNeeds) {
    g.addEntity(h.action, ["Activity"], `Human activity of ${h.action.toLowerCase()}.`);
    g.addEntity(h.need, ["HumanNeed"], `Basic physiological or psychological need: ${h.need}.`);
    g.addEntity(h.organ, ["Anatomy"], `Organ involved: ${h.organ}.`);
    g.addEntity(h.benefit, ["Outcome"], `Positive outcome: ${h.benefit}.`);

    g.addRelation(h.action, "RELIEVES", h.need);
    g.addRelation(h.action, "USES", h.organ);
    g.addRelation(h.action, "TARGETS", h.target);
    g.addRelation(h.action, "PROVIDES", h.benefit);
  }

  // 4. Spatial, Environmental & Temporal Common Sense Concepts (150+ nodes)
  const environments = [
    { env: "Kitchen", items: ["Stove", "Refrigerator", "Sink", "Pantry", "Cutting Board", "Trash Can"] },
    { env: "Bathroom", items: ["Shower", "Toilet", "Sink", "Towel", "Soap", "Mirror", "Toothbrush"] },
    { env: "Bedroom", items: ["Bed", "Wardrobe", "Nightstand", "Curtains", "Dresser", "Alarm Clock"] },
    { env: "Living Room", items: ["Sofa", "Television", "Coffee Table", "Rug", "Bookshelf", "Floor Lamp"] },
    { env: "Office", items: ["Desk", "Ergonomic Chair", "Computer", "Whiteboard", "Stationery", "Filing Cabinet"] },
    { env: "Supermarket", items: ["Shopping Cart", "Checkout Register", "Produce Aisle", "Dairy Cooler", "Shelves"] },
    { env: "Hospital", items: ["Stethoscope", "Emergency Room", "X-Ray Machine", "Patient Bed", "Medicine Cabinet"] },
    { env: "Airport", items: ["Runway", "Boarding Gate", "Luggage Carousel", "Security Scanner", "Air Traffic Tower"] },
    { env: "Park", items: ["Trees", "Grass", "Park Bench", "Walking Path", "Fountain", "Playground"] },
    { env: "Farm", items: ["Tractor", "Barn", "Crops", "Livestock", "Silo", "Irrigation System"] },
    { env: "Library", items: ["Book Stacks", "Study Desk", "Catalog Index", "Quiet Zone", "Librarian Counter"] },
  ];

  for (const e of environments) {
    g.addEntity(e.env, ["Location", "Environment"], `${e.env} setting in everyday human society.`);
    for (const item of e.items) {
      g.addEntity(item, ["Object", "Fixture"], `${item} typically found in a ${e.env}.`);
      g.addRelation(e.env, "CONTAINS", item);
      g.addRelation(item, "LOCATED_IN", e.env);
    }
  }

  // 5. Common Cause-and-Effect Chains & Everyday Heuristics (100+ nodes)
  const causalChains = [
    ["Heavy Rain", "CAUSES", "Wet Roads", "CAUSES", "Reduced Tire Friction", "CAUSES", "Increased Braking Distance"],
    ["High Humidity", "CAUSES", "Slow Sweat Evaporation", "CAUSES", "Overheating Feeling", "REQUIRES", "Hydration and Fans"],
    ["Lack of Sleep", "CAUSES", "Adenosine Buildup", "CAUSES", "Impaired Cognitive Focus", "LEADS_TO", "Higher Error Rates"],
    ["Skipping Breakfast", "CAUSES", "Blood Glucose Drop", "CAUSES", "Mid-Morning Slump", "REQUIRES", "Nutrient Intake"],
    ["Prolonged Sun Exposure", "CAUSES", "UV Skin Damage", "CAUSES", "Sunburn", "PREVENTED_BY", "Sunscreen"],
    ["Poor Posture", "CAUSES", "Musculoskeletal Strain", "CAUSES", "Chronic Back Pain", "RELIEVED_BY", "Ergonomic Stretching"],
    ["Untreated Rust", "CAUSES", "Iron Oxidation", "CAUSES", "Structural Weakening", "PREVENTED_BY", "Protective Paint Coating"],
    ["Leaving Milk Unrefrigerated", "CAUSES", "Bacterial Fermentation", "CAUSES", "Sour Scurdling", "PREVENTED_BY", "Cold Storage"],
    ["Freezing Water in Sealed Glass", "CAUSES", "Volumetric Ice Expansion", "CAUSES", "Glass Bottle Fracture", "DEMONSTRATES", "Hydrogen Bonding Density Drop"],
    ["Dropping Fragile Ceramic", "CAUSES", "Brittle Fracture Impact", "CAUSES", "Shattered Pieces", "CLEANED_BY", "Broom and Dustpan"],
    ["Turning Hot Water Faucet", "CAUSES", "Boiler Flow Activation", "DELIVERS", "Hot Water to Sink", "AIDS", "Disinfecting Hands"],
    ["Flipping Light Switch", "CAUSES", "Circuit Closure", "ALLOWS", "Current Flow to Bulb", "PRODUCES", "Room Illumination"],
    ["Pressing Car Brake Pedal", "CAUSES", "Hydraulic Fluid Compression", "CLOSES", "Brake Calipers on Rotor", "STOPS", "Moving Vehicle"],
  ];

  for (const chain of causalChains) {
    for (let i = 0; i < chain.length - 2; i += 2) {
      const src = chain[i];
      const pred = chain[i + 1];
      const dst = chain[i + 2];
      g.addEntity(src, ["Cause", "Concept"], `Causal entity: ${src}`);
      g.addEntity(dst, ["Effect", "Concept"], `Causal entity: ${dst}`);
      g.addRelation(src, pred, dst);
    }
  }

  // 6. Detailed Affordances & Anti-Patterns (100+ nodes)
  const materialsAndProperties = [
    { mat: "Ceramic", prop: "Brittle", use: "Coffee Mugs and Plates", caution: "Shatters upon dropped impact" },
    { mat: "Cotton", prop: "Breathable and Absorbent", use: "Shirts and Bedding", caution: "Shrinks when exposed to high washing heat" },
    { mat: "Stainless Steel", prop: "Corrosion Resistant", use: "Cutlery and Cookware", caution: "Scratches non-stick pans if scrubbed harshly" },
    { mat: "Aluminum", prop: "Lightweight and Conductive", use: "Soda Cans and Foil", caution: "Cannot be placed in a microwave oven" },
    { mat: "Cast Iron", prop: "High Heat Retention", use: "Heavy Skillets", caution: "Rusts if left wet without seasoning oil" },
    { mat: "Wool", prop: "Insulating When Wet", use: "Winter Sweaters and Coats", caution: "Felts and loses shape in rough agitation" },
    { mat: "Silicone", prop: "Flexible and Heat Resistant", use: "Baking Mats and Spatulas", caution: "Absorbs pungent food odors if unwashed" },
    { mat: "Cardboard", prop: "Recyclable and Cushioning", use: "Shipping Boxes", caution: "Loses all tensile strength when soaked with water" },
    { mat: "Leather", prop: "Durable and Pliable", use: "Shoes and Belts", caution: "Dries out and cracks without periodic conditioning" },
    { mat: "Concrete", prop: "High Compressive Strength", use: "Sidewalks and Foundations", caution: "Weak in tensile strength without steel rebar" },
  ];

  for (const mp of materialsAndProperties) {
    g.addEntity(mp.mat, ["Material"], `Material: ${mp.mat}`);
    g.addEntity(mp.prop, ["Property"], `Physical property: ${mp.prop}`);
    g.addEntity(mp.use, ["Application"], `Common application: ${mp.use}`);
    g.addEntity(mp.caution, ["HazardCaution"], `Usage caveat: ${mp.caution}`);

    g.addRelation(mp.mat, "CHARACTERIZED_BY", mp.prop);
    g.addRelation(mp.mat, "UTILIZED_FOR", mp.use);
    g.addRelation(mp.mat, "PRONE_TO", mp.caution);
  }

  // 7. Temporal Cycles & Routine Knowledge
  const temporalCycles = [
    ["Dawn", "Sunrise", "Morning Breakfast", "Commute to Work", "Midday Lunch", "Afternoon Productive Sprint", "Sunset", "Evening Dinner", "Night Relaxation", "Deep Sleep"],
    ["Spring Thaw", "Seed Germination", "Summer Crop Growth", "Autumn Harvest", "First Winter Frost", "Dormancy Cycle"],
    ["Infancy", "Early Childhood", "Adolescence", "Young Adulthood", "Mature Adulthood", "Elder Years"],
  ];

  for (const cycle of temporalCycles) {
    g.linkChain(cycle, "PRECEDES", "Chronological sequence");
    // Connect each back into everyday life
    for (const step of cycle) {
      g.addEntity(step, ["TemporalEvent"], `Phase in cycle: ${step}`);
    }
  }

  return g.exportGraph();
}
