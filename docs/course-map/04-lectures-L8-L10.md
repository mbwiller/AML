# Lectures 8–10: Model selection, generative models, Naive Bayes, GDA, k-means

<!--
  COURSE MAP — generated 2026-10-06 by subject-explorer agents that read every slide
  page visually (equations are images in the PDFs, so text extraction alone misses them).
  This file is the source of truth for lesson authors: it records exactly what the
  professor's slides state vs. derive, her notation, slide errors to correct, Poll
  Everywhere questions (quiz bank seeds), concept-graph edges, and widget ideas.
  Do NOT re-read the PDFs to write a lesson unless this file is ambiguous.
  Source material: "AML Course Material/" in this repo (lectures L1–L10, code companions, HW1–HW2).
-->

# Content Map: Lectures L8–L10 (CS 5785 Applied Machine Learning, Fall 2026, Prof. Kyra Gan)

Source files (all pages read visually):
- `AML Course Material/Lectures/L8 regularization and model selection.pdf` (43 pp.)
- `AML Course Material/Lectures/L9 Generative model and text classification.pdf` (46 pp.)
- `AML Course Material/Lectures/L10 Naive Bayes and GDA_2026.pdf` (49 pp.)
- Notebooks: `Code_Companions__Lecture_8_Code_Companion.ipynb.md`, `Lectures__NaiveBayes_Spam_exercise.ipynb.md`, `Lectures__NaiveBayes_Spam_exercise_sol.ipynb.md`, `Lectures__lecture10-unsupervised-learning_code_companion.ipynb.md` (all under the corresponding notebook under `AML Course Material/`)

## Global findings that affect unit design (read first)

1. **File names vs. slide titles differ.** L8's title slide reads "Lecture 8 Model Selection and Generative Models I" (file name says "regularization and model selection"). L10's title slide reads "Lecture 10 Gaussian Discriminant Analysis, Unsupervised Learning, and K-Means" (file name says "Naive Bayes and GDA"). L10 contains **no new Naive Bayes content** beyond a 3-slide recap; ~60% of L10 (slides 22–49) is unsupervised learning and k-means.
2. **Content that the task brief expected but the slides do NOT contain** (these must be authored by our platform from scratch; see "Derivation gaps"):
   - No Laplace / additive smoothing anywhere (the notebooks handle zero probabilities only by clipping to `1e-14`).
   - No multinomial Naive Bayes; only **Bernoulli** Naive Bayes.
   - No "shared covariance ⇒ linear decision boundary" result, no LDA/QDA distinction, no derivation of the GDA ⇒ logistic-regression posterior. GDA stops at the closed-form MLE for $\mu_k, \Sigma_k$ (stated, not derived).
   - No formal bias–variance decomposition. The only mention is one bullet (L9 p4): generative models make strong assumptions, "$P(x,y)$ -> higher bias (less accurate)".
   - No EM, no PCA, no trees, no neural nets. "GMM" appears, but only as the *motivation* for GDA (mixture with one component per class); fitting an unsupervised GMM is posed as a question ("Goal: given the samples … how to determine the parameters of GMM to best fit them?") and left open, which sets up EM in a later lecture.
3. **Notebook ↔ lecture mismatch.** The notebook labelled "Lecture 8 Code Companion" actually implements the L9 slides (20 Newsgroups, bag of words, logistic regression, Bernoulli NB). The notebook labelled "lecture10-unsupervised-learning" matches the k-means half of L10 (Iris, `KMeans(n_clusters=3)`) and then goes **beyond** the slides (make_blobs, under/overfitting in k-means, elbow method) – that extra material previews the next lecture.
4. **Suggested unit grouping.** L8 pp.1–18 close out the *Supervised learning: regularization & model selection* unit (continuing L7). L8 pp.19–43 + all of L9 + L10 pp.1–21 form a single coherent *Generative models for classification* unit (generative vs discriminative → MLE → bag of words → Bernoulli NB → GMM/GDA). L10 pp.22–49 open the *Unsupervised learning* unit (k-means), which the "lecture10" notebook continues.

---

## L8: Model Selection and Generative Models I (43 pages)

### Summary and place in the course arc
L8 is a hinge lecture. Its first half (pp.2–18) finishes the regularization/model-selection story begun in the previous lecture: it recaps overfitting, states L2 (ridge) and L1 (lasso) penalties, gives the constrained-optimization view with the famous circle-vs-diamond picture, then formalizes train/development/test splits and K-fold cross-validation. Its second half (pp.19–43) pivots to a new paradigm: generative models. It motivates "ML that generates data" with faces/landscapes, defines a generative model as a model of $p(x)$, contrasts discriminative $p_\theta(y|x)$ (softmax regression) with generative $p_\theta(x|y)$, derives the Bayes-rule classifier $\hat y=\arg\max_y p(x|y)p(y)$, and closes by stating the maximum-likelihood objective for a joint model $P_\theta(x,y)$.

### Learning objectives (stated or clearly implied)
- Explain why over-parameterized models overfit and how "smoothing" constraints restore generalization.
- Write the L2- and L1-regularized objectives; explain why L1 yields sparse (exactly-zero) weights and L2 does not.
- Interpret regularization as constrained optimization (level sets intersecting a norm ball).
- Define training / development (validation, holdout) / test sets and the model-development workflow.
- Explain and execute K-fold cross-validation; know when it is preferable to a fixed validation split.
- Define generative vs discriminative models; state $P_\theta(x,y):\mathcal X\times\mathcal Y\to[0,1]$ vs $P_\theta(y|x):\mathcal X\to(\mathcal Y\to[0,1])$.
- Derive the Bayes-rule classifier and explain why $p(x)$ can be dropped.
- State the maximum-likelihood learning objective for a generative model.

### Ordered concept walkthrough

**p.1 – Title.** "Lecture 8 Model Selection and Generative Models I".

**p.2 – Recap: Overfitting (STATED-ONLY).** Figure: dashed blue "true" function vs. a red spiky fit that passes exactly through 6 red data points (vertical stems) and collapses to ~0 between them. Text: "ML algorithms may just learn the values of the inputs if the number of parameters in a model is **a lot more than** the true function. Need additional '**smoothing**' constraints that will 'fill in' the missing regions acceptably → Generalization."

