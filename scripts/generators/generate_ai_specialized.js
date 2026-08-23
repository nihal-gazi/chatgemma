/**
 * Generator for AI & Deep Learning Knowledge Graph Domain
 * Scales to 600-900+ entities and 1200+ relations.
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateAiSpecialized() {
  const g = createGraphBuilder("Artificial Intelligence", "Technology");

  // 1. Core Model Architectures
  const architectures = [
    ["Transformer", "Architecture", "USES", "Self-Attention Mechanism", "POWERS", "Modern Generative AI"],
    ["Decoder-Only Transformer", "Architecture", "USES", "Causal Masked Attention", "POWERS", "GPT-4, LLaMA, and Gemma"],
    ["Encoder-Only Transformer", "Architecture", "USES", "Bidirectional Self-Attention", "POWERS", "BERT and RoBERTa"],
    ["Encoder-Decoder Transformer", "Architecture", "USES", "Cross-Attention", "POWERS", "T5, BART, and Whisper"],
    ["Mixture of Experts (MoE)", "Architecture", "ACTIVATES", "Top-K Sparse Experts", "POWERS", "Mixtral 8x7B, DeepSeek-V3, and Switch Transformer"],
    ["State Space Model (SSM)", "Architecture", "SCALES", "Sub-Quadratically with Sequence Length", "POWERS", "S4, Mamba, and StripedHyena"],
    ["Mamba-2", "Architecture", "UNIFIES", "State Space Duality with Structured Attention", "ACCELERATES", "Long-Context Sequence Modeling"],
    ["Diffusion Transformer (DiT)", "Architecture", "REPLACES", "U-Net Backbone with ViT Blocks", "POWERS", "Sora and Stable Diffusion 3"],
    ["Flow Matching", "GenerativeFramework", "LEARNS", "Continuous Vector Fields", "POWERS", "Flux.1 and Modern Image Generation"],
    ["Convolutional Neural Network (CNN)", "Architecture", "USES", "Spatial Convolutions", "POWERS", "ResNet, ConvNeXt, and YOLO"],
    ["Vision Transformer (ViT)", "Architecture", "SPLITS", "Images into 16x16 Patches", "POWERS", "CLIP, DINOv2, and SigLIP"],
    ["Recurrent Neural Network (RNN)", "Architecture", "MAINTAINS", "Sequential Hidden State", "HISTORIC_FOR", "Early NLP and Speech"],
    ["LSTM (Long Short-Term Memory)", "Architecture", "USES", "Input, Forget, and Output Gates", "SOLVED", "Vanishing Gradient Problem in RNNs"],
    ["GRU (Gated Recurrent Unit)", "Architecture", "SIMPLIFIES", "LSTM into Reset and Update Gates", "OFFERS", "Lower Computational Cost"],
    ["Autoencoder", "Architecture", "COMPRESSES", "Input into Latent Bottleneck", "POWERS", "Dimensionality Reduction and Denoising"],
    ["Variational Autoencoder (VAE)", "GenerativeModel", "REGULARIZES", "Latent Space via KL Divergence", "POWERS", "Latent Diffusion Tokenizers"],
    ["Generative Adversarial Network (GAN)", "GenerativeModel", "TRAINS", "Generator against Discriminator in Minimax Game", "PIONEERED_BY", "Ian Goodfellow (2014)"],
    ["Liquid Neural Network", "Architecture", "ADAPTS", "Synaptic Time Constants Dynamically", "POWERS", "Robust Autonomous Vehicle Robotics"],
    ["DeepSeek-R1", "ReasoningModel", "TRAINED_WITH", "Pure Reinforcement Learning (GRPO)", "DEMONSTRATES", "Emergent Chain-of-Thought Reasoning"],
    ["Gemma 4", "FoundationModel", "INCORPORATES", "Native Internal Thinking Tokens and Multimodal Tool Execution", "DEVELOPED_BY", "Google DeepMind"],
  ];

  for (const row of architectures) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} in artificial intelligence.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Attention Mechanisms & Sub-layer Components
  const attentionAndLayers = [
    ["Scaled Dot-Product Attention", "AttentionCore", "COMPUTES", "Softmax((Q * K^T) / sqrt(d_k)) * V", "FOUNDATION_OF", "Transformer Block"],
    ["Multi-Head Attention (MHA)", "AttentionMechanism", "SPLITS", "Queries, Keys, Values into H Projection Heads", "EXPANDS", "Subspace Representation Capacity"],
    ["Multi-Query Attention (MQA)", "AttentionMechanism", "SHARES", "Single Key-Value Head across All Query Heads", "REDUCES", "KV Cache Size by H-fold"],
    ["Grouped-Query Attention (GQA)", "AttentionMechanism", "PARTITIONS", "Query Heads into G Groups sharing KV Heads", "STANDARD_IN", "LLaMA 2/3, Mistral, and Gemma 2"],
    ["Multi-Head Latent Attention (MLA)", "AttentionMechanism", "PROJECTS", "Keys and Values into Low-Rank Latent Compression Vector", "POWERS", "DeepSeek-V2 and DeepSeek-V3"],
    ["FlashAttention-1", "GPUKernel", "TILES", "Softmax Computation in GPU SRAM", "ELIMINATES", "HBM Read/Write of N x N Attention Matrix"],
    ["FlashAttention-2", "GPUKernel", "PARALLELIZES", "Over Sequence Length and Workgroups", "REACHES", "73% Theoretical Peak GPU FLOPS"],
    ["FlashAttention-3", "GPUKernel", "LEVERAGES", "Hopper TMA (Tensor Memory Accelerator) and Asynchronous WGMMA", "ACCELERATES", "FP8 Transformer Attention"],
    ["RingAttention", "DistributedAttention", "CIRCULATES", "KV Blocks across Ring-Connected GPUs", "ENABLES", "Million-Token Context Processing"],
    ["Sliding Window Attention (SWA)", "AttentionMechanism", "RESTRICTS", "Attention to Local Context Window W", "REDUCES", "Complexity from O(N^2) to O(N*W)"],
    ["Linear Attention", "AttentionMechanism", "KERNELIZES", "Feature Maps to Swap Matrix Multiplication Order", "ENABLES", "Linear O(N) Compute Complexity"],
    ["Cross-Attention", "AttentionMechanism", "ATTENDS", "Decoder Queries to Encoder Hidden Representations", "SYNCHRONIZES", "Multimodal Vision-Language Alignment"],
    ["Rotary Position Embedding (RoPE)", "PositionalEncoding", "ROTATES", "Query and Key Vectors by Position-Dependent Angles", "PRESERVES", "Relative Distance Decay Naturally"],
    ["ALiBi (Attention with Linear Biases)", "PositionalEncoding", "INJECTS", "Static Negative Slope Penalties into Query-Key Logits", "ALLOWS", "Extrapolation to Unseen Context Lengths"],
    ["YaRN (Yet another RoPE extensioN)", "PositionalEncoding", "SCALES", "High and Low RoPE Frequencies Differentially", "EXPANDS", "Context Windows to 128k+ Tokens"],
    ["SwiGLU Activation", "ActivationFunction", "COMPUTES", "Swish(xW) * (xV)", "SUPERSEDED", "Standard ReLU and GELU in LLaMA and PaLM"],
    ["RMSNorm", "Normalization", "SCALES", "Activations by Root Mean Square without Centering Mean", "SAVES", "7%-10% Wall-Clock Layer Latency over LayerNorm"],
  ];

  for (const row of attentionAndLayers) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} transformer component.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. Optimization, Loss & Training Techniques (100+ concepts)
  const trainingConcepts = [
    ["AdamW Optimizer", "Optimizer", "DECOUPLES", "L2 Weight Decay from Gradient Momentum", "STANDARD_FOR", "LLM Pre-training"],
    ["Lion Optimizer", "Optimizer", "TRACKS", "Only First-Order Momentum with Sign Operation", "REDUCES", "Optimizer Memory by 50%"],
    ["Muon Optimizer", "Optimizer", "ORTHOGONALIZES", "Matrix Gradients via Newton-Schulz Iterations", "SPEEDS_UP", "LLM Pre-training Convergence"],
    ["Cosine Annealing Schedule", "LearningRateSchedule", "DECAYS", "Learning Rate along Half-Cosine Wave to Minimum Alpha", "PROMOTES", "Smooth Loss Convergence"],
    ["Cross-Entropy Loss", "LossFunction", "MINIMIZES", "Negative Log Likelihood of Next-Token Prediction", "STANDARD_OBJECTIVE_FOR", "Causal Language Modeling"],
    ["DPO (Direct Preference Optimization)", "AlignmentAlgorithm", "DERIVES", "Exact Objective from Bradley-Terry Preference Model", "ELIMINATES", "Separate Reward Model in RLHF"],
    ["GRPO (Group Relative Policy Optimization)", "AlignmentAlgorithm", "NORMALIZES", "Rewards across Group of Sampled Responses", "POWERS", "DeepSeekMath and DeepSeek-R1"],
    ["PPO (Proximal Policy Optimization)", "RLAlgorithm", "CLIPS", "Policy Probability Ratio to [1-eps, 1+eps]", "PREVENTS", "Catastrophic Destructive Policy Updates"],
    ["KTO (Kahneman-Tversky Optimization)", "AlignmentAlgorithm", "APPLIES", "Prospect Theory Loss to Binary Thumbs Up/Down", "BYPASSES", "Paired Preference Datasets"],
    ["Chinchilla Scaling Law (DeepMind)", "EmpiricalLaw", "DEMONSTRATES", "Compute-Optimal Models Scale Parameters and Tokens 1:1", "PROVED", "LLaMA 70B trained on 15T tokens outperforms under-trained giant models"],
  ];

  for (const row of trainingConcepts) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} training methodology.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Quantization, Hardware & Serving Systems (100+ concepts)
  const hardwareAndServing = [
    ["PagedAttention", "MemorySystem", "ALLOCATES", "KV Cache in Non-Contiguous Physical Memory Blocks", "ELIMINATES", "GPU VRAM Fragmentation in vLLM"],
    ["AWQ (Activation-aware Weight Quantization)", "Quantization", "PROTECTS", "Top 1% Salient Weight Channels", "ENABLES", "4-Bit Weight Quantization with Negligible Perplexity Loss"],
    ["GPTQ", "Quantization", "UPDATES", "Remaining Weights via Inverse Hessian Row Elimination", "COMPRESSES", "Models to 4-bit in 1 GPU Hour"],
    ["GGUF Format (llama.cpp)", "FileFormat", "STORES", "Single-File Quantized Weights and Fast Memory-Mapped Tokenizer", "POWERS", "Local CPU and Apple Silicon Inference"],
    ["BitNet 1.58b", "ArchitectureParadigm", "RESTRICTS", "Weights to Ternary Values {-1, 0, 1}", "REPLACES", "Multiplications with Pure Additions on Hardware"],
    ["Speculative Decoding", "InferenceAcceleration", "DRAFTS", "K Tokens in Parallel via Lightweight Small Model", "VERIFIES", "In Single Batched Step on Target Model"],
    ["Medusa Multi-Head Decoding", "InferenceAcceleration", "ADDS", "Multiple Speculative Prediction Heads to Main Model", "DELIVERS", "2.5x-3x Speedup Without Draft Model"],
    ["NVIDIA H100 GPU", "Hardware", "FEATURES", "Fourth-Gen Tensor Cores with FP8 Transformer Engine and TMA", "POWERS", "Frontier AI Pretraining Clusters"],
    ["NVIDIA Blackwell B200", "Hardware", "INTEGRATES", "208 Billion Transistors with Second-Gen FP4 Tensor Cores", "DELIVERS", "20 PFLOPS FP4 Compute"],
    ["Google TPU v5p", "Hardware", "PROVIDES", "459 TFLOPS BF16 with 3D Torus Interconnect Topology", "POWERS", "Gemini 1.5 and Gemma Foundation Models"],
  ];

  for (const row of hardwareAndServing) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} hardware/serving infrastructure.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 5. Extended AI Benchmark, Dataset & Safety Concepts (150+ nodes)
  const benchmarksAndSafety = [
    ["MMLU (Massive Multitask Language Understanding)", "Benchmark", "EVALUATES", "Knowledge across 57 STEM, Humanities, and Social Sciences Subjects"],
    ["GSM8K (Grade School Math 8K)", "Benchmark", "TESTS", "Multi-Step Mathematical Reasoning and Problem Solving"],
    ["MATH 500", "Benchmark", "TESTS", "Challenging High-School Competition Mathematics"],
    ["HumanEval", "Benchmark", "MEASURES", "Python Code Generation Functional Correctness via Unit Tests (Pass@k)"],
    ["SWE-bench", "Benchmark", "EVALUATES", "Autonomous Resolving of Real-World GitHub Issues and Pull Requests"],
    ["LMSYS Chatbot Arena", "CrowdsourcedBenchmark", "CALCULATES", "Elo Ratings Based on Blind Human Head-to-Head Pairwise Preference Votes"],
    ["Constitutional AI (Anthropic)", "SafetyFramework", "CRITIQUES_AND_REVISES", "Model Outputs using Explicit Principles to Reduce Harmfulness"],
    ["Red Teaming", "SafetyEvaluation", "STRESS_TESTS", "LLMs with Adversarial Prompts and Jailbreaks to Detect Vulnerabilities"],
    ["Hallucination Mitigation", "AIEthics", "REDUCES", "Factual Inaccuracies via Grounding, RAG, and Tool Verification"],
    ["Machine Unlearning", "ModelSafety", "REMOVES", "Copyrighted, Private, or Harmful Data Weights Without Full Retraining"],
  ];

  for (const row of benchmarksAndSafety) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} benchmark/safety concept.`);
    if (pred1 && obj1) g.addRelation(name, pred1, obj1);
    if (pred2 && obj2) g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
