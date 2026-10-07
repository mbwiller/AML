# Lectures 1–3: Orientation, supervised learning, linear regression, data-generating distribution

<!--
  COURSE MAP — generated 2026-10-06 by subject-explorer agents that read every slide
  page visually (equations are images in the PDFs, so text extraction alone misses them).
  This file is the source of truth for lesson authors: it records exactly what the
  professor's slides state vs. derive, her notation, slide errors to correct, Poll
  Everywhere questions (quiz bank seeds), concept-graph edges, and widget ideas.
  Do NOT re-read the PDFs to write a lesson unless this file is ambiguous.
  Source material: "AML Course Material/" in this repo (lectures L1–L10, code companions, HW1–HW2).
-->

# Content Map: Lectures L1–L3 (CS 5785 Applied Machine Learning, Fall 2026, Prof. Kyra Gan)

Source files (all pages read visually):
- `AML Course Material/Lectures/L1-Introduction.pdf` (47 pages)
- `AML Course Material/Lectures/L2.pdf` (31 pages)
- `AML Course Material/Lectures/L3 empirical error and gradient descent.pdf` (45 pages)
- Code companion: `Code_Companions__Lecture2code_companion.ipynb` 

Global note for content writers: these three lectures contain very little derived math. L1 is logistics + taxonomy of ML; L2 is notation + data representation + loss functions; L3 adds the design matrix, the (unshown) closed form, convexity, a verbal description of gradient descent, R², and the probability/data-generating-distribution framing that L4 then turns into true risk vs. empirical risk. Almost every equation is STATED-ONLY, so the platform's "fully derived" promise means we must supply nearly all derivations ourselves (listed per lecture under "Derivation gaps").

---

## L1: Introduction to Machine Learning (47 pages)