**p.3 – L2 Regularization (STATED-ONLY).** Regularized loss:
$$\ell(f_\theta)=\underbrace{\frac1n\sum_{i=1}^n Div\big(y^{(i)},f_\theta(x^{(i)})\big)}_{\text{Learning Objective}}+\underbrace{\tfrac12\lambda\|\theta\|_2^2}_{\text{L2 penalty}},\qquad \|\theta\|_2^2=\sum_{j=1}^d\theta_j^2,$$
$\lambda$: tunable regularization parameter. ($Div$ is the professor's generic per-example loss/divergence; the $\tfrac12$ is a convenience so the gradient is $\lambda\theta$ – not said on slide.)

**p.4 – L1 Regularization (Lasso) (STATED-ONLY).**
$$\ell(\theta)=\frac1n\sum_{i=1}^n Div\big(y^{(i)},f_\theta(x^{(i)})\big)+\lambda\cdot\|\theta\|_1,\qquad \|\theta\|_1=\sum_{j=1}^d|\theta_j|.$$
"Forces weights to decay to zero rather than being small." Optimizers listed: subgradient descent, coordinate descent, least angle regression, etc. (No optimizer is derived; the non-differentiability of $|\cdot|$ at 0 is implicit.)

**p.5 – Coefficient paths (STATED-ONLY, empirical).** "Lasso parameters become progressively smaller; stay at zero when the parameters reach 0." Two plots: *Ridge coefficients as a function of regularization strength λ* ($\lambda$ on log axis $10^{-5}\ldots10^{2}$; ~10 coefficient curves starting at roughly $+760,+520,+480,+320,+180,+100,+80,0,-230,-780$ and all shrinking smoothly toward 0 by $\lambda\approx10^2$, some crossing zero and changing sign on the way), and *LASSO coefficients as a function of λ* (linear axis 0…3500; same starting values; curves are piecewise-linear and hit exactly 0 one at a time, staying at 0). Magnitudes are consistent with sklearn's diabetes dataset (10 features) – not stated on slide.

**p.6 – Regularizing via Constraints (STATED-ONLY).**
$$\min_{\theta\in\Theta}\frac1n\sum_{i=1}^n Div\big(y^{(i)},f_\theta(x^{(i)})\big)\quad\text{such that }\|\theta\|\le\lambda',$$
$\|\cdot\|$ either L1 or L2 norm. (Equivalence to the penalized form via Lagrangian duality is *not* shown – gap.)

**p.7 – Geometric picture, hand-annotated (intuition only).** Two panels in $(\theta_1,\theta_2)$. Nested ellipses labelled $C_1\subset C_2\subset C_3$ are "θs with constant $\ell(\theta)$ (level sets of $\ell(\theta)$)" centred at unconstrained optimum $\hat\theta$; annotation $\frac1n\sum_i Div(y^{(i)},f_\theta(x^{(i)}))=C_i$ "for some constant $C_i$". Left: orange disk "θs with constant l2 norm", $\|\theta\|_2^2=\theta_1^2+\theta_2^2\le\lambda'$. Right: pink diamond "θs with constant l1 norm", $\|\theta\|_1=|\theta_1|+|\theta_2|\le\lambda'$. Handwritten: "optimization objective: find the smallest $C_i$ such that [ellipse] intersects [circle] or [diamond]". Takeaway (implicit): the ellipse tends to touch the diamond at a corner (a coordinate axis ⇒ one weight exactly 0), but touches the circle at a generic point ⇒ no exact zeros.

**p.8 – Poll (regularization).** See poll section.

**p.9 – Takeaways.** Small training set ⇒ overfit; detect with held-out development or test set (sampled from the same distribution); mitigate with regularization (L2 or L1 norm of $\theta$ in the objective).

**p.10 – Datasets for Model Development (STATED-ONLY).** Training set: train algorithms. Development set (validation or holdout set): hyperparameter tuning. Test set: evaluate final performance.

**p.11 – Model Development Workflow.** (1) Training: fit a new model on the training set. (2) Model selection: estimate performance on the development set using metrics; based on results, try a new model idea in step 1. (3) Evaluation: estimate real-world performance on the test set.

**p.12 – Validation and Test Sets.** *Distributional consistency*: dev and test should come from the distribution we will see in production. *Dataset size*: large enough to estimate future performance; "30% of the data on small tasks"; "usually up to not more than a few thousand instances".

**p.13 – Cross Validation, motivating numbers.** 16 data points total; 4 reserved for testing; if 4 more kept for validation, only 8 remain for training – "Too small". Q: how to estimate validation error without a validation dataset?

**p.14 – Cross Validation, worked example.** Split the 12 non-test points into 3 folds of 4. Train (fixed model class + hyperparameter) on 2 folds, test on the held-out fold. Because the sample is small, one split may not represent the distribution ⇒ "repeat training by holding out each of the 3 folds and take the average!"

**p.15 – K-fold definition (STATED-ONLY).** "K-fold cross-validation: group the data into K disjoint folds. Train the model K times, each time using a different fold for testing, and the rest for training. The training and validation errors of **a fixed model class and fixed hyperparameter set** are estimated by averaging the results from the K experiments." Figure: $n=12$, $k=3$; a row of 12 numbered boxes (all red here = train); legend blue = Test, red = Train.

**p.16 – K-fold, outer loop.** Adds: "Try different hyperparameters and model classes and repeat the entire K-fold process!"

**pp.17–18 – Polls (cross-validation).** See poll section. Note the embedded claims: validation sets matter most when data is small; CV does not itself produce a new model; after selecting by CV it is good practice to retrain on train+validation.

**p.19 – Section: Generative Models.**

**pp.20–22 – A New Problem.** All previous models "operate on, or process" inputs; "Can ML algorithms also **generate** data? And learn to do so from examples." Faces grid → generated portrait; landscape grid → generated landscape. "Generate samples from the distribution of 'face' images. How do we even characterize this distribution?"

**p.23 – ML Algorithms as Generative Models.** Seen so far: linear regression, logistic regression, softmax regression (classification/regression). Next: model the distribution of *any* data so we can draw samples.

**p.24 – But First…** (chimp photo) What are generative models? How to estimate them? → Maximum likelihood estimation.

**p.25 – What is a Generative Model? (DEFINITION, STATED).** "A model for the probability distribution of a data $x$ – e.g., a multinomial, Gaussian etc. Computational equivalent: a model that can be used to 'generate' data with a distribution similar to given data $x$. Typical setting: a box that takes in random seeds and outputs random samples like $x$." Figure: seed → MAGIC BOX → $x$; caption `numpy.random.seed`.

**p.26 – Generative Models** (repeat of faces/landscapes). **p.27 – Generative Model in Unsupervised Learning** (same text as p.25) + red question: "What about Generative model in supervised learning?"

**p.28 – Probabilistic model (STATED).** Classification as a probabilistic question: most likely label given features, $p(y|\mathbf x)$; prediction $\hat y=\arg\max_y p(y|\mathbf x)$.

**p.29 – Recap: Softmax regression.** For each class $y$: a separate linear regression; exponential to make it non-negative; normalize to a probability distribution. $k$-th entry $p_\theta(y=k|\mathbf x)$. (Formula not re-displayed.)

**p.30 – Discriminative Model (DEFINITION).** Softmax regression is discriminative: directly transfers $x$ into a score per class $y$; the score is interpretable as a conditional probability $p_\theta(y|\mathbf x)$; **learns the decision boundary between classes**; not trying to learn the underlying data-generating distribution.

**p.31 – Generative Model (DEFINITION).** Class-conditional distribution
$$P_\theta(x|y):\ \underbrace{\mathcal Y}_{\text{target}}\ \to\ \underbrace{(\mathcal X\to[0,1])}_{\text{probability }P(x|y)\text{ over }\mathcal X}.$$
Parametrization with $\theta$: given $y$, write $p_\theta(\mathbf x|y)$ as a function of $y$ and $\theta$; it assigns higher probabilities ("scores") to more likely $x$.

**p.32 – Generative vs Discriminative.** Discriminative $p_\theta(y|\mathbf x)$: given input $\mathbf x$, compute the likelihood of each class $y$. Generative $p_\theta(\mathbf x|y)$: given label $y$, compute the likelihood that data point $\mathbf x$ is generated from $y$.

**p.33 – Comparison table (figure).** Rows: Goal (Directly estimate $P(y|x)$ vs Estimate $P(x|y)$ to then deduce $P(y|x)$); What's learned (Decision boundary vs Probability distributions of the data); Illustration (blue/red points separated by a dashed line vs blue/red density contours); Examples (Regressions, SVMs vs GDA, Naive Bayes).

**p.34 – The Advantage of Generative Model.** Learns the data distribution ⇒ (i) data imputation / missing data; (ii) anomaly detection ("easier to quantify which points are outliers"); (iii) generate new samples (e.g., generating images to gain interpretability).

**p.35 – Poll (generative model).** **p.36 – Generative Model in Classification.** Spam example: fit two models $p_\theta(x|y=0)$, $p_\theta(x|y=1)$; $p_\theta(\mathbf x|y=0)$ scores $x$ on how non-spam-like it looks; $p_\theta(\mathbf x|y=1)$ on how spam-like. **p.37 – Poll (classification)** – includes the numerical trap: "$p_\theta(x|y=0)=0.6,\ p_\theta(x|y=1)=0.4$ ⇒ always predict $y=0$?" (answer: no, the prior matters).

**p.38 – Prediction needs the prior (STATED).** "$p_\theta(x|y)$ alone is not enough – we also need the probability of seeing a class." Prior $p_\theta(y=k)$;
$$P_\theta(y):\ \underbrace{\mathcal Y\to[0,1]}_{\text{probability over }\mathcal Y}.$$
Spam: % of data with class $k$.

**p.39 – Bayes Rule (DERIVED, two lines).**
$$\hat y=\arg\max_y p(y|\mathbf x)=\arg\max_y\frac{p(\mathbf x|y)p(y)}{p(\mathbf x)}.$$
"$p(\mathbf x)$: independent of label $y$ – not important when comparing across prediction class", hence
$$\hat y=\arg\max_y\frac{p(\mathbf x|y)p(y)}{p(\mathbf x)}=\arg\max_y p(\mathbf x|y)\,p(y).$$
(Bayes' rule itself is assumed; the "drop the denominator" step is the only derived step.)

**p.40 – Prediction on New Data (algorithm).** Given new $\mathbf x'$: score with each $p(\mathbf x'|y)$ for each class $k$; adjust scores with priors $p(y=k)$; output the class with the highest score.

**p.41 – Generative vs Discriminative, formal (STATED).** A generative model defines $p_\theta(x|y)$ and $p_\theta(y)$ ⇒ defines the joint $p_\theta(x,y)$:
$$\underbrace{P_\theta(x,y):\mathcal X\times\mathcal Y\to[0,1]}_{\text{generative model}}\qquad\underbrace{P_\theta(y|x):\mathcal X\to(\mathcal Y\to[0,1])}_{\text{discriminative model}}.$$
Discriminative models don't define any probability over the $x$'s; their parameters are NOT designed to learn that; generative models do.

**p.42 – Poll (generative model).** **p.43 – Maximum Likelihood Learning (STATED-ONLY).**
$$\max_\theta\ \frac1n\sum_{i=1}^n\log P_\theta(x^{(i)},y^{(i)}).$$
"Choose $\theta$ such that $P_\theta$ assigns a high probability to each training example $(x^{(i)},y^{(i)})$ in the dataset $D$. This is probability of observing the dataset $D=\{(x^1,y^1),(x^2,y^2),\ldots,(x^n,y^n)\}$ if data were IID draws from $P_\theta$." (The step from product of probabilities to average log is not shown; "Recall from the MLE lecture" is invoked in L9.)

### Running examples and datasets
- Toy 1-D overfitting sketch (p.2), 6 points.
- Ridge vs Lasso coefficient paths (p.5), 10 coefficients, ranges $[-800,800]$; ridge $\lambda\in[10^{-5},10^2]$ log-scale, lasso $\lambda\in[0,3500]$ linear.
- Cross-validation arithmetic: 16 points → 4 test; 12 remaining → 3 folds × 4 (p.13–15); "30%" dev-set rule of thumb (p.12).
- Faces / landscapes generation (pp.21–22, 26); spam filter as the recurring supervised generative example (pp.36–38).

### Figures to rebuild interactively
1. Overfitting sketch: true smooth curve vs interpolating spiky fit (p.2).
2. Ridge vs Lasso regularization paths (p.5) – slider on $\lambda$, watch coefficients shrink (ridge) vs hit zero (lasso).
3. Level sets + L2 ball / L1 ball (p.7) – drag $\hat\theta$ or change $\lambda'$; show tangency point and whether a coordinate is exactly 0.
4. K-fold diagram (p.15): 12 boxes, highlight the test fold cycling through $k=1..3$.
5. Discriminative-vs-generative illustration (p.33): dashed boundary vs class-conditional density contours.
6. "Magic box" seed → sample (p.25).

### Notation table
| Symbol | Meaning |
|---|---|
| $\theta\in\Theta$ | model parameters, $d$-dimensional; $\theta_j$ its components |
| $f_\theta$ | model/predictor |
| $Div(y^{(i)},f_\theta(x^{(i)}))$ | per-example divergence (loss) |
| $\ell(f_\theta)$, $\ell(\theta)$ | regularized objective (slides use both) |
| $\lambda$ | penalty strength; $\lambda'$ constraint radius in constrained form |
| $\|\theta\|_2^2=\sum_j\theta_j^2$, $\|\theta\|_1=\sum_j|\theta_j|$ | L2 / L1 norms |
| $C_i$ | level-set constants of the training loss |
| $n$, $k$ (or $K$) | #data points; #folds |
| $\mathcal X,\mathcal Y$ | input and label spaces |
| $p(y|\mathbf x)$, $p_\theta(y|\mathbf x)$ | (parametrized) posterior / discriminative model |
| $p_\theta(\mathbf x|y)$ | class-conditional / generative model |
| $p_\theta(y)$, $p_\theta(y=k)$ | prior |
| $p_\theta(x,y)$ | joint model |
| $\hat y$ | predicted label |
| $D=\{(x^{(i)},y^{(i)})\}_{i=1}^n$ | dataset (also written $(x^1,y^1)$ on p.43) |

### Prerequisite / sticky-note concepts
- **Norms (L1, L2)** – p.3–7. Refresher: $\|\theta\|_2^2=\sum\theta_j^2$ is a smooth bowl; $\|\theta\|_1=\sum|\theta_j|$ has corners on the axes; unit balls are a disk and a diamond respectively; corners are where sparsity comes from.
- **Level sets / contours of a function** – p.7. Refresher: the set $\{\theta:\ell(\theta)=C\}$; for a convex quadratic loss these are nested ellipses around the minimizer; smaller $C$ = inner ellipse.
- **Constrained optimization / Lagrange multipliers** – p.6. Refresher: minimizing $g(\theta)$ subject to $\|\theta\|\le\lambda'$ is equivalent (for convex problems) to minimizing $g(\theta)+\lambda\|\theta\|$ for some $\lambda\ge0$; $\lambda$ and $\lambda'$ are inversely related.
- **Subgradient** – p.4 (name-dropped). Refresher: generalization of gradient for non-differentiable convex functions; for $|t|$ at 0 any value in $[-1,1]$ works.
- **Bayes' rule, conditional probability, marginalization** – p.39. Refresher: $p(y|x)=p(x|y)p(y)/p(x)$ with $p(x)=\sum_y p(x|y)p(y)$; the denominator is the same for every $y$.
- **IID sampling, likelihood of a dataset** – p.43. Refresher: under independence the joint probability of the dataset is the product $\prod_i P_\theta(x^{(i)},y^{(i)})$; taking logs turns it into a sum; dividing by $n$ does not change the maximizer.
- **Softmax** – p.29. Refresher: $p_\theta(y=k|x)=\exp(\theta_k^\top x)/\sum_l\exp(\theta_l^\top x)$.

### Derivation gaps (to be derived in full by the platform)
1. Why L1 induces exact zeros and L2 does not (1-D soft-thresholding $\theta^*=\mathrm{sign}(z)\max(|z|-\lambda,0)$ vs. shrinkage $\theta^*=z/(1+\lambda)$; the tangency/corner argument of p.7 made rigorous).
2. Equivalence of penalized and constrained formulations (KKT / Lagrangian), including why the slide's $\lambda'$ is monotone-decreasing in $\lambda$.
3. Closed-form ridge solution $\theta=(X^\top X+n\lambda I)^{-1}X^\top y$ with the slide's $\tfrac1n$ and $\tfrac12$ conventions; gradient-descent update $\theta\leftarrow\theta-\alpha(\nabla\text{loss}+\lambda\theta)$ ("weight decay").
4. Why coefficient paths look as they do on p.5 (ridge: smooth, sign changes possible; lasso: piecewise linear in $\lambda$ – LARS).
5. Why cross-validation estimates generalization error and why one must retrain on all data afterwards; why $K$-fold with small $K$ is pessimistically biased and large $K$ has high variance (ties to the missing bias–variance material).
6. Why model selection on the test set is invalid (optimistic bias of the selected minimum).
7. Dropping $p(\mathbf x)$ in the arg max (p.39) – fine, but the platform should also show that $p(y|x)$ itself requires normalizing by $\sum_k p(x|y=k)p(y=k)$ (needed for calibrated probabilities later).
8. From "probability of observing $D$ under IID" to $\frac1n\sum\log P_\theta$ (p.43).

### Poll Everywhere questions (verbatim, answers not shown on slides; suggested keys in brackets are mine)
- **p.8 Regularization.** (a) L1 and L2 are general methods to control parameter values to prevent overfitting; they work beyond linear regression [True]. (b) L2 induces sparse model parameters [False]. (c) Instead of regularization, when we detect overfitting it is always better to switch to a model with fewer parameters [False]. (d) Identifying the model class with the precise number of parameters required to represent a dataset is straightforward [False].
- **p.17 Cross-validation.** (a) Without CV, a validation set is especially important for model selection when the dataset is small because it is easier to overfit with few points [True]. (b) Without a validation set and CV, the model selected among many model classes can easily overfit [True]. (c) It is generally recommended to use a validation set when tuning hyperparameters / selecting model classes rather than only a train/test split [True].
- **p.18 Cross-validation.** (a) CV is an alternative for model selection and hyperparameter tuning when data is limited [True]. (b) The result of CV proposes a new prediction model [False – it yields an error estimate; you then retrain]. (c) Once model class and hyperparameters are fixed by CV, it is a good idea to retrain on combined training+validation data [True].
- **p.35 Generative model.** (a) A generative model is a special type of probabilistic model [True]. (b) We can fit probabilistic models using MLE [True]. (c) Generative models offer a more complete description of the data than discriminative models by modeling $P(X|Y)$ instead of $P(Y|X)$ [True, as intended by the slides].
- **p.37 Classification.** (a) In supervised learning it is more common to use a generative model for classification than regression [True]. (b) Discriminative models learn $p_\theta(y|x)$, generative learn $p_\theta(x|y)$; furthermore $p_\theta(x|y=0)+p_\theta(x|y=1)$ should always equal 1 [False – they are different distributions over $x$, each sums to 1 over $x$, not over $y$]. (c) The goal of generative classification is eventually to learn $p_\theta(y|x)$ to predict labels [True]. (d) If $p_\theta(x|y=0)=0.6$ and $p_\theta(x|y=1)=0.4$ we would always predict $y=0$ [False – must multiply by priors].
- **p.42 Generative model.** (a) In supervised learning a generative model directly parameterizes the joint; notation $p_\theta(x,y):\mathcal X\times\mathcal Y\to[0,1]$ [True]. (b) The generative model assigns higher scores to $x,y$ pairs that are more compatible [True]. (c) We can learn generative-model parameters via the maximum likelihood principle [True].

### Continuity
Backward: continues L7's overfitting/regularization discussion ("Recap: Overfitting"), and relies on an earlier MLE lecture (L9 p.32 says "Recall from the MLE lecture"). Forward: p.43's MLE objective is re-shown verbatim as L9 p.5; the spam example (p.36) becomes the spam notebook exercise; the comparison table's "GDA, Naive Bayes" examples are exactly L9–L10's content. Unit boundary falls inside L8 at p.19.

### Concept-graph edges (A -> B means B depends on A)
Overfitting -> Regularization; Norms (L1/L2) -> L2 penalty (ridge); Norms -> L1 penalty (lasso); Constrained optimization -> Constraint view of regularization; Level sets -> Geometric sparsity argument; L1 penalty -> Sparsity; Train/dev/test split -> Model-development workflow; Hyperparameters -> Model selection; Small data -> K-fold cross-validation; Model selection -> K-fold CV; Probability distributions -> Generative model (definition); Softmax regression -> Discriminative model; Conditional probability -> Class-conditional $p(x|y)$; Prior $p(y)$ + Class-conditional -> Joint $p(x,y)$; Bayes' rule -> Bayes classifier $\arg\max_y p(x|y)p(y)$; IID + Likelihood -> Maximum likelihood learning; Maximum likelihood learning -> Naive Bayes (L9); Maximum likelihood learning -> GDA (L10).

### Suggested interactive widgets
- **Ridge/Lasso path explorer**: fit on a 10-feature synthetic/diabetes dataset, slider for $\lambda$ (log for ridge), live coefficient bars plus the two path plots; toggle to show train vs held-out error.
- **Norm-ball tangency sandbox**: draggable $\hat\theta$ and ellipse eccentricity; slider $\lambda'$; animate shrinking $C_i$ until the ellipse touches the disk/diamond; readout of the constrained solution and whether $\theta_1$ or $\theta_2=0$.
- **K-fold animator**: choose $n$, $K$; show folds, per-fold validation error, average; compare with a single hold-out; outer loop over a hyperparameter grid producing a CV curve.
- **Generative vs discriminative toggle**: 2-class 2-D data; left: logistic boundary; right: fitted class densities + Bayes boundary; slider for the prior $p(y=1)$ to show how the boundary moves (addresses the 0.6/0.4 poll trap).

---

## L9: Generative Model and Text Classification (46 pages)

### Summary and place in the course arc
L9 is the core generative-classification lecture. It recaps generative vs discriminative with a crisp trade-off (discriminative: simpler, often more accurate, needs more data; generative: fewer samples, strong assumptions ⇒ higher bias, but supports imputation/anomaly/generation), restates MLE, then builds text classification end-to-end on 20 Newsgroups: bag-of-words features, sklearn `CountVectorizer`, logistic regression baseline, then the generative approach. It shows why a full categorical model over binary vectors is hopeless ($2^d$ states), introduces the Naive Bayes conditional-independence assumption via the chain rule, defines the **Bernoulli Naive Bayes** joint model with $K(d+1)$ parameters, and derives (at the level of "the log-likelihood decomposes, so each $\psi_{jk}$ and $\phi$ can be optimized separately") that the MLE is empirical frequencies. It implements NB in numpy (86.9% train accuracy), then opens the GDA section by motivating Gaussian mixtures for continuous features.

### Learning objectives
- Articulate the practical trade-offs between discriminative and generative classifiers.
- Convert variable-length text to fixed-length binary bag-of-words vectors; know stemming/stop-word/rare-word preprocessing.
- Use `CountVectorizer(binary=True[, max_features])`, `vocabulary_`, `fit_transform`/`transform`.
- Explain the parameter explosion of a full categorical class-conditional model.
- State and justify the Naive Bayes assumption via the chain rule of probability.
- Write the Bernoulli NB model and its parameter count; derive that MLE decomposes per $(j,k)$ and per $\phi$; state the closed-form MLE.
- Implement NB prediction in log-space with probability clipping; evaluate accuracy.
- Recognize a mixture of Gaussians and how a mixture with one component per class becomes a generative classifier.

### Ordered concept walkthrough

**p.1 – Title.** **p.2 – Recap: Generative vs Discriminative** (same text as L8 p.32, plus the two illustrations).

**p.3 – Generative vs Discriminative (discriminative side).** "Recall discriminative model (logistic regression)
$$P_\theta(y|\mathbf x)=\prod_{i=1}^n P_\theta\big(y^{(i)}|x^{(i)}\big)$$
If we only care about prediction, we don't need a model of $P(x)$. It is simpler to only model $P(y|x)$. In practice, discriminative models are often more accurate. However, discriminative models often require large sample sizes to learn the decision boundaries well." (STATED-ONLY; note the slide's LHS notation is loose – it means the conditional likelihood of the whole dataset.)

