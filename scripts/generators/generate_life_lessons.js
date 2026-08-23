/**
 * Generator for Life Lessons, Mental Models & Psychology Knowledge Graph Domain
 * Target: 600-800 nodes, 1200-1800 relations
 */

import { createGraphBuilder } from "../kg_builder_util.js";

export function generateLifeLessons() {
  const g = createGraphBuilder("Life Lessons & Mental Models", "Concept");

  // 1. Core Mental Models & Reasoning Frameworks
  const mentalModels = [
    ["First Principles Thinking", "MentalModel", "DECONSTRUCTS", "Problems down to Fundamental Self-Evident Truths", "REBUILDS", "Novel Solutions Without Analogy Dogma"],
    ["Second-Order Thinking", "MentalModel", "ASKS", "'And Then What?' to Evaluate Long-Term Downstream Consequences", "PREVENTS", "Unintended Systemic Failures"],
    ["Inversion Principle (Jacobi)", "MentalModel", "SOLVES", "Problems by Reversing Perspective ('Invert, Always Invert')", "IDENTIFIES", "What Specifically to Avoid in Order to Succeed"],
    ["Occam's Razor", "Heuristic", "FAVORS", "Hypothesis with Fewest Assumptions When Multiple Explanations Exist", "MINIMIZES", "Overfitting and Unnecessary Complexity"],
    ["Hanlon's Razor", "Heuristic", "ADVISES", "'Never Attribute to Malice That Which is Adequately Explained by Incompetence or Stupidity'", "REDUCES", "Interpersonal Paranoia and Conflict"],
    ["Pareto Principle (80/20 Rule)", "EmpiricalLaw", "STATES", "80% of Outcomes Result from 20% of Critical Input Causes", "DIRECTS", "Focus toward Highest-Leverage Activities"],
    ["Circle of Competence", "DecisionFramework", "DEFINES", "Boundary of Genuine Deep Understanding vs Superficial Knowledge", "PROTECTS", "Against Unwarranted Overconfidence in Unknown Fields"],
    ["The Map is Not the Territory", "EpistemicModel", "REMINDS", "Abstract Models are Simplifications and Never Perfectly Capture Reality", "WARNS", "Against Confusing Symbolic Representation with Ground Truth"],
    ["Antifragility (Taleb)", "SystemModel", "DESCRIBES", "Systems that Gain Strength, Robustness, and Smarts from Random Shocks and Volatility", "CONTRASTS_WITH", "Fragile Systems that Break under Stress"],
    ["Chesterton's Fence", "DecisionRule", "REQUIRES", "Understanding Why a Rule, Fence, or Institution Exists Before Attempting to Abolish It", "PRESERVES", "Hidden Evolutionary Safeguards"],
  ];

  for (const row of mentalModels) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} mental model.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 2. Cognitive Biases & Thinking Fallacies
  const cognitiveBiases = [
    ["Confirmation Bias", "CognitiveBias", "SEEKS_AND_INTERPRETS", "Information that Validates Pre-Existing Beliefs while Ignoring Contradictory Evidence", "MITIGATED_BY", "Actively Searching for Disconfirming Data"],
    ["Sunk Cost Fallacy", "CognitiveBias", "CONTINUES", "Unfruitful Endeavor Solely Due to Previously Invested Non-Recoverable Time/Money", "OVERCOME_BY", "Forward-Looking Marginal Opportunity Cost Analysis"],
    ["Dunning-Kruger Effect", "MetacognitiveBias", "LEADS", "Novices with Low Competence to Overestimate Their Ability", "EXPLAINS", "Beginner Overconfidence and Expert Imposter Syndrome"],
    ["Survivorship Bias", "CognitiveBias", "FOCUSES", "Exclusively on Successful Survivors while Overlooking Hidden Failures", "DISTORTS", "Real Probability of Entrepreneurial and Financial Success"],
    ["Anchoring Bias", "CognitiveBias", "OVER-RELIANT_ON", "First Piece of Information Encountered When Making Judgments", "EXPLOITED_IN", "Price Negotiations and Retail Discounts"],
    ["Fundamental Attribution Error", "PsychologicalBias", "ATTRIBUTES", "Others' Mistakes to Internal Character Flaws while Blaming One's Own on External Circumstances", "CORRECTED_BY", "Empathetic Perspective Taking"],
    ["Availability Heuristic", "CognitiveBias", "ESTIMATES", "Event Likelihood Based on How Easily Examples Come to Mind (e.g. Plane Crashes)", "SKEWS", "Accurate Statistical Risk Perception"],
    ["Loss Aversion (Prospect Theory)", "BehavioralEconomics", "FEELS", "Psychological Pain of Losing \$100 Twice as Intensely as Joy of Gaining \$100", "EXPLAINS", "Irrational Risk-Averse and Panic Selling Decisions"],
  ];

  for (const row of cognitiveBiases) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} cognitive bias.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 3. Stoic Wisdom, Emotional Resilience & Philosophy of Life
  const stoicPractices = [
    ["Dichotomy of Control (Epictetus)", "StoicPrinciple", "DIVIDES", "World into What is Up to Us (Thoughts/Actions) vs What is Not (External Events/Outcomes)", "FOSTERS", "Unshakeable Inner Tranquility (Ataraxia)"],
    ["Premeditatio Malorum (Negative Visualization)", "StoicPractice", "REHEARSES", "Potential Worst-Case Scenarios and Adversities in Advance", "REMOVES", "Shock and Builds Psychological Antifragility"],
    ["Amor Fati (Nietzsche / Stoics)", "LifePhilosophy", "EMBRACES", "Every Event, Hardship, and Tragedy as Necessary and Meaningful Fuel for Growth", "TRANSMUTES", "Suffering into Strength"],
    ["Memento Mori", "ExistentialPractice", "MEDITATES_ON", "Inevitability of Mortality and Finite Nature of Life", "CLARIFIES", "What Truly Matters and Eradicates Petty Trivialities"],
    ["Cognitive Reframing (CBT)", "PsychologicalTechnique", "REINTERPRETS", "Negative Automatic Thoughts into Constructive, Rational Perspectives", "ALIGNED_WITH", "Epictetus's Dictum: 'People are disturbed not by things, but by view they take of them'"],
    ["Growth Mindset (Carol Dweck)", "PsychologicalModel", "VIEWS", "Intelligence and Talent as Developed Through Effort, Strategy, and Learning from Mistakes", "OUTPERFORMS", "Fixed Mindset"],
  ];

  for (const row of stoicPractices) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} resilience discipline.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  // 4. Productivity, Mastery & Execution Frameworks
  const executionFrameworks = [
    ["Eisenhower Matrix", "PrioritizationFramework", "CATEGORIZES", "Tasks by Urgency vs Importance into 4 Quadrants", "ELIMINATES", "Tyranny of Urgent-Yet-Unimportant Fires"],
    ["Deep Work (Cal Newport)", "ProductivityDiscipline", "ELIMINATES", "Shallow Distractions to Perform High-Cognitive Focus Sprints", "MAXIMIZES", "Rate of High-Value Knowledge Creation"],
    ["The Habit Loop (Duhigg)", "BehavioralFramework", "COMPRISES", "Cue, Routine, and Reward", "ENHANCED_BY", "James Clear's Atomic Habits: Make It Obvious, Attractive, Easy, and Satisfying"],
    ["Parkinson's Law", "OrganizationalLaw", "STATES", "'Work Expands So As to Fill Time Available for Its Completion'", "COUNTERED_BY", "Aggressive Yet Realistic Artificial Deadlines"],
    ["Deliberate Practice (Anders Ericsson)", "MasteryMethod", "TARGETS", "Specific Weaknesses at Edge of Ability with Immediate Expert Feedback", "DEFEATS", "Mindless Repetition Plateaus"],
    ["Regret Minimization Framework (Bezos)", "DecisionFramework", "PROJECTS", "One's Self to Age 80 to Evaluate If One Would Regret Not Trying a Bold Path", "ENABLES", "Courageous Asymmetric Career Bets"],
  ];

  for (const row of executionFrameworks) {
    const [name, type, pred1, obj1, pred2, obj2] = row;
    g.addEntity(name, [type], `${name} execution system.`);
    g.addRelation(name, pred1, obj1);
    g.addRelation(name, pred2, obj2);
  }

  return g.exportGraph();
}