### Summary and place in the course arc
L1 is the course kickoff: ~28 slides of logistics (staff, grading, policies, GenAI policy, resources) followed by ~19 slides motivating ML through 2016–2025 breakthroughs (image captioning, AlphaZero, LLMs, coding agents, AlphaFold 3, self-driving) and a conceptual taxonomy of learning paradigms using "How is ChatGPT trained?" as the organizing example: unsupervised/self-supervised pre-training, supervised fine-tuning, and RL with human feedback. It ends with the formal learning objectives and the AI ⊃ ML ⊃ DL Venn diagram. No equations appear except the RL loop symbols ($s \in \mathcal{S}$, $a \in \mathcal{A}$, $r$, $s' \in \mathcal{S}$). It sets up the vocabulary (supervised / unsupervised / RL, labels, generalization) that L2 formalizes.

### Learning objectives (stated on slide 46)
1. Demystify supervised and unsupervised learning.
2. Cast real-world tasks as formal ML problems.
3. Identify and apply appropriate ML methods.
4. Master deep learning basics.
5. Critically analyze the promise and perils of ML in context.
6. Understand RL/LLM.

Course-level objectives (slides 7–8): understand fundamentals ("the what, the why, and the how (the math)"); propose a workflow for a real-world problem (collect/preprocess data, choose algorithms, evaluate); assess whether an ML algorithm is suitable (what assumptions does it require? do they make sense?); improve existing algorithms; build your own ML tools; work on real-world problems via projects and homeworks.

### Ordered concept walkthrough
- **Slides 1–6: Course identity.** CS 5785 / ECE 5414 / ORIE 5750, Fall 2026, Prof. Kyra Gan (Assistant Prof. in ORIE, 4th year; research in causality, sequential decision making, healthcare applications: heart failure, single cell). TAs: Adnan Armouti, Jindan Li (full time), Diyang Li, Jiamin Xu (part time). Graders: Jiwon Jeong, Zirui Han, Fengze Cai, Ruixiang Lu, Kaiwen Zhoing. M/W 7:30–8:45 pm, Bloomberg Center Room 131. Canvas: https://canvas.cornell.edu/courses/88328. Slide 6 is a blank "You?" slide (student introductions).
- **Slides 7–10: Objectives, contents, topics.** Lectures = "foundations of ML algorithm in math": required assumptions, when do they work. Coding = in-class labs, HW, Python + Jupyter, packages matplotlib, numpy, pandas, sklearn, pytorch. Topics first half: basic supervised learning (regression + gradient descent, classification + MLE, regularization, generative vs discriminative + EM), unsupervised (clustering, density estimation / nonparametric estimation, dimensionality reduction). Second half: deep learning (MLP, CNN), advanced topics (diffusion, RL).
- **Slide 11: Tentative schedule (useful for unit grouping).** 8/24 L1 intro; 8/26 review (probability + linear algebra); 8/31 review (calculus + coding autograd); 9/2 L2 supervised learning + linear regression (HW0 due); 9/9 L3 empirical risk + gradient descent; 9/14 L4 gradient descent + logistic regression; 9/16 L5 classification + MLE (HW1 due); 9/21 L6 classification evaluation, choice of divergence, data underspecification; 9/23 L7 regularization, model selection, generative model I; 9/28 L8 generative model + text classification; 9/30 L9 Naive Bayes + GMM (HW2 due); 10/5 L10 unsupervised + k-means; 10/7 L11 GMM + EM; 10/14 L12 EM, nonparametric/density estimation, kernels; 10/19 L13 KNN (HW3 due); 10/21 L14 dimensionality reduction; 10/26 L15 guest (sensor/vision); 10/28 L16 PCA, decision trees, random forest; 11/2 midterm due (semisupervised learning Kaggle); 11/4 L17 distribution shifts + NN; 11/9 L18 NN II; 11/11 L19 learning MLPs, regularization, tricks; 11/16 L20 dropout + CNNs; 11/18 L21 CNN II (HW4 due); 11/23 L22 guest (attention, diffusion); 11/30 L23 RL I; 12/2 L24 RL II; 12/7 L25 guest TBD (HW5 due); 12/17 final project due.
- **Slides 12–27: Policies.** Grade: HW 40% (5 HW + HW0; Canvas quiz on lecture material + Gradescope), midterm group Kaggle competition 25% (~1 week), final group project 25%, participation 10% (60% attendance via Poll Everywhere + surveys, 40% being active). 6 slip days total, max 2 per assignment, then additive 20%/day penalty. HW0 = env setup + 2 surveys, ungraded. Groups up to 3. Three in-class review sessions (8/26 prob/linear algebra, 8/31 calculus/GD, 8/31 2:55–4:10 pm coding). In-person attendance required; no AI use in classroom; GenAI allowed in assignments with citation and critical thinking ("walk before we run", "be careful with agentic AI use").
- **Slide 28: Resources.** Dive into Deep Learning (d2l.ai), Mitchell *Machine Learning*, Murphy *ML: A Probabilistic Perspective*, Bishop *PRML*, (image of Daumé's *A Course in Machine Learning*).
- **Slides 29–34: Motivation / breakthroughs.** 2016: Karpathy image captioning ("man in black shirt is playing guitar", etc.), AlphaZero vs Stockfish/Elmo/AlphaGo. LLMs: ChatGPT, Claude, DeepSeek, Gemini, Llama 3.1; ChatGPT identifies humpback whales from a photo; time-to-1M-users chart (ChatGPT 5 days vs Netflix 3.5 yr, Instagram 2.5 mo) and time-to-100M-users chart (DeepSeek 7 d, ChatGPT 2 mo, TikTok 9 mo ... WWW 7 yr); AI coding assistants landscape (2×2: Agent–Assistant × Generic–Specialized; Cursor, Copilot, Devin, Cline, aider, Replit, bolt, v0 ...); AlphaFold 3; Waymo self-driving car.
- **Slide 35: Limits.** GenAI hallucinates, is not interpretable, "learns association rather than causation"; we may lack the right data (e.g., which patients will develop resistance to cancer therapies?); "Data types and representation are important!" (foreshadows L2).
- **Slide 38: Why does ChatGPT hallucinate?** It is a generative model for NLP; generated content can be false; it will *fail* if used for self-driving cars, treatment recommendation, causal reasoning, statistical inference.
- **Slides 39–45: Learning paradigms via "How is ChatGPT trained?"** STATED-ONLY, conceptual.
  - *Unsupervised learning* (slide 40): dataset without labels; objective = learn structure: clusters, outliers, signal hidden in noise (speech over noisy phone). ChatGPT pre-training = next-token prediction ("aka self-supervised learning").
  - *Supervised learning* (slide 41): most common approach; collect labeled training examples; train a model to output accurate predictions on this dataset; "when the model sees new, similar data, it will also be accurate" (informal statement of generalization under the similar-distribution assumption, formalized in L3 as iid). ChatGPT fine-tuning.
  - *RLHF* (slide 42): where do labels come from? Manual labeling — expensive.
  - *Summary* (slide 43): pre-training (unsupervised/self-supervised) → fine-tuning (supervised) → RLHF (update model using RL with manually labeled preference data). "The performance of ChatGPT is limited by the dataset it was trained on, and the amount of labels that are available."
  - *Reinforcement learning* (slides 44–45): agent interacts with environment over time; taught good behavior via rewards. Diagram: agent in state $s \in \mathcal{S}$ takes action $a \in \mathcal{A}$; environment returns reward $r$ and new state $s' \in \mathcal{S}$. Applications: game agents (Chess, AlphaGo), datacenter cooling control, digital health interventions.
- **Slide 47: AI vs ML vs DL.** AI = building machines that exhibit intelligence; ML = enables machines to learn from experience (a tool for AI); DL = family of learning algorithms loosely inspired by the brain. Nested-ellipse Venn diagram.

### Running examples / datasets
None quantitative. Qualitative examples: image captions, humpback whale photo, cancer-therapy resistance (data availability), self-driving / treatment recommendation (where LLMs fail), speech over noisy phone (unsupervised signal extraction), AlphaGo / datacenter cooling / digital health (RL).

### Figures to rebuild
1. Nested ellipses AI ⊃ ML ⊃ DL (slide 47).
2. RL agent–environment loop with $s, a, r, s'$ (slide 44).
3. Time-to-N-users bar charts (slide 32) — optional, illustrative only.
4. 2×2 coding-assistant landscape (slide 33) — optional.

### Notation table
| Symbol | Meaning |
|---|---|
| $s \in \mathcal{S}$ | RL state in state space |
| $a \in \mathcal{A}$ | RL action in action space |
| $r$ | reward |
| $s' \in \mathcal{S}$ | next state |

### Prerequisite / sticky-note concepts
None mathematical. Conceptual: "label", "training data", "generalization to new similar data" (informal), "generative model" (used informally for ChatGPT), "association vs causation".

### Derivation gaps
None (no math). The platform could add an optional short note formalizing "learns from experience" as the five ML components introduced in L2.

### Poll Everywhere / in-class questions
- "Who are your TAs for this class?" Options: Adnan Armouti / Jindan Li / Diyang Li / Jiamin Xu / All of the above. (Answer: All of the above.)
- "When are the three in-class review sessions?" Options: 8/26 (wed) 11:40–12:55 pm; 8/26 (wed) 7:30–8:45 pm; 8/31 (mon) 7:30–8:45 pm; 9/2 (wed) 7:30–8:45 pm; 8/31 (mon) 2:55–4:10 pm. (Answers: 8/26 7:30–8:45 pm, 8/31 7:30–8:45 pm, 8/31 2:55–4:10 pm.)
Quiz-bank candidates from content: "Which stage of ChatGPT training is supervised?" (fine-tuning); "Next-token prediction is an example of ___ learning" (self-supervised/unsupervised); "Which is NOT a stated RL application?"; "Why does the professor say ChatGPT will fail at statistical inference / causal reasoning?" (generative model trained to produce plausible text; learns association not causation).

### Continuity
L1 → L2: slide 35's "Data types and representation are important!" and slide 41's informal supervised-learning definition are exactly what L2 opens with ("Recall: Machine Learning Basics" + data representation). The L1 schedule shows L2–L4 form a "linear regression & optimization" unit, L5–L7 a "classification/MLE/evaluation/regularization" unit, L8–L12 "generative models & EM", L13–L16 "nonparametric & unsupervised", L17–L22 "deep learning", L23–L24 "RL".

### Concept-graph edges
- Supervised learning -> Linear regression (L2)
- Unsupervised learning -> Clustering/k-means (L10), Density estimation (L12), Dimensionality reduction (L14)
- Reinforcement learning -> RL I/II (L23–24)
- Self-supervised learning (next-token prediction) -> LLM fine-tuning -> RLHF
- Labels/training data -> Supervised learning dataset notation (L2)
- "Similar new data" (informal generalization) -> iid assumption (L3) -> Generalization error / true risk (L4)

### Suggested widgets
- Interactive "ChatGPT training pipeline" stepper (pre-train → SFT → RLHF) with a toggle showing which paradigm each stage is.
- Drag-and-drop "classify the task": given tasks (spam filter, clustering news, playing Go, next-word prediction), sort into supervised / unsupervised / RL.
- Course-arc timeline widget derived from the schedule table (links into the platform's units).

---

## L2: Supervised Learning + Linear Regression (31 pages)

### Summary and place in the course arc
L2 is the first technical lecture. It introduces the five-component recipe for ML (input data, output/targets, model class, loss/objective, learning rule/optimizer), spends most of its time on *data representation* using the sklearn diabetes dataset (attribute types, one-hot encoding, discretization, feature engineering), then sets up formal notation: attributes $x^{(i)} \in \mathcal{X}$, features $\phi(x^{(i)})$, targets $y^{(i)} \in \mathcal{Y}$, dataset $\mathcal{D}$, model $f_\theta: \mathcal{X} \to \mathcal{Y}$, model class $\mathcal{M}$, and loss functions (MAE, MSE) for regression. It stops right after MSE; L3 picks up with RMSE, $R^2$, and the optimizer. Everything is STATED-ONLY.

### Learning objectives (implied)
- Name the five components of a supervised ML problem.
- Represent raw data as numeric vectors; choose encodings for discrete/continuous/categorical attributes; know when to discretize; engineer indicator features.
- Distinguish attributes vs features; regression vs binary/multiclass/multilabel/structured prediction.
- Write a supervised dataset, a parametric model, and a model class in set notation.
- Explain why a model class must be restricted (overfitting / no-free-lunch intuition) and state the three structural assumptions of linear models (independence, monotonicity, uniform effects).
- Define MAE and MSE and interpret them geometrically.

### Ordered concept walkthrough
- **Slides 2–3: Announcements.** HW0 due 9/2, HW1 due 9/16; OH: Kyra Mon 5–6:30 Bloomberg 464; Adnan Thu 10–11:30; Jindan Tue 5–6:30; Diyang Thu 4–5:30. Review session recordings posted.
- **Slide 4: Recall: Machine Learning Basics (the five-component recipe).** Input data; Output (targets task, target values); Model class; Loss function/objective function; Learning rule/optimizer. STATED-ONLY. This list is repeated verbatim as L3 slide 3 and is the organizing spine for L2–L4.
- **Slides 5–7: Data representation: predicting diabetes.** Table of first 5 rows of `sklearn.datasets.load_diabetes(as_frame=True)` with columns age, sex, bmi, bp, s1–s6 (values e.g. row 0: 0.038076, 0.050680, 0.061696, 0.021872, −0.044223, −0.034821, −0.043401, −0.002592, 0.019908, −0.017646). Slide 5 glosses: bmi body mass index; bp average blood pressure; s1 "tc, T-Cells"; s2 ldl; s3 hdl; s4 "tch, thyroid stimulating hormone"; s5 "ltg, lamotrigine"; s6 glu blood sugar. **Content-writer warning:** the sklearn DESCR (in the notebook) says s1 = total serum cholesterol, s4 = total cholesterol/HDL, s5 = (possibly) log of serum triglycerides — the slide's expansions for s1/s4/s5 are wrong (a well-known mislabeling); use the sklearn DESCR. Slide 6: "Predict whether a patient has diabetes based on vectors of patient attributes"; vector representation $x = [x_1, x_2, x_3, \dots, x_{10}]$ with $x_1$: age, $x_2$: sex, $x_3$: BMI, $x_4$: average blood pressure. Slide 7 shows the loading code (`import numpy as np; import pandas as pd; import matplotlib.pyplot as plt; plt.rcParams['figure.figsize']=[12,4]; from sklearn import datasets; diabetes = datasets.load_diabetes(as_frame=True); print(diabetes.DESCR); diabetes_X, diabetes_y = diabetes.data, diabetes.target; diabetes_X.head()`).
- **Slides 8–10: Attribute types and one-hot encoding.** "The amount of signal that you will be able to extract highly depends on the preprocessing steps." Discrete variables (ordering matters, e.g., age); continuous (lab values); categorical (zipcode). Example column 10040, 10041, 10042, 10043, 10044 — how to represent? Poll (slide 9). Answer (slide 10): one-hot encoding — vector of length 5; 10044 ↦ $[0,0,0,0,1]$. STATED-ONLY; intuition: numeric zipcodes have no meaningful order/scale, so treating them as numbers injects false structure.
- **Slide 11: When to convert continuous → discrete/categorical.** Different labs process blood differently (amount of blood/technology); "whether your red blood cell count is normal depends on how your blood is physically processed in the lab"; more meaningful to convert counts to categories: normal, abnormal, low flag, high flag.
- **Slide 12: Feature engineering.** Create indicator "old and a man" (useful if old men are at risk): `diabetes_X['old_man'] = (diabetes_X['sex'] > 0) & (diabetes_X['age'] > 0.05)`; table shows row 2 is True (age 0.085299, sex 0.050680), others False.
- **Slide 13: Poll — is maximizing the number of features beneficial?** (see Poll section).
- **Slide 14: Dataset: Attributes.** Columns = attributes; $i$ indexes the $i$th patient; attribute vector $x^{(i)} \in \mathcal{X}$ is $d$-dimensional: $x^{(i)} = \begin{bmatrix} x^{(i)}_1 \\ x^{(i)}_2 \\ \vdots \\ x^{(i)}_d \end{bmatrix}$. $\mathcal{X}$ = attribute space ("all possible values attributes can take"); often $\mathcal{X} = \mathbb{R}^d$.
- **Slide 15: Dataset: Features.** Features = representations of attributes. Function $\phi: \mathcal{X} \to \mathbb{R}^p$ inputs $x^{(i)}$ and outputs a $p$-dimensional representation; slide writes $\phi(x^{(i)}) = \begin{bmatrix} \phi(x^{(i)}_1) \\ \phi(x^{(i)}_2) \\ \vdots \\ \phi(x^{(i)}_d) \end{bmatrix}$ (note: this component-wise display is loose — it has $d$ entries while $\phi$ maps to $\mathbb{R}^p$; the intended meaning is a general featurization map, with $\phi(x^{(i)})_j$ "a feature"). Convention: attributes and features used interchangeably; most authors call $x^{(i)}$ features; the course follows that and says "attributes" only when disambiguating.
- **Slides 16–17: Target values decide the task.** Regression (continuous or many discrete values: dollars in sales, days since last hospital admission); binary classification (spam/not, diabetes/not); multiclass (categorical with ≥ 3 values: which of 10 digits); multilabel (categories not mutually exclusive: topics of a news article); structured prediction (sentence, image, graph, molecule; machine translation).
- **Slide 18: Dataset: Targets.** $y^{(i)} \in \mathcal{Y}$; $\mathcal{Y}$ = target space; "Assume $y^{(i)}$ is a one-dimensional vector from now on."
- **Slide 19: Supervised learning dataset.** $\mathcal{D} = \{(x^{(i)}, y^{(i)}) \mid i = 1, 2, \dots, n\}$; $x^{(i)} \in \mathcal{X}$ features/inputs (measurements from patient $i$); $y^{(i)} \in \mathcal{Y}$ target (diabetes risk); $(x^{(i)}, y^{(i)})$ a training example. STATED-ONLY.
- **Slides 20–21: Example dataset + first fit.** Scatter of 20 patients, x = BMI (≈22.8–27.7), y = diabetes risk (≈48–310). "How do we explain the correlation between BMI and diabetes risk? Data looks linear! Might be able to fix a line with slope [slide typo 'slop'] to explain the variability. Linear regression! → this is a model class that we decided to pick." Code: `from sklearn.linear_model import LinearRegression; model = LinearRegression()`; black fitted line overlaid.
- **Slide 22: Model notation.** Model = function mapping inputs to targets, $f: \mathcal{X} \to \mathcal{Y}$. Linear regression: $f(x) = \theta_0 + \theta_1 x$ for some $\theta_0, \theta_1 \in \mathbb{R}$ (e.g., $\theta_0 = 0, \theta_1 = 1$). Models parametrized by $\boldsymbol{\theta} \in \Theta$; write $f_{\boldsymbol{\theta}}: \mathcal{X} \to \mathcal{Y}$; here $\boldsymbol{\theta} = [\theta_0, \theta_1]$.
- **Slide 23: Model class.** $\mathcal{M} \subseteq \{ f \mid f: \mathcal{X} \to \mathcal{Y} \}$. Running example: $\mathcal{M} = \{ f_{\boldsymbol{\theta}}(x) \mid f_{\boldsymbol{\theta}}(x) = \theta_0 + \theta_1 x : \theta_0, \theta_1 \in \mathbb{R} \}$. "Objective of learning: selecting the model with the best fit within the model class."
- **Slide 24: Choosing a model class — must restrict the hypothesis space to generalize.** Otherwise we can just overfit; "without assumptions, my current data is not informative of unseen future data" (informal no-free-lunch). Restriction ≠ finite: linear regression has infinitely many parameter values (continuous coefficients). Each model class satisfies different properties.
- **Slide 25: Properties (inductive biases) of linear regression.** *Independence*: each feature exerts an independent effect on the prediction. *Monotonicity*: increasing feature $x_i$ makes $f(\boldsymbol{x})$ go up always or down always (fails for age vs income). *Uniform effects*: $\boldsymbol{x} \to \boldsymbol{x} + \boldsymbol{\Delta}_1$ should change output by a corresponding amount $f(\boldsymbol{x} + \boldsymbol{\Delta}_1) \to f(\boldsymbol{x}) + \boldsymbol{\Delta}_2$ (violated for income vs happiness). STATED-ONLY; platform should show these follow from linearity: $f(x+\Delta) - f(x) = \theta^\top \Delta$ independent of $x$.
- **Slide 26: Model families.** Neural networks dominate today for high-dimensional data, large data, function fitting; "they haven't always, and may not in the future"; many classical methods (linear models) are special cases of NNs.
- **Slide 27: Objective functions.** "Best fit" = distance between predicted outcome and true label, i.e., loss functions $loss_\theta(\hat{y}^{(i)}, y^{(i)})$; distance between vectors is not unique → multiple objective choices.
- **Slide 28: Figure — three candidate lines through a scatter** (orange steep, green, dark-red shallow) — which is best?
- **Slides 29–30 (duplicate): Absolute error.** $\text{loss}_\theta = \frac{1}{n} \sum_{i=1}^n |f_\theta(x^{(i)}) - y^{(i)}|$, figure shows vertical red segments labeled MAE from points to the green line.
- **Slide 31: Mean squared error (most common in linear regression).** $\text{loss}_\theta = \frac{1}{n}\sum_{i=1}^n \left(f_\theta(x^{(i)}) - y^{(i)}\right)^2$; figure shows red *squares* whose side is the residual (big square for a far point, tiny square for a near point) — geometric intuition that MSE penalizes large residuals quadratically.

### Running examples / datasets
- **sklearn Diabetes dataset** (Efron, Hastie, Johnstone, Tibshirani 2004 LARS): $n = 442$ patients, 10 baseline features (age, sex, bmi, bp, s1–s6) each mean-centered and scaled so each column's sum of squares is 1; target = quantitative disease progression one year after baseline ("diabetes risk", range ≈ 25–346; slides say 0–400). Slides use the *last 20 rows* as the training scatter, BMI re-scaled as `bmi*30 + 25` (so x ≈ 22.8–27.7), e.g. rows 422–426: (27.34, 233), (23.81, 91), (25.33, 111), (23.78, 152), (23.97, 120).
- Zipcode column 10040–10044 (one-hot).
- Lab blood-cell counts (discretize to normal/abnormal/low/high).
- `old_man` indicator feature.

### Figures to rebuild
1. **Diabetes head() table** (5 rows × 10 cols) with hover tooltips giving correct variable meanings.
2. **Scatter: BMI (x, ≈22.8–27.7) vs Diabetes Risk (y, ≈48–310), 20 black points** (slide 20); same with fitted black line (slide 21).
3. **Three candidate lines** on a generic scatter (slide 28): axes "Inputs" (X) / "Output" (Y).
4. **MAE figure**: vertical residual segments to the line (slides 29–30).
5. **MSE figure**: squares on residuals (slide 31).

### Notation table
| Symbol | Meaning |
|---|---|
| $i$ | index of the $i$th example/patient, $i = 1,\dots,n$ |
| $n$ | number of training examples |
| $d$ | number of attributes (dimension of $x^{(i)}$) |
| $x^{(i)} \in \mathcal{X}$ | attribute/feature vector of example $i$; components $x^{(i)}_j$ |
| $\mathcal{X}$ | attribute space, often $\mathbb{R}^d$ |
| $\phi: \mathcal{X} \to \mathbb{R}^p$ | featurization map; $\phi(x^{(i)})$ featurized input; $\phi(x^{(i)})_j$ a feature |
| $p$ | feature dimension after $\phi$ |
| $y^{(i)} \in \mathcal{Y}$ | target/label of example $i$ (assumed scalar) |
| $\mathcal{Y}$ | target space |
| $\mathcal{D} = \{(x^{(i)}, y^{(i)})\}_{i=1}^n$ | training dataset |
| $f: \mathcal{X} \to \mathcal{Y}$ | a model |
| $\boldsymbol{\theta} \in \Theta$ | parameter vector in parameter space; $f_{\boldsymbol{\theta}}$ parametric model |
| $\theta_0, \theta_1$ | intercept and slope of 1-D linear regression |
| $\mathcal{M}$ | model class (hypothesis space), $\mathcal{M} \subseteq \{f: \mathcal{X}\to\mathcal{Y}\}$ |
| $\hat{y}^{(i)}$ | predicted target $f_\theta(x^{(i)})$ |
| $loss_\theta(\hat{y}^{(i)}, y^{(i)})$ | per-example loss; $\text{loss}_\theta$ dataset-average loss |
| $\boldsymbol{\Delta}_1, \boldsymbol{\Delta}_2$ | input perturbation and corresponding output change (uniform effects) |

### Prerequisite / sticky-note concepts
- **Vectors and column notation** (slide 14): a $d$-vector is an ordered list of $d$ reals; superscript $(i)$ indexes examples, subscript indexes components; $\mathbb{R}^d$ is the set of all such vectors.
- **Functions / mappings and set-builder notation** (slides 15, 22, 23): $f: \mathcal{X} \to \mathcal{Y}$ assigns each input exactly one output; $\{ f_\theta \mid \theta \in \Theta\}$ is the set of all functions obtained by ranging over parameters; $\subseteq$ means subset.
- **Absolute value and squares as distances** (slides 29–31): $|a-b|$ and $(a-b)^2$ are both ≥ 0, zero iff $a=b$; squaring magnifies large errors and is differentiable at 0, absolute value is not.
- **Mean/average** $\frac{1}{n}\sum$ (slides 29–31).
- **Standardization** (poll on slide 9: "convert to numerical values and standardize"): subtract mean, divide by standard deviation — needs mean and SD definitions; also the diabetes features are pre-standardized (column sum of squares = 1).
- **Indicator/Boolean features** (slide 12): $\mathbb{1}[\text{condition}] \in \{0,1\}$.
- **Correlation** (slide 21, "correlation between BMI and diabetes risk"): used informally as "linear association".

### Derivation gaps
1. Why one-hot rather than integer codes for categoricals: show that an integer code imposes an arbitrary ordering and spacing which a linear model would exploit; one-hot gives each category its own free parameter.
2. Linear-model properties (independence, monotonicity, uniform effects) as theorems about $f_\theta(x) = \theta_0 + \theta^\top x$: $\partial f/\partial x_j = \theta_j$ constant; $f(x+\Delta) - f(x) = \theta^\top\Delta$.
3. Why MAE and MSE are both valid "distances" and how they differ (robustness to outliers; MSE ↔ Gaussian noise / MLE, previewed later in L5; MAE ↔ Laplace / median).
4. Why restricting the model class is necessary (informal no-free-lunch): a 1-slide argument that an unrestricted class can interpolate any finite dataset, so training fit says nothing about new points.
5. The "features vs attributes" map $\phi$: give concrete examples (polynomial features, one-hot, indicator) so the notation on slide 15 is well-typed.

### Poll Everywhere / in-class questions
- "How to represent the 5 zipcodes in the example?" Options: convert to numerical values and use as is; convert to numerical values and standardize; represent using a binary vector of length 5 where each entry represents one zipcode; any of the above works well in practice. (Intended answer: the binary/one-hot vector.)
- "Is it beneficial to maximize the number of input features in a machine learning model?" Options: depends on the model class (more complex → more the better); depends on dataset size (large datasets → more the better); always beneficial; never beneficial; none of the above. (Discussion point: more features ≠ better — overfitting, noise, curse of dimensionality; nuanced answer.)

### Continuity
Builds on L1's informal supervised-learning definition; formalizes the five components (data, targets, model class, loss, optimizer) and covers the first four for regression. Ends on MSE; L3 begins by *re-showing* the same recap list, the same scatter, the same MAE/MSE slides (L3 slides 3–7 are near-verbatim repeats of L2 slides 4, 20, 27–31), then adds RMSE, $R^2$, optimizer. L2+L3 should be one unit ("Supervised learning & linear regression").

### Concept-graph edges
- Five ML components -> Data representation; -> Model class; -> Loss function; -> Optimizer (L3)
- Attribute types (discrete/continuous/categorical) -> One-hot encoding; -> Discretization; -> Feature engineering
- Attributes $x^{(i)}$ -> Features $\phi(x^{(i)})$ -> Design matrix $X$ (L3)
- Target space $\mathcal{Y}$ -> Task taxonomy (regression / binary / multiclass / multilabel / structured)
- Dataset $\mathcal{D}$ -> Loss over dataset; -> iid sampling assumption (L3)
- Model $f_\theta$ -> Model class $\mathcal{M}$ -> Restricting hypothesis space (generalization) -> Regularization / model selection (L7–L8)
- Linear regression model -> Linear-model properties (independence, monotonicity, uniform effects)
- Loss function concept -> MAE; -> MSE -> RMSE, $R^2$ (L3) -> Closed-form least squares (L3) -> Gradient descent (L3/L4)
- Linear models -> Neural networks (special case; L17+)

### Suggested widgets
- **Encoding explorer**: a categorical column (zipcodes); toggle integer-code vs one-hot and watch a linear fit's predictions change.
- **Feature-engineering sandbox** on the diabetes frame: build `old_man`-style boolean features from thresholds and see a table update.
- **Line-fitting playground**: sliders for $\theta_0, \theta_1$ on the 20-point BMI scatter; live display of MAE and MSE with residual segments / squares drawn (directly recreates slides 28–31).
- **Loss comparison**: drag one point far away and watch MAE vs MSE respond (outlier sensitivity).
- **Task classifier quiz**: given a target description, pick regression/binary/multiclass/multilabel/structured.

---

## L3: Linear Regression and Data Generating Distribution (45 pages)
(file name: "L3 empirical error and gradient descent"; title slide reads "Lecture 3 Linear Regression and Data Generating Distribution")

### Summary and place in the course arc
L3 completes the five-component recipe for linear regression — recapping losses, adding RMSE and $R^2$, introducing the design matrix and the least-squares optimization problem (closed form asserted, not shown), the MSE bowl and convexity, and a verbal gradient-descent/SGD loop with its optimality guarantee under convexity — then pivots to "the philosophy of thinking about data": random variables, probability axioms, iid sampling, the data-generating distribution $P$ with $(X^{(i)}, y^{(i)}) \sim P$ and $Y = f(X) + \epsilon$, a worked linear DGP, the $R^2$ formula and the HW2 question "what does $R^2$ converge to?", and finally the picture of a true function $g(X)$, a fitted $f(X;\theta)$, total error as an integral $\int error(f(X;\theta), g(X))\,dX$, the problem that $g$ is unknown, and the solution of sampling training points. L4 (per its text dump) immediately names that integral "true risk" $R(\theta) = \mathbb{E}_{(X,Y)\sim P}[\dots]$ and defines empirical risk; so L3 is the bridge from "fit a line" to statistical learning theory language.

### Learning objectives (implied)
- Compute and interpret MAE, MSE, RMSE, $R^2$; know which are losses vs evaluation metrics.
- Write the least-squares problem in matrix form with the design matrix and know it has a closed form under squared loss.
- Define convexity and state when gradient descent is guaranteed to reach the global optimum.
- Describe the gradient-descent/SGD loop.
- Model data as realizations of random variables drawn iid from a data-generating distribution; state the iid assumption and its two parts.
- Understand "true" total error over the input space vs what can be computed from samples (setup for empirical risk).

### Ordered concept walkthrough
- **Slide 2: Announcements.** HW1 due 9/16; Canvas quiz: no automated feedback per attempt, unlimited attempts, most recent score counts.
- **Slide 3: ML basics recap** (same five components as L2 slide 4).
- **Slide 4: How linear regression works (hand-annotated).** BMI scatter with three hand-drawn candidate lines labeled $45 + 4x$ (orange), $47 + 3.5x$ (blue), $43 + 3x$ (pink); "Each line is a model and forms a valid hypothesis of the true model"; handwritten: $\mathcal{M} = \{ f_\theta(x) \mid \theta_0, \theta_1 \in \mathbb{R} \}$ "→ model class associated with this linear regression". (Note: these lines are illustrative — on the slide's axes (BMI 23–27.7) $45+4x$ gives 137–156, so the annotations are schematic rather than exact.)
- **Slides 5–7: Objective functions recap.** $loss_\theta(\hat{y}^{(i)}, y^{(i)})$; Absolute Error, Mean Squared Error, Root Mean Squared Error listed. MAE and MSE formulas repeated: $\text{loss}_\theta = \frac{1}{n}\sum_{i=1}^n |f_\theta(x^{(i)}) - y^{(i)}|$; $\text{loss}_\theta = \frac{1}{n}\sum_{i=1}^n (f_\theta(x^{(i)}) - y^{(i)})^2$.
- **Slide 8: RMSE.** $\text{loss}_\theta = \sqrt{\frac{1}{n}\sum_{i=1}^n (f_\theta(x^{(i)}) - y^{(i)})^2}$. "RMSE puts the error back in the units of the label." What is good RMSE? "Depending on the variance of the data." Coefficient of determination $R^2$: an *evaluation metric*, "Not a loss function." STATED-ONLY.
- **Slide 9: Coefficient of determination.** "Measures the amount of variance explained by the linear regression model." Figure (Wikipedia-style): left panel squares of deviations from $\bar{y}$ (red, $SS_{\text{tot}}$); right panel squares of residuals from fitted line $f$ (blue, $SS_{\text{res}}$). $R^2 = 1 - \frac{SS_{\text{res}}}{SS_{\text{tot}}}$. "$R^2$ moves closer to 1 as the fit becomes better"; "normalized metric that allows goodness-of-fit comparison across different datasets." STATED-ONLY.
- **Slide 10: Training / Optimizer.** Once model class is fixed, infinitely many parameter values; how should they change? "Find the minimizer of the objective/loss function." An optimizer takes a loss and a model class $\mathcal{M}$ and finds $\min_{f \in \mathcal{M}} loss(f)$; when parameterized by $\theta$ we minimize over parameter space $\Theta$.
- **Slide 11: Design matrix.** $X \in \mathbb{R}^{n \times d}$, $X = \begin{bmatrix} x^{(1)}_1 & x^{(1)}_2 & \cdots & x^{(1)}_d \\ x^{(2)}_1 & x^{(2)}_2 & \cdots & x^{(2)}_d \\ \vdots \\ x^{(n)}_1 & x^{(n)}_2 & \cdots & x^{(n)}_d \end{bmatrix} = \begin{bmatrix} - & (x^{(1)})^\top & - \\ - & (x^{(2)})^\top & - \\ & \vdots & \\ - & (x^{(n)})^\top & - \end{bmatrix}$. STATED-ONLY.
- **Slide 12: Linear regression admits closed-form solution — optimization problem.** "Minimize the sum of the squared errors": $\min \sum_{(\mathbf{x}_i, y_i) \in \mathcal{D}} \left( \left(\theta_0 + \theta_1 x^{(i)}_1 + \theta_2 x^{(i)}_2 + \cdots + \theta_d x^{(i)}_d\right) - y_i \right)^2$. "Succinctly (with linear algebra): $\min_\theta \|\theta^\top X - y\|_2^2$, with $x_0 = 1$." **Notation warning for writers:** with $X \in \mathbb{R}^{n\times d}$ (rows = examples) the well-typed expression is $\|X\theta - y\|_2^2$ (and $X$ must be augmented with a column of ones so $\theta \in \mathbb{R}^{d+1}$); the slide's $\theta^\top X$ is dimensionally inconsistent; it also mixes $y_i$ / $\mathbf{x}_i$ with $x^{(i)}$. The platform should present the clean version and note the slide's shorthand.
- **Slide 13: Closed form under mean squared loss.** $\ell(\mathbf{y}, \hat{\mathbf{y}}) = \|\theta^T X - y\|_2^2 = \sum_{i=1}^n (y_i - \theta^T \mathbf{x}^{(i)})^2 = (\mathbf{y} - \theta^T X)^T (\mathbf{y} - \theta^T X)$. "The derivation was presented in the first review session." Code: `model.fit(X_train, y_train)`. **The closed-form solution itself ($\hat\theta = (X^\top X)^{-1} X^\top y$) is never written on these slides** — STATED-ONLY (and only its existence is stated).
- **Slide 14: MSE surface.** 3-D mesh of $J(\theta_0, \theta_1)$ over $\theta_0 \in [-20, 10]$, $\theta_1 \in [-20, 10]$, $J \in [0, 100]$ — a convex bowl (elongated/elliptical). STATED-ONLY (that MSE in $\theta$ is a quadratic bowl is not proven).
- **Slide 15: Convex functions.** For all $0 \le t \le 1$ and all $x_1, x_2 \in X$: $f(t x_1 + (1-t) x_2) \le t f(x_1) + (1-t) f(x_2)$. Pictures: convex (chord above curve) vs not convex (chord crosses curve). STATED-ONLY.
- **Slide 16: Optimizer.** "In general, many models are trained by stochastic gradient descent (SGD)": gradients (multivariable calculus), programs that perform automatic differentiation, PyTorch.
- **Slide 17: Gradient descent (verbal).** Gradient = generalization of derivatives to vectors and matrices; can optimize *any* differentiable loss; takes partial derivatives, which inform directions where loss increases/decreases most rapidly; move parameters in the direction of the negative gradient. **No update equation $\theta \leftarrow \theta - \eta \nabla_\theta \text{loss}$ and no symbol for the learning rate appear in L3** — STATED-ONLY (L4 supplies them).
- **Slide 18: SGD loop (verbal).** Random initialization; repeat: grab data point $(x, y)$ from dataset; pass $x$ into model generating $f(x)$; calculate $loss(f(x), y)$; update weights $w$ in the direction that lowers the loss. (Note: uses $w$ here instead of $\theta$.)
- **Slides 19–20: Polls** (see below).
- **Slide 21: Guarantees.** Optimality: guaranteed to reach global optimum if the loss function is convex and with suitable step sizes. If not convex (multiple optima), the stochastic part will nudge the loss function out of local minima; "hopefully you reach a global optimum, but there is no guarantee." STATED-ONLY.
- **Slide 22: Poll** "loss is high, what went wrong?" (below).
- **Slide 23: Generalization.** "After training, model accurately classifies images we have seen. But we want to perform well on previously unseen images!" Figure: blue "Model" points (training patients) on raw-scale BMI (−0.08 to 0.09) vs risk; three red × "Initial patients" [sic — actually the 3 new test patients] and red ● "Prediction" markers near (−0.051, 75 vs true 94), (0.044, 141 vs 126), (0.062, 150 vs 158).
- **Slide 24: Objective of learning (synthesis).** Find the model within the model class that best fits the data; achieved by defining a loss/objective and using an optimizer to find the parameters that minimize it. Formula-diagram: $\underbrace{\text{Dataset}}_{\text{Features, Attributes, Targets}} + \underbrace{\text{Learning Algorithm}}_{\text{Model Class + Objective + Optimizer}} \to \text{Predictive Model}$. Output: a predictive model that maps inputs to targets and can predict targets on new inputs.
- **Slide 25: Recall MSE + "Next".** Next: an automated (universal) way of optimizing an objective; before that, "the philosophy of thinking about data and what machines are learning: data generating distribution and empirical risk."
- **Slide 26: Modeling the data generating distribution.** Randomness in the attributes: $X$: BMI, $Y$: diabetes risk are now random variables; RV = mathematical way to model randomness and quantify random events.
- **Slide 27: Probability refresher: RVs.** The BMI of the next data point is *random*; need the notion of RV to define the set of all possible BMI values (sample space), the likelihood of a value (probability), and the distribution (density function).
- **Slides 28–30: RV examples.** A RV $X: \Omega \to E$ is a mapping from the set of possible outcomes in a sample space $\Omega$ to a measurable space $E$. (i) $X$ = outcome of a single coin toss: $X(\text{heads}) = H$, $X(\text{tails}) = T$. (ii) $X$ = number of heads in two tosses: $X(H,H) = 2$, $X(T,H) = 1$. (iii) $X$ = whether a head appeared in two tosses: $X(H,H) = 1$, $X(T,H) = 1$. Point: the same sample space supports many RVs; an RV is something *you construct*.
- **Slide 31: Probability distributions — axioms.** The distribution of RVs defines a probability distribution quantifying how likely an event is. Axioms as written: $P(\Omega) = 1, P(\emptyset) = 0$; $0 \le P(\omega) \le 1$ for all $\omega \subseteq \Omega$; satisfy countable additivity. STATED-ONLY (no σ-algebra; $\omega$ used for events).
- **Slide 32: Example — fair coin once.** $P(X = T) = 0.5, P(X = H) = 0.5$; $P(\text{observes nothing}) = 0$; $P(X = T \text{ or } X = H) = P(X=T) + P(X=H) = 1$. Highlighted: "Probability function is something you can construct!!"
- **Slides 33–34: Attributes as RVs; data drawn from data generating distributions; dataset = realizations.** The BMI of the entire population forms a distribution; each person's BMI is randomly sampled independently → "the BMI satisfies the independent and identically distributed (iid) assumption."
- **Slide 35: Common iid assumption.** Independent: each sample's value independent of others ("my BMI has no effect on your BMI — Really?"). Identically distributed: samples from the same distribution. "IID is *not* always assumed by ML methods."
- **Slides 36–37: Data generating distribution.** Dataset sampled iid from distribution $P$: $(X^{(i)}, y^{(i)}) \sim P$. Example $X$: BMI, $Y$: diabetes risk; $P$ described by $Y = \alpha + \beta X + \varepsilon$, $X \sim N(168, 30)$, $\varepsilon \sim N(0, 20)$ (slide 37 has a rendering glitch dropping $\beta$ and $\varepsilon$; slide 40 shows the full form). "The iid assumption → algorithmic guarantees." **Writer note:** 168 is implausible for BMI (looks like a height in cm) and the slides do not say whether 30/20 are variances or standard deviations; treat as a synthetic toy DGP and state the convention explicitly.
- **Slide 38: Why model the DGP?** Lets us describe how ML algorithms learn in the language of generalization error, true risk, empirical risk; models randomness in the dataset; data generated by some unknown function $f$: $Y = f(X) + \epsilon$; use probability/statistics to analyze ML algorithms.
- **Slide 39: Poll** (select all true; below).
- **Slide 40: Linear DGP vs linear regression — $R^2$ question.** When the DGP is truly linear, what does $R^2$ converge to as $n \to \infty$? DGP: $Y = \alpha + \beta X + \varepsilon$, $X \sim N(168,30)$, $\varepsilon \sim N(0,20)$; run linear regression $Y^{(i)} = \alpha + \beta X^{(i)}$. "What does $R^2$ converge to? (Homework 2)". $R^2 = 1 - \frac{\sum_i (y_i - \hat{y}_i)^2}{\sum_i (y_i - \bar{y})^2} = 1 - \frac{RSS}{TSS}$; RSS = sum of squares of residuals, TSS = total sum of squares. Highlighted: "$R^2$ can be negative if your model is really bad!!" STATED-ONLY (answer not given; it is $\mathrm{Var}(\beta X)/(\mathrm{Var}(\beta X) + \mathrm{Var}(\varepsilon)) = \beta^2\sigma_X^2/(\beta^2\sigma_X^2 + \sigma_\varepsilon^2)$ — the platform must NOT give the HW answer outright but can derive the general principle).
- **Slide 41: How to learn an ML model? (hand-annotated).** Blue dotted curve = true data-generating mechanism $g(X)$ (annotated "glucose level" as output, "BMI" as input); red points at $X_1, \dots, X_5$ = data points in my dataset, sampled from $g(X)$; annotation "index for data points".
- **Slide 42: Fitted function.** Red dashed curve $f(X; \theta)$ = current fitted function; vertical bars at each $X_i$ show $f(X_i;\theta)$ vs $g(X_i)$; handwritten $y_1 \dots y_5$ at the true-curve values; shaded area between curves.
- **Slide 43: Total error.** Pointwise $error(f(X;\theta), g(X))$ (arrow to vertical gap); the shaded area $totalerr(\theta) = \int_{-\infty}^{\infty} error\big(f(X;\theta), g(X)\big)\, dX$; the optimal $\hat{\theta} = \arg\min_\theta totalerr(\theta)$. STATED-ONLY.
- **Slide 44: Problem: $g(X)$ is unknown.** (2-D surface $g(X)$ over a cube + the 1-D picture.) The function must be fully specified to compute $\int_{-\infty}^{\infty} error(f(X;\theta), g(X))\,dX$; in practice we have no such specification.
- **Slide 45: Solution: sampling the function.** Sample $g(X)$: get input–output pairs $(\mathbf{X}_i, \mathbf{d}_i)$ for a number of inputs (3-D stem plots); "very easy in most problems: just gather training data"; "we must learn the entire function from these few examples — the training samples." (Lecture ends; L4 continues with true risk $R(\theta) = \mathbb{E}_{(X,Y)\sim P}[error(f(X;\theta), g(X))]$, empirical error, and "Supervised learning problem restated".)

### Running examples / datasets
- Diabetes BMI → risk scatter (20 training points) with candidate lines $45+4x$, $47+3.5x$, $43+3x$ (slide 4), and the generalization plot with 3 test patients (slide 23; raw-scale BMI).
- Synthetic linear DGP: $Y = \alpha + \beta X + \varepsilon$, $X \sim N(168, 30)$, $\varepsilon \sim N(0, 20)$.
- Coin tosses (one toss; two tosses: number of heads; any head) for RV construction; fair coin probabilities 0.5/0.5.
- Schematic true function $g(X)$ with 5 sample points $X_1..X_5$ (glucose level vs BMI annotation).
- Diabetes head() table reused as "realizations of RVs" (slides 33–34).

### Figures to rebuild
1. BMI scatter with three selectable candidate lines + handwritten model-class annotation (slide 4).
2. MAE / MSE residual figures (slides 6–7; same as L2).
3. $R^2$ two-panel: squares around $\bar{y}$ vs squares around fitted line (slide 9).
4. Design matrix as a grid with row = example, column = attribute (slide 11).
5. 3-D MSE bowl $J(\theta_0, \theta_1)$ over $[-20,10]^2$ (slide 14).
6. Convex vs non-convex curve with chord (slide 15).
7. Generalization scatter with train (blue), test (red ×) and predictions (red ●) (slide 23).
8. Dataset + Learning Algorithm → Predictive Model block diagram (slide 24).
9. Coin-toss RV mapping diagrams (slides 28–30).
10. True curve $g(X)$ with sampled points; fitted curve $f(X;\theta)$ with shaded error area; pointwise error arrow (slides 41–44).
11. 3-D surface $g(X)$ over a 2-D input cube and stem-plot samples (slides 44–45).

### Notation table
| Symbol | Meaning |
|---|---|
| $\text{loss}_\theta$ | dataset-level loss (MAE, MSE, RMSE) as a function of $\theta$ |
| $\ell(\mathbf{y}, \hat{\mathbf{y}})$ | vector-form squared loss $\|\theta^T X - y\|_2^2$ |
| $J(\theta_0, \theta_1)$ | MSE surface label on the 3-D bowl plot |
| $X \in \mathbb{R}^{n\times d}$ | design matrix, rows $(x^{(i)})^\top$ |
| $x_0 = 1$ | bias/intercept augmentation |
| $\mathbf{y}$, $y_i$ | target vector / $i$th target (slides mix $y_i$ and $y^{(i)}$) |
| $\|\cdot\|_2^2$ | squared Euclidean norm |
| $\Theta$ | parameter space; $\min_{f\in\mathcal{M}} loss(f)$ ↔ $\min_{\theta\in\Theta}$ |
| $w$ | "weights" (slide 18; synonym for $\theta$) |
| $R^2$ | coefficient of determination $= 1 - SS_{\text{res}}/SS_{\text{tot}} = 1 - RSS/TSS$ |
| $SS_{\text{res}}, RSS$ | $\sum_i (y_i - \hat{y}_i)^2$ |
| $SS_{\text{tot}}, TSS$ | $\sum_i (y_i - \bar{y})^2$ |
| $\bar{y}$ | sample mean of targets |
| $t \in [0,1]$ | convex-combination weight in the convexity definition |
| $X: \Omega \to E$ | random variable from sample space $\Omega$ to measurable space $E$ |
| $\Omega$, $\emptyset$, $\omega$ | sample space, empty event, an event ($\omega \subseteq \Omega$ on the slide) |
| $P(\cdot)$ | probability measure / data-generating distribution |
| $(X^{(i)}, y^{(i)}) \sim P$ | iid draws from $P$ |
| $N(\mu, \cdot)$ | normal distribution (second argument ambiguous: variance or SD) |
| $\alpha, \beta$ | intercept, slope of the true linear DGP |
| $\varepsilon$, $\epsilon$ | additive noise, $\varepsilon \sim N(0,20)$ |
| $f(X)$ (slide 38), $g(X)$ (slides 41–45) | the unknown true data-generating function |
| $f(X;\theta)$ | fitted model (same as $f_\theta(x)$) |
| $error(f(X;\theta), g(X))$ | pointwise error at input $X$ |
| $totalerr(\theta)$ | $\int_{-\infty}^\infty error(f(X;\theta), g(X))\,dX$ |
| $\hat{\theta}$ | $\arg\min_\theta totalerr(\theta)$ |
| $\mathbf{X}_i, \mathbf{d}_i$ | sampled input and its observed output (slide 45 stem plot) |

### Prerequisite / sticky-note concepts
- **Matrix–vector product, transpose, Euclidean norm** (slides 11–13): $X\theta$ stacks the $n$ inner products $(x^{(i)})^\top\theta$; $\|v\|_2^2 = v^\top v = \sum_i v_i^2$; $(A B)^\top = B^\top A^\top$.
- **Square root and units** (slide 8): RMSE $= \sqrt{\text{MSE}}$ has the units of $y$.
- **Variance and sample mean** (slides 8, 9, 40): $\bar{y} = \frac1n\sum y_i$; $TSS/n$ is the sample variance; $R^2$ compares residual variance to total variance.
- **Minimization / argmin** (slides 10, 43): $\min$ is the smallest value, $\arg\min$ the parameter achieving it; for a parametric class, minimizing over $f\in\mathcal{M}$ equals minimizing over $\theta\in\Theta$.
- **Partial derivatives and the gradient** (slides 16–17): $\nabla_\theta J = (\partial J/\partial\theta_0, \dots)$ points in the direction of steepest ascent; $-\nabla J$ is steepest descent.
- **Convex functions and convex combinations** (slide 15): chord lies above graph; for differentiable $f$, convexity ⇔ $f(y) \ge f(x) + \nabla f(x)^\top(y-x)$; local minima of convex functions are global.
- **Local vs global minima; step size** (slide 21).
- **Automatic differentiation / PyTorch** (slide 16): computes gradients of code-defined losses by the chain rule.
- **Sample space, events, random variable as a function, measurable space** (slides 27–30).
- **Probability axioms and countable additivity** (slides 31–32): $P(\Omega)=1$, $P(A)\ge 0$, $P(\bigcup_k A_k) = \sum_k P(A_k)$ for disjoint $A_k$.
- **Independence and identical distribution** (slides 34–35): $P(A \cap B) = P(A)P(B)$; same marginal law for each sample.
- **Normal distribution** (slides 37, 40): $N(\mu,\sigma^2)$ density; linear transformations of normals are normal.
- **Expectation / integral over the input space** (slides 43–44): an integral $\int error\,dX$ is the continuous analogue of a sum; L4 replaces it by $\mathbb{E}_{(X,Y)\sim P}$.
- **Realization vs random variable** (slide 33): the dataset contains numbers (realizations); the RV is the mechanism.

### Derivation gaps (core product feature)
1. **Least-squares closed form (normal equations).** From $\ell(\theta) = \|X\theta - y\|_2^2 = (X\theta - y)^\top(X\theta - y)$ expand, take $\nabla_\theta \ell = 2X^\top X\theta - 2X^\top y = 0$, obtain $\hat\theta = (X^\top X)^{-1}X^\top y$ when $X^\top X$ is invertible (needs: matrix calculus identities $\nabla_\theta \theta^\top A\theta = 2A\theta$ for symmetric $A$, $\nabla_\theta b^\top\theta = b$; invertibility ⇔ full column rank ⇔ linearly independent features — ties to the slide-22 poll option "features not linearly independent"). Also the 1-D special case $\hat\theta_1 = \mathrm{Cov}(x,y)/\mathrm{Var}(x)$, $\hat\theta_0 = \bar y - \hat\theta_1\bar x$, which reproduces the notebook's numbers.
2. **MSE in $\theta$ is a convex quadratic (bowl).** Show the Hessian $\frac{2}{n}X^\top X \succeq 0$; explain why the bowl is elliptical (eigenvalues of $X^\top X$) and what that means for GD step sizes.
3. **Convexity ⇒ every local minimum is global; GD with suitable step size converges** (slide 21 guarantee). At minimum: a one-paragraph proof of "local = global" for convex functions, and the descent lemma $f(\theta - \eta\nabla f) \le f(\theta) - \frac{\eta}{2}\|\nabla f\|^2$ for $\eta \le 1/L$ with $L$-smooth $f$.
4. **The gradient-descent update equation** $\theta_{t+1} = \theta_t - \eta\nabla_\theta J(\theta_t)$ and the MSE gradient $\nabla_\theta J = \frac{2}{n}X^\top(X\theta - y)$ (never written in L3; L4 gives it — platform should derive it here or at the L3/L4 boundary).
5. **Why the negative gradient is the direction of steepest descent** (first-order Taylor expansion + Cauchy–Schwarz).
6. **$R^2$ properties.** (a) $R^2 \le 1$; (b) with an intercept and OLS fit on the training set, $R^2 \in [0,1]$ because residuals are orthogonal to the fitted values; (c) $R^2$ can be negative for a bad / mis-specified / test-set model (the slide's highlighted claim) — show an example; (d) population limit under a linear DGP: $R^2 \to \beta^2\mathrm{Var}(X)/(\beta^2\mathrm{Var}(X) + \mathrm{Var}(\varepsilon))$ (this is HW2 — present the general derivation but flag not to give numeric answers for the HW parameters).
7. **RMSE vs variance of the data**: show that predicting the constant $\bar y$ gives RMSE = SD of $y$, so RMSE should be judged relative to $\mathrm{SD}(y)$ — this is exactly $R^2$.
8. **Linear DGP ⇒ linear regression is well-specified**: under $Y = \alpha + \beta X + \varepsilon$ with $\mathbb{E}[\varepsilon \mid X] = 0$, $\mathbb{E}[Y\mid X] = \alpha + \beta X$ is the MSE-optimal predictor (conditional expectation minimizes squared error) — justifies poll slide 39's "we expect linear regression to work well if the DGP is linear".
9. **From $totalerr(\theta) = \int error\,dX$ to $\mathbb{E}_{(X,Y)\sim P}[\,\cdot\,]$ (true risk) and to the empirical average** (law of large numbers) — the L3→L4 hinge; the integral on slide 43 is unweighted by the density of $X$, so the platform should explain the correct weighted version $\int error(\dots)\,p(X)\,dX$.
10. **Random variable formalism**: why $X:\Omega\to E$ needs measurability; why the "whether a head appeared" RV is a different function on the same $\Omega$; probability of an event as $P(X^{-1}(B))$.
11. **iid and its consequences**: joint density factorizes $\prod_i p(x^{(i)}, y^{(i)})$ (used later for MLE in L5); why non-iid data (time series, patients in the same family/hospital) breaks the "my BMI has no effect on your BMI" premise.
12. **The linear-model properties from L2** (independence/monotonicity/uniform effects) can be proven here using the design-matrix form.

### Poll Everywhere / in-class questions
- "What is the most common objective/loss function for linear regression?" Options: Least squares; Gradient Descent; Mean squared error; R^2. (Intended: Mean squared error / least squares — note Gradient Descent is an optimizer and $R^2$ is an evaluation metric.)
- "Select all that can be used as an evaluation metric for linear regression:" Options: Least Squares; Root Mean Squared Error; R^2; Mean Squared Error; Accuracy. (Intended: RMSE, $R^2$, MSE (and least squares as a value); Accuracy is for classification.)
- "The loss of my linear regression is high on my dataset, what could have gone wrong?" Options: I picked the wrong model class, i.e., the underlying data generating mechanism is highly nonlinear; the loss function got stuck at a local minima; I did not preprocess my data well; the model class is too small since linear regression only contains a finite number of hypotheses; the features in my dataset are not linearly independent of each other; all of the above. (Discussion: wrong model class and poor preprocessing are valid; MSE for linear regression is convex so no local minima; the class is infinite, not finite; linear dependence causes non-uniqueness of $\hat\theta$, not high loss.)
- "Select all statements that are true:" (a) To run linear regression we would require the underlying DGP to be linear; (b) oftentimes the DGP is unknown but it is easy to guess which family it comes from; (c) in general we expect linear regression to work well if the DGP of the observed variables is linear; (d) deep learning methods often achieve superior performance in practice as their model classes are more expressive; (e) none of the above. (Discussion: (c) true; (d) largely true as stated; (a) false — you can always run it; (b) false — guessing the family is generally hard.)
- Open question (slide 40, HW2): "What does $R^2$ converge to when the DGP is truly linear and $n \to \infty$?"

### Continuity
L3 slides 3–7 literally repeat L2 (recap list, scatter, loss formulas) and then extend. It closes the "five components" loop (optimizer) and opens the probabilistic framing that L4 ("Empirical Risk and Gradient Descent", per its text dump: recap DGP, true risk $R(\theta)$, empirical error, "Supervised learning problem restated", then GD details) continues directly — L4's first slides re-show L3 slides 38, 41–45. Recommended unit grouping: **Unit 1 = L2 + L3 + L4** ("Supervised learning, linear regression, risk and gradient descent"), with L1 as a standalone "Orientation" unit. L3's convexity + GD guarantee and the design matrix feed L4 (GD math) and L5 (logistic regression, MLE).

### Concept-graph edges
- MSE -> RMSE; MSE -> $R^2$; Sample variance -> $R^2$; $R^2$ -> "R² can be negative" ; Linear DGP + $R^2$ -> HW2 limit question
- Loss function + Model class -> Optimizer ($\min_{f\in\mathcal{M}} loss(f)$) -> Closed-form least squares; -> Gradient descent
- Attribute vectors $x^{(i)}$ -> Design matrix $X$ -> Vector form of squared loss -> Normal equations (gap)
- Convexity definition -> GD global-optimality guarantee; MSE bowl -> Convexity of least squares
- Gradient / partial derivatives -> Gradient descent -> SGD loop -> Autodiff/PyTorch; GD -> GD + logistic regression (L4–L5)
- Non-convexity -> local minima -> role of stochasticity in SGD
- Training fit -> Generalization (unseen data) -> train/test split (L4+), regularization/model selection (L7–L8)
- Sample space $\Omega$ -> Random variable $X:\Omega\to E$ -> Probability axioms -> Probability distribution -> Data-generating distribution $P$
- Independence + Identical distribution -> iid assumption -> algorithmic guarantees; iid -> MLE factorization (L5)
- Data-generating distribution -> $Y = f(X) + \epsilon$ -> linear DGP example -> true function $g(X)$ -> total error integral -> (g unknown) -> sampling training data -> true risk vs empirical risk (L4)
- Normal distribution -> noise model $\varepsilon \sim N(0,\cdot)$ -> Gaussian MLE ⇔ least squares (L5)

### Suggested widgets
- **Residual-metric dashboard**: on the 20-point BMI data, sliders for $\theta_0,\theta_1$ show MAE, MSE, RMSE, $R^2$ simultaneously; a "set to OLS" button snaps to the closed form; shows $R^2$ going negative when the line is worse than the mean.
- **$R^2$ two-panel squares**: toggle between squares around $\bar y$ (TSS) and around the fit (RSS); animate the ratio.
- **MSE bowl + GD trajectory**: 3-D/contour plot of $J(\theta_0,\theta_1)$ over $[-20,10]^2$ with a learning-rate slider; show convergence, oscillation, divergence; toggle feature standardization to show the bowl becoming round (ties to eigenvalues of $X^\top X$).
- **Convexity checker**: drag two points on a user-chosen curve; chord drawn; highlights where $f(tx_1+(1-t)x_2) \le tf(x_1)+(1-t)f(x_2)$ fails.
- **SGD vs GD on a non-convex 1-D loss**: show stochastic noise escaping a local minimum (slide 21 claim).
- **Random-variable builder**: two coin tosses; pick a mapping (number of heads / any head / first toss) and see the induced distribution; verify axioms numerically.
- **DGP sampler**: sliders for $\alpha,\beta,\sigma_X,\sigma_\varepsilon$; draw $n$ points from $Y=\alpha+\beta X+\varepsilon$; fit OLS; plot $R^2$ vs $n$ converging to its population limit (supports HW2 intuition without giving the formula).
- **True function vs fitted function**: hidden $g(X)$; the learner sees only sampled points; slider for sample count $n$; shaded area shows $totalerr(\theta)$ (computed by the widget, hidden from the "learner") vs the training-sample average error — previews true vs empirical risk.
- **Generalization explorer**: fit on 20 points, reveal 3 held-out patients and their predictions (recreates slide 23).

---

## Code companion notebook: "Lecture 2: Supervised Machine Learning + Linear Regression Code Companion"

**Libraries:** numpy, pandas, matplotlib.pyplot (`%matplotlib inline`, figsize [12,4]), sklearn (`datasets.load_diabetes`, `linear_model.LinearRegression`, `metrics.mean_squared_error` imported but unused). No torch.

**Dataset:** sklearn Diabetes (442 patients, 10 standardized features; target = disease progression one year after baseline). The notebook prints `diabetes.DESCR` (authoritative variable meanings: s1 tc total serum cholesterol, s2 ldl, s3 hdl, s4 tch total cholesterol/HDL, s5 ltg possibly log serum triglycerides, s6 glu; "each feature mean centered and scaled by the standard deviation times sqrt(n_samples), i.e., sum of squares of each column totals 1"; source Efron et al. 2004 LARS).

**Cells and what they demonstrate (↔ slides):**
1. Load dataset as a DataFrame, print DESCR, `diabetes_X.head()` — ↔ L2 slides 5–7 (the table on the slides is this output).
2. Feature engineering: `diabetes_X['old_man'] = (diabetes_X['sex'] > 0) & (diabetes_X['age'] > 0.05)` — ↔ L2 slide 12 (row 2 True).
3. Reload with `return_X_y=True, as_frame=True`; keep only `bmi`; rescale `diabetes_X = diabetes_X * 30 + 25` ("recenter for ease of presentation"); training set = last 20 rows (`iloc[-20:]`); shows head: (27.335902, 233.0), (23.811456, 91.0), (25.331171, 111.0), (23.779122, 152.0), (23.973128, 120.0).
4. Scatter plot BMI vs Diabetes Risk, black points — ↔ L2 slide 20, L3 slides 4/26.
5. "The Model Family": $y = \theta_1 x + \theta_0$ with unknown $\theta_0,\theta_1\in\mathbb{R}$; plots four lines for `theta_list = [(1, 2), (2,1), (1,0), (0,1)]` (as (theta0, theta1)) over `x = np.arange(10)` — illustrates the model class ↔ L2 slides 22–23, L3 slide 4.
6. "The Optimizer": `regr = linear_model.LinearRegression(); regr.fit(diabetes_X_train, diabetes_y_train.values)`; prints **Slope (theta1) = 37.37884216052121, Intercept (theta0) = −797.0817390343262** — ↔ L2 slide 21, L3 slide 13 (`model.fit`). (On the rescaled BMI axis; a sanity check for any platform reimplementation of the closed form.)
7. "A Supervised Learning Model": $f(x) = \theta_1^* x + \theta_0^*$; scatter + black fitted line — ↔ L2 slide 21.
8. "Making New Predictions": $y_{\text{new}} = f(x_{\text{new}}) = \theta_1^* x_{\text{new}} + \theta_0$; test set = first 3 rows (`iloc[:3]`); plot train (blue) + new patients (red); then predictions as red × markers (`'x', mew=3, markersize=8`) with legend ['Initial patients', 'New patients', 'Model', 'Prediction'] — ↔ L3 slide 23 "Generalization" (whose rendering uses the raw BMI scale, i.e., an earlier variant of this notebook without the `*30+25` rescale; the legend labels on the slide are also permuted).

**Plots generated (5):** training scatter; four model-family lines; fitted line over scatter; train + 3 new patients; train + new + fitted line + predicted × markers.

**Not in the notebook:** no loss computation, no gradient descent, no $R^2$; all optimization is delegated to sklearn — consistent with L2/L3 asserting but not deriving the closed form. The platform's companion code should add: explicit MSE/MAE/RMSE/$R^2$ functions, the normal-equation solution reproducing 37.3788 / −797.08, and a from-scratch GD loop.

---

## Cross-lecture recommendations for the platform
1. Treat L1 as an "Orientation" unit (no math), L2–L3(–L4) as Unit 1 "Supervised learning & linear regression"; L3's probability refresher (slides 26–35) can be a shared "Probability sticky-notes" module reused by L5 (MLE) and L8–L9 (generative models).
2. Fix/annotate notation inconsistencies when writing lessons: $\theta^\top X$ vs $X\theta$; $y_i$ vs $y^{(i)}$; $w$ vs $\theta$; $f(X)$ vs $g(X)$ for the true function; $\phi$'s typing; $N(168,30)$ parameter convention; the s1/s4/s5 variable glosses.
3. The single most valuable derivations to add first: normal equations; convexity of MSE; GD update + steepest-descent justification; $R^2$ properties incl. negativity and population limit; total error → true risk → empirical risk.