**p.4 – Generative side.** $\hat y=\arg\max_y p_\theta(\mathbf x|y)p_\theta(y)$. "It requires less samples. But need to make fewer samples strong assumptions to learn [sic]. $P(x,y)$ -> higher bias (less accurate). Use generative approach if we care about other tasks: data imputation and handling missing data; anomaly detection; generate new data samples." (This is the lecture's only bias/variance mention – STATED-ONLY.)

**p.5 – Maximum Likelihood Learning** (identical to L8 p.43).

**p.6 – Example: Text Classification.** Applied problems: spam filtering, fraud detection, medical record classification. Inputs $x$ are word sequences of arbitrary length; algorithms need fixed-dimension column vectors ⇒ preprocess.

**p.7 – Dataset: Twenty Newsgroups.** ~20,000 documents, ~evenly from 20 online newsgroups (topics e.g. medicine, computer graphics, religion); common benchmark. **p.8 – sklearn DESCR excerpt**: ~18,000 posts, 20 topics, train/test split by posting date; two loaders `fetch_20newsgroups` (raw text) and `fetch_20newsgroups_vectorized`; table: Classes 20, Samples total 18846, Dimensionality 1, Features text. **p.9 – `print(twenty_train.data[3])`**: the "catholic church poland" post from `s0612596@let.rug.nl` (M.M. Zwart), Rijksuniversiteit Groningen, 10 lines, asking about the church's role in Poland after 1989.

**p.10–11 – Feature Representations for Text.** Hand-crafted features: contains "church"? email originates outside the US? organization a university? Then: count occurrences of each word – contains "church"/"doctor"/"purple" yes/no. "Many modern deep learning methods can directly work with sequences of characters of an arbitrary length."

**p.12 – Bag of Words (DEFINITION, STATED).** Vocabulary $V$ of all words of interest, e.g. $V=\{\text{church},\text{doctor},\text{purple},\text{slow},\text{apple},\ldots\}$. BoW representation of document $x$ is a function $\phi(x)\to\{0,1\}^{|V|}$; feature vector of dimension $|V|$ (slide says "dimension V"); $\phi(x)_j=1$ if $x$ contains the $j$-th word in $V$, 0 otherwise. Figure: column $\phi(x)=(0\ \text{church},\ 1\ \text{doctor},\ 0\ \text{purple},\ \vdots,\ 0\ \text{slow},\ \vdots)^\top$.

**p.13 – sklearn.** `CountVectorizer(binary=True)`; `X_train = count_vect.fit_transform(twenty_train.data)`; shape `(2257, 35788)`. "Don't need a predefined dictionary. fit_transform: learn all raw tokens and convert the data to sparse matrix representation. Binary: whether the document contains the word or not."

**p.14 – Vocabulary indices.** `count_vect.vocabulary_.get(u'church')` → 8609; `'computer'` → 9338. "Our featurized dataset is in the matrix X_train; retrieve the 0-1 value for each word using the above indices." **p.15** – for document 3: church 1, computer 0, doctor 0, important 1.

**p.16 – Practical Considerations.** $\phi(x)_j$ may instead be the *count* of word $j$; preprocessing: stemming (keep root; "slowly", "slowness" → "slow"); filter stop-words ("the", "a", "and"); exclude rare words.

**p.17 – Classification using BoW: logistic regression.** `LogisticRegression(C=1e5, multi_class='multinomial', verbose=True).fit(X_train, twenty_train.target)` (essentially unregularized softmax; L-BFGS output shown). **p.18** – `docs_new=['God is love','OpenGL on the GPU is fast']` → `soc.religion.christian`, `comp.graphics`.

**p.19 – Summary of Text Classification.** Requires specifying features over raw data; BoW is the common representation (occurrences/counts); once featurized any off-the-shelf supervised algorithm applies, "some work better than others"; next: generative approach.

**p.20 – A Generative Model for Text Classification.** Fit on a labeled corpus $P_\theta(\mathbf x|y=0)$ and $P_\theta(\mathbf x|y=1)$; each $P_\theta(\mathbf x|y=k)$ scores $\mathbf x$ by how much it looks like class $k$; documents in BoW form; "How do we choose $P_\theta(\mathbf x|y=k)$?"

**p.21 – Categorical Distribution (DEFINITION, STATED).** Parameter $\theta$, probability over $K$ discrete outcomes; $a\in\{1,2,\ldots,K\}$, $P_\theta(a=j)=\theta_j$. $K=2$: Bernoulli. Special case of the multinomial (single draw vs multiple draws). Figure: cartoon die-roller; sequence "6 3 1 5 4 1 2 4 …"; histogram of outcomes $n_1\ldots n_6$; two probability bar charts $p_1\ldots p_6$ (one near-uniform, one with peaks at 2 and 4).

**p.22 – Generative Model: First Attempt.** Finite number of $\mathbf x$'s (binary vectors of dimension $d$); $P_\theta(\mathbf x|y=k)$ categorical; assigns a probability to each possible state:
$$P(x|y=k)=P_k\begin{pmatrix}0&\text{church}\\1&\text{doctor}\\0&\text{fervently}\\\vdots&\vdots\\0&\text{purple}\end{pmatrix}=\theta_{xk}=0.0012.$$
$\theta_{xk}$: probability of $x$ under class $k$; specify $\theta_{xk}$ for all $x,k$.

**p.23 – High Dimensionality.** Dimension of $\mathbf x$ 10000 ⇒ $\mathbf x$ can take $2^{10000}$ values ⇒ "Need to specify $2^{d-1}$ parameters for the categorical distribution" (slide typo: should be $2^d-1$ free parameters per class). Comparison: atoms in the universe $\approx10^{82}$.

**p.24 – Naïve Bayes Assumption (DERIVED via chain rule).** $\hat y=\arg\max_y p(\mathbf x|y)p(y)$. Probability chain rule:
$$p(\mathbf x|y)=p(x_1,\ldots,x_d|y)=p(x_1|y)\,p(x_2|x_1,y)\cdots p(x_d|x_1,\ldots,x_{d-1},y).$$
"Given a label, features are conditionally independent of each other":
$$p(\mathbf x|y)=\prod_{i=1}^d p(x_i|y).$$
(Note index clash: here $i$ indexes features; elsewhere $i$ indexes samples and $j$ features.)

**p.25 –** "Naïve Bayes is a general technique that can be used with any $d$-dimensional $\mathbf x$ to construct tractable models $p_\theta(\mathbf x|y)$."

**p.26 – Naïve Bayes Example: Bernoulli (STATED).** Bernoulli model with parameter $\psi_{jk}\in[0,1]$: probability that a class-$k$ document contains word $j$, $P_\theta(x_j=1|y=k)=\psi_{jk}$. $P_\theta(x|y=k)=\prod_{j=1}^d P_\theta(x_j|y=k)$ ("product of the occurrence probabilities of each word in $x$ in class $k$"). How many parameters? $\sim Kd$.

**p.27 – Poll (naive bayes).** **p.28 – Defining Prior $P(y)$.** Encodes prior belief about $y$ before seeing data; $K$ small ⇒ categorical with parameters $\boldsymbol\phi=(\phi_1,\ldots,\phi_K)$; learn from data: $P_\theta(y=k)=\phi_K$ (slide writes capital-$K$ subscript; means $\phi_k$).

**p.29 – Bernoulli Naïve Bayes model $P_\theta(x,y)$ (DEFINITION).** Binary $x$ (binary BoW). Parameter $\theta=(\phi_1,\ldots,\phi_K,\psi_{11},\ldots,\psi_{dK})$: prior parameters $\boldsymbol\phi=(\phi_1,\ldots,\phi_K)$ encoding $P(Y)$; $K$ sets of per-class parameters $\psi_k=(\psi_{1k},\ldots,\psi_{dk})$ encoding $P(X|Y)$; **$K(d+1)$ parameters**. Model:
$$P_\theta(y)=\mathrm{Categorical}(\phi_1,\phi_2,\ldots,\phi_K),\qquad P_\theta(x_j=1|y=k)=\mathrm{Bernoulli}(\psi_{jk}),\qquad P_\theta(x|y=k)=\prod_{j=1}^d P_\theta(x_j|y=k).$$

**p.30 – Learning (log-likelihood decomposition – DERIVED).** Given $D=\{(x^{(i)},y^{(i)})\,|\,i=1,\ldots,n\}$,
$$\ell=\sum_{i=1}^n\log P_\theta(x^{(i)},y^{(i)})=\sum_{i=1}^n\log P_\theta(x^{(i)}|y^{(i)})P_\theta(y^{(i)})=\sum_{i=1}^n\sum_{j=1}^d\log P_\theta(x_j^{(i)}|y^{(i)})+\sum_{i=1}^n\log P_\theta(y^{(i)})$$
$$=\underbrace{\sum_{k=1}^K\sum_{j=1}^d\sum_{i:y^{(i)}=k}\log P(x_j^{(i)}|y^{(i)};\psi_{jk})}_{\text{all the terms that involve }\psi_{jk}}+\underbrace{\sum_{i=1}^n\log P(y^{(i)};\phi)}_{\text{all the terms that involve }\phi}.$$

**p.31 –** Each $\psi_{jk}$ only appears in $\max_{\psi_{jk}}\ell(\theta)=\max_{\psi_{jk}}\sum_{i:y^{(i)}=k}\log P(x_j^{(i)}|y^{(i)};\psi_{jk})$; optimization over $\psi_{jk}$ can be carried out independently.

**p.32 – (STATED-ONLY, "Recall from the MLE lecture").** The MLE of a Bernoulli is the empirical count ⇒ $\psi_{jk}$ = proportion of documents in class $k$ containing word $j$. (The calculus is not shown.)

**p.33 – Optimizing $\boldsymbol\phi$ (STATED-ONLY).** $\max_{\vec\phi}\sum_{i=1}^n\log P_\theta(x^{(i)},y^{(i)};\theta)=\max_{\vec\phi}\sum_{i=1}^n\log P_\theta(y^{(i)};\phi)$. "The optimal $\phi_K$ is the proportion of data points with class $k$ ($n_k$) in the training set":
$$\frac{\phi_k}{\sum_l\phi_l}=\frac{n_k}{n}.$$
(The constrained maximization with $\sum_k\phi_k=1$ – Lagrange multiplier – is not shown.)

**p.34 – Querying the Model.** $\arg\max_y P_\theta(y|x)=\arg\max_y P_\theta(x|y)P_\theta(y)$; compute $P_\theta(x|y=k)P_\theta(y=k)$ for each $k$; choose the class that best explains the data.

**pp.35–38 – Implementation (code slides).** `CountVectorizer(binary=True, max_features=1000)`; `X_train = ....toarray()` shape `(2257, 1000)` ("top 1000 frequent words"). MLE: `n, d = X_train.shape; K = 4; psis = np.zeros([K,d]); phis = np.zeros([K]); for k: X_k = X_train[y_train==k]; psis[k] = X_k.mean(axis=0); phis[k] = X_k.shape[0]/n` → `phis = [0.21267169 0.25875055 0.26318121 0.26539654]`. Prediction `nb_predictions(x, psis, phis)`: reshape to broadcast, `psis.clip(1e-14, 1-1e-14)` "to avoid log(0)", `logpy = log(phis)`, `logpxy = x*log(psis) + (1-x)*log(1-psis)`, `logpyx = logpxy.sum(axis=2) + logpy`, return `argmax(axis=0)`; first ten predictions `[1 1 3 0 3 3 3 2 2 2]`. Accuracy `(idx==y_train).mean()` = **0.8692955250332299** (training accuracy). `'OpenGL on the GPU is fast' => comp.graphics`.

**pp.39–40 – Polls (naive bayes).**

**p.41 – Section: Gaussian Discriminant Analysis.** **p.42 – GMMs (motivation).** Bernoulli NB is one way to model $P(\mathbf x|y)$ for text; continuous features need a better model; figure: a bumpy 1-D density $P(x)$ with ~4 modes. **p.43 – Standard Gaussian** $N(u,\sigma^2)$ (slide uses $u$ for $\mu$); Normal(0,1) bell curve plot on $[-5,5]$, peak 0.4;
$$f(x)=\frac{1}{\sigma\sqrt{2\pi}}e^{-\frac12\left(\frac{x-\mu}{\sigma}\right)^2}.$$
**p.44 – Mixture (DEFINITION, STATED).** Weighted sum of Gaussians
$$P(x)=\sum_k P(k)\,N(x;\mu_k,\sigma_k^2),$$
weights $p(k)$ sum to 1, "each representing the likelihood that a data point is from each Gaussian distribution"; figure: four coloured components (red, green, black, yellow) under the blue mixture. **p.45 –** three panels showing different component placements that approximate the same blue curve; handwritten "Many ways to fit these Gaussians"; highlighted: "Goal: given the samples from the original distribution, how to determine the parameters of GMM to best fit them?" (Left open – EM is the future answer.)

**p.46 – GMM as Generative Classification Model (STATED).** With $p(k)$'s summing to 1, $P(x)=\sum_kP(k)N(x;\mu_k,\sigma_k^2)$; number of mixtures = number of label classes: $P(k)\to P(Y=k)$; each mixture = class-conditional: $N(x;\mu_k,\sigma_k^2)\to P(x|Y=k)$;
$$P(x)=\sum_kP(Y=k)P(x|Y=k).$$

### Running examples and datasets
- **20 Newsgroups**, restricted (in the companion notebook) to 4 categories `['alt.atheism','soc.religion.christian','comp.graphics','sci.med']`, `subset='train'`, `shuffle=True`, `random_state=42` ⇒ 2257 documents; full vocab 35,788; `max_features=1000` for NB; class priors $[0.2127, 0.2588, 0.2632, 0.2654]$; NB train accuracy 0.8693; example predictions.
- Document index 3 (church/Poland post); words church (8609), computer (9338), doctor, important.
- Toy numbers: $\theta_{xk}=0.0012$; $d=10000$, $2^{10000}$ states, $10^{82}$ atoms; $\sim Kd$ vs $K(d+1)$ parameters.
- Dice/categorical cartoon; 1-D 4-component mixture sketch.

### Figures to rebuild interactively
1. BoW vectorizer: type a sentence, see the sparse 0/1 vector against a small vocabulary (p.12–15).
2. Parameter-count explosion: slider on $d$, show $2^d-1$ vs $Kd$ on a log scale with the $10^{82}$ reference line (p.23).
3. Categorical die: roll, update empirical histogram vs true $p_j$ (p.21).
4. NB "spamicity" heat map of $\psi_{jk}$ per word per class (p.36 data).
5. 1-D GMM builder: add/drag components $(\mu_k,\sigma_k,p(k))$, see the mixture curve (pp.44–46); "many fits" panel.

### Notation table
| Symbol | Meaning |
|---|---|
| $V$, $|V|$ | vocabulary and its size |
| $\phi(x)\in\{0,1\}^{|V|}$, $\phi(x)_j$ | bag-of-words feature map and its $j$-th entry (word present?) |
| $d$ | feature dimension ($=|V|$ or `max_features`) |
| $K$ | number of classes (also number of categorical outcomes on p.21) |
| $a\in\{1..K\}$, $P_\theta(a=j)=\theta_j$ | categorical variable and parameters |
| $\theta_{xk}$ | prob. of binary vector $x$ under class $k$ in the "first attempt" model |
| $\psi_{jk}\in[0,1]$ | $P(x_j=1\mid y=k)$ – Bernoulli parameter for word $j$, class $k$; $\psi_k=(\psi_{1k},\ldots,\psi_{dk})$ |
| $\boldsymbol\phi=(\phi_1,\ldots,\phi_K)$, $\vec\phi$ | class prior parameters, $P_\theta(y=k)=\phi_k$ |
| $\theta=(\phi,\psi)$ | full parameter vector of Bernoulli NB, $K(d+1)$ numbers |
| $n_k$ | number of training points with label $k$ |
| $\ell$, $\ell(\theta)$ | (un-normalized) log-likelihood $\sum_i\log P_\theta(x^{(i)},y^{(i)})$ |
| $i:y^{(i)}=k$ | sum over training points of class $k$ |
| `psis` `(K,d)`, `phis` `(K,)` | code arrays; `psis[k,j]` $=\psi_{jk}$ (transposed index order) |
| $N(u,\sigma^2)$, $N(x;\mu_k,\sigma_k^2)$ | univariate Gaussian (slides write $u$ for $\mu$) |
| $P(k)$ | mixture weight |

### Prerequisite / sticky-note concepts
- **Chain rule of probability** – p.24. Refresher: $p(x_1,\ldots,x_d|y)=\prod_j p(x_j|x_1..x_{j-1},y)$ holds for any ordering with no assumptions; NB then *assumes* each factor drops its dependence on earlier $x$'s.
- **Conditional independence** – p.24. Refresher: $X_1\perp X_2\mid Y$ means $p(x_1,x_2|y)=p(x_1|y)p(x_2|y)$; it does not imply marginal independence (words can be correlated overall yet independent within a class, and vice versa).
- **Bernoulli / categorical / multinomial distributions and their MLE** – pp.21, 26, 32–33. Refresher: Bernoulli pmf $\psi^x(1-\psi)^{1-x}$; MLE of $\psi$ is the sample mean; categorical MLE is the vector of empirical frequencies (needs the simplex constraint).
- **Logs turn products into sums; log is monotone** – pp.30, 37. Refresher: $\arg\max$ is unchanged by $\log$; sums of logs avoid underflow of products of thousands of probabilities (why the code works in log-space).
- **Sparse matrices** – p.13. Refresher: `fit_transform` returns a `scipy.sparse` CSR matrix; `.toarray()` densifies (fine at 1000 columns, not at 35,788 × many rows).
- **Gaussian density** – p.43. Refresher: $\mu$ location, $\sigma$ scale, normalizing constant $1/(\sigma\sqrt{2\pi})$.
- **Mixture distribution** – p.44. Refresher: sampling story – pick component $k$ with probability $p(k)$, then draw from it; density is the weighted sum.

### Derivation gaps
1. **Bernoulli MLE** $\hat\psi_{jk}=\frac{\sum_{i:y^{(i)}=k}x_j^{(i)}}{n_k}$: set derivative of $\sum_{i:y^{(i)}=k}[x_j^{(i)}\log\psi+(1-x_j^{(i)})\log(1-\psi)]$ to zero.
2. **Categorical MLE with simplex constraint** $\hat\phi_k=n_k/n$ via Lagrange multiplier on $\sum_k\phi_k=1$ (the slide only writes $\phi_k/\sum_l\phi_l=n_k/n$).
3. **Exact free-parameter count** of the full categorical model: $2^d-1$ per class, $K(2^d-1)$ total (slide writes $2^{d-1}$); Bernoulli NB: $Kd+(K-1)$ free parameters (slide says $K(d+1)$, counting $\phi$ unconstrained).
4. **Laplace (add-$\alpha$) smoothing** – absent from slides; needed to explain the $\log 0=-\infty$ failure seen in the notebooks (34 zero entries in `psis`) and why clipping to $10^{-14}$ is a hack: $\hat\psi_{jk}=\frac{\sum_{i:y^{(i)}=k}x_j^{(i)}+\alpha}{n_k+2\alpha}$, with a MAP/Beta-prior interpretation.
5. **Multinomial NB** (word counts) and its relation to the Bernoulli variant – mentioned implicitly by "count of occurrences" (p.16) but never modeled.
6. **NB posterior is linear in $x$**: $\log\frac{P(y=1|x)}{P(y=0|x)}=\sum_j x_j\log\frac{\psi_{j1}(1-\psi_{j0})}{\psi_{j0}(1-\psi_{j1})}+\sum_j\log\frac{1-\psi_{j1}}{1-\psi_{j0}}+\log\frac{\phi_1}{\phi_0}$ ⇒ NB is a linear classifier, i.e., the generative counterpart of logistic regression (sets up the GDA ⇔ LR story).
7. Why NB probabilities are over/under-confident (poll p.27(c)) – double counting under violated independence.
8. Computing calibrated $P(y|x)$ from log-scores via log-sum-exp (code only returns arg max and raw scores).
9. Why discriminative models need more data / generative models have higher bias (poll and p.3–4) – the Ng–Jordan asymptotic argument, in sketch.
10. How the mixture $P(x)=\sum_kP(Y=k)P(x|Y=k)$ is the marginal of the joint – one line of marginalization, not shown.

### Poll Everywhere questions
- **p.27 Naive Bayes.** (a) NB is an assumption imposed to reduce the number of parameters needed to learn $P(X|Y)$ [True]. (b) NB assumes words are uncorrelated when conditioned on the label class; this assumption often holds in practice [False – it rarely holds]. (c) Probabilities estimated by NB can be over- or under-confident [True]. (d) NB often has good performance in practice despite strong assumptions [True].
- **p.39 Naive Bayes.** (a) Bernoulli NB is a discriminative model [False]. (b) It models $P(x|y)$ as a product of independent Bernoulli distributions [True]. (c) If we model $P(Y)$ with a multinomial (categorical) distribution, the MLE is always the empirical frequency regardless of whether the model is NB [True].
- **p.40 Naive Bayes.** (a) Optimizing Bernoulli NB = finding parameters that fit the data best, achieved by maximizing the log-likelihood [True]. (b) Bernoulli NB cannot be solved in closed form, so we need gradient descent [False]. (c) NB was state of the art for a long time, scales well, and is always a good baseline for text classification [True, as intended].

### Continuity
Backward: pp.2–5 are verbatim recaps of L8 pp.32, 43 and the trade-off slide extends L8 p.34. Forward: the Bernoulli NB recap is L10 pp.3–5; GDA slides pp.41–46 are re-shown verbatim as L10 pp.6–11; "Recall from the MLE lecture" (p.32) points to an earlier lecture. The spam exercise notebook is the hands-on version of pp.12–38.

### Concept-graph edges
Variable-length text -> Need for fixed-length features; Vocabulary -> Bag of words $\phi(x)$; Bag of words -> `CountVectorizer`; Bag of words -> Logistic-regression text classifier; Bag of words -> Bernoulli NB; Categorical distribution -> Full class-conditional model; Full class-conditional model -> Parameter explosion $2^d$; Chain rule -> Naive Bayes assumption; Conditional independence -> Naive Bayes assumption; Naive Bayes assumption -> Bernoulli NB model; Bernoulli distribution -> Bernoulli NB model; Prior (categorical) -> Bernoulli NB joint; Maximum likelihood learning -> NB log-likelihood decomposition; NB log-likelihood decomposition -> Closed-form MLE ($\psi_{jk}=$ freq, $\phi_k=n_k/n$); Bayes classifier -> NB prediction; Log-space computation -> NB implementation; Zero-count problem -> (gap) Laplace smoothing; Gaussian density -> Gaussian mixture; Gaussian mixture + Bayes classifier -> GDA (L10); Stemming/stop-words -> Preprocessing (notebook).

### Suggested interactive widgets
- **Live BoW + NB spam scorer**: type an email; show $\phi(x)$, per-word contributions $\log\frac{\psi_{j1}}{\psi_{j0}}$ (coloured bars), running log-odds, final decision; toggle Laplace smoothing on/off to show the $-\infty$ failure.
- **Independence-assumption stress test**: duplicate a word feature $m$ times and watch NB's posterior become overconfident.
- **Parameter-count explorer** (as above).
- **1-D GMM builder → classifier**: label components as classes, draw the Bayes boundary where $P(Y=k)N(x;\mu_k,\sigma_k^2)$ curves cross.

---

## L10: Gaussian Discriminant Analysis, Unsupervised Learning, and K-Means (49 pages)

### Summary and place in the course arc
L10 opens with announcements (NB exercise + solution posted; HW2 due today; HW3 due 10/19 on NB and GDA) and a 3-slide recap of Bernoulli NB and its closed-form MLE. It then re-shows the L9 GMM slides and completes GDA: multivariate Gaussian $N(\mathbf u,\Sigma)$, covariance matrix, four correlation scatter plots, GDA as the mixture with one Gaussian per class, the log-likelihood decomposition (same pattern as NB), and the closed-form MLE $\mu_k$ = class mean, $\Sigma_k$ = class covariance (stated, "plug in the multivariate Gaussian, differentiate, set to zero" – not carried out). A GMM poll closes the supervised part. The second half introduces unsupervised learning (clustering/customer segmentation, outlier detection/density estimation, denoising with GMMs, dimensionality reduction), visualizes Iris without labels, runs `KMeans(n_clusters=3)`, then gives the k-means principles: model $f:\mathcal X\to\mathcal Z$, objective $J(f)$, Lloyd's algorithm (initialize / iterate assign+recompute / terminate), Euclidean distance, the units/normalization issue, and the formal update rules.

### Learning objectives
- Recall Bernoulli NB and why its MLE is closed-form.
- Define the multivariate Gaussian $N(\mathbf u,\Sigma)$ and the covariance matrix; read correlation structure from scatter plots.
- Define GDA as a per-class Gaussian generative classifier; show the log-likelihood decomposes; state the MLE $\mu_k,\Sigma_k,\phi_k$.
- Distinguish supervised vs unsupervised learning; list the four unsupervised tasks on the slides.
- Describe k-means: model class, objective, Lloyd's algorithm, convergence criterion; implement with sklearn.
- Explain why feature scaling matters for L2-distance-based clustering; z-score normalization.
- Recognize k-means's limitations (local minima, no probabilistic interpretation, spherical-cluster bias).

### Ordered concept walkthrough

**p.1 – Title.** **p.2 – Announcements** (see summary). **pp.3–5 – Last Lecture (recap, STATED).** Generative model for text; BoW; NB principle $P_\theta(x_j=1|y=k)=\psi_{jk}$, $P_\theta(x|y=k)=\prod_{j=1}^dP_\theta(x_j|y=k)$; prior $P_\theta(y=k)=\phi_K$; the MLE decomposition equation (identical to L9 p.30, with the two under-braces); "MLE solution for Naïve Bayes can be solved in closed form"; Bernoulli MLE = empirical count; $\psi_{jk}$ = proportion of class-$k$ docs containing word $j$; $\phi_K$ = proportion $n_k$ of class $k$.

**p.6 – Section: GDA.** **pp.7–11** – verbatim L9 pp.42–46, except **p.9** now labels the four components on the figure: **N(−2.5, 0.85)** red, **N(−1, 0.7)** green, **N(0, 1)** black, **N(2, 2)** yellow (second argument presumably variance $\sigma_k^2$ to match $N(x;\mu_k,\sigma_k^2)$).

**p.12 – Multivariate Gaussian $N(\mathbf u,\Sigma)$ (DEFINITION, STATED-ONLY, no density formula).** $\mathbf u$: vector of length $d$; $\Sigma$: $d\times d$ covariance matrix. Figures: 3-D bell surface over a 100×100 grid (peak ≈ 0.0012); 2-D scatter of samples with a green covariance ellipse and the two marginal histograms with fitted red/blue 1-D Gaussians.

**p.13 – Covariance Matrix (DEFINITION).**
$$\mathrm{cov}(X,Y)=\mathbb E\big[(X-\mathbb E[X])(Y-\mathbb E[Y])\big],\qquad \begin{bmatrix}var(x)&cov(x,y)\\cov(x,y)&var(y)\end{bmatrix}$$
(rows/columns labelled $x$, $y$). **p.14 – Four scatter plots** on $[-10,10]^2$: (top-left) positively correlated elongated along $y=x$; (top-right) negatively correlated; (bottom-left) roughly isotropic blob (slightly wider in $x$); (bottom-right) vertically elongated (var $y$ > var $x$). No matrices given – an exercise to match $\Sigma$ to shape.

**p.15 – Gaussian Discriminant Analysis (DEFINITION, STATED).**
$$P(\mathbf x)=\sum_kP(Y=k)\,P(\mathbf x|Y=k),\qquad P(\mathbf x|Y=k):\ N(\mathbf x;\mu_k,\Sigma_k).$$
"Gaussian discriminant analysis: fit the parameters $\mu_k,\Sigma_k$ to be empirical means and variances of each label class $k$." (Per-class covariance – this is QDA-style GDA; no shared-$\Sigma$ variant.)

**p.16 – GDA through MLE (DERIVED decomposition).**
$$\ell(\theta)=\sum_{i=1}^n\log P_\theta(x^{(i)},y^{(i)})=\sum_{i=1}^n\log P_\theta(x^{(i)}|y^{(i)})+\sum_{i=1}^n\log P_\theta(y^{(i)})$$
$$=\underbrace{\sum_{k=1}^K\sum_{i:y^{(i)}=k}\log P(x^{(i)}|y^{(i)};\mu_k,\Sigma_k)}_{\text{all the terms that involve }\mu_k,\Sigma_k}+\underbrace{\sum_{i=1}^n\log P(y^{(i)};\vec\phi)}_{\text{all the terms that involve }\vec\phi}.$$

**p.17 – Solving for $\vec\phi$ (STATED).** $\max_{\vec\phi}\sum_{i=1}^n\log P_\theta(x^{(i)},y^{(i)})=\max_{\vec\phi}\sum_{i=1}^n\log P_\theta(y^{(i)};\vec\phi)$; "can be carried out independently for each label class"; optimal $\phi_K$ is the class proportion: $\frac{\phi_k}{\sum_l\phi_l}=\frac{n_k}{n}$.

**p.18 – Each $\mu_k,\Sigma_k$ (DERIVED reduction).**
$$\max_{\mu_k,\Sigma_k}\sum_{i=1}^n\log P_\theta(x^{(i)},y^{(i)})=\max_{\mu_k,\Sigma_k}\sum_{l=1}^K\sum_{i:y^{(i)}=l}\log P_\theta(x^{(i)}|y^{(i)};\mu_l,\Sigma_l)=\max_{\mu_k,\Sigma_k}\sum_{i:y^{(i)}=k}\log P_\theta(x^{(i)}|y^{(i)};\mu_k,\Sigma_k).$$
"Carry out optimization over $\mu_k,\Sigma_k$ independently of all the other parameters."

**p.19 – Learning $\mu_k,\Sigma_k$ through MLE (method STATED).** $=\max_{\mu_k,\Sigma_k}\sum_{i:y^{(i)}=k}\log\mathcal N(x^{(i)}|\mu_k,\Sigma_k)$; "calculating the maximum likelihood by plugging in the expression for the multivariate Gaussian distribution; compute the derivative and setting it to zero."

**p.20 – Result (STATED-ONLY).** "The MLE of $\mu_k,\Sigma_k$ are just the empirical means and covariances of each class":
$$\mu_k=\frac{\sum_{i:y^{(i)}=k}x^{(i)}}{n_k},\qquad \Sigma_k=\frac{\sum_{i:y^{(i)}=k}(x^{(i)}-\mu_k)(x^{(i)}-\mu_k)^T}{n_k}.$$

**p.21 – Poll (GMM).** Includes "GDA is equivalent of naive Bayes but for continuous data" – intended True in spirit (same generative recipe), though strictly GDA with full $\Sigma_k$ does *not* assume conditional independence; a diagonal-$\Sigma_k$ GDA is Gaussian NB. Worth a platform note.

**pp.22–28 – Unsupervised Learning (progressively revealed list).** "A dataset without labels – learn interesting structures within the data." Tasks: (1) **Clusters** of related datapoints, e.g. customer segmentation (**p.23**: subdivide customers into a small number of groups with similar characteristics; how many groups is enough?; features: needs, past behaviours, demographics; use case targeted marketing; algorithm clustering). (2) **Outliers** (**p.25** Outlier Detection: is a new point normal?; features e.g. summary of network traffic logs, state of a factory machine; "model the data generating distribution"; "density estimation"). (3) **Denoised signals** (**p.27**: Lena image with added Gaussian noise, shown as colour-mapped noisy and segmented versions; "assume data generated from different Gaussian distributions; use Gaussian Mixture Models to cluster data; remove the cluster that is labeled as noise"). (4) **Dimensionality reduction** (named only – PCA is upcoming).

**p.29 – Section: Data and Visualization.** **p.30 – 2D Visualization (not using labels).** `plt.scatter(iris.data[:,0], iris.data[:,1], alpha=0.5)`, axes "Sepal length (cm)" ×"Sepal width (cm)", title "Dataset of Iris flowers"; scatter of 150 points, $x\in[4.3,7.9]$, $y\in[2.0,4.4]$.

**p.31 – Section: K-Means.** **p.32 –** "Find $K$ hidden clusters in the data." `from sklearn import cluster; model = cluster.KMeans(n_clusters=3); model.fit(iris.data[:,[0,1]])`; plotting code adds `model.cluster_centers_` as red diamonds (`marker='D', c='r', s=100`), legend `['Datapoints','Probability peaks']`. **p.33 –** resulting figure: three red diamonds at approximately (5.0, 3.4), (5.8, 2.7), (6.8, 3.1). **p.34–35 –** same plot coloured by `iris.target` with `cmap='Paired'`, legend Iris Setosa / Versicolour / Virginica: "Plot labels to visually examine how good the centers returned by the clustering algorithm are" (Setosa cluster is clean; Versicolour/Virginica overlap in these two features).

**p.36 – Unsupervised Learning Notations.** $\mathcal D=\{x^{(i)}\,|\,i=1,2,\ldots,n\}$; each $x^{(i)}\in\mathbb R^d$ a vector of $d$ attributes/features. **p.37 – Components of Unsupervised Learning Algorithms.** A **model class** (set of possible unsupervised models); an **objective** function (defines how good a model is; cannot use/won't have labels); an **optimizer** (finds the best model in the class per the objective).

**p.38 – Section: k-Means Clustering Principles.** **p.39 – K-Means Model.** The returned model is a function $f:\mathcal X\to\mathcal Z$ assigning each input $x$ a cluster ID $z\in Z=\{1,2,\ldots,K\}$.

**p.40 – K-Means Objective (STATED).** Find centroids $c_k$ such that the distance between points and their closest centroid is minimized:
$$J(f)=\frac1n\sum_{i=1}^n\big\|x^{(i)}-\mathrm{centroid}(f(x^{(i)}))\big\|,$$
where $\mathrm{centroid}(k)=c_k$. Figure: a triangle with its three medians meeting at the "Centroid". (Note: the slide's $J$ uses the *un-squared* norm; sklearn's `score`/inertia and the mean-update step correspond to the *squared* norm – see gaps.)

**p.41 – k-Means Clustering (algorithm, STATED).** Set number of clusters: select $k$. Initialize: randomly select $k$ centroid locations (a centroid is a "representative" point of each cluster; not necessarily a data point). Iterate until convergence: assign each observation to the nearest centroid; recalculate centroids as the average of assigned observations. Terminate when no observations get reassigned. **pp.42–43 –** Wikipedia k-means animation frame "Iteration #0": three clusters of points (orange +, yellow ×, blue ○), three centroids (big markers), black Voronoi boundary lines; axes $[0,1]\times[0.1,0.9]$.

**p.44 – Measuring Distance between 2 Points.** Clustering relies on pairwise distances; typically Euclidean / L2: for $a=(a_1,a_2)$, $b=(b_1,b_2)$, $\text{Distance}=\sqrt{(a_1-b_1)^2+(a_2-b_2)^2}$ (right-triangle figure with legs $a_2-b_2$, $a_1-b_1$); generalizes: $\text{Distance}=\sqrt{(a_1-b_1)^2+(a_2-b_2)^2+\cdots+(a_6-b_6)^2}$.

**p.45 – Poll (K-means, units).** **p.46 – Normalization in K-Means.** "Normalized variables are expressed in terms of 'number of standard deviations from mean'":
$$\text{Normalized data}=\frac{\text{Data}-\text{Sample mean}}{\text{Sample standard deviation}}.$$

**p.47 – k-Means Clustering, formal update (STATED).** Select $k$; randomly select $k$ centroids; repeat until convergence: update $f(x)$ such that
$$f(x(i))=\operatorname{argmin}_k\|x(i)-c_k\|_2$$
(the cluster of the closest centroid to $x(i)$); set each $c_k$ to the center (average vector) of its cluster $\{x(i)\,|\,f(x(i))=k\}$; terminate when no observations get reassigned. (Slide writes $x(i)$ for $x^{(i)}$.) **p.48 –** Wikipedia figure again. **p.49 – Poll (K-means and clustering).**

### Running examples and datasets
- 1-D GMM with components N(−2.5, 0.85), N(−1, 0.7), N(0, 1), N(2, 2) (p.9).
- Covariance scatter quartet (p.14), ranges $[-10,10]$.
- **Iris** (150 samples, 3 classes × 50; features sepal length/width, petal length/width; only the first two used): k-means with $K=3$; centroids ≈ (5.0,3.4), (5.8,2.7), (6.8,3.1).
- Wikipedia k-means animation (iteration 0).
- Lena denoising illustration (p.27); customer segmentation and network-traffic/factory-machine anomaly examples (text only).

### Figures to rebuild interactively
1. 1-D mixture with the four labelled components (p.9) – sliders.
2. Multivariate Gaussian surface + contour ellipse + marginals (p.12) – edit $\Sigma$ entries, watch the ellipse rotate/stretch.
3. Covariance quartet (p.14) – "match the matrix to the cloud" quiz.
4. Iris scatter → k-means centroids → true labels overlay (pp.30–35).
5. Lloyd's algorithm stepper (pp.41–43, 47): step through assign/update with Voronoi cells; random restarts to show local minima.
6. Distance/normalization demo (pp.44–46): two features with wildly different units; toggle z-scoring and watch clusters change.

### Notation table
| Symbol | Meaning |
|---|---|
| $N(\mathbf u,\Sigma)$ | multivariate Gaussian with mean vector $\mathbf u\in\mathbb R^d$ (= $\mu$) and covariance $\Sigma\in\mathbb R^{d\times d}$ |
| $\mathrm{cov}(X,Y)$, $var(x)$ | covariance / variance |
| $\mu_k,\Sigma_k$ | class-$k$ Gaussian mean and covariance (GDA) |
| $\vec\phi=(\phi_1..\phi_K)$, $\phi_K$ | class priors (capital-$K$ subscript = typo for $k$) |
| $n_k$ | class-$k$ count |
| $\mathcal N(x^{(i)}\mid\mu_k,\Sigma_k)$ | Gaussian density evaluated at $x^{(i)}$ |
| $\mathcal D=\{x^{(i)}\}_{i=1}^n$, $x^{(i)}\in\mathbb R^d$ | unlabeled dataset |
| $f:\mathcal X\to\mathcal Z$, $z\in Z=\{1..K\}$ | k-means assignment function and cluster IDs |
| $c_k=\mathrm{centroid}(k)$ | centroid of cluster $k$ |
| $J(f)$ | k-means objective (average distance to assigned centroid) |
| $\|\cdot\|$, $\|\cdot\|_2$ | Euclidean norm |
| $a=(a_1,a_2)$, $b=(b_1,b_2)$ | two points in the distance slide |

### Prerequisite / sticky-note concepts
- **Multivariate Gaussian density** – p.12 (never written). Refresher: $\mathcal N(x;\mu,\Sigma)=(2\pi)^{-d/2}|\Sigma|^{-1/2}\exp\!\big(-\tfrac12(x-\mu)^\top\Sigma^{-1}(x-\mu)\big)$; contours are ellipses whose axes are eigenvectors of $\Sigma$.
- **Covariance matrix properties** – p.13–14. Refresher: symmetric positive semi-definite; diagonal = variances; off-diagonal sign = direction of linear association; correlation $=\mathrm{cov}/(\sigma_x\sigma_y)$.
- **Determinant and inverse of a matrix** – implicit in the Gaussian density. Refresher: $|\Sigma|$ scales volume (needed in the normalizer); $\Sigma^{-1}$ (precision) appears in the quadratic form; singular $\Sigma$ breaks both.
- **Matrix calculus** – p.19 "compute the derivative and set to zero". Refresher: $\nabla_\mu\,(x-\mu)^\top\Sigma^{-1}(x-\mu)=-2\Sigma^{-1}(x-\mu)$; $\nabla_\Sigma\log|\Sigma|=\Sigma^{-\top}$; $\nabla_\Sigma\,\mathrm{tr}(\Sigma^{-1}A)=-\Sigma^{-\top}A^\top\Sigma^{-\top}$.
- **Expectation, sample mean/standard deviation, z-score** – pp.13, 46.
- **Euclidean distance / Pythagoras** – p.44.
- **Argmin / Voronoi partition** – p.47. Refresher: assigning each point to its nearest centre partitions space into convex cells bounded by perpendicular bisectors.
- **Local vs global minima of a non-convex objective** – poll p.49.

### Derivation gaps
1. **Full MLE for $\mu_k$ and $\Sigma_k$** (p.19–20 states the method and result only): write $\sum_{i:y^{(i)}=k}\big[-\tfrac d2\log2\pi-\tfrac12\log|\Sigma_k|-\tfrac12(x^{(i)}-\mu_k)^\top\Sigma_k^{-1}(x^{(i)}-\mu_k)\big]$, differentiate w.r.t. $\mu_k$ and $\Sigma_k$ (or $\Sigma_k^{-1}$), solve; discuss the biased $1/n_k$ normalizer.
2. **Shared covariance ⇒ linear boundary; per-class covariance ⇒ quadratic boundary** (absent): with $\Sigma_k=\Sigma$, $\log\frac{P(y=1|x)}{P(y=0|x)}=w^\top x+b$ with $w=\Sigma^{-1}(\mu_1-\mu_0)$, $b=-\tfrac12\mu_1^\top\Sigma^{-1}\mu_1+\tfrac12\mu_0^\top\Sigma^{-1}\mu_0+\log\frac{\phi_1}{\phi_0}$; hence $P(y=1|x)=\sigma(w^\top x+b)$ – exactly the logistic-regression form, fit differently (generative vs discriminative). Pooled-covariance MLE $\Sigma=\frac1n\sum_i(x^{(i)}-\mu_{y^{(i)}})(x^{(i)}-\mu_{y^{(i)}})^\top$. LDA/QDA naming.
3. **GDA vs Gaussian Naive Bayes**: diagonal $\Sigma_k$ ⇔ conditional independence; clarifies poll p.21(d).
4. **Marginal $P(x)$ as a mixture** from the joint (one-line marginalization).
5. **Covariance quartet**: give explicit $\Sigma$'s (e.g. $\begin{bmatrix}4&3\\3&4\end{bmatrix}$, $\begin{bmatrix}4&-3\\-3&4\end{bmatrix}$, $\begin{bmatrix}4&0\\0&1\end{bmatrix}$, $\begin{bmatrix}1&0\\0&4\end{bmatrix}$) and show how eigen-decomposition yields the ellipse.
6. **k-means objective consistency**: the slide's $J(f)$ uses $\|\cdot\|$; Lloyd's mean update minimizes $\sum\|x-c\|^2$ (the mean is the minimizer of squared distances; for un-squared it would be the geometric median). Platform should present $J=\frac1n\sum_i\|x^{(i)}-c_{f(x^{(i)})}\|_2^2$, prove each of the two steps is a coordinate-wise minimization, hence $J$ is monotone non-increasing and the algorithm terminates (finitely many partitions).
7. **Why k-means can get stuck in local minima / sensitivity to initialization** (poll p.49) and standard fixes (k-means++, restarts) – not on slides.
8. **Why scaling matters** (poll p.45): a feature with large variance dominates $\sum_j(a_j-b_j)^2$.
9. **Choosing $K$** – elbow method appears only in the notebook (see below).
10. **k-means as a limiting case of GMM/EM** (hard assignments, isotropic $\Sigma=\sigma^2I$, $\sigma\to0$) – connects the two halves of L10 and previews EM; poll p.49(e) says k-means has *no* probabilistic confidence, which EM/GMM remedies.

### Poll Everywhere questions
- **p.21 GMM.** (a) In classification, GMM assumes the conditional distribution of the feature given the label is Gaussian [True]. (b) Number of mixtures = number of label classes, and the best-fit parameters are found by MLE in closed form [True]. (c) Predicting $P(y|\mathbf x)$ with a GDA model applies Bayes rule, selecting the class maximizing $P_\theta(\mathbf x|y)P_\theta(y)$ [True]. (d) GDA is the equivalent of naive Bayes but for continuous data [intended True; see caveat above].
- **p.45 K-means (units).** (a) K-means performance is sensitive to the choice of units, e.g. time in days vs years [True]. (b) The L2 distance is primarily driven by the variables of a *smaller* scale [False – larger scale]. (c) It is hard to compare different units in L2 distance, e.g. days and miles [True].
- **p.49 K-means and clustering.** (a) K-means returns the exact same solution every time on the same dataset with different initial centroids [False]. (b) K-means performs best when variables are correlated (ellipsoid clusters) with different variances across clusters [False – it prefers spherical, similar-size clusters]. (c) k-means can get stuck at local minima [True]. (d) Measuring clustering quality is hard and relies on heuristics [True]. (e) The assignment returned by k-means has a probabilistic interpretation representing confidence [False].

### Continuity
Backward: pp.3–11 are recaps of L9 (NB MLE, GMM). Forward: "Dimensionality reduction" (p.28) and "density estimation" (p.25) name upcoming topics (PCA; GMM/EM); the open GMM-fitting question (p.10) and poll p.49(e) motivate EM; HW3 covers NB and GDA. The supervised→unsupervised boundary is at p.22. The "lecture10" notebook continues directly from p.35 with generalization, elbow method.

### Concept-graph edges
Univariate Gaussian -> Multivariate Gaussian; Covariance matrix -> Multivariate Gaussian; Expectation/variance -> Covariance matrix; Gaussian mixture -> GDA model; Bayes classifier -> GDA prediction; Maximum likelihood learning -> GDA log-likelihood decomposition; GDA log-likelihood decomposition -> Closed-form $\mu_k,\Sigma_k,\phi_k$; Matrix calculus -> Closed-form $\mu_k,\Sigma_k$ (gap); GDA -> (gap) Linear boundary with shared $\Sigma$ -> Logistic regression link; Naive Bayes -> Gaussian NB = diagonal GDA (gap); Supervised learning -> Unsupervised learning (contrast); Unsupervised learning -> Clustering; Unsupervised learning -> Density estimation / outlier detection; Unsupervised learning -> Dimensionality reduction (future); Euclidean distance -> k-means objective; Model class/objective/optimizer -> k-means as an algorithm; k-means objective -> Lloyd's algorithm; Feature scaling (z-score) -> Reliable k-means; Lloyd's algorithm -> Local minima / initialization sensitivity; Gaussian mixture -> EM (future); k-means -> GMM/EM (future, soft version).

### Suggested interactive widgets
- **GDA fitter**: draw/upload 2-class 2-D points; show fitted class ellipses, priors, and the Bayes boundary; toggle "shared covariance" to see the boundary become linear and overlay a logistic-regression fit for comparison.
- **Covariance playground**: sliders for $\sigma_x,\sigma_y,\rho$; live scatter + ellipse + the matrix.
- **k-means stepper** with pause-per-step, random restarts, inertia trace, and k-means++ toggle.
- **Scaling sandbox**: two features (e.g. age in years vs income in dollars), show clusters before/after z-scoring.
- **Elbow-curve builder** (from the notebook): sweep $K=1..10$, plot inertia, mark the elbow.

---

## Notebooks

### 1. `Code_Companions__Lecture_8_Code_Companion.ipynb.md` (matches **L9** slides 8–9, 13–15, 17–18, 35–38)
Follows the sklearn "Working with text data" tutorial (link in cell 0). Libraries: numpy, pandas, `sklearn.datasets.fetch_20newsgroups`, `sklearn.feature_extraction.text.CountVectorizer`, `sklearn.linear_model.LogisticRegression`. Dataset: 20 Newsgroups, `subset='train'`, 4 categories (`alt.atheism`, `soc.religion.christian`, `comp.graphics`, `sci.med`), `shuffle=True, random_state=42` → 2257 docs; `target_names` sorted alphabetically `['alt.atheism','comp.graphics','sci.med','soc.religion.christian']` (so label 1 = comp.graphics, 3 = soc.religion.christian). Steps: print DESCR; print `data[3]`; `CountVectorizer(binary=True)` → `(2257, 35788)`; vocabulary indices church=8609, computer=9338; binary values for doc 3; `LogisticRegression(C=1e5, multi_class='multinomial', verbose=True)` (L-BFGS, 17 iterations, final loss 5.0e-4 – essentially separable/overfit; sklearn deprecation warning for `multi_class`); predictions for 'God is love' → soc.religion.christian and 'OpenGL on the GPU is fast' → comp.graphics; then re-vectorize with `max_features=1000` and `.toarray()` → `(2257, 1000)`; compute `psis (K,d)` and `phis (K,)` by class-wise means and proportions → `phis = [0.2127 0.2588 0.2632 0.2654]`; `nb_predictions` (broadcasting to `(K,n,d)`, clip to `[1e-14, 1-1e-14]`, Bernoulli log-likelihood, add log prior, argmax over classes) → first 10 predictions `[1 1 3 0 3 3 3 2 2 2]`; training accuracy **0.8693**; NB prediction for the OpenGL sentence → comp.graphics. **No plots.** Key functions: `nb_predictions(x, psis, phis)`. Note: NB is evaluated on the *training* set only; no test split, no smoothing.

### 2. `Lectures__NaiveBayes_Spam_exercise.ipynb.md` (unsolved in-class exercise) and 3. `..._sol.ipynb.md` (solution)
Corresponds to L9 slides 12–16 (BoW, preprocessing), 17 (LR), 20, 26, 28–38 (Bernoulli NB), plus L8's spam framing (p.36–38). Precision/recall/F1 material is included as review (from an earlier classification-metrics lecture). Libraries: numpy, pandas, `sklearn.model_selection.train_test_split`, `CountVectorizer`, `LogisticRegression`, `sklearn.metrics`, `nltk` (`stopwords`, `PorterStemmer`). Dataset: `emails.csv` from Canvas (encoding latin-1), 5728 rows, columns `text` (every email starts with "Subject: …") and `spam` ∈ {0,1}; 4360 ham / 1368 spam (23.9% spam).

Tasks (as posed) → solution:
1. *Load the dataset* → `pd.read_csv("emails.csv", encoding="latin-1")`; display shows 5728 × 2.
2. *What are $x^{(1)}$ and $y^{(1)}$ in this dataset?* → (answer in prose, not coded) $x^{(1)}$ = the first email's text, $y^{(1)}$ = its spam label (1). Solution also prints `data.spam.value_counts()`.
3. *Split into train/test* → `train_test_split(text, Y, test_size=0.33, random_state=42)` → train 3837, test 1891.
4. *Check label balance* → `sum(y_train)/len(y_train)` = 0.2280; test = 0.2607; shapes (5728,), (3837,), (1891,).
5. *Bag-of-words with CountVectorizer* → `CountVectorizer(binary=True, max_features=1000)`; `fit_transform(text_train).toarray()` → (3837, 1000); `transform(text_test)` → (1891, 1000). (Fit on train only – good practice.)
6. *Print the dictionary* → `count_vect.vocabulary_` (dict word→index, e.g. 'subject': 834, 're': 706, 'enron': 310, 'vince': 943, 'kaminski': 469 – the Enron corpus).
7. *Is "," / "and" in the vocabulary?* → `',' in vocabulary_` False (tokenizer drops punctuation); `'and'` True (stop-words kept by default).
8. *Visualize a feature vector* → `print(X_train[0])` – a length-1000 0/1 vector, mostly zeros.
9. *Shapes* → `n = 3837, d = 1000, K = 2`.
10. *Discriminative model: linear or logistic regression? why?* → logistic (binary label; outputs probabilities). Solution: `LogisticRegression(multi_class='ovr', penalty="none", verbose=True)` (unregularized; L-BFGS 35 iterations).
11. *Train/test accuracy* → 0.99974 train, 0.97726 test (near-perfect train fit = mild overfitting).
12. *Precision/recall/F1 because classes are imbalanced* → markdown defines TP/FP/FN/TN table, precision = TP/(TP+FP), recall = TP/(TP+FN), F1 = 2PR/(P+R); solution `metrics.f1_score(y_test, logreg.predict(X_test))` = **0.9564**.
13. *Generative model: compute $P(x_1=1|y=1)$ by empirical mean* → `np.mean(X_train[y_train==1, 0])` = 0.0811.
14. *Compute $\psi_j = P(x_j=1|y=1)$ for all $j$* → `psi = np.mean(X_train[y_train==1], axis=0)`.
15. *Build `psis` (K×d; row 0 = $P(x_j=1|y=0)$, row 1 = $P(x_j=1|y=1)$) and `phis` (K)* → loop over k: `X_k = X_train[y_train==k]; psis[k] = X_k.mean(axis=0); phis[k] = X_k.shape[0]/X_train.shape[0]` → `phis = [0.77195726 0.22804274]`. A helper cell demonstrates `np.mean(a, axis=0)` = column means `[2.5 3.5 4.5]` vs `axis=1` = row means `[2. 5.]`.
16. *Interpret the rows of psis* → row 0: word frequencies in ham; row 1: in spam.
17. *Top-10 "spamicity" words* → `np.argsort(psis[1])[-10:]` = indices `[430 454 353 997 996 601 107 868 890 834]` → words: subject, for, you, the, of, to, in, and, is, your (all stop-words – motivates stop-word removal).
18. *Prediction via Bayes rule and the NB assumption* (markdown derives $\arg\max_k\sum_j\log P(x'_j|y=k;\psi_{jk})+\log\phi_k$, and $P(x'_j=1|\cdot)=\psi_{jk}$, $P(x'_j=0|\cdot)=1-\psi_{jk}$; coin analogy). Solution first shows the pitfall: `np.sum(psis==0)` = **34** zero entries; `np.log(psis)` emits `RuntimeWarning: divide by zero` and `-inf` entries (one shown in the spam row: a word never seen in spam); note the first attempt `psis.clip(...)` without assignment does nothing (teaching moment); then `psis = psis.clip(1e-14, 1-1e-14)` → 0 zeros, the `-inf` becomes −32.236.
19. *Complete `spam_predict(x, psis, phis, K=2)`* → fills `score[i][k] = np.sum(np.log(psis)[k]*x[i] + np.log(1-psis)[k]*(1-x[i])) + log_py[k]`; returns `score.argmax(axis=1)`. (Double loop, O(nK), vs. the companion's vectorized broadcasting.)
20. *Evaluate* → first 20 training predictions `[0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 1 0 0 1 0]`; train accuracy **0.9268**; test accuracy **0.9217** (vs LR 0.977 – consistent with "discriminative often more accurate" when data is plentiful).
21. *Check whether a word appears only in one class* → `np.sum(psis[0]==0)`, `np.sum(psis[1]==0)` both 0 – but only because psis was already clipped; before clipping there were 34 such entries. (Platform should flag this ordering subtlety.)
22. *Remove stop-words from the dictionary* → `count_vect.vocabulary_.pop('and')` (returns 107) → re-transform → (3837, 999).
23. *Batch stop-word removal with NLTK* → `nltk.download('stopwords')`; print the 179-word English list; pop every vocabulary key in the list → (3837, 886).
24. *Stemming* → `PorterStemmer`; build `new_dict` mapping each stem to a fresh index (742 unique stems); assign `count_vect.vocabulary_ = new_dict`; re-transform → (3837, 742). (The exercise stops here; it does not re-train NB on the reduced vocabulary – a natural extension task.)

No plots are produced in either spam notebook.

### 4. `Lectures__lecture10-unsupervised-learning_code_companion.ipynb.md`
**Verdict:** it matches the **second half of L10** (unsupervised learning / k-means, slides 30–35), not Naive Bayes/GDA, and then **extends beyond L10** into material that will presumably be the next lecture. Libraries: numpy, pandas, `sklearn.datasets` (`load_iris`, `make_blobs`), `sklearn.cluster.KMeans`, matplotlib (`figsize [12,4]`).

Content and plots:
1. Iris loaded; DESCR printed (150 instances, 4 attributes, class correlations; "one class is linearly separable from the other 2").
2. **Plot A** – Iris scatter sepal length vs width, unlabeled (= L10 p.30).
3. `KMeans(n_clusters=3).fit(iris.data[:,[0,1]])`; **Plot B** – data + red diamond centroids, legend 'Datapoints'/'Probability peaks' (= L10 pp.32–33).
4. **Plot C** – same with `c=iris.target, cmap='Paired'` and species legend (= L10 pp.34–35).
5. *Beyond the slides:* "Review: Generalization" definition; synthetic dataset `np.random.seed(0); X, y = datasets.make_blobs(centers=4)` (100 points, 4 Gaussian blobs); **Plot D** unlabeled, **Plot E** coloured by true blob.
6. *Underfitting in unsupervised learning*: `KMeans(n_clusters=2)` → **Plot F** with centroids; prints `K-Means Objective: 462.03` (computed as `-model.score(X)` = inertia = sum of squared distances).
7. `Ks=[4,10,20]` → **Plot G**, 1×3 subplots, titles show decreasing objective.
8. *Overfitting*: `KMeans(n_clusters=50)` → **Plot H**, objective 5.46 ("fitting small, local noise clusters").
9. "We can see the true structure given enough data": `make_blobs(n_samples=10000, centers=4)` → **Plot I** (alpha 0.03 overlay).
10. Markdown: data distribution $x\sim\mathbb P$, IID sampling (coin-flip example; yearly census counter-example); generalization as $\mathbb P=F+E$ (signal $F$ + noise $E$): a model generalizes if it fits $F$, overfits if it fits $E$.
11. **Plot J** – 1×3 panels for $K=2,4,20$ titled 'Underfitting', 'Good fit', 'Overfitting'.
12. **The Elbow Method** – sweep $K=1..10$, `objs.append(-model.score(X))`; **Plot K** – objective vs $K$ with the $K=4$ point highlighted in red; "the decrease slows down after $K=4$, after that the curve becomes just a line."

Key functions/attributes: `cluster.KMeans(n_clusters=k).fit(X)`, `model.cluster_centers_`, `model.score(X)` (negative inertia), `datasets.make_blobs(n_samples, centers)`. Correspondence: cells 0–10 ↔ L10 pp.29–35; cells 11–35 are *not* on the L10 slides (preview of hyperparameter selection in unsupervised learning, which also closes the loop with L8's model-selection theme: "the elbow method is a way of tuning hyper-parameters in unsupervised learning").

---

## Cross-lecture notation conventions and quirks to normalize on the platform
- Samples are indexed $i=1..n$ with superscript $x^{(i)}$ (L10 p.47 writes $x(i)$; L8 p.43 writes $x^1$); features indexed $j=1..d$ (but L9 p.24 uses $i$ for features); classes $k=1..K$ (code uses $0..K-1$).
- $P_\theta$ vs $p_\theta$ used interchangeably; $\boldsymbol\phi$, $\vec\phi$, $\phi$ all denote the prior vector; $\phi_K$ with capital subscript means $\phi_k$.
- $\psi_{jk}$ is word-$j$-given-class-$k$; code stores it as `psis[k, j]`.
- $N(u,\sigma^2)$ and $N(\mathbf u,\Sigma)$ use $u$ for the mean; $\mathcal N(x\mid\mu,\Sigma)$ and $N(x;\mu_k,\Sigma_k)$ also appear.
- $Div(\cdot,\cdot)$ is the generic per-example loss; $\ell$ is used both for the regularized training objective (L8) and for the log-likelihood (L9–L10) – opposite sign conventions (minimize vs maximize).
- $J(f)$ (k-means) is written with an un-squared norm on the slide; code inertia is squared.
