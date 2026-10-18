# Course overview, schedule, and unit map

<!--
  Generated 2026-10-06 from the syllabus, the L1 schedule slide, the L5/L10 announcement
  slides, and the five content maps in this folder. Updated 2026-10-18 for L11–L12 and the
  lecture11,13 companion (06-lectures-L11-L12.md). This is the top-level index that
  every lesson author should read first. Update the "Status" column as units ship.
-->

## The course

| Field | Value |
|---|---|
| Course | CS 5785 / ECE 5414 / ORIE 5750 Applied Machine Learning, Fall 2026, Cornell Tech |
| Instructor | Prof. Kyra Gan (ORIE; research in causality, sequential decision-making, healthcare) |
| Meets | Mon/Wed 7:30–8:45 pm, Bloomberg 131 |
| Textbook | *Dive into Deep Learning* (d2l.ai, free). Optional: Mitchell; Murphy *ML: A Probabilistic Perspective*; Bishop *PRML* |
| Prereqs / coreqs | CS 2800 + Python; Linear Algebra; Intro Probability |
| Grading | Participation (Poll Everywhere) 10% · 5 HW + HW0 40% · Group midterm Kaggle 25% · Group final project 25% |
| Each HW has | (1) a Canvas quiz on lecture material, (2) programming questions, (3) written/math questions, submitted on Gradescope |
| Late policy | 6 slip days total, max 2 per assignment, then −20%/day |

Stated course philosophy (syllabus): *"Rather than focusing on engineering models for optimal performance, we will emphasize developing a rigorous mathematical understanding of how these models work."* The lectures teach "the what, the why, and the how (the math)". That is exactly the register this platform must match and exceed.

## Tentative schedule (from the L1 schedule slide; dates are 2026)

| Date | Lecture | Topic | Milestone |
|---|---|---|---|
| 8/24 | L1 | Introduction | |
| 8/26 | — | Review: probability + linear algebra | |
| 8/31 | — | Review: calculus + coding/autograd | |
| 9/2 | L2 | Supervised learning + linear regression | HW0 due |
| 9/9 | L3 | Linear regression + data-generating distribution | |
| 9/14 | L4 | Empirical risk + gradient descent | |
| 9/16 | L5 | GD + logistic regression + MLE | **HW1 due** |
| 9/21 | L6 | MLE + classification evaluation | |
| 9/23 | L7 | Evaluation, choice of divergence, regularization | |
| 9/28 | L8 | Model selection + generative models I | |
| 9/30 | L9 | Generative models + text classification (Naive Bayes) | |
| 10/5 | L10 | GDA, unsupervised learning, k-means | **HW2 due** |
| 10/7 | L11 | K-means (choosing K, limitations), unsupervised GMM, EM (slide title: "K-Means, unsupervised GMM, EM") | |
| 10/14 | L12 | EM algorithm and density estimation (M-step derivation, holdout log-likelihood, histograms; KDE introduced on the last slide) | Midterm project announced (teams ≤3) |
| 10/19 | L13 | KNN (expected to continue kernel density estimation; not yet released) | **HW3 due (Naive Bayes + GDA)** |
| 10/21 | L14 | Dimensionality reduction | |
| 10/26 | L15 | Guest lecture (sensors/vision) | |
| 10/28 | L16 | PCA, decision trees, random forests | |
| 11/2 | — | | **Midterm Kaggle (semi-supervised) due** |
| 11/4 | L17 | Distribution shift + neural networks I | |
| 11/9 | L18 | Neural networks II | |
| 11/11 | L19 | Training MLPs, regularization, tricks | |
| 11/16 | L20 | Dropout + CNNs | |
| 11/18 | L21 | CNNs II | **HW4 due** |
| 11/23 | L22 | Guest: attention, diffusion | |
| 11/30 | L23 | Reinforcement learning I | |
| 12/2 | L24 | Reinforcement learning II | |
| 12/7 | L25 | Guest TBD | **HW5 due** |
| 12/17 | — | | **Final project due** |

Material in the repo as of 2026-10-06: L1–L10 slides, 5 code companions, the Naive Bayes spam exercise + solution, the "lecture10 unsupervised" companion, HW1 and HW2 with solutions and data. Added 2026-10-14: HW3 assignment. Added 2026-10-18 (commit c40676b): L11 and L12 slides, the "lecture11,13-GMM-and-EM" companion, and a second copy of the lecture10 companion under `Code Companions/`.

## Unit map

Units are defined by **conceptual continuity, not by lecture file boundaries**. Several lectures end mid-argument and the next one finishes it (L4→L5 on step sizes; L6→L7 on ROC/AUC; L8 splits in the middle between regularization and generative models). Slide ranges below are exact.

