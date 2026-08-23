/**
 * Master Knowledge Graph Generator & Builder for ChatGemma
 * Builds 9 complete, dense, production-grade Knowledge Graph domains
 * targeting 500-1000 nodes per category (~5,500 - 7,500 total nodes).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCommonSense } from "./generators/generate_common_sense.js";
import { generateAiSpecialized } from "./generators/generate_ai_specialized.js";
import { generateGeneralKnowledge } from "./generators/generate_general_knowledge.js";
import { generateElectronics } from "./generators/generate_electronics.js";
import { generateArts } from "./generators/generate_arts.js";
import { generateLifeLessons } from "./generators/generate_life_lessons.js";
import { generateLiterature } from "./generators/generate_literature.js";
import { generatePhilosophy } from "./generators/generate_philosophy.js";
import { generateCulture } from "./generators/generate_culture.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, "../src/data/knowledge");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function expandDomainGraph(baseGraph, expansionTaxonomies) {
  const entityMap = new Map();
  for (const ent of baseGraph.entities) {
    entityMap.set(ent.id, ent);
  }
  const relations = [...baseGraph.relations];

  function addOrGetEntity(name, types = ["Concept"], desc = "") {
    if (!name || typeof name !== "string") return null;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    const primaryType = Array.isArray(types) && types.length > 0 ? types[0] : "Concept";
    const id = `entity:${primaryType.toLowerCase()}:${slug}`;

    if (!entityMap.has(id)) {
      const newEnt = {
        id,
        name: name.trim(),
        types: Array.isArray(types) ? types : [types],
        domain: baseGraph.domain,
        description: desc || `${name} within ${baseGraph.domain}.`,
        aliases: [name.toLowerCase()],
        attributes: { domain: baseGraph.domain },
        isActive: true,
      };
      entityMap.set(id, newEnt);
    }
    return entityMap.get(id);
  }

  function addRel(srcName, pred, dstName, desc = "") {
    if (!srcName || !dstName || !pred) return;
    const src = addOrGetEntity(srcName);
    const dst = addOrGetEntity(dstName);
    if (!src || !dst) return;

    const predUpper = pred.toUpperCase().replace(/\s+/g, "_");
    const relId = `rel_${src.id}_${predUpper}_${dst.id}`;

    if (!relations.some((r) => r.id === relId)) {
      relations.push({
        id: relId,
        sourceId: src.id,
        sourceName: src.name,
        sourceType: src.types[0],
        predicate: predUpper,
        targetId: dst.id,
        targetName: dst.name,
        targetType: dst.types[0],
        domain: baseGraph.domain,
        description: desc || `${src.name} ${pred.toLowerCase().replace(/_/g, " ")} ${dst.name}.`,
        weight: 1.0,
        confidence: 0.95,
        isActive: true,
      });
    }
  }

  if (Array.isArray(expansionTaxonomies)) {
    for (const item of expansionTaxonomies) {
      const { root, category, children = [], relationships = [], clusters = [] } = item;
      const rootEnt = addOrGetEntity(root, [category || "Category"], `${root} in ${baseGraph.domain}`);

      for (const child of children) {
        const childName = typeof child === "string" ? child : child.name;
        const childDesc = typeof child === "object" ? child.desc : "";
        const childTypes = typeof child === "object" ? child.types || [category] : [category];
        
        addOrGetEntity(childName, childTypes, childDesc);
        addRel(childName, "PART_OF", root, `${childName} is an element of ${root}`);
        addRel(root, "CONTAINS", childName, `${root} encompasses ${childName}`);
      }

      for (const [src, pred, dst, desc] of relationships) {
        addRel(src, pred, dst, desc);
      }

      for (const cluster of clusters) {
        const clusterParent = cluster.parent || root;
        for (const leaf of cluster.leaves) {
          addOrGetEntity(leaf, [cluster.type || category], `${leaf} in ${clusterParent}`);
          addRel(leaf, "SUB_CATEGORY_OF", clusterParent);
          addRel(clusterParent, "INCLUDES", leaf);
          if (cluster.predicate && cluster.target) {
            addRel(leaf, cluster.predicate, cluster.target);
          }
        }
      }
    }
  }

  return {
    domain: baseGraph.domain,
    version: "1.0.0",
    stats: {
      totalEntities: entityMap.size,
      totalRelations: relations.length,
    },
    entities: Array.from(entityMap.values()),
    relations,
  };
}

// -------------------------------------------------------------
// 1. Common Sense Expansion Taxonomies (1,000+ nodes)
// -------------------------------------------------------------
const commonSenseTaxonomy = [
  {
    root: "Everyday Household Fixtures & Tools",
    category: "Household",
    children: [
      "Stove Burner", "Induction Cooktop", "Baking Tray", "Saucepan", "Frying Pan", "Wok",
      "Chef Knife", "Bread Knife", "Paring Knife", "Cutting Board", "Colander", "Measuring Cup",
      "Can Opener", "Whisk", "Peeler", "Ladle", "Tongs", "Oven Mitts", "Aluminum Foil",
      "Parchment Paper", "Dish Soap", "Sponge", "Paper Towels", "Trash Can", "Compost Bin",
      "Food Storage Container", "Spice Rack", "Salt Shaker", "Pepper Mill", "Olive Oil Bottle",
      "Sink Faucet", "Garbage Disposal", "Range Hood", "Ice Maker", "Freezer Compartment",
      "Pantry Shelf", "Dining Table", "Placemat", "Dinner Napkin", "Water Pitcher",
      "Broom", "Dustpan", "Mop", "Bucket", "Microfiber Cloth", "Toilet Plunger",
      "Shower Curtain", "Bath Mat", "Soap Dispenser", "Hair Dryer", "Toothbrush Holder",
      "Hanger", "Laundry Basket", "Ironing Board", "Shoe Rack", "Doormat", "Curtain Rod"
    ],
    relationships: [
      ["Chef Knife", "CHOPS_ON", "Cutting Board", "Prevents countertop damage."],
      ["Dish Soap", "EMULSIFIES", "Grease", "Lifts grease for water rinsing."],
      ["Range Hood", "VENTS", "Cooking Smoke", "Exhausts aerosols outside."],
    ]
  },
  {
    root: "Urban City Infrastructure & Public Spaces",
    category: "UrbanEnvironment",
    children: [
      "Traffic Light", "Crosswalk", "Pedestrian Signal", "Speed Bump", "Bicycle Lane",
      "Bus Stop", "Subway Station", "Turnstile", "Ticket Machine", "Platform Edge",
      "Escalator", "Elevator", "Overhead Sign", "Streetlight", "Manhole Cover",
      "Fire Hydrant", "Storm Drain", "Sidewalk Curb", "Parking Meter", "Guardrail",
      "Road Asphalt", "Bridge Pylon", "Toll Booth", "Pedestrian Bridge", "Roundabout",
      "Highway Merge", "Pavement Markings", "Bus Lane", "Train Track", "Overhead Catenary Wire",
      "Public Bench", "Trash Receptacle", "Postal Mailbox", "Drinking Fountain", "Public Restroom",
      "Street Tree Grate", "Bicycle Rack", "Taxi Stand", "Emergency Call Box", "Billboard",
      "Crosswalk Curb Cut", "Tactile Paving", "Traffic Cone", "Construction Barrier", "Speed Limit Sign",
      "Stop Sign", "Yield Sign", "One-Way Sign", "No-Parking Zone", "Loading Zone"
    ]
  },
  {
    root: "Natural Weather Phenomena & Hazards",
    category: "Nature",
    children: [
      "Heavy Downpour", "Puddle", "Mud", "Morning Dew", "Dense Fog", "Hailstorm",
      "Snowdrift", "Blizzard", "Frost Layer", "Icicle", "Thunderclap", "Lightning Bolt",
      "Gusting Wind", "Tornado Vortex", "Hurricane Eye", "Heatwave", "Drought",
      "Wildfire", "River Flood", "Rainbow Refraction", "Sunset Glow", "Overcast Sky",
      "Atmospheric Humidity", "Barometric Pressure", "Warm Front", "Cold Front",
      "Cumulonimbus Cloud", "Cirrus Cloud", "Stratosphere Jet Stream", "Sea Breeze",
      "Avalanche", "Landslide", "Monsoon Rain", "Sleet", "Freezing Rain",
      "Dust Storm", "Solar Halo", "Aurora Borealis", "Tidal Surge", "Sea Fog"
    ]
  }
];

// -------------------------------------------------------------
// 2. AI Specialized Expansion Taxonomies (700+ nodes)
// -------------------------------------------------------------
const aiSpecializedTaxonomy = [
  {
    root: "Neural Network Architectures & Paradigms",
    category: "Architecture",
    children: [
      "Convolutional Neural Network (CNN)", "ResNet-50", "ConvNeXt", "MobileNetV3", "EfficientNet",
      "DenseNet", "U-Net", "YOLOv8 Object Detector", "Faster R-CNN", "Mask R-CNN",
      "Vision Transformer (ViT)", "Swin Transformer", "DeiT", "DINOv2 Self-Supervised Vision",
      "CLIP Multimodal Embeddings", "SigLIP Vision-Language Model", "Segment Anything Model (SAM)",
      "Recurrent Neural Network (RNN)", "LSTM (Long Short-Term Memory)", "Bidirectional LSTM",
      "GRU (Gated Recurrent Unit)", "Seq2Seq with Attention", "Bahdanau Additive Attention",
      "Luong Multiplicative Attention", "Transformer", "Decoder-Only Transformer",
      "Encoder-Only Transformer", "Encoder-Decoder Transformer", "BERT (Bidirectional Encoder)",
      "RoBERTa", "DeBERTa-v3", "T5 (Text-to-Text Transfer Transformer)", "Flan-T5", "BART",
      "GPT-1", "GPT-2", "GPT-3", "GPT-3.5-Turbo", "GPT-4", "GPT-4o", "Claude 3.5 Sonnet",
      "LLaMA", "LLaMA 2", "LLaMA 3", "LLaMA 3.1 405B", "LLaMA 3.3 70B", "Mistral 7B",
      "Mixtral 8x7B (MoE)", "Mixtral 8x22B", "Qwen 2.5 72B", "Qwen 2.5 Coder", "DeepSeek-V2",
      "DeepSeek-V3", "DeepSeek-Coder-V2", "DeepSeek-R1", "Phi-3", "Phi-4", "Gemma 1",
      "Gemma 2 27B", "Gemma 4", "Command R+", "Jamba 1.5", "Mamba-1 SSM", "Mamba-2 SSM",
      "StripedHyena", "RWKV-v6 Eagle", "Titans Architecture", "Liquid Time-Constant Network",
      "Neural Ordinary Differential Equations (Neural ODE)", "Graph Neural Network (GNN)",
      "Graph Convolutional Network (GCN)", "Graph Attention Network (GAT)", "Message Passing Neural Network",
      "Autoencoder", "Variational Autoencoder (VAE)", "Vector Quantized VAE (VQ-VAE)", "VQ-GAN",
      "Diffusion Model", "Denoising Diffusion Probabilistic Model (DDPM)", "DDIM Sampler",
      "Latent Diffusion Model (Stable Diffusion)", "Stable Diffusion XL", "Stable Diffusion 3",
      "FLUX.1 Flow Matching", "Sora Video Diffusion", "AudioCraft / MusicLM", "Whisper Speech-to-Text",
      "SeamlessM4T Multilingual Speech", "ControlNet Spatial Conditioning", "IP-Adapter",
      "LoRA (Low-Rank Adaptation)", "QLoRA 4-Bit LoRA", "DoRA (Weight-Decomposed LoRA)",
      "Prefix Tuning", "Prompt Tuning", "P-Tuning v2", "AdapterFusion", "IA3 (Infused Adapter)"
    ]
  },
  {
    root: "Attention & Sequence Scaling Mechanisms",
    category: "Attention",
    children: [
      "Scaled Dot-Product Attention", "Multi-Head Attention (MHA)", "Multi-Query Attention (MQA)",
      "Grouped-Query Attention (GQA)", "Multi-Head Latent Attention (MLA)", "FlashAttention-1",
      "FlashAttention-2", "FlashAttention-3 (TMA/WGMMA)", "RingAttention", "DeepSpeed Ulysses Context Parallelism",
      "Megatron-SP Sequence Parallelism", "Sliding Window Attention (SWA)", "Local Attention",
      "Sparse Attention", "Linear Attention", "Performer Fast Attention", "Linformer",
      "Reformer LSH Attention", "Routing Attention", "Cross-Attention", "Causal Attention Mask",
      "Bidirectional Attention Mask", "Document Masking", "Chunked Attention", "Prefix LM Masking",
      "Rotary Position Embedding (RoPE)", "ALiBi (Attention with Linear Biases)", "YaRN RoPE Interpolation",
      "Dynamic RoPE Scaling", "Linear RoPE Scaling", "LongRoPE", "NoPE (No Positional Embedding)",
      "Sinusoidal Positional Encoding", "Learned 1D Absolute Positional Embeddings", "2D Rotary Embeddings (Vision RoPE)",
      "SwiGLU Activation", "GeGLU Activation", "GELU Activation", "SiLU (Swish) Activation",
      "RMSNorm (Root Mean Square Normalization)", "LayerNorm (Layer Normalization)", "GroupNorm",
      "BatchNorm", "DeepNorm Pre-LN", "Post-LN Stability", "Residual Stream Highway"
    ]
  },
  {
    root: "Optimization, Scaling Laws & Alignment",
    category: "TrainingMethods",
    children: [
      "Stochastic Gradient Descent (SGD)", "SGD with Nesterov Momentum", "Adam Optimizer",
      "AdamW with Decoupled Weight Decay", "Lion (EvoLved Sign Momentum)", "Sophia Curvature Optimizer",
      "Muon Newton-Schulz Optimizer", "Adafactor Optimizer", "LAMB Optimizer for Large Batches",
      "Cosine Annealing Learning Rate", "Linear Warmup Schedule", "Inverse Square Root Decay",
      "WSD (Warmup-Stable-Decay) Schedule", "Cross-Entropy Loss", "Label Smoothing",
      "Focal Loss", "Contrastive InfoNCE Loss", "DPO (Direct Preference Optimization)",
      "GRPO (Group Relative Policy Optimization)", "PPO (Proximal Policy Optimization)",
      "KTO (Kahneman-Tversky Optimization)", "ORPO (Odds Ratio Preference Optimization)",
      "RLOO (Reinforcement Learning with Leave-One-Out)", "REINFORCE Algorithm", "Rejection Sampling",
      "Supervised Fine-Tuning (SFT)", "Curriculum Learning", "Chinchilla Compute-Optimal Scaling Law",
      "Kaplan Power-Law Scaling", "Loss-Compute Pareto Frontier", "Data Constrained Scaling Laws",
      "Synthetic Data Distillation", "Evol-Instruct Dataset Generation", "Self-Instruct Framework",
      "UltraFeedback Preference Dataset", "Constitutional AI Alignment", "Process Reward Models (PRM)",
      "Outcome Reward Models (ORM)", "Step-Level Value Estimation", "Monte Carlo Tree Search for Reasoning"
    ]
  },
  {
    root: "Quantization, GPU Hardware & High-Throughput Serving",
    category: "ServingSystems",
    children: [
      "FP32 Single Precision", "FP16 Half Precision", "BF16 Bfloat16 Precision", "FP8 E4M3 Precision",
      "FP8 E5M2 Precision", "INT8 Fixed Point", "INT4 Weight Only Quantization", "INT2 Binary Weight",
      "BitNet 1.58b Ternary Weights", "AWQ (Activation-aware Weight Quantization)", "GPTQ Second-Order Quantizer",
      "GGUF File Standard", "EXL2 Quantization", "HQQ (Half-Quadratic Quantization)", "SmoothQuant (W8A8)",
      "SpQR Sparse-Quantized Representation", "PagedAttention Virtual Memory", "Continuous Batching (Orca)",
      "Chunked Prefill Engine", "KV Cache Quantization (FP8/INT4)", "Prefix Caching (Prompt Cache)",
      "Speculative Decoding with Small Draft Model", "Medusa Multi-Head Speculation", "EAGLE Speculative Decoding",
      "vLLM High-Throughput Engine", "TensorRT-LLM (NVIDIA)", "TGI (Text Generation Inference)",
      "SGLang High-Speed Runtime", "Ollama Local LLM Runner", "llama.cpp C++ Engine",
      "NVIDIA Hopper H100 GPU", "NVIDIA Blackwell B200 GPU", "NVIDIA Grace Hopper GH200",
      "Google TPU v5p Pod", "Google TPU v6e Trillium", "Cerebras CS-3 WSE Wafer Scale Engine",
      "Groq LPU Tensor Streaming Processor", "Apple M4 Max Unified Memory", "AMD Instinct MI300X Accelerator",
      "CUDA C++ GPU Kernels", "OpenAI Triton Compiler", "CUTLASS Template Library", "Tensor Memory Accelerator (TMA)"
    ]
  }
];

// -------------------------------------------------------------
// 3. General Knowledge Expansion Taxonomies (700+ nodes)
// -------------------------------------------------------------
const generalKnowledgeTaxonomy = [
  {
    root: "Fundamental Physics & Particle Classification",
    category: "Physics",
    children: [
      "Up Quark", "Down Quark", "Charm Quark", "Strange Quark", "Top Quark", "Bottom Quark",
      "Electron", "Muon", "Tau Lepton", "Electron Neutrino", "Muon Neutrino", "Tau Neutrino",
      "Gluon", "Photon", "W Plus Boson", "W Minus Boson", "Z Zero Boson", "Higgs Boson",
      "Graviton", "Dark Photon", "Axion", "Majorana Fermion", "Magnetic Monopole",
      "Proton", "Neutron", "Pion", "Kaon", "Baryon", "Meson", "Hadron", "Atomic Nucleus",
      "Newtonian Gravitation", "Coulomb's Electrostatic Law", "Lorentz Force Law", "Faraday's Induction Law",
      "Ampere-Maxwell Law", "Gauss's Law for Electricity", "Gauss's Law for Magnetism",
      "Planck's Constant (h)", "Speed of Light in Vacuum (c)", "Gravitational Constant (G)",
      "Boltzmann Constant (k_B)", "Stefan-Boltzmann Radiation Law", "Wien's Displacement Law",
      "Compton Scattering", "Photoelectric Effect (Einstein 1905)", "De Broglie Matter Wave",
      "Schrodinger Wave Equation", "Dirac Relativistic Wave Equation", "Pauli Exclusion Principle",
      "Quantum Superposition", "Quantum Tunneling", "Wavefunction Collapse", "Quantum Decoherence"
    ]
  },
  {
    root: "Chemical Elements, Thermodynamics & Organic Reactions",
    category: "Chemistry",
    children: [
      "Hydrogen", "Helium", "Lithium", "Beryllium", "Boron", "Carbon", "Nitrogen", "Oxygen",
      "Fluorine", "Neon", "Sodium", "Magnesium", "Aluminum", "Silicon", "Phosphorus", "Sulfur",
      "Chlorine", "Argon", "Potassium", "Calcium", "Scandium", "Titanium", "Vanadium", "Chromium",
      "Manganese", "Iron", "Cobalt", "Nickel", "Copper", "Zinc", "Gallium", "Germanium", "Arsenic",
      "Selenium", "Bromine", "Krypton", "Rubidium", "Strontium", "Silver", "Cadmium", "Tin",
      "Iodine", "Xenon", "Cesium", "Barium", "Tungsten", "Platinum", "Gold", "Mercury", "Lead",
      "Uranium", "Plutonium", "Noble Gases", "Alkali Metals", "Alkaline Earth Metals", "Halogens",
      "Transition Metals", "Lanthanides", "Actinides", "Electronegativity (Pauling Scale)",
      "Ionization Energy", "Electron Affinity", "Covalent Bond", "Ionic Crystal Lattice",
      "Metallic Bond", "Van der Waals Dispersion Force", "Hydrogen Bonding", "Lewis Acid-Base Theory",
      "Arrhenius Acid-Base", "Bronsted-Lowry Proton Transfer", "Enthalpy (H)", "Entropy (S)",
      "Gibbs Free Energy (G)", "Exothermic Reaction", "Endothermic Reaction", "Activation Energy Barrier",
      "Catalysis Mechanism", "Alkanes", "Alkenes", "Alkynes", "Benzene Aromatic Ring",
      "Alcohols (-OH)", "Carboxylic Acids (-COOH)", "Esters (-COOR)", "Amines (-NH2)", "Amides (-CONH-)",
      "Aldehydes (-CHO)", "Ketones (-C=O)", "Polymers (Polyethylene, Nylon, PTFE, PET)"
    ]
  },
  {
    root: "Astronomy, Planetary Systems & Cosmology",
    category: "Astronomy",
    children: [
      "Sun (G-Type Main Sequence Yellow Dwarf)", "Mercury", "Venus", "Earth", "Mars",
      "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto (Dwarf Planet)", "Ceres (Asteroid Belt)",
      "Eris (Kuiper Belt)", "The Moon (Luna)", "Phobos & Deimos (Mars Moons)", "Io (Volcanic Moon)",
      "Europa (Subsurface Ocean Moon)", "Ganymede (Largest Solar System Moon)", "Callisto",
      "Titan (Methane Atmosphere Moon)", "Enceladus (Cryovolcanic Geysers)", "Triton (Retrograde Moon)",
      "Asteroid Belt", "Kuiper Belt", "Oort Cloud", "Halley's Comet", "Hertzsprung-Russell Diagram",
      "Red Giant Phase", "White Dwarf Remnant", "Electron Degeneracy Pressure", "Type II Core-Collapse Supernova",
      "Pulsar / Magnetar", "Event Horizon", "Accretion Disk", "Supermassive Black Hole (Sagittarius A*)",
      "Milky Way Galaxy", "Andromeda Galaxy (M31)", "Large Magellanic Cloud", "Local Group Cluster",
      "Virgo Supercluster", "Cosmic Web Filaments", "Cosmic Microwave Background (CMB)",
      "Hubble-Lemaitre Law", "Redshift (z)", "James Webb Space Telescope (JWST)", "Hubble Space Telescope"
    ]
  },
  {
    root: "Biology, Cellular Anatomy & Genetics",
    category: "Biology",
    children: [
      "Prokaryotic Cell", "Eukaryotic Cell", "Cell Membrane Lipid Bilayer", "Cytoplasm Cytosol",
      "Cell Nucleus", "Nucleolus", "Mitochondria (ATP Powerhouse)", "Endoplasmic Reticulum (Rough & Smooth)",
      "Golgi Apparatus (Protein Sorting)", "Lysosome (Hydrolytic Enzymes)", "Peroxisome",
      "Cytoskeleton Microtubules", "Chloroplast (Thylakoids & Stroma)", "Vacuole Turgor Pressure",
      "DNA Double Helix", "mRNA (Messenger RNA)", "tRNA (Transfer RNA)", "rRNA (Ribosomal RNA)",
      "Adenine", "Thymine", "Guanine", "Cytosine", "Uracil", "Codon Triplet Code", "Amino Acid Residue",
      "Peptide Bond", "Protein Primary Structure", "Protein Secondary Alpha Helix", "Protein Tertiary Fold",
      "Enzyme Active Site", "Substrate Lock-and-Key / Induced Fit", "Cellular Respiration (Glycolysis, Krebs Cycle)",
      "Oxidative Phosphorylation", "Photosynthesis (Light Reactions & Calvin Cycle)", "Mitosis Cell Division",
      "Meiosis Gametogenesis", "Mendelian Dominant-Recessive Inheritance", "Crossing Over Recombination",
      "CRISPR-Cas9 Genome Editing", "Epigenetic DNA Methylation", "Bacterial Plasmid Vector", "Viral Capsid Infection"
    ]
  }
];

// -------------------------------------------------------------
// 4. Electronics Expansion Taxonomies (Target 700+ nodes)
// -------------------------------------------------------------
const electronicsTaxonomy = [
  {
    root: "Semiconductors, Transistors & Power Switching",
    category: "Semiconductors",
    children: [
      "Intrinsic Silicon Semiconductor", "Extrinsic N-Type Doping (Phosphorus)", "Extrinsic P-Type Doping (Boron)",
      "PN Junction Depletion Region", "Forward Bias Conduction (0.7V Silicon Threshold)", "Reverse Breakdown Avalanche",
      "Zener Diode Voltage Reference", "Schottky Diode (Low Vf Drop)", "Light Emitting Diode (LED)",
      "Photodiode Sensor", "Solar Photovoltaic Cell", "Varactor Diode (Voltage-Tuned Capacitance)",
      "Transient Voltage Suppressor (TVS Diode)", "NPN BJT Transistor", "PNP BJT Transistor",
      "BJT Base-Emitter Junction", "BJT Collector-Base Junction", "BJT Current Gain (Beta / Hfe)",
      "N-Channel MOSFET Enhancement Mode", "P-Channel MOSFET Enhancement Mode", "MOSFET Gate Oxide Insulation",
      "MOSFET Threshold Voltage Vgs(th)", "MOSFET On-State Resistance Rds(on)", "MOSFET Input Gate Capacitance Ciss",
      "MOSFET Parasitic Body Diode", "Gallium Nitride (GaN) HEMT", "Silicon Carbide (SiC) Power MOSFET",
      "IGBT (Insulated Gate Bipolar Transistor)", "TRIAC AC Switch", "SCR (Silicon Controlled Rectifier)",
      "JFET (Junction Field Effect Transistor)", "Optocoupler / Optoisolator Phototransistor"
    ]
  },
  {
    root: "Analog Signal Processing, Op-Amps & Filters",
    category: "AnalogCircuits",
    children: [
      "Operational Amplifier (Op-Amp)", "Inverting Op-Amp Amplifier", "Non-Inverting Op-Amp Amplifier",
      "Voltage Follower Buffer", "Summing Op-Amp Amplifier", "Differential Op-Amp Amplifier",
      "Instrumentation Amplifier (3 Op-Amp Topology)", "Op-Amp Integrator Circuit", "Op-Amp Differentiator Circuit",
      "Active Low-Pass Sallen-Key Filter", "Active High-Pass Filter", "Active Bandpass Filter",
      "Notch Filter (Twin-T Topology)", "Bessel Linear-Phase Filter", "Butterworth Maximally Flat Filter",
      "Chebyshev Fast-Roll-Off Filter", "Elliptic (Cauer) Steep-Cut Filter", "Voltage Comparator (LM393)",
      "Schmitt Trigger with Hysteresis", "Peak Detector Circuit", "Precision Rectifier (Superdiode)",
      "Logarithmic Amplifier", "Phase-Locked Loop (PLL IC 4046)", "NE555 Timer IC (Astable & Monostable)",
      "Analog-to-Digital Converter (ADC)", "Successive Approximation Register (SAR ADC)",
      "Delta-Sigma ADC (High Resolution Audio)", "Flash ADC (Ultra-High Speed)", "Digital-to-Analog Converter (DAC)",
      "R-2R Ladder Network DAC", "Current Shunt Resistor Monitor", "Wheatstone Bridge Strain Sensor"
    ]
  },
  {
    root: "Embedded Microcontrollers, Buses & Protocols",
    category: "EmbeddedHardware",
    children: [
      "ESP32 Dual-Core Xtensa SoC", "ESP32-S3 AI Vector Instructions", "ESP32-C3 RISC-V Microcontroller",
      "STM32F4 ARM Cortex-M4 with FPU", "STM32H7 High-Performance Dual Core", "Raspberry Pi RP2040 Dual M0+",
      "ATmega328P 8-Bit AVR Microcontroller", "ATmega2560 Mega Microcontroller", "Microchip PIC16F Series",
      "Nordic nRF52840 Bluetooth BLE SoC", "Texas Instruments CC2652 Zigbee/Thread MCU",
      "I2C Bus (SDA / SCL Open-Drain Lines)", "I2C Bus Pull-Up Resistors (4.7k Ohm)", "I2C 7-Bit Device Address",
      "SPI Bus (MOSI / MISO / SCK / CS Lines)", "SPI Master-Slave Topology", "UART Serial Protocol (TX / RX)",
      "UART Baud Rate Clock Matching", "RS-232 Level Shifter (MAX232)", "RS-485 Differential Half-Duplex Bus",
      "CAN Bus (Controller Area Network 2.0B)", "CAN-FD (Flexible Data-Rate)", "CAN Differential Transceiver (TJA1050)",
      "USB 2.0 Full-Speed / High-Speed Differential Lines", "USB-PD (Power Delivery 100W/240W CC Lines)",
      "BLE GATT Server & Client Profiles", "LoRa Long-Range Chirp Spread Spectrum Radio", "PWM (Pulse Width Modulation Peripheral)",
      "DMA (Direct Memory Access Controller)", "Hardware Watchdog Timer (WDT)", "Brown-Out Reset Detector (BOD)",
      "JTAG / SWD Hardware Debugging Port", "FreeRTOS Embedded Kernel Tasks & Semaphores"
    ]
  },
  {
    root: "Power Supplies, Voltage Regulators & PCB Engineering",
    category: "PowerAndPcb",
    children: [
      "Linear Voltage Regulator (LM7805 / LM317)", "LDO (Low-Dropout Linear Regulator)",
      "Buck Step-Down Switching Converter", "Boost Step-Up Switching Converter",
      "Buck-Boost Inverting / Non-Inverting SMPS", "Flyback Isolated AC-DC Switching Supply",
      "Forward Converter", "Push-Pull SMPS Topology", "Full-Bridge Resonant LLC Converter",
      "Inductor Saturation Current (Isat)", "Capacitor ESR (Equivalent Series Resistance)",
      "Decoupling / Bypass Capacitor Array", "Ferrite Bead High-Frequency Filter",
      "FR-4 Glass Epoxy PCB Substrate", "4-Layer PCB Stackup (Signal-GND-Power-Signal)",
      "Continuous Ground Return Plane", "Controlled Differential Impedance (90 Ohm USB / 100 Ohm Ethernet)",
      "Trace Width vs Current Capacity (IPC-2152 Standard)", "Thermal Relief Via Pad",
      "SMD Surface Mount Component", "BGA (Ball Grid Array Packaging)", "Solder Stencil & Reflow Soldering",
      "Pick-and-Place Automation", "ESD Protection TVS Array", "Polyfuse Resettable PTC Fuse"
    ]
  },
  {
    root: "Sensors, Actuators & RF Hardware",
    category: "HardwareSensors",
    children: [
      "MPU6050 6-Axis Accelerometer & Gyroscope", "BME280 Temperature, Humidity & Pressure Sensor",
      "HC-SR04 Ultrasonic Distance Sensor", "VL53L0X Time-of-Flight Laser LiDAR",
      "PIR Infrared Motion Sensor", "DHT22 Digital Temperature Sensor", "Hall Effect Magnetic Sensor (A3144)",
      "MQ-2 Gas and Smoke Sensor", "Thermocouple Type K with MAX6675 Amplifier", "HX711 24-Bit Load Cell ADC",
      "NEMA 17 Stepper Motor", "A4988 Stepper Driver Carrier", "TMC2209 SilentStepStick Driver",
      "Brushless DC Motor (BLDC)", "Electronic Speed Controller (ESC 30A)", "SG90 Micro Servo 9g (PWM Controlled)",
      "Relay Module (5V Coil / 250VAC Contacts)", "Solid State Relay (SSR Zero-Crossing)", "Solenoid Valve Actuator",
      "Yagi-Uda Directional RF Antenna", "Patch Microstrip Antenna (2.4GHz/5.8GHz)", "SMA Connector (50 Ohm RF)",
      "Low-Noise Amplifier (LNA)", "Power Amplifier (RF PA)", "RF Mixer (Heterodyne Downconversion)",
      "SAW Filter (Surface Acoustic Wave)", "Balun Transformer (Balanced to Unbalanced)", "Smith Chart Impedance Matching"
    ]
  },
  {
    root: "Digital Logic, FPGA & Microarchitecture",
    category: "DigitalFPGA",
    children: [
      "AND Gate", "OR Gate", "NOT Gate (Inverter)", "NAND Universal Gate", "NOR Universal Gate",
      "XOR Exclusive-OR Gate", "XNOR Gate", "D-Type Flip-Flop (Edge-Triggered)", "JK Flip-Flop",
      "T Flip-Flop", "SR Latch", "4-to-1 Multiplexer (MUX)", "1-to-4 Demultiplexer (DEMUX)",
      "3-to-8 Binary Decoder", "Priority Encoder", "8-Bit Ripple Carry Adder", "Carry-Lookahead Adder (CLA)",
      "Arithmetic Logic Unit (ALU)", "Static RAM (SRAM 6T Cell)", "Dynamic RAM (DRAM 1T-1C Cell)",
      "Flash Memory NAND Floating Gate", "NOR Flash Parallel Boot ROM", "EEPROM (I2C 24LC256)",
      "FPGA (Field-Programmable Gate Array)", "Look-Up Table (LUT 6-Input)", "Configurable Logic Block (CLB)",
      "Block RAM (BRAM 36Kb Primitive)", "DSP48E1 Multiply-Accumulate Slice", "Phase-Locked Loop (PLL Clock Manager)",
      "VHDL Hardware Description Language", "Verilog HDL", "SystemVerilog for Verification",
      "Timing Closure (Setup & Hold Time Slack)", "Clock Domain Crossing (CDC Synchronizer)", "JTAG Boundary Scan (IEEE 1149.1)"
    ]
  }
];

// -------------------------------------------------------------
// 5. Arts Expansion Taxonomies (Target 700+ nodes)
// -------------------------------------------------------------
const artsTaxonomy = [
  {
    root: "Visual Arts Movements, Masters & Masterpieces",
    category: "ArtMovement",
    children: [
      "Early Renaissance (Giotto, Masaccio, Donatello)", "High Renaissance (Leonardo, Michelangelo, Raphael)",
      "Mannerism (El Greco, Parmigianino, Tintoretto)", "Baroque (Caravaggio, Rembrandt, Bernini, Vermeer, Velazquez)",
      "Rococo (Watteau, Fragonard, Boucher)", "Neoclassicism (Jacques-Louis David, Ingres)",
      "Romanticism (Caspar David Friedrich, J.M.W. Turner, Delacroix, Goya)",
      "Realism (Gustave Courbet, Jean-Francois Millet)", "Impressionism (Monet, Renoir, Degas, Pissarro, Morisot)",
      "Post-Impressionism (Van Gogh, Cezanne, Gauguin, Seurat)", "Fauvism (Henri Matisse, Andre Derain)",
      "Expressionism (Edvard Munch, Wassily Kandinsky, Egon Schiele)", "Cubism (Pablo Picasso, Georges Braque, Juan Gris)",
      "Futurism (Umberto Boccioni, Giacomo Balla)", "Constructivism (Vladimir Tatlin, El Lissitzky)",
      "De Stijl / Neoplasticism (Piet Mondrian, Theo van Doesburg)", "Dadaism (Marcel Duchamp, Man Ray, Hannah Hoch)",
      "Surrealism (Salvador Dali, Rene Magritte, Max Ernst, Joan Miro, Frida Kahlo)",
      "Abstract Expressionism (Jackson Pollock, Mark Rothko, Willem de Kooning)",
      "Pop Art (Andy Warhol, Roy Lichtenstein, Keith Haring)", "Minimalism (Donald Judd, Dan Flavin, Sol LeWitt)",
      "Conceptual Art (Joseph Kosuth, Marina Abramovic)", "Street Art & Graffiti (Banksy, Jean-Michel Basquiat)",
      "Mona Lisa (Louvre)", "The Last Supper (Milan)", "Sistine Chapel Ceiling (Vatican)",
      "The Starry Night (MoMA)", "Guernica (Reina Sofia)", "The Persistence of Memory (MoMA)",
      "The Night Watch (Rijksmuseum)", "Girl with a Pearl Earring (Mauritshuis)", "Las Meninas (Prado)",
      "The Great Wave off Kanagawa (Hokusai)", "The Scream (National Gallery Oslo)", "The Kiss (Gustav Klimt, Vienna)"
    ]
  },
  {
    root: "Musicology, Classical Forms, Harmony & Composition",
    category: "MusicTheory",
    children: [
      "Major Scale (Ionian Mode)", "Natural Minor Scale (Aeolian Mode)", "Harmonic Minor Scale",
      "Melodic Minor Scale", "Dorian Mode", "Phrygian Mode", "Lydian Mode", "Mixolydian Mode", "Locrian Mode",
      "Pentatonic Major Scale", "Blues Scale with Blue Note", "Circle of Fifths", "Interval of Perfect Fifth",
      "Tritone (Augmented Fourth / Diminished Fifth)", "Major Triad Chord", "Minor Triad Chord",
      "Dominant Seventh Chord (V7)", "Major Seventh Chord (Maj7)", "Minor Seventh Chord (m7)",
      "Half-Diminished Seventh Chord (m7b5)", "Diminished Seventh Chord (dim7)", "Authentic Cadence (V - I)",
      "Plagal Cadence (IV - I)", "Deceptive Cadence (V - vi)", "Half Cadence (I - V)",
      "Counterpoint (Species Counterpoint Fux)", "Polyphony", "Homophony", "Monophony",
      "Fugue Subject and Countersubject", "Sonata-Allegro Form (Exposition, Development, Recapitulation)",
      "Rondo Form (ABACA)", "Theme and Variations Form", "Symphony Four-Movement Structure",
      "Concerto (Soloist vs Orchestra)", "String Quartet Ensemble", "Johann Sebastian Bach (Baroque)",
      "Wolfgang Amadeus Mozart (Classical)", "Ludwig van Beethoven (Classical to Romantic)",
      "Frederic Chopin (Romantic Piano)", "Johannes Brahms (Romantic)", "Pyotr Ilyich Tchaikovsky (Romantic)",
      "Claude Debussy (Impressionist)", "Igor Stravinsky (The Rite of Spring Modernism)", "Miles Davis (Modal Jazz)",
      "John Coltrane (Giant Steps Harmonic Substitution)", "Syncopation Rhythmic Accent", "Time Signature 4/4 / 3/4 / 6/8 / 5/4"
    ]
  },
  {
    root: "Architecture Eras, Engineering & World Monuments",
    category: "Architecture",
    children: [
      "Ancient Greek Doric Order", "Ancient Greek Ionic Order", "Ancient Greek Corinthian Order",
      "Roman Semicircular Arch", "Roman Concrete Barrel Vault", "Roman Groin Vault", "Roman Dome (Pantheon)",
      "Roman Colosseum Amphitheater", "Roman Aqueduct Pont du Gard", "Byzantine Pendentive Dome (Hagia Sophia)",
      "Romanesque Thick Walls & Rounded Arches", "Gothic Pointed Arch", "Gothic Ribbed Cross Vault",
      "Gothic Flying Buttress", "Gothic Rose Stained Glass Window", "Notre-Dame Cathedral Paris",
      "Chartres Cathedral", "Brunelleschi's Dome (Florence Cathedral)", "St. Peter's Basilica (Rome)",
      "Baroque Grandeur & Trompe-l'Oeil Ceiling", "Versailles Palace Royal Architecture",
      "Mughal Indo-Islamic Architecture", "Taj Mahal White Marble Mausoleum (Agra)",
      "Alhambra Moorish Islamic Palace (Granada)", "Neoclassical Capitol Architecture",
      "Cast-Iron Crystal Palace (1851 London)", "Eiffel Tower Wrought-Iron Lattice (Paris)",
      "Chicago School Skyscraper Steel Frame (Louis Sullivan)", "Bauhaus Functionalist Campus (Dessau)",
      "Modernist Villa Savoye (Le Corbusier 5 Points)", "Organic Architecture Fallingwater (Frank Lloyd Wright)",
      "Brutalist Concrete Monumentalism", "Deconstructivist Guggenheim Museum Bilbao (Frank Gehry)",
      "Parametric Fluid Architecture (Zaha Hadid)", "Burj Khalifa Supertall Engineering (Dubai)"
    ]
  },
  {
    root: "Cinema, Directing, Photography & World Music",
    category: "CinemaAndWorldMusic",
    children: [
      "Alfred Hitchcock (Suspense & Vertigo Dolly Zoom)", "Stanley Kubrick (One-Point Perspective & 2001 Space Odyssey)",
      "Akira Kurosawa (Seven Samurai Dynamic Weather Blocking)", "Federico Fellini (8 1/2 Surrealist Carnivalesque)",
      "Jean-Luc Godard (Breathless Jump Cuts French New Wave)", "Andrei Tarkovsky (Solaris Sculpting in Time Long Takes)",
      "Ingmar Bergman (The Seventh Seal Existential Chess)", "Martin Scorsese (Taxi Driver Moving Tracking Shots)",
      "Christopher Nolan (Inception Practical Effects Non-Linear Time)", "Hayao Miyazaki (Studio Ghibli Spirited Away Animism)",
      "Italian Neorealism (Bicycle Thieves Non-Professional Actors)", "Film Noir High-Contrast Shadows",
      "Mise-en-Scène Spatial Staging", "Kuleshov Montage Psychological Juxtaposition", "Depth of Field (Deep Focus vs Shallow Bokeh)",
      "Dutch Angle Unease Tilt", "Low-Angle Power Shot", "High-Angle Vulnerability Shot",
      "Steadicam Fluid Tracking", "Three-Point Lighting (Key, Fill, Back)", "Golden Hour Natural Warm Glow",
      "Indian Classical Raga (Melodic Framework) and Tala (Rhythmic Cycle)", "Sitar & Tabla Percussion",
      "Arabic Maqam Microtonal Quarter-Tone System", "Oud Fretless Lute", "Andalusian Flamenco Cante Jondo & Phrygian Cadence",
      "Indonesian Gamelan Bronze Metallophone Polyphony", "Brazilian Bossa Nova Syncopated Guitar (Jobim)",
      "West African Djembe Polyrhythmic Talking Drum", "Irish Celtic Fiddle & Uilleann Pipes Reels",
      "Japanese Shakuhachi Bamboo Flute Meditation", "Chinese Guqin Ancient Zither", "Tuvan Throat Singing Overtone Polyphony"
    ]
  },
  {
    root: "Master Visual Artists, Sculptors & Movements",
    category: "VisualArtMasters",
    children: [
      "Leonardo da Vinci (Renaissance Polymath)", "Michelangelo Buonarroti (Sistine Chapel & David)",
      "Raphael Sanzio (School of Athens Fresco)", "Caravaggio (Master of Chiaroscuro & Tenebrism)",
      "Rembrandt van Rijn (Dutch Golden Age Master)", "Johannes Vermeer (Master of Intimate Light)",
      "Diego Velazquez (Las Meninas Court Painter)", "Francisco Goya (Black Paintings & Third of May)",
      "Claude Monet (Father of Impressionism Water Lilies)", "Vincent van Gogh (Post-Impressionist Visionary)",
      "Paul Cezanne (Father of Modern Art Geometric Planes)", "Pablo Picasso (Pioneer of Cubism & Guernica)",
      "Salvador Dali (Surrealist Melting Clocks)", "Rene Magritte (Surrealist Treachery of Images)",
      "Frida Kahlo (Mexican Surrealist Self-Portraits)", "Henri Matisse (Master of Color and Cut-Outs)",
      "Wassily Kandinsky (Pioneer of Abstract Art)", "Jackson Pollock (Action Painting Drip Technique)",
      "Mark Rothko (Color Field Painting Sublime Emotion)", "Andy Warhol (King of Pop Art Silk-Screening)",
      "Hokusai (Japanese Ukiyo-e Woodblock Great Wave)", "Hiroshige (Fifty-Three Stations of Tokaido)",
      "Auguste Rodin (The Thinker Bronze Sculpture)", "Gian Lorenzo Bernini (Ecstasy of Saint Teresa)",
      "Constantin Brancusi (Bird in Space Modernist Sculpture)", "Alexander Calder (Kinetic Mobile Sculptures)",
      "Georgia O'Keeffe (American Modernist Flower Landscapes)", "Gustav Klimt (Vienna Secession The Kiss)",
      "Egon Schiele (Austrian Expressionist Figurative)", "Edward Hopper (Nighthawks American Realism)",
      "Roy Lichtenstein (Pop Art Ben-Day Dots)", "Keith Haring (Pop Art Radiant Baby Murals)",
      "Jean-Michel Basquiat (Neo-Expressionist Crown Iconography)", "Banksy (Satirical Stencil Street Art Balloon Girl)",
      "Yayoi Kusama (Infinity Mirror Rooms & Polka Dots)", "Marina Abramovic (The Artist Is Present Performance)",
      "Christo and Jeanne-Claude (Large-Scale Environmental Wrapping)", "Anish Kapoor (Cloud Gate The Bean Chicago)"
    ]
  },
  {
    root: "Classical, Romantic & Modern Music Virtuosos",
    category: "MusicMasters",
    children: [
      "Johann Sebastian Bach (The Well-Tempered Clavier & Brandenburg Concertos)",
      "Wolfgang Amadeus Mozart (Requiem, Don Giovanni, Symphony No. 40)",
      "Ludwig van Beethoven (Symphony No. 9 Ode to Joy, Moonlight Sonata)",
      "Franz Schubert (Winterreise Lieder & Unfinished Symphony)",
      "Frederic Chopin (Nocturnes, Ballades, and Polonaises for Piano)",
      "Franz Liszt (Transcendental Etudes & Hungarian Rhapsodies)",
      "Johannes Brahms (German Requiem & Academic Festival Overture)",
      "Pyotr Ilyich Tchaikovsky (Swan Lake, The Nutcracker, 1812 Overture)",
      "Richard Wagner (The Ring of the Nibelung Gesamtkunstwerk)",
      "Gustav Mahler (Symphony of a Thousand & Resurrection Symphony)",
      "Claude Debussy (Clair de Lune & Prelude to the Afternoon of a Faun)",
      "Maurice Ravel (Bolero & Pavane for a Dead Princess)",
      "Igor Stravinsky (The Firebird & Petrushka Ballet)",
      "Sergei Rachmaninoff (Piano Concerto No. 2 & Rhapsody on a Theme of Paganini)",
      "Bela Bartok (Music for Strings, Percussion and Celesta)",
      "Dmitri Shostakovich (Symphony No. 5 & String Quartet No. 8)",
      "George Gershwin (Rhapsody in Blue & Porgy and Bess)",
      "Miles Davis (Kind of Blue & Bitches Brew Jazz)",
      "John Coltrane (A Love Supreme & Giant Steps)",
      "Duke Ellington (Take the A Train Big Band Swing)",
      "Thelonious Monk (Round Midnight Bebop Syncopation)",
      "Bill Evans (Sunday at the Village Vanguard Modal Jazz Trio)"
    ]
  },
  {
    root: "World Architectural Landmarks & Engineering Feats",
    category: "ArchitectureLandmarks",
    children: [
      "The Great Pyramid of Giza (Khufu Ancient Wonder)", "The Parthenon of Athens (Classical Doric Temple)",
      "The Roman Colosseum (Flavian Amphitheater)", "The Pantheon of Rome (Unreinforced Concrete Dome)",
      "Hagia Sophia (Byzantine Grand Pendentive Dome Istanbul)", "Notre-Dame de Paris (Gothic Flying Buttresses)",
      "Chartres Cathedral (Gothic Rose Stained Glass Windows)", "Florence Cathedral Dome (Filippo Brunelleschi)",
      "St. Peter's Basilica (Vatican Renaissance Baroque)", "The Taj Mahal (Mughal White Marble Agra)",
      "The Alhambra (Moorish Islamic Palace Granada)", "Angkor Wat (Khmer Temple Complex Cambodia)",
      "Machu Picchu (Incan Stone Citadel Andes)", "The Forbidden City (Ming Qing Imperial Palace Beijing)",
      "Versailles Palace (Hall of Mirrors French Baroque)", "St. Basil's Cathedral (Onion Domes Red Square Moscow)",
      "The Crystal Palace (1851 Prefabricated Cast-Iron London)", "The Eiffel Tower (Wrought-Iron Lattice Paris)",
      "Fallingwater (Frank Lloyd Wright Organic Architecture)", "Villa Savoye (Le Corbusier Modernist 5 Points)",
      "The Sydney Opera House (Jorn Utzon Precast Concrete Shells)", "The Guggenheim Museum Bilbao (Frank Gehry Titanium)",
      "The Burj Khalifa (Supertall Buttressed Core Dubai)", "The Sagrada Familia (Antoni Gaudi Catalan Modernisme Barcelona)"
    ]
  }
];

// -------------------------------------------------------------
// 6. Life Lessons Expansion Taxonomies (Target 700+ nodes)
// -------------------------------------------------------------
const lifeLessonsTaxonomy = [
  {
    root: "Latticework of Mental Models & Strategic Decision Making",
    category: "MentalModel",
    children: [
      "First Principles Thinking (Aristotle & Musk)", "Second-Order Thinking (Howard Marks)",
      "Inversion Principle (Carl Jacobi 'Invert, Always Invert')", "Occam's Razor Simplicity Heuristic",
      "Hanlon's Razor Compassion Heuristic", "Pareto Principle (80/20 Rule)", "Price's Law of Asymmetric Output",
      "Circle of Competence (Warren Buffett & Charlie Munger)", "The Map is Not the Territory (Alfred Korzybski)",
      "Antifragility (Nassim Nicholas Taleb)", "Barbell Strategy (Extreme Safety + Asymmetric Upside)",
      "Skin in the Game (Symmetric Accountability)", "Chesterton's Fence (Understand Before Abolishing)",
      "Goodhart's Law (Metric Becomes Target)", "Campbell's Law of Indicator Corruption",
      "Cobweb Effect in Market Cycles", "Tragedy of the Commons", "Prisoner's Dilemma Game Theory",
      "Tit-for-Tat with Forgiveness Strategy (Robert Axelrod)", "Nash Equilibrium in Strategy",
      "Ashby's Law of Requisite Variety", "Red Queen Principle (Evolutionary Arms Race)",
      "Galling's Law (Complex Systems Evolve from Simple Working Ones)", "Margin of Safety Engineering Buffering",
      "Opportunity Cost Evaluation", "Comparative Advantage Trade Theory (David Ricardo)",
      "Zero-Sum vs Positive-Sum Cooperation Dynamics", "Regret Minimization Framework (Jeff Bezos)",
      "Expected Value Calculation (Probability x Payoff)", "Survivorship Bias Awareness",
      "Base Rate Fallacy Correction (Bayesian Thinking)", "Confirmation Bias Countermeasure (Falsification)"
    ]
  },
  {
    root: "Psychological Resilience, Stoic Philosophy & Emotional Mastery",
    category: "ResiliencePsychology",
    children: [
      "Dichotomy of Control (Epictetus: Internal vs External)", "Amor Fati (Love of One's Fate)",
      "Memento Mori (Mindfulness of Mortality)", "Premeditatio Malorum (Negative Visualization)",
      "Voluntary Discomfort Practice (Seneca)", "Ataraxia (Tranquil Freedom from Fear)",
      "Apatheia (Freedom from Destructive Passions)", "Inner Citadel (Marcus Aurelius Meditations)",
      "Cognitive Reframing (Aaron Beck Cognitive Behavioral Therapy)", "Locus of Control (Internal vs External Rotter)",
      "Growth Mindset vs Fixed Mindset (Carol Dweck)", "Learned Helplessness vs Learned Optimism (Seligman)",
      "Flow State (Mihaly Csikszentmihalyi Optimal Experience)", "Delay of Gratification (Stanford Marshmallow Study)",
      "Radical Acceptance (Carl Rogers & Tara Brach)", "Antifragile Post-Traumatic Growth",
      "Logotherapy & Search for Meaning (Viktor Frankl)", "The Shadow Self Integration (Carl Jung)",
      "Emotional Intelligence (Daniel Goleman: Self-Awareness & Empathy)", "Active Listening & Nonviolent Communication (Marshall Rosenberg)"
    ]
  },
  {
    root: "Behavioral Habits, Execution & Personal Productivity",
    category: "ProductivityExecution",
    children: [
      "The Habit Loop (Cue, Routine, Reward - Charles Duhigg)", "Atomic Habits 4 Laws (Make Obvious, Attractive, Easy, Satisfying)",
      "Identity-Based Habit Change (James Clear)", "Implementation Intentions ('If X happens, I will do Y')",
      "Habit Stacking onto Existing Routines", "Friction Reduction (The 2-Minute Rule)",
      "Deep Work Sprints (Cal Newport)", "Attention Residue from Task Switching", "Time Blocking Calendar Strategy",
      "Eisenhower Matrix (Urgent vs Important Quadrants)", "Parkinson's Law of Work Expansion",
      "Deliberate Practice & Expert Feedback (Anders Ericsson)", "Spaced Repetition & Forgetting Curve (Hermann Ebbinghaus)",
      "Active Recall Testing Effect", "Pomodoro Focus Cycles (25m Focus / 5m Rest)", "Eat That Frog (Tackle Hardest Task First)",
      "Inbox Zero Email Processing Strategy", "The 5 Whys Root Cause Analysis (Toyota Production System)"
    ]
  },
  {
    root: "Negotiation, Influence & Financial Wisdom",
    category: "NegotiationFinance",
    children: [
      "BATNA (Best Alternative to a Negotiated Agreement Fisher & Ury)", "ZOPA (Zone of Possible Agreement)",
      "Cialdini's Reciprocity Principle", "Cialdini's Scarcity Principle", "Cialdini's Authority Principle",
      "Cialdini's Consistency & Commitment Principle", "Cialdini's Social Proof Principle", "Cialdini's Liking Principle",
      "Tactical Empathy & Emotional Labeling (Chris Voss Never Split the Difference)", "The Calibrated 'How' and 'What' Questions",
      "Anchoring in Salary & Contract Negotiations", "Dollar-Cost Averaging (DCA Investment Strategy)",
      "Asset Allocation Rebalancing (Stocks, Bonds, Real Assets)", "Sequence of Returns Risk in Retirement",
      "Compounding Interest Magic (Albert Einstein 8th Wonder)", "Lifestyle Creep & Hedonic Treadmill Resistance",
      "Emergency Fund Liquidity Buffer (6 Months Expenses)", "Opportunity Cost of Capital",
      "Symmetric Upside vs Downside (Risk Management)", "Circle of Competence in Capital Allocation"
    ]
  },
  {
    root: "Systems Thinking, Complexity & Cognitive Biases",
    category: "SystemsThinking",
    children: [
      "Donella Meadows Leverage Points (12 Places to Intervene in a System)", "Balancing Negative Feedback Loops (Homeostasis)",
      "Reinforcing Positive Feedback Loops (Runaway Compounding)", "Stocks and Inflow/Outflow Buffers",
      "System Delays and Oscillations", "Tragedy of the Commons Shared Resource Depletion",
      "Shifting the Burden / Addiction Loop", "Eroding Goals / Boiling Frog Syndrome",
      "Hyperbolic Discounting (Overweighting Immediate vs Future Gratification)", "Endowment Effect (Overvaluing What We Own)",
      "Framing Effect (Decisions Influenced by Presentation Context)", "Choice Overload Paradox (Barry Schwartz)",
      "Status Quo Bias (Resistance to Baseline Departure)", "Peak-End Rule (Kahneman Evaluation of Experiences)",
      "Nudge Theory Behavioral Architecture (Richard Thaler)", "Radical Candor (Care Personally + Challenge Directly Kim Scott)",
      "High Output Management (Managerial Leverage Andy Grove)", "The 7 Habits of Highly Effective People (Stephen Covey)",
      "Getting Things Done Workflow Capture (David Allen GTD)", "Principle of Subsidiarity in Decentralized Management"
    ]
  },
  {
    root: "Mastery, Learning Theories & Metacognition",
    category: "LearningMetacognition",
    children: [
      "Dreyfus Model of Skill Acquisition (Novice to Expert)", "Bloom's Taxonomy (Remember, Understand, Apply, Analyze, Evaluate, Create)",
      "The Feynman Technique (Explain to a Child Simplicity Test)", "Retrieval Practice Effect (Testing Enhances Retention)",
      "Interleaving Practice vs Blocked Practice", "Desirable Difficulties in Long-Term Memory (Bjork)",
      "Leitner Box Spaced Repetition Flashcard System", "The Dual Coding Theory (Verbal and Visual Processing Paivio)",
      "Cognitive Load Theory (Intrinsic, Extraneous, Germane Sweller)", "Chunking in Working Memory (George Miller 7 Plus Minus 2)",
      "Metacognitive Monitoring and Calibration", "Zone of Proximal Development (Lev Vygotsky ZPD)",
      "Scaffolding in Educational Mastery", "Deliberate Rest and Incubation in Creative Breakthroughs",
      "Ultradian Rhythm Focus Cycles (90-Minute Energy Waves)", "Sleep Architecture and Memory Consolidation (REM & Slow-Wave)",
      "The Generation Effect (Self-Generated Answers Stick Better)", "Transfer of Learning across Distant Domains"
    ]
  },
  {
    root: "Interpersonal Dynamics, Conflict Resolution & Social Intelligence",
    category: "SocialDynamics",
    children: [
      "The Johari Window (Open, Blind, Hidden, Unknown Self)", "Thomas-Kilmann Conflict Mode Instrument (Competing, Collaborating, Compromising, Avoiding, Accommodating)",
      "Active Empathic Listening and Reflection", "Psychological Safety in Teams (Amy Edmondson)",
      "Dunbar's Number (150 Natural Community Limit)", "Social Proof and Informational Cascades",
      "Fundamental Attribution Error in Team Conflict", "The Pygmalion Effect (High Expectations Drive Performance)",
      "The Golem Effect (Low Expectations Degrade Performance)", "Emotional Contagion in Groups",
      "Nonviolent Communication 4 Steps (Observation, Feeling, Need, Request)", "The Drama Triangle (Victim, Rescuer, Persecutor Karpman)",
      "The Empowerment Dynamic (Creator, Challenger, Coach)", "Boundaries and Assertiveness without Aggression",
      "Gaslighting Recognition and Reality Grounding", "Triangulation Defense in Interpersonal Conflict",
      "The Abilene Paradox (Group Agrees to Action Nobody Wants)", "Groupthink Symptoms and Devil's Advocate Safeguard"
    ]
  },
  {
    root: "Cognitive Heuristics, Mental Fallacies & Biases",
    category: "CognitiveHeuristics",
    children: [
      "Survivorship Bias (Focusing on Winners Ignoring Failures)", "Availability Cascade (Self-Reinforcing Public Belief)",
      "Affect Heuristic (Gut Emotional Rapid Decision)", "Neglect of Probability (Ignoring Statistical Likelihood)",
      "Gambler's Fallacy (Belief in Event Correction)", "Hot Hand Fallacy (Perceived Streak Success)",
      "Clustering Illusion (Seeing Patterns in Random Noise)", "Texas Sharpshooter Fallacy (Target Drawn Around Hits)",
      "Base Rate Fallacy (Ignoring General Statistical Population Baseline)", "Zero-Risk Bias (Preferring Elimination of Small Risk)",
      "Outcome Bias (Judging Decision Solely by Outcome)", "Overconfidence Effect (Subjective Confidence Exceeds Objective Accuracy)",
      "Illusion of Control (Belief in Directing Inevitable Events)", "Egocentric Bias (Recalling Past as Self-Directed)",
      "Halo Effect (Positive Trait Overshadows Flaws)", "Horn Effect (Negative Trait Overshadows Strengths)",
      "Self-Serving Bias (Success to Self, Failure to Others)", "Just-World Hypothesis (Belief that the World is Inherently Fair)",
      "Naive Realism (Belief that One Sees Reality Directly Without Bias)", "The Third-Person Effect (Belief that Mass Media Affects Others More)"
    ]
  },
  {
    root: "Decision Making Under Deep Uncertainty & Risk",
    category: "DecisionRisk",
    children: [
      "Cynefin Framework (Simple, Complicated, Complex, Chaotic Domains)", "OODA Loop (Observe, Orient, Decide, Act John Boyd)",
      "Kelly Criterion Optimal Bet Sizing Formula", "Expected Value Maximization under Imperfect Information",
      "Minimax Regret Strategy (Decision Theory)", "Satisficing vs Maximizing (Herbert Simon Bounded Rationality)",
      "Reversible vs Irreversible Decisions (Type 1 vs Type 2 Decisions Jeff Bezos)", "Pre-Mortem Strategy (Gary Klein Prospective Hindsight)",
      "Red Teaming and Adversarial Role-Playing", "Scenario Planning & Multiple Future Simulations (Shell Method)",
      "Margin of Safety Buffering in Financial Engineering", "Ergodicity in Wealth Accumulation (Ole Peters Ensemble vs Time Average)",
      "Lindy Effect (Future Life Expectancy Proportional to Current Age)", "Taleb's Fat Tails & Extreme Value Distributions",
      "Fragile vs Robust vs Antifragile Systems Response to Volatility", "Optionality (Right but Not Obligation with Asymmetric Upside)"
    ]
  },
  {
    root: "Emotional Mastery, Mindfulness & Inner Strength",
    category: "EmotionalMastery",
    children: [
      "Cognitive Distancing & Self-Talk Shift", "RAIN Mindfulness Technique (Recognize, Allow, Investigate, Nurture)",
      "Window of Tolerance (Hyperarousal, Optimal Zone, Hypoarousal)", "Self-Compassion Triad (Self-Kindness, Common Humanity, Mindfulness Kristin Neff)",
      "Vulnerability as Courage (Brené Brown Daring Greatly)", "Equanimity under Pressure (Inner Calm Amid External Storm)",
      "Reframing Adversity into Character Refinement", "Sympatheia (Cosmic Interconnectedness Stoic Practice)",
      "View from Above (Transcending Micro-Agitations Marcus Aurelius)", "Sophrosyne (Harmonious Self-Control and Balance)"
    ]
  }
];

// -------------------------------------------------------------
// 7. Literature Expansion Taxonomies (Target 700+ nodes)
// -------------------------------------------------------------
const literatureTaxonomy = [
  {
    root: "Narrative Architectures, Tropes & Literary Devices",
    category: "Narratology",
    children: [
      "The Hero's Journey (Monomyth Joseph Campbell)", "Departure Phase (Call to Adventure, Refusal of Call)",
      "Initiation Phase (Road of Trials, Meeting with the Goddess, Atonement with Father)",
      "Return Phase (Magic Flight, Master of Two Worlds, Freedom to Live)",
      "Three-Act Structure (Setup, Confrontation, Climax Resolution)", "Plot Point 1 & Plot Point 2",
      "Midpoint Reversal Shift", "Freytag's Pyramid 5-Act Dramatic Arc", "Inciting Incident",
      "Rising Action Complications", "Climax Moment of Peak Crisis", "Falling Action Resolution",
      "Denouement Untying of Knots", "In Medias Res Opening", "Dan Harmon 8-Beat Story Circle",
      "Save the Cat 15-Beat Sheet (Blake Snyder)", "Chekhov's Gun Dramatic Necessity",
      "Red Herring Misdirection Clue", "Unreliable Narrator (First Person Bias/Deception)",
      "Dramatic Irony (Audience Knows Truth Characters Do Not)", "Situational Irony (Opposite Outcome Occurs)",
      "Verbal Irony & Sarcasm", "Deus Ex Machina External Plot Contrivance", "MacGuffin Plot Motivator (Hitchcock)",
      "Rashomon Effect Conflicting Eyewitnesses", "Stream of Consciousness Interior Monologue",
      "Frame Narrative (Story within a Story)", "Foreshadowing Symbolic Clues", "Cliffhanger Ending",
      "Epiphany Moment of Spiritual Insight (James Joyce)", "Hubris Overweening Pride Leading to Fall",
      "Hamartia Fatal Flaw in Aristotelian Tragedy", "Catharsis Emotional Purging in Audience",
      "Anagnorisis Moment of Critical Truth Discovery", "Peripeteia Sudden Reversal of Fortune"
    ]
  },
  {
    root: "World Classics, Master Authors & Literary Movements",
    category: "LiteraryCanon",
    children: [
      "Epic of Gilgamesh (Ancient Mesopotamia)", "The Iliad (Homer Trojan War Epic)",
      "The Odyssey (Homer Odysseus 10-Year Return)", "Oedipus Rex (Sophocles Greek Tragedy)",
      "Medea (Euripides Tragedy)", "The Aeneid (Virgil Roman Epic)", "Metamorphoses (Ovid Mythological Transformations)",
      "The Divine Comedy (Dante Alighieri Inferno, Purgatorio, Paradiso)", "The Decameron (Giovanni Boccaccio)",
      "The Canterbury Tales (Geoffrey Chaucer Middle English)", "Don Quixote (Miguel de Cervantes Picaresque Satire)",
      "Hamlet (William Shakespeare Tragedy of Inaction)", "King Lear (Shakespeare Tragedy of Blind Pride)",
      "Macbeth (Shakespeare Tragedy of Ruthless Ambition)", "Othello (Shakespeare Tragedy of Jealous Manipulation)",
      "Paradise Lost (John Milton Epic of Satan and Fall of Man)", "Gulliver's Travels (Jonathan Swift Satire)",
      "Candide (Voltaire Philosophical Satire of Optimism)", "Faust (Johann Wolfgang von Goethe Tragedy of Soul Pact)",
      "Frankenstein (Mary Shelley Gothic Science Fiction)", "Jane Eyre (Charlotte Bronte Gothic Romance)",
      "Wuthering Heights (Emily Bronte Romantic Obsession)", "Pride and Prejudice (Jane Austen Comedy of Manners)",
      "Moby-Dick (Herman Melville Allegory of Cosmic Obsession)", "The Scarlet Letter (Nathaniel Hawthorne Puritan Guilt)",
      "Crime and Punishment (Fyodor Dostoevsky Utilitarian Guilt)", "The Brothers Karamazov (Dostoevsky Faith and Doubt)",
      "War and Peace (Leo Tolstoy Napoleonic Invasion Realism)", "Anna Karenina (Tolstoy Tragedy of Passion and Society)",
      "Madame Bovary (Gustave Flaubert Realist Critique of Romanticism)", "Les Miserables (Victor Hugo Epic of Redemption)",
      "The Metamorphosis (Franz Kafka Absurdist Alienation)", "The Trial (Franz Kafka Bureaucratic Nightmare)",
      "Ulysses (James Joyce Modernist Dublin Odyssey)", "To the Lighthouse (Virginia Woolf Modernist Stream of Consciousness)",
      "In Search of Lost Time (Marcel Proust Involuntary Memory & Madeleines)", "The Great Gatsby (F. Scott Fitzgerald Jazz Age Tragedy)",
      "One Hundred Years of Solitude (Gabriel Garcia Marquez Magical Realism Macondo)", "1984 (George Orwell Totalitarian Dystopia)",
      "Brave New World (Aldous Huxley Hedonistic Conditioning Dystopia)", "Fahrenheit 451 (Ray Bradbury Book-Burning Censorship)",
      "Waiting for Godot (Samuel Beckett Absurdist Theater)", "Things Fall Apart (Chinua Achebe African Colonial Tragedy)",
      "Beloved (Toni Morrison Historical Ghost Trauma)", "Kafka on the Shore (Haruki Murakami Magic Realism)",
      "Ficciones & Labyrinths (Jorge Luis Borges Infinite Library)", "Invisible Cities (Italo Calvino Marco Polo Dialogue)",
      "Blood Meridian & The Road (Cormac McCarthy Apocalyptic Sublime)", "The Handmaid's Tale (Margaret Atwood Dystopian Theocracy)",
      "Never Let Me Go (Kazuo Ishiguro Clone Humanity)", "The Stranger (Albert Camus Absurdist Murder Meursault)",
      "Siddhartha (Hermann Hesse Eastern Enlightenment Journey)", "Midnight's Children (Salman Rushdie Indian Independence Magic Realism)"
    ]
  },
  {
    root: "Poetics, Metric Forms & Master Poets",
    category: "PoeticsCanon",
    children: [
      "Metaphor Conceptual Mapping", "Simile Explicit Comparison", "Synecdoche Part for Whole",
      "Metonymy Associated Attribute Substitute", "Allegory Extended Metaphorical Narrative",
      "Hyperbole Intentional Dramatic Exaggeration", "Litotes Ironical Understatement",
      "Personification Giving Human Traits to Inanimate", "Oxymoron Contradictory Terms Joint",
      "Chiasmus Inverted Parallelism ABBA", "Anaphora Repetition of Beginning Words",
      "Epistrophe Repetition of Ending Words", "Alliteration Repetition of Consonant Sounds",
      "Assonance Repetition of Vowel Sounds", "Onomatopoeia Sound-Imitating Words",
      "Iambic Pentameter (da-DUM da-DUM 10 Syllables)", "Shakespearean English Sonnet (ABAB CDCD EFEF GG)",
      "Petrarchan Italian Sonnet (Octave ABBAABBA + Sestet CDECDE)", "Haiku (5-7-5 Japanese Nature Verse)",
      "Tanka (5-7-5-7-7 Japanese Poetic Form)", "Villanelle (19 Lines with 2 Repeating Refrains)",
      "Free Verse Non-Metrical Modern Poetry", "Blank Verse Unrhymed Iambic Pentameter",
      "Ballad Stanza Folk Narrative Rhyme", "Elegy Poem of Mourning and Loss", "Ode Celebratory Lyric Poem",
      "William Blake (Songs of Innocence and Experience)", "John Keats (Ode on a Grecian Urn & Negative Capability)",
      "Percy Bysshe Shelley (Ozymandias Sublime Ruin)", "Lord Byron (Childe Harold's Pilgrimage Byronic Hero)",
      "Emily Dickinson (Slant Rhyme and Reclusive Genius)", "Walt Whitman (Leaves of Grass Democratic Free Verse)",
      "T.S. Eliot (The Waste Land Modernist Fragmentation)", "W.B. Yeats (The Second Coming & Celtic Twilight)",
      "Pablo Neruda (Twenty Love Poems and a Song of Despair)", "Rumi (Masnavi Sufi Mystical Poetry of Divine Love)",
      "Hafez of Shiraz (Divan of Persian Ghazals)", "Matsuo Basho (The Narrow Road to the Deep North Haiku)",
      "Maya Angelou (I Know Why the Caged Bird Sings)"
    ]
  },
  {
    root: "Literary Genres, Playwrights & Dramaturgy",
    category: "DramaturgyGenres",
    children: [
      "Anton Chekhov (The Cherry Orchard & The Seagull Realist Subtext)", "Henrik Ibsen (A Doll's House Father of Modern Realism)",
      "Arthur Miller (Death of a Salesman The American Dream Tragedy)", "Tennessee Williams (A Streetcar Named Desire Southern Gothic Drama)",
      "Bertolt Brecht (Epic Theater & Alienation Effect Verfremdungseffekt)", "Samuel Beckett (Endgame & Krapp's Last Tape)",
      "Cyberpunk (William Gibson Neuromancer High Tech Low Life)", "Steampunk (Victorian Industrial Steam Sci-Fi)",
      "Solarpunk (Optimistic Sustainable Eco-Futurism)", "High Fantasy (J.R.R. Tolkien The Lord of the Rings Worldbuilding)",
      "Hard Science Fiction (Arthur C. Clarke 2001 & Isaac Asimov Foundation)", "Southern Gothic (William Faulkner The Sound and the Fury)",
      "Psychological Thriller (Daphne du Maurier Rebecca)", "Noir Detective Fiction (Raymond Chandler The Big Sleep)"
    ]
  },
  {
    root: "Literary Theory, Criticism & Hermeneutics",
    category: "LiteraryTheory",
    children: [
      "Russian Formalism (Defamiliarization / Ostranenie Viktor Shklovsky)", "New Criticism (Close Reading and Intentional Fallacy Wimsatt & Beardsley)",
      "Structuralism in Literature (Roland Barthes Death of the Author)", "Deconstruction & Differance (Jacques Derrida)",
      "Postcolonial Criticism (Edward Said Orientalism & Gayatri Spivak Subaltern)", "Feminist Literary Theory (Sandra Gilbert The Madwoman in the Attic)",
      "Psychoanalytic Criticism (Freud Uncanny & Lacan Symbolic Order)", "Reader-Response Theory (Stanley Fish Interpretive Communities)",
      "New Historicism (Stephen Greenblatt Cultural Poetics)", "Marxist Literary Criticism (Terry Eagleton Base and Superstructure)",
      "Narrative Voice: First Person Protagonist", "First Person Peripheral Narrator",
      "Second Person Direct Address ('You')", "Third Person Limited Point of View",
      "Third Person Omniscient Point of View", "Free Indirect Discourse (Gustave Flaubert & Jane Austen)"
    ]
  },
  {
    root: "Classic Plays, Greek Tragedies & Dramatic Soliloquies",
    category: "ClassicDramas",
    children: [
      "Antigone (Sophocles Divine Law vs State Law)", "The Oresteia (Aeschylus Blood Feud to Court Trial)",
      "The Bacchae (Euripides Rational Order vs Dionysian Frenzy)", "Lysistrata (Aristophanes Anti-War Satire)",
      "Romeo and Juliet (Shakespeare Star-Crossed Lovers Fate)", "Julius Caesar (Shakespeare Rhetoric & Tyrannicide)",
      "A Midsummer Night's Dream (Shakespeare Forest Transformation)", "The Merchant of Venice (Shakespeare Justice and Mercy)",
      "Twelfth Night (Shakespeare Gender Disguise and Desire)", "Tartuffe (Moliere Religious Hypocrisy Comedy)",
      "The Misanthrope (Moliere Social Satire)", "Faust Part One & Two (Goethe Romantic Striving)",
      "Peer Gynt (Henrik Ibsen Self-Discovery Mythic Journey)", "The Crucible (Arthur Miller Salem Witch Hunt Allegory)",
      "A Raisin in the Sun (Lorraine Hansberry Family Dreams)", "Long Day's Journey into Night (Eugene O'Neill Family Tragedy)"
    ]
  },
  {
    root: "World Epics, Narrative Folklore & Mythic Poems",
    category: "WorldEpicsFolklore",
    children: [
      "Beowulf (Old English Heroic Monster Slayer Grendel)", "Song of Roland (Old French Chanson de Geste)",
      "Nibelungenlied (Middle High German Dragon Slayer Siegfried)", "The Poem of the Cid (Spanish Reconquista Epic)",
      "Shahnameh (Ferdowsi Persian Epic of Kings Rostam)", "The Tale of the Heike (Japanese Samurai Tragic Feud)",
      "Mahabharata (Vyasa Sanskrit Epic Kurukshetra War)", "Ramayana (Valmiki Sanskrit Epic Rama and Sita)",
      "Journey to the West (Wu Cheng'en Monkey King Sun Wukong)", "Dream of the Red Chamber (Cao Xueqin Qing Grandeur)",
      "Water Margin (Outlaws of the Marsh Song Dynasty Rebels)", "Romance of the Three Kingdoms (Luo Guanzhong Han Strategy)",
      "Epic of Sundiata (Mali Lion King Griot Oral Tradition)", "The Mabinogion (Welsh Celtic Mythological Prose)"
    ]
  }
];

// -------------------------------------------------------------
// 8. Philosophy Expansion Taxonomies (Target 700+ nodes)
// -------------------------------------------------------------
const philosophyTaxonomy = [
  {
    root: "Classical Ancient & Hellenistic Philosophy",
    category: "AncientPhilosophy",
    children: [
      "Socrates (Elenchus Socratic Method)", "Plato (Theory of Ideal Forms)", "Allegory of the Cave (Plato Republic)",
      "Philosopher King Political Model", "Platonic Tripartite Soul (Reason, Spirit, Appetite)",
      "Aristotle (Four Causes: Material, Formal, Efficient, Final)", "Aristotelian Syllogistic Logic (Organon)",
      "Nicomachean Ethics (Golden Mean Doctrine)", "Eudaimonia (Human Flourishing Activity of Soul)",
      "Presocratics: Thales of Miletus (Water as Arche)", "Anaximander (Apeiron Boundless Infinite)",
      "Heraclitus (Eternal Flux & Logos 'Panta Rhei')", "Parmenides of Elea (Unchanging Monism of Being)",
      "Zeno of Elea (Motion Paradoxes: Achilles and the Tortoise)", "Democritus (Atomism & Void Vacuum)",
      "Epicurus (Hedonistic Ataraxia & Materialist Atomism)", "Zeno of Citium (Founder of Stoicism at Stoa Poikile)",
      "Seneca the Younger (Letters from a Stoic on Time and Grief)", "Epictetus (Enchiridion & Dichotomy of Control)",
      "Marcus Aurelius (Meditations on Duty, Nature, and Mortality)", "Pyrrho of Elis (Pyrrhonian Skepticism Epoché)",
      "Sextus Empiricus (Outlines of Pyrrhonism)", "Plotinus (Neoplatonism & The One Emanation)"
    ]
  },
  {
    root: "Islamic Golden Age Philosophy & Medieval Scholasticism",
    category: "IslamicScholastic",
    children: [
      "Al-Kindi (First Arab Philosopher)", "Al-Farabi (The Second Teacher Al-Madina al-Fadila)",
      "Ibn Sina / Avicenna (The Book of Healing & Floating Man)", "Avicennian Essence-Existence Distinction",
      "Al-Ghazali (Proof of Islam Hujjat al-Islam)", "Tafahut al-Falasifah (The Incoherence of the Philosophers Al-Ghazali)",
      "Occasionalist Metaphysics (God as Direct Sole Cause of Every Event)",
      "Al-Ghazali's Critique of Natural Necessity in Causality", "The Alchemy of Happiness (Kimiya-yi Sa'adat)",
      "Deliverance from Error (Al-Munqidh min al-Dalal)", "Ibn Rushd / Averroes (The Great Commentator on Aristotle)",
      "Tafahut al-Tafahut (The Incoherence of the Incoherence Averroes)",
      "Double Truth Doctrine Harmonization of Faith and Rational Demonstration",
      "Ibn Tufayl (Hayy ibn Yaqzan Philosophical Novel)", "Ibn Khaldun (Muqaddimah Founder of Sociology & Asabiyyah)",
      "Maimonides (The Guide for the Perplexed Jewish Aristotelianism)",
      "Thomas Aquinas (Summa Theologiae Five Proofs Quinque Viae)", "Thomistic Act and Potency Synthesis",
      "William of Ockham (Nominalism & Ockham's Razor Parsimony)", "Duns Scotus (Univocity of Being)"
    ]
  },
  {
    root: "Modern Western Philosophy, Enlightenment & Existentialism",
    category: "ModernPhilosophy",
    children: [
      "Rene Descartes (Meditations on First Philosophy Cogito Ergo Sum)", "Cartesian Mind-Body Substance Dualism",
      "Baruch Spinoza (Ethics Pantheistic Monism Deus Sive Natura)", "Gottfried Wilhelm Leibniz (Monadology & Principle of Sufficient Reason)",
      "John Locke (An Essay Concerning Human Understanding Tabula Rasa)", "Lockean Natural Rights (Life, Liberty, Property)",
      "George Berkeley (Immaterialism Idealism 'To Be is to Be Perceived Esse est Percipi')",
      "David Hume (A Treatise of Human Nature Problem of Induction)", "Hume's Fork (Matters of Fact vs Relations of Ideas)",
      "Hume's Is-Ought Problem in Ethics", "Immanuel Kant (Critique of Pure Reason Synthetic A Priori)",
      "Transcendental Idealism (Phenomena vs Noumena Thing-in-Itself)", "Kant's Categorical Imperative Deontology",
      "G.W.F. Hegel (Phenomenology of Spirit Master-Slave Dialectic)", "Hegelian Absolute Idealism & Historical Geist",
      "Arthur Schopenhauer (The World as Will and Representation Pessimism)",
      "Soren Kierkegaard (Fear and Trembling Knight of Faith)", "Friedrich Nietzsche (Thus Spoke Zarathustra Will to Power)",
      "Nietzsche's Death of God & Overman Ubermensch", "Eternal Recurrence Thought Experiment",
      "Karl Marx (Das Kapital Historical Materialism & Class Struggle)", "Charles Sanders Peirce (Pragmatic Maxim of Meaning)",
      "William James (Pragmatism & Stream of Consciousness)", "John Dewey (Instrumentalism in Education)",
      "Edmund Husserl (Phenomenological Epoché Intentionality)", "Martin Heidegger (Being and Time Dasein Authenticity)",
      "Jean-Paul Sartre (Being and Nothingness Existence Precedes Essence)", "Sartrean Bad Faith (Mauvaise Foi Self-Deception)",
      "Albert Camus (The Myth of Sisyphus Absurd Rebellion)", "Simone de Beauvoir (The Second Sex Feminist Existentialism)",
      "Ludwig Wittgenstein (Tractatus Logico-Philosophicus Picture Theory)", "Wittgenstein's Philosophical Investigations Language Games",
      "Bertrand Russell (Logical Atomism & Theory of Definite Descriptions)", "Karl Popper (Conjectures and Refutations Falsificationism)",
      "Thomas Kuhn (The Structure of Scientific Revolutions Paradigm Shifts)", "John Rawls (A Theory of Justice Veil of Ignorance)",
      "David Chalmers (The Hard Problem of Consciousness & P-Zombies)", "Frank Jackson (Mary the Super-Scientist Knowledge Argument)",
      "John Searle (The Chinese Room Argument against Strong AI)", "Hilary Putnam (Functionalism & Brain in a Vat)",
      "Willard Van Orman Quine (Two Dogmas of Empiricism Web of Belief)", "Wilfrid Sellars (Empiricism and the Philosophy of Mind Myth of Given)",
      "Saul Kripke (Naming and Necessity Rigid Designators)", "Derek Parfit (Reasons and Persons Bundle Theory of Identity)"
    ]
  },
  {
    root: "Eastern & Asian Philosophical Traditions",
    category: "EasternPhilosophy",
    children: [
      "Upanishadic Sage Teachings (Tat Tvam Asi 'Thou Art That')", "Advaita Vedanta Non-Dualism (Adi Shankara)",
      "Brahman (Ultimate Formless Transcendent Reality)", "Atman (The Pure Eternal Innermost Self)",
      "Maya (Cosmic Illusion of Plurality and Separation)", "Bhagavad Gita (Karma Yoga Action Without Attachment)",
      "Siddhartha Gautama Buddha (Enlightenment under Bodhi Tree)", "Four Noble Truths (Dukkha Suffering Diagnosis and Path)",
      "Noble Eightfold Path (Wisdom, Ethical Conduct, Mental Concentration)", "Anatta (Doctrine of Non-Self and No Fixed Ego)",
      "Anicca (Universal Impermanence of All Composite Things)", "Pratityasamutpada (Interdependent Co-Arising of Phenomena)",
      "Nagarjuna (Madhyamaka School Doctrine of Sunyata Emptiness)", "Laozi (Tao Te Ching Harmony with the Tao)",
      "Wu Wei (Effortless Action in Accordance with Nature)", "Zhuangzi (Butterfly Dream Parable and Radical Freedom)",
      "Yin and Yang Dualistic Complementary Cosmic Forces", "Confucius (Analects Cultivation of Moral Character)",
      "Ren (Benevolence and Humanity)", "Li (Ritual Propriety and Etiquette)", "Xiao (Filial Piety towards Ancestors and Parents)",
      "Mencius (Inherent Goodness of Human Nature)", "Xunzi (Human Nature is Inherently Selfish and Requires Discipline)",
      "Chan / Zen Buddhism (Bodhidharma Direct Transmission Beyond Words)", "Koan Practice (Riddles Transcend Linear Logic: 'Clap of One Hand')"
    ]
  },
  {
    root: "Political Philosophy, Law & Applied Ethics",
    category: "PoliticalEthics",
    children: [
      "Thomas Hobbes (Leviathan State of Nature as Nasty, Brutish, and Short)", "Jean-Jacques Rousseau (The Social Contract & The General Will)",
      "Montesquieu (The Spirit of the Laws Separation of Powers)", "John Stuart Mill (On Liberty & The Harm Principle)",
      "Jeremy Bentham (Principle of Utility Greatest Happiness for Greatest Number)", "Hannah Arendt (Eichmann in Jerusalem Banality of Evil)",
      "Michel Foucault (Discipline and Punish The Panopticon & Biopolitics)", "Jurgen Habermas (Theory of Communicative Action Public Sphere)",
      "Robert Nozick (Anarchy, State, and Utopia Entitlement Theory of Justice)", "Peter Singer (Animal Liberation & Effective Altruism)",
      "Carol Gilligan (In a Different Voice Ethics of Care)", "Hans Jonas (The Imperative of Responsibility Future Generations)",
      "John Locke (Second Treatise of Government Property Rights)", "Isaiah Berlin (Two Concepts of Liberty: Negative vs Positive Freedom)",
      "G.E. Moore (Principia Ethica The Naturalistic Fallacy)", "Philippa Foot (Virtues and Vices The Trolley Problem Originator)"
    ]
  },
  {
    root: "Logic, Philosophy of Science & Epistemic Paradoxes",
    category: "LogicParadoxes",
    children: [
      "Propositional Logic & Truth Tables", "First-Order Predicate Calculus (Quantifiers For All / There Exists)",
      "Modal Logic (Possible Worlds Semantics Saul Kripke)", "Gödel's First Incompleteness Theorem",
      "Gödel's Second Incompleteness Theorem", "Russell's Paradox (Set of Sets That Do Not Contain Themselves)",
      "The Halting Problem (Alan Turing Undecidability)", "The Liar Paradox ('This Statement is False')",
      "The Ship of Theseus Paradox (Identity over Time)", "The Sorites Paradox (The Paradox of the Heap)",
      "Hempel's Raven Paradox (Confirmation Theory)", "Goodman's New Riddle of Induction (Grue and Bleen)",
      "Gettier Problem (Justified True Belief Is Insufficient for Knowledge)", "Agrippa's Trilemma (Foundationalism vs Coherentism vs Infinitism)",
      "Epistemic Fallibilism (Charles Sanders Peirce)", "Underdetermination of Scientific Theory by Data (Duhem-Quine Thesis)",
      "Instrumentalism vs Scientific Realism", "Bayesian Epistemology & Prior Probability Updating"
    ]
  },
  {
    root: "Philosophy of Mind, Cognition & Consciousness",
    category: "PhilosophyOfMind",
    children: [
      "Mind-Body Problem (Descartes Substance Dualism vs Physicalism)", "Property Dualism & Epiphenomenalism",
      "Type Identity Theory (Brain States Equal Mental States)", "Functionalism (Multiple Realizability Putnam)",
      "Eliminative Materialism (Folk Psychology Is False Churchland)", "Anomalous Monism (Donald Davidson)",
      "The Hard Problem of Consciousness (David Chalmers)", "Qualia (The Subjective 'What It Is Like' Nagel)",
      "Inverted Spectrum Thought Experiment (Color Qualia Disconnect)", "The Knowledge Argument (Frank Jackson Mary in Black and White)",
      "The Chinese Room Argument (Syntactic Simulation vs Semantic Mind Searle)", "Philosophical Zombies (Physical Identical Without Inner Experience)",
      "The Extended Mind Thesis (Andy Clark & David Chalmers Notebook Memory)", "Embodied Cognition (Mind Grounded in Bodily Action)",
      "Panpsychism (Consciousness as Fundamental Cosmic Property)", "Integrated Information Theory (IIT Giulio Tononi)",
      "Global Workspace Theory (Bernard Baars & Dehaene)", "Illusionism regarding Phenomenal Consciousness (Keith Frankish)"
    ]
  },
  {
    root: "Normative Ethics, Metaethics & Value Theory",
    category: "NormativeEthics",
    children: [
      "Act Utilitarianism vs Rule Utilitarianism", "Kantian Deontology (Duty & Imperatives)",
      "Aristotelian Virtue Ethics (Hexis & Phronesis Practical Wisdom)", "Care Ethics (Relational Attunement Carol Gilligan)",
      "Moral Realism vs Anti-Realism", "Emotivism & Non-Cognitivism (A.J. Ayer Boo/Hooray Theory)",
      "Moral Error Theory (J.L. Mackie Queerness Argument)", "Divine Command Theory",
      "Contractarianism vs Contractualism (Scanlon)", "The Is-Ought Gap (David Hume Naturalistic Fallacy)",
      "Moral Particularism (Jonathan Dancy)", "The Problem of Moral Luck (Thomas Nagel & Bernard Williams)",
      "The Doctrine of Double Effect (Thomas Aquinas)", "The Repugnant Conclusion (Derek Parfit Population Ethics)",
      "Future Generations Discounting & Intergenerational Justice", "Supererogation (Actions Beyond the Call of Duty)"
    ]
  }
];

// -------------------------------------------------------------
// 9. Culture Expansion Taxonomies (Target 700+ nodes)
// -------------------------------------------------------------
const cultureTaxonomy = [
  {
    root: "Comparative World Mythologies & Sacred Epics",
    category: "WorldMythology",
    children: [
      "Greek Olympian Gods (Zeus, Hera, Poseidon, Hades, Athena, Apollo, Ares, Aphrodite, Hermes, Hephaestus)",
      "Greek Titans & Primordials (Cronus, Rhea, Uranus, Gaia, Prometheus, Atlas)",
      "Norse Aesir & Vanir Pantheons (Odin Allfather, Thor Thunder, Loki Trickster, Freyja Love, Baldr Light, Tyr War)",
      "Yggdrasil World Ash Tree & Nine Norse Realms (Asgard, Midgard, Jotunheim, Niflheim, Muspelheim)",
      "Ragnarok Twilight of the Gods Epic Battle (Fenrir Wolf, Jormungandr Midgard Serpent, Surtr Fire Giant)",
      "Egyptian Ennead & Underworld Gods (Ra Sun, Osiris King of Dead, Isis Magic, Anubis Embalming, Horus Falcon, Set Chaos)",
      "The Weighing of the Heart against the Feather of Ma'at", "Book of the Dead Funerary Papyrus Spells",
      "Mesopotamian Sumerian-Babylonian Gods (Anu Sky, Enlil Wind, Enki Fresh Waters/Wisdom, Inanna/Ishtar Queen of Heaven)",
      "Epic of Gilgamesh & Enkidu Wild Man Companionship", "Utnapishtim Great Deluge Survivor",
      "Hindu Trimurti & Deities (Brahma Creator, Vishnu Preserver, Shiva Destroyer, Ganesha Remover of Obstacles, Saraswati Wisdom, Lakshmi Prosperity)",
      "Ramayana Epic (Prince Rama, Sita Devotion, Hanuman Loyalty, Ravana Defeat)",
      "Mesoamerican Aztec & Maya Deities (Quetzalcoatl Feathered Serpent, Huitzilopochtli Sun/War, Tlaloc Rain, Chaac Maya Storm)",
      "Popol Vuh Maya K'iche' Creation Account (Hero Twins Hunahpu & Xbalanque Ballgame in Xibalba Underworld)",
      "Japanese Shinto Kami Spirits (Amaterasu Sun Goddess, Susanoo Storm God, Tsukuyomi Moon God, Inari Fox Agriculture)",
      "Celtic Irish Tuatha De Danann (The Dagda All-Father, The Morrigan War Goddess, Lugh the Many-Skilled)",
      "West African Yoruba Orisha Spirits (Olorun Sky, Ogun Iron/War, Shango Thunder, Yemoja Oceans, Eshu Trickster Crossroads)",
      "Slavic Pantheon Deities (Perun Thunder God, Veles Earth/Underworld God, Mokosh Mother Earth, Baba Yaga Forest Witch)",
      "Polynesian Creation & Demigod Legends (Maui Hooking the Islands, Pele Volcano Goddess, Tangaroa Ocean Lord)",
      "Indigenous North American Sacred Traditions (White Buffalo Calf Woman Lakota, Raven Trickster Pacific Northwest, Sedna Inuit Sea Mother)"
    ]
  },
  {
    root: "Incan, Celtic, Arthurian & Slavic Legends",
    category: "RegionalMythology",
    children: [
      "Incan Solar Pantheon (Inti Sun God, Viracocha Creator, Pachamama Earth Mother, Mama Killa Moon)",
      "Arthurian Legend (King Arthur, Merlin Wizard, Guinevere, Sir Lancelot, The Holy Grail Quest, Excalibur Sword, Avalon)",
      "Celtic Legends (Cu Chulainn Hound of Ulster, Queen Maeve of Connacht, Finn MacCool, Oisin in Tir na nOg)",
      "Slavic Deities (Svarog Celestial Fire, Dazhbog Giving God, Belobog White God, Chernobog Black God, Morana Winter Death, Rusalka Water Spirit)",
      "Baltic Deities (Perkunas Thunder, Saule Sun Goddess, Dievas Sky God, Velnias Underworld)",
      "Finno-Ugric Kalevala Epic (Väinämöinen Ancient Singer, Ilmarinen Blacksmith Forging Sampo, Louhi Mistress of Pohjola)",
      "Persian Shahnameh Book of Kings (Rostam Hero, Sohrab Tragedy, Simurgh Mythical Bird, Zahhak Serpent King)"
    ]
  },
  {
    root: "Anthropological Systems, Rituals & Kinship",
    category: "Anthropology",
    children: [
      "Rites of Passage 3 Stages (Separation, Liminality Threshold, Incorporation Arnold van Gennep)",
      "Liminality and Communitas Egalitarian Bond (Victor Turner)", "The Gift Economy 3 Obligations (To Give, Receive, Reciprocate Marcel Mauss)",
      "Kula Ring Ceremonial Shell Trade System (Trobriand Islands Bronislaw Malinowski)",
      "Potlatch Competitive Feast & Wealth Destruction (Pacific Northwest Indigenous Franz Boas)",
      "Structural Anthropology Binary Oppositions (Claude Levi-Strauss The Raw and the Cooked)",
      "Totemism Clan Ancestor Animal Bonds", "Shamanic Ecstatic Trance & Spirit Journeying",
      "Taboo Sacred Prohibitions in Polynesian Culture (Tapu)", "Matrilineal Kinship Descent Systems",
      "Patrilineal Kinship Descent Systems", "Egalitarian Hunter-Gatherer Band Organization",
      "Oral History Mnemonic Storytelling Systems", "Indigenous Australian Dreamtime (Tjukurpa Songlines Cartography)",
      "Kintsugi Japanese Art of Gold Ceramic Repair (Beauty in Imperfection)", "Wabi-Sabi Traditional Japanese Aesthetics",
      "Ayurveda Ancient Indian Holistic Health System (Tridosha: Vata, Pitta, Kapha)", "Traditional Chinese Medicine (Acupuncture, Meridians, Qi Balance)",
      "The Silk Road Ancient Trans-Eurasian Trade Network", "The Maritime Spice Route (Malacca, Calicut, Alexandria)"
    ]
  },
  {
    root: "Global Festivals, Cultural Traditions & Languages",
    category: "GlobalTraditions",
    children: [
      "Diwali Festival of Lights (Clay Diyas, Sweets, Lakshmi Puja)", "Holi Festival of Colors (Spring Equinox Gulal Powders)",
      "Lunar New Year Spring Festival (Dragon Dance, Red Envelopes Hongbao, Family Reunion)",
      "Mid-Autumn Moon Festival (Mooncakes & Lanterns)", "Dia de los Muertos Day of the Dead (Marigold Ofrendas, Sugar Skulls Calaveras)",
      "Carnival of Venice (Elaborate Bauta Masks & Historical Regatta)", "Rio de Janeiro Samba Carnival",
      "Hanami Cherry Blossom Picnics (Mono no Aware Transient Aesthetics)", "Obon Japanese Ancestor Lantern Festival",
      "Ramadan Fasting Month & Eid al-Fitr Feast", "Eid al-Adha Feast of Sacrifice",
      "Midsummer Solstice Celebrations (Maypoles & Bonfires Scandinavia)", "Day of Saint Patrick Cultural Heritage (Ireland)",
      "Songkran Thai Buddhist Water New Year Festival", "Vesak Buddha Day of Birth, Enlightenment, and Parinirvana",
      "Indo-European Language Family Branches (Germanic, Romance, Slavic, Indo-Iranian, Celtic, Hellenic)",
      "Sino-Tibetan Language Family (Mandarin, Yue, Tibetan, Burmese)", "Afroasiatic Language Family (Arabic, Hebrew, Amharic, Berber)",
      "Austronesian Language Family (Malay, Tagalog, Javanese, Hawaiian, Malagasy)",
      "Niger-Congo Language Family (Swahili, Yoruba, Igbo, Zulu)", "Dravidian Language Family (Tamil, Telugu, Kannada, Malayalam)",
      "Sapir-Whorf Hypothesis of Linguistic Relativity", "Cuneiform Mesopotamian Clay Tablet Script",
      "Egyptian Sacred Hieroglyphic Script", "Phoenician Phonetic Alphabet Ancestor"
    ]
  },
  {
    root: "World Folklore Monsters, Creatures & Sacred Rites",
    category: "FolkloreCreatures",
    children: [
      "Eastern Dragon (Long Divine Rain and Imperial Power)", "Western Fire-Breathing Dragon (Smaug Archetype)",
      "Phoenix / Fenghuang (Immortality and Rebirth from Ashes)", "Chimera (Lion, Goat, and Serpent Fire-Breather)",
      "Kraken (Giant Nordic Cephalopod Sea Monster)", "Sphinx (Lion Body with Human Head Riddle Guardian)",
      "Minotaur (Bull-Headed Beast of the Cretan Labyrinth)", "Cerberus (Three-Headed Hound Guarding Hades Gates)",
      "Pegasus (Divine Winged Stallion Birthed from Medusa)", "Centaur (Half-Human Half-Horse Chiron Wisdom)",
      "Garuda (Divine Eagle Mount of Vishnu in Hinduism/Buddhism)", "Thunderbird (Indigenous North American Sky Spirit)",
      "Wendigo (Spirit of Insatiable Winter Cannibalistic Greed Algonquin)", "Banshee (Irish Fairy Woman Wailing of Impending Death)",
      "Kitsune (Japanese Nine-Tailed Shapeshifting Fox Spirit)", "Tengu (Japanese Bird-Man Mountain Spirit Martial Master)",
      "Golem (Clay Living Being Animated by Sacred Hebrew Letters Emet)", "Anansi the Spider (West African Ashanti Trickster)",
      "Quinceañera (Latin American 15th Birthday Passage to Womanhood)", "Bar Mitzvah & Bat Mitzvah (Jewish Religious Adulthood Rite)",
      "Hajj (Annual Islamic Sacred Pilgrimage to Mecca Kaaba)", "Kumbh Mela (World's Largest Peaceful Gathering Bathing in Sacred Rivers)",
      "Japanese Tea Ceremony (Chanoyu Way of Tea Mindfulness)", "Aboriginal Walkabout (Rite of Passage into Australian Wilderness)"
    ]
  },
  {
    root: "Ancient Civilizations, Dynasties & Sacred Heritage",
    category: "AncientCivilizations",
    children: [
      "Sumerian Mesopotamian Civilization (Ur, Uruk, Cuneiform)", "Old Kingdom Egypt (Pyramid Age Pharaohs)",
      "Indus Valley Harappan Civilization (Mohenjo-daro Urban Planning)", "Minoan Bronze Age Civilization (Knossos Palace Crete)",
      "Mycenaean Greece (Agamemnon, Golden Mask of Atreus)", "Zhou Dynasty China (Mandate of Heaven & Hundred Schools of Thought)",
      "Han Dynasty (Silk Road Pax Sinica & Paper Invention)", "Tang Dynasty (Golden Age of Poetry Li Bai & Du Fu)",
      "Song Dynasty (Movable Type Printing & Gunpowder)", "Achaemenid Persian Empire (Cyrus the Great Cylinder of Human Rights)",
      "Mauryan Empire (Ashoka the Great Buddhist Edicts on Pillars)", "Gupta Empire (Classical Golden Age of Mathematics Aryabhata)",
      "Roman Republic & Pax Romana Empire", "Byzantine Eastern Roman Empire (Constantinople Justinian Code)",
      "Islamic Abbasid Caliphate (House of Wisdom Bayt al-Hikma Baghdad)", "Cordoba Umayyad Caliphate (Andalusian Golden Age)",
      "Mali Empire (Mansa Musa Wealth & Timbuktu Sankore University)", "Kingdom of Aksum (Ancient Ethiopian Trade & Obelisks)",
      "Great Zimbabwe Shona Stone Citadel Civilization", "Aztec Triple Alliance (Tenochtitlan Island Capital)",
      "Classic Maya City-States (Tikal, Palenque, Calakmul, Chichen Itza)", "Inca Tawantinsuyu Empire (Qhapaq Ñan Andean Road Network)"
    ]
  },
  {
    root: "World Wisdom Traditions, Herbal Lore & Gastronomy",
    category: "CulturalWisdomGastronomy",
    children: [
      "Traditional Mediterranean Diet (Olive Oil, Whole Grains, Longevity Blue Zones)",
      "Okinawan Hara Hachi Bu (Eat until 80% Full Longevity Practice)", "Nordic Hygge & Lagom (Cozy Contentment and Balanced Moderation)",
      "Ubuntu Southern African Philosophy ('I am because we are')", "Ikigai Japanese Concept (Intersection of Passion, Mission, Vocation, Profession)",
      "Komorebi Japanese Aesthetic (Sunlight Filtering Through Leaves)", "Fernweh German Feeling (Homesickness for Faraway Lands)",
      "Saudade Portuguese Emotion (Poignant Nostalgic Longing)", "Sprezzatura Italian Grace (Effortless Nonchalance in Mastery)",
      "Ayurvedic Cooking with Six Tastes (Sweet, Sour, Salty, Bitter, Pungent, Astringent)",
      "Fermentation Heritage (Kimchi, Miso, Sourdough, Kefir, Tempeh Microbial Culture)",
      "Traditional Herbalism (Ginseng, Ashwagandha, Chamomile, Turmeric Curcumin, Elderberry)",
      "Sacred Geometry in Islamic Tile Mosaics (Girih Quasi-Crystalline Patterns)",
      "Batik Wax-Resist Textile Dyeing (Indonesian UNESCO Heritage)", "Tartan Woven Wool Patterns (Scottish Clan Identity)"
    ]
  },
  {
    root: "Traditional Performing Arts, Costumes & Sacred Heritage",
    category: "PerformingHeritage",
    children: [
      "Kabuki Japanese Classical Theater (Stylized Drama & Kumadori Makeup)", "Noh Japanese Musical Drama (Spiritual Masks & Chanting)",
      "Kathakali Classical Indian Dance-Drama (Elaborate Makeup & Mudra Hand Gestures)",
      "Flamenco Andalusian Passion Dance (Zapateado Footwork & Castanets)", "Peking Opera (Singing, Recitation, Acting, and Acrobatics)",
      "Samba Brazilian Carnival Dance & Batucada Drumming", "Haka Maori Ceremonial Dance of Unity and Challenge",
      "Tango Argentine Passionate Partner Dance (Buenos Aires Heritage)", "Irish Stepdance (Riverdance Rapid Leg Movement)",
      "Capoeira Afro-Brazilian Martial Dance Game (Berimbau Bow Instrument)", "Balinese Kecak Monkey Chant Choir Drama",
      "Sufi Whirling Dervish Sema Ceremony (Mevlevi Order Spiritual Trance)", "Venetian Commedia dell'Arte Mask Theater (Arlecchino, Pantalone)",
      "Scottish Highland Bagpipe Pibroch Piping", "Mariachi Mexican Folk Brass and Guitar Ensemble (Jalisco)",
      "Traditional Kimono & Obi Silk Attire (Japan)", "Hanbok Traditional Korean Dress (Chima & Jeogori)",
      "Sari Traditional Indian Woven Silk Draping", "Kente Handwoven Akan Silk Cloth (Ghana Royalty)",
      "Dirndl & Lederhosen Alpine Folk Attire (Bavaria & Austria)", "Keffiyeh Traditional Arab Patterned Headdress",
      "Sombrero Charro Embroidered Wide-Brimmed Hat (Mexico)", "Fez Brimless Tapered Felt Cap (Ottoman Mediterranean)",
      "Kilts & Tartan Woolen Clan Dress (Scotland)", "Huipil Indigenous Mayan Embroidered Tunic (Guatemala & Mexico)"
    ]
  },
  {
    root: "World Architectural Sacred Wonders & Heritage Sites",
    category: "WorldHeritageSites",
    children: [
      "Petra Nabataean Rock-Cut Treasury (Al-Khazneh Jordan)", "The Great Wall of China (Ming Dynasty Watchtowers)",
      "The Taj Mahal (Mughal White Marble Mausoleum Agra)", "Angkor Wat Temple Complex (Khmer Empire Cambodia)",
      "Machu Picchu Incan Citadel (Sacred Urubamba Valley Peru)", "Chichen Itza Mayan Step-Pyramid (El Castillo Yucatan)",
      "The Roman Colosseum (Flavian Amphitheater Italy)", "The Acropolis & Parthenon (Classical Athens Greece)",
      "Hagia Sophia (Byzantine Pendentive Dome Basilica-Mosque Istanbul)", "The Alhambra Palace & Generalife Gardens (Granada Spain)",
      "St. Peter's Basilica & Sistine Chapel (Vatican City)", "Karnak & Luxor Temple Complexes (Thebes Upper Egypt)",
      "Easter Island Moai Megaliths (Rapa Nui Polynesia)", "Stonehenge Neolithic Megalithic Circle (Wiltshire England)",
      "Borobudur Mahayana Buddhist Temple (Java Indonesia)", "Prambanan Hindu Temple Compound (Java Indonesia)",
      "Mount Fuji Sacred Volcano & Pilgrimage (Japan)", "Mont-Saint-Michel Tidal Island Abbey (Normandy France)",
      "Lalibela Rock-Hewn Monolithic Churches (Ethiopia)", "Timbuktu Djinguereber Mud Mosque (Mali)"
    ]
  },
  {
    root: "Indigenous Ethno-Ecological Knowledge & Storytelling",
    category: "IndigenousKnowledge",
    children: [
      "Traditional Ecological Knowledge (TEK Sustainable Resource Stewardship)",
      "Seven Generations Principle (Iroquois Great Law of Peace Long-Term Decision)",
      "Braiding Sweetgrass Reciprocity with Nature (Robin Wall Kimmerer)",
      "Songlines Topographic Navigation Maps (Australian Aboriginal Oral Cartography)",
      "Tjukurpa Ancestral Creation Law and Moral Code (Anangu Central Desert)",
      "Hawaiian Ahupua'a Watershed Community Land Division", "Inuit Qaujimajatuqangit (Inuit Indigenous Knowledge of Arctic Ice and Animals)",
      "Amazonian Ayahuasca Shamanic Plant Wisdom (Shipibo-Conibo Healing)",
      "Lakota Medicine Wheel (Four Directions, Seasons, and Life Stages)",
      "Maya Milpa Poly-Crop Agriculture (Maize, Beans, Squash Three Sisters)",
      "Andean Ayni Reciprocal Labor System (Inca Communal Harmony)",
      "Maori Kaitiakitanga (Guardianship and Environmental Conservation)",
      "Sami Reindeer Herding Seasonal Migration (Siida Social Unit Lapland)",
      "Cairn Stone Trail Markers (Inukshuk Human Directional Figure)",
      "Totem Pole Clan Lineage Carving (Haida and Tlingit Cedar Art)",
      "Aboriginal Dot Painting Dreamtime Symbolism (Central Australia)",
      "Hawaiian Hula Sacred Storytelling Dance & Mele Chants",
      "Inuit Umiak & Kayak Traditional Arctic Navigation",
      "Navajo Sandpainting Ceremonial Healing Art (Diné Sacred Lore)"
    ]
  }
];

// -------------------------------------------------------------
// Master Build Pipeline Execution
// -------------------------------------------------------------
console.log("=== CHATGEMMA KNOWLEDGE GRAPH MASTER BUILD PIPELINE ===");

const domainConfigs = [
  { name: "common_sense", generator: generateCommonSense, taxonomy: commonSenseTaxonomy, filename: "common_sense.json" },
  { name: "ai_specialized", generator: generateAiSpecialized, taxonomy: aiSpecializedTaxonomy, filename: "ai_specialized.json" },
  { name: "general_knowledge", generator: generateGeneralKnowledge, taxonomy: generalKnowledgeTaxonomy, filename: "general_knowledge.json" },
  { name: "electronics", generator: generateElectronics, taxonomy: electronicsTaxonomy, filename: "electronics.json" },
  { name: "arts", generator: generateArts, taxonomy: artsTaxonomy, filename: "arts.json" },
  { name: "life_lessons", generator: generateLifeLessons, taxonomy: lifeLessonsTaxonomy, filename: "life_lessons.json" },
  { name: "literature", generator: generateLiterature, taxonomy: literatureTaxonomy, filename: "literature.json" },
  { name: "philosophy", generator: generatePhilosophy, taxonomy: philosophyTaxonomy, filename: "philosophy.json" },
  { name: "culture", generator: generateCulture, taxonomy: cultureTaxonomy, filename: "culture.json" },
];

let grandTotalEntities = 0;
let grandTotalRelations = 0;
const domainStats = {};

for (const d of domainConfigs) {
  console.log(`\nBuilding domain: ${d.name}...`);
  const base = d.generator();
  const expanded = expandDomainGraph(base, d.taxonomy);

  const filePath = path.join(OUTPUT_DIR, d.filename);
  fs.writeFileSync(filePath, JSON.stringify(expanded, null, 2), "utf-8");

  console.log(`✓ ${d.filename} written: ${expanded.stats.totalEntities} entities, ${expanded.stats.totalRelations} relations.`);
  grandTotalEntities += expanded.stats.totalEntities;
  grandTotalRelations += expanded.stats.totalRelations;
  domainStats[d.name] = expanded.stats;
}

// Generate src/data/knowledge/index.js
const indexFileContent = `/**
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
  totalEntities: ${grandTotalEntities},
  totalRelations: ${grandTotalRelations},
  domainBreakdown: ${JSON.stringify(domainStats, null, 2)},
};
`;

fs.writeFileSync(path.join(OUTPUT_DIR, "index.js"), indexFileContent, "utf-8");
console.log(`\n✓ index.js bundled successfully.`);
console.log(`\n=== GRAND TOTAL: ${grandTotalEntities} ENTITIES, ${grandTotalRelations} RELATIONS ACROSS 9 DOMAINS ===`);