| # | Unit | Source slides | Companion code | Detail file | Status |
|---|---|---|---|---|---|
| 0 | **Orientation: what machine learning is** | L1 all | — | 01 | planned |
| 1 | **Supervised learning & linear regression** | L2 all; L3 pp. 1–25 | Lecture 2 companion | 01 | planned |
| 2 | **Data-generating distributions, risk & gradient descent** | L3 pp. 26–45; L4 all; L5 pp. 1–16 | Lecture 4 companion (autograd + GD half) | 01, 02 | planned |
| 3 | **Logistic regression & maximum likelihood** | L5 pp. 17–50; L6 pp. 1–25 | Lecture 4 companion (Iris half); L5 companion §1 | 02, 03 | planned |
| 4 | **Evaluating classifiers** | L6 pp. 26–38; L7 pp. 1–11 | L5 companion §2 | 03 | planned |
| 5 | **Divergences, overfitting & regularization** | L7 pp. 12–54; L8 pp. 1–18 | L6 companion (polynomial, ridge/lasso paths) | 03, 04 | planned |
| 6 | **Generative models & Naive Bayes** | L8 pp. 19–43; L9 pp. 1–40 | "Lecture 8" companion (20 Newsgroups NB); spam exercise + solution | 04 | planned — **HW3 priority** |
| 7 | **Gaussian discriminant analysis** | L9 pp. 41–46; L10 pp. 1–21 | — | 04 | planned — **HW3 priority** |
| 8 | **Unsupervised learning & k-means** | L10 pp. 22–49; L11 pp. 1–14 | lecture10 companion (Iris k-means, blobs, elbow) | 04, 06 | 8.1 review; 8.2 draft stub |
| 9 | **Gaussian mixtures & EM** | L11 pp. 15–55; L12 pp. 1–38 | lecture11,13 companion cells 0–41 (GDA warm-up on Iris, EM formulas, GMM holdout log-likelihood) | 06 | draft stubs 9.1–9.4 |
| 10 | **Density estimation, kernels, KNN** | L12 pp. 39–53; L13 (not yet released) | — (L13 part of the lecture11,13 companion pending) | 06 | draft stub 10.1 |
| 11 | Dimensionality reduction & PCA | L14, L16 | | | future |
| 12 | Decision trees & random forests | L16 | | | future |
| 13 | Neural networks & MLPs | L17–L19 | | | future |
| 14 | CNNs | L20–L21 | | | future |
| 15 | Attention, diffusion | L22 | | | future |
| 16 | Reinforcement learning | L23–L24 | | | future |

**Placement of L11–L12 (2026-10-18, VISION R3).** L11 pp. 1–14 finish Unit 8's argument (recap, then how to choose $K$: Iris objectives for $K = 4, 10, 20$, the elbow at $K = 3$, generalization as $P = F + E$, detecting over/underfitting, one poll), so they extend Unit 8 as lesson 8.2. The section divider on L11 p. 15 ("Gaussian Mixture Models: overcoming deficiencies in k-Means") starts Unit 9: the k-means failure cases on pp. 16–24 are paired with GMM fixes on pp. 28–29 and are the GMM's motivation. EM straddles the lecture boundary (L11 pp. 51–55 → L12 pp. 3–30), and L12 pp. 31–38 (GMM holdout log-likelihood) complete the forward pointer on L11 p. 13, so Unit 9 runs to L12 p. 38. L12 p. 39 ("Density Estimation") opens Unit 10, which ends mid-argument on p. 53 (KDE without a formula) and will absorb L13. Unit 9 lessons: 9.1 L11 pp. 15–39 (+ L12 pp. 3–6, recap), 9.2 L11 pp. 40–50 (+ L12 p. 7), 9.3 L11 pp. 51–55 + L12 pp. 8–30, 9.4 L12 pp. 31–38 (L12 pp. 1–2 are title and announcements). Unit 10: 10.1 L12 pp. 39–53.

## Homework bridges

Each unit page ends with a "Ready for HW n?" gate that lists the exact skills the homework needs (see `05-homeworks.md` for the per-problem mapping and the readiness checklists).

| Homework | Due | Needs units | Notes |
|---|---|---|---|
| HW1 | Sep 16 | 1, 2 (+ a tooling primer: numpy, torch, autograd) | Ames housing OLS via sklearn and from-scratch torch GD; Kaggle submission |
| HW2 | Oct 5 | 2, 3, 4, 5 (+ text preprocessing from 6) | R² limit under a linear DGP (posed on an L3 slide); clinical-trial outcome text classification with L1/L2 logistic regression, F1/ROC-AUC/PR-AUC |
| HW3 | Oct 19 | 6, 7 (likely a k-means warm-up from 8) | Professor: "focusing on Naive Bayes and GDA" |
| Midterm Kaggle | Nov 2 | 1–9 | Semi-supervised learning competition, groups of ≤3 (announced L12 p. 2); EM with partly observed $z$ (Unit 9) is the core theory |

## The derivation gap, in one paragraph

Across L2–L10 the slides *state* far more than they *derive*. The only step-by-step derivations on the slides are: the logistic-regression log-likelihood (L5/L6), the coin-flip Bernoulli MLE (L6, with a sign typo), the softmax construction and its K=2 reduction (L6), the Bayes-classifier "drop p(x)" step (L8), and the Naive Bayes / GDA log-likelihood decompositions (L9/L10). Everything else, including the normal equations, convexity of MSE, the steepest-descent argument, the step-size regimes and condition number, the sigmoid derivative and NLL gradient, KL ≥ 0, the ridge closed form, L1 sparsity, the bias–variance decomposition, Laplace smoothing, the GDA MLE, and the shared-covariance ⇒ linear-boundary result, is either stated or absent. Each detail file has a "Derivation gaps" list per lecture; those lists are the platform's derivation backlog. L11–L12 continue the pattern: the slides derive the marginal likelihood, the cluster posterior, and the split of the M-step objective, but only state the weighted M-step closed forms, the soft prior $\phi_k = n_k/n$, and EM's convergence (no Jensen/ELBO argument anywhere).

## Notation conventions to normalize platform-wide

The professor's notation drifts between lectures. Lessons use **one** convention and footnote the slide's variant where it differs:

- Examples indexed $i = 1,\dots,n$ with superscripts $x^{(i)}, y^{(i)}$; features $j = 1,\dots,d$; classes $k = 1,\dots,K$. (Slides variously use $N$, $x_i$, $X_i$, $x(i)$, $x^1$.)
- Parameters $\theta$ (slides sometimes use $w$, $\mathbf{W}$); learning rate $\eta$; iteration superscript $\theta^{(k)}$.
- Design matrix $X \in \mathbb{R}^{n \times d}$ with rows $(x^{(i)})^\top$, so the least-squares objective is $\|X\theta - y\|_2^2$ (the L3 slide writes $\theta^\top X$, which is dimensionally inconsistent).
- $y$ is always the true label and $\hat y = f_\theta(x)$ the prediction. (L7's imported divergence slides use $y$ for output and $d$ for desired; the lesson restates them.)
- Sigmoid $\sigma(z)$; Gaussian noise standard deviation written $\sigma_\varepsilon$ to avoid the clash.
- Bernoulli likelihood in product form $p^{y}(1-p)^{1-y}$, with a note that the slides' additive form $y p + (1-y)(1-p)$ is equal on $\{0,1\}$.
- $\mathcal{N}(\mu, \sigma^2)$ with the second argument a variance; state the convention whenever the slides are ambiguous (the L3 DGP $X \sim N(168, 30)$).
- Naive Bayes: $\psi_{jk} = P(x_j = 1 \mid y = k)$, priors $\phi_k$; code stores `psis[k, j]`.
- k-means objective uses the squared norm $\|x^{(i)} - c_{f(x^{(i)})}\|_2^2$ (the slide omits the square; the mean-update step and sklearn's inertia use the square).
- Gaussian mixtures (L11–L12): latent cluster index $z^{(i)} \in \{1, \dots, K\}$; mixture weights $\phi_k = P_\theta(z = k)$ (the slides' symbol, same as the GDA prior; lessons 7.1 and 8.1 wrote $\pi_k$); means $\mu_k$ (L11 pp. 32–38 write $\boldsymbol u_k$); covariances $\Sigma_k$; responsibilities $r_k^{(i)} = P_{\theta^{(t)}}(z = k \mid x^{(i)})$ (the slides never name them); EM iterates $\theta^{(t)}$ (slides: $\theta_t$); soft counts $n_k = \sum_i r_k^{(i)}$ (not L10's integer $n_k$). Never $j$ for the cluster index (L11 pp. 44, 54 use it).
- Model scores in code: sklearn k-means `score` is minus the inertia $nJ$; `GaussianMixture.score` is the average log-likelihood $\frac1n\sum_i \log p_\theta(x^{(i)})$, a log-density that can be positive.
- Regularization: $\lambda$ multiplies the penalty; sklearn's `alpha` = $\lambda$ and `C` = $1/\lambda$; the $\tfrac{1}{n}$ on the data term changes the meaning of $\lambda$ by a factor of $n$ (L7 p.44 vs p.47).

## Known slide errors (correct silently in lessons; keep as "spot the error" quiz items)

- L2 p.5: s1/s4/s5 diabetes variable glosses are wrong; use the sklearn DESCR (s1 total serum cholesterol, s4 total cholesterol/HDL, s5 log serum triglycerides).
- L3 p.12–13: $\theta^\top X$ for $X\theta$; closed form never written.
- L3 p.37/40: $X \sim N(168, 30)$ is a toy DGP with implausible BMI numbers and an unstated variance/SD convention.
- L4 p.5: $g(\theta)$ for $g(X)$; L4 p.51: $\partial E / d\partial w$.
- L6 p.11: sign error in the coin-flip derivative ($+\#T/(1-\theta)$ should be $-$).
- L6 p.34: raising the threshold *lowers* TPR and FPR (the slide's direction is loose).
- L7 p.21: garbled KL row in the divergence table; L7 p.25: "gradient clipping" described as gradient averaging; L7 p.31: $\epsilon \sim Unif(0,1)$ (the notebook uses $0.1 \cdot \mathcal{N}(0,1)$).
- L9 p.23: $2^{d-1}$ should be $2^d - 1$; L9 p.28/L10: $\phi_K$ means $\phi_k$.
- L10 p.40: k-means objective written with an un-squared norm.
- L11 p.40 (and companion cell 4): $x^{(i)} \in \mathbb R$ should be $\mathbb R^d$.
- L11 p.44: Gaussian normalizer $(2\pi)^{n/2}$ should be $(2\pi)^{d/2}$; cluster index written $j$.
- L11 p.47: "local minima" of a maximized objective should be local maxima; "slip the sum and the log" means split; "easier if $P_\theta(z)$ is known" means if each $z^{(i)}$ is known.
- L11 p.52 / L12 p.9: the M-step is said to maximize "the marginal log-likelihood"; it maximizes the expected complete-data log-likelihood (which cannot decrease the marginal). The E-step wording suggests a hard assignment; it is soft.
- L11 p.54 / L12 p.11: sum limit lowercase $k$ should be $K$. L11 p.55: "Trackable" for tractable.
- L12 pp.21–22: hand-written responsibilities (0.2, 0.18, …) are illustrative, and implausible for points sitting above the yellow mean.
- L12 p.51: "bin width 1" is plotted with width $15/14 \approx 1.07$. L12 p.50: "shifting the bin mean" means shifting the bin edges.
- L12 p.12: partially rendered animation build of L11 p.55 (use L11 p.55).
- L5 companion notebook: FPR written as $FP/(TP+FP)$; should be $FP/(FP+TN)$.
- L6 companion notebook: the lasso-path x-axis is $3500 - \|\theta\|_1$, not a real $\lambda$.
- lecture11,13 companion cell 11: `gda_predictions` multiplies by $\sqrt{(2\pi)^d\lvert\Sigma_k\rvert}$ instead of dividing and computes $-\tfrac12 e^{q}$ instead of $e^{-q/2}$; it is not the GDA rule. Cell 9 uses `np.cov` ($n_k - 1$), not the MLE ($n_k$).

## Notebook ↔ lecture mismatches (so authors attach code to the right unit)

- "Lecture 4 code companion" = L4 autograd/GD **and** L5's Iris logistic regression.
- "L5 code companion" = L6's softmax decision regions **and** L6's evaluation metrics (confusion matrix, ROC, AUC, macro/micro).
- "L6 code companion" produces only **L7** figures (polynomial overfitting, ridge/lasso paths).
- "Lecture 8 Code Companion" implements **L9** (20 Newsgroups, Bernoulli NB).
- "lecture10-unsupervised-learning code companion" = L10's k-means half, then previews under/overfitting in k-means and the elbow method (next lecture). Two byte-identical copies exist: `Lectures/lecture10-unsupervised-learning code companion.ipynb` and `Code Companions/lecture10-unsupervised-learning code companion.ipynb`. L11 pp. 6–13 cover the same ideas on Iris; the notebook uses `make_blobs`.
- "lecture11,13-GMM-and-EM code companion" = L11 pp. 30–48 (multivariate normal, GDA warm-up on Iris's sepal pair, EM formulas as markdown, no EM code) and L12 pp. 31–38 (GMM train vs holdout log-likelihood on `make_blobs`). Cells 35–36, 40–41 are on no released slide; the L13 part is pending until L13 is released. `GaussianMixture` is unseeded, so its printed log-likelihoods differ from the slides'.
