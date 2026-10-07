# Lectures 6–7: MLE, KL divergence, softmax, classification evaluation, divergences, regularization

<!--
  COURSE MAP — generated 2026-10-06 by subject-explorer agents that read every slide
  page visually (equations are images in the PDFs, so text extraction alone misses them).
  This file is the source of truth for lesson authors: it records exactly what the
  professor's slides state vs. derive, her notation, slide errors to correct, Poll
  Everywhere questions (quiz bank seeds), concept-graph edges, and widget ideas.
  Do NOT re-read the PDFs to write a lesson unless this file is ambiguous.
  Source material: "AML Course Material/" in this repo (lectures L1–L10, code companions, HW1–HW2).
-->

# Content Map: Lectures L6 and L7 (CS 5785 Applied ML, Fall 2026, Prof. Kyra Gan)

Source files read in full (every page, visually):
- `AML Course Material/Lectures/L6 MLE & classification Eval.pdf` (38 pages)
- `AML Course Material/Lectures/L7  classification evaluation, choice of divergence, Regularization.pdf` (54 pages)
- the corresponding notebook under `AML Course Material/` (notebook, 26 cells)

Notation convention used throughout this report: I preserve the professor's symbols exactly where they appear on a slide. Where a slide is internally inconsistent (there are several places; all flagged), I say so explicitly rather than silently fixing it. "DERIVED" = the slides show the steps; "STATED-ONLY" = the slides assert the result and the platform must derive it.

---

## L6: MLE and Classification Evaluation (38 pages)

### Summary and place in the course arc
L6 is the hinge between the "how do we fit a model" half of the course (L3-L5: empirical risk, gradient descent, logistic regression) and the "how do we judge a model" half (L7-L8: divergences, overfitting, regularization, cross-validation). It opens by recapping the MLE derivation for logistic regression that L5 ended on, then generalizes maximum likelihood into a *principle* via two worked exercises (a Bernoulli coin flip, and OLS where the Gaussian noise assumption turns MLE into least squares), shows that maximizing likelihood is the same as minimizing KL divergence to the empirical distribution, extends logistic regression to K classes via softmax, and finally pivots to classification evaluation: accuracy, confusion matrix, sensitivity/specificity, precision/recall, F1, and the ROC curve (ending right before AUC, which L7 picks up).

### Learning objectives (stated or clearly implied)
1. State the maximum-likelihood principle and its "the world is a boring place" assumption.
2. Write the likelihood of i.i.d. data under a model $P_\theta(y|X)$, take the log, drop constants, and reduce to a conditional-likelihood objective.
3. Execute the three-step MLE recipe (likelihood -> log -> derivative = 0) on a Bernoulli coin and recognize that the MLE is the empirical frequency.
4. Derive least squares as the MLE of linear regression with Gaussian noise.
5. Recognize the logistic-regression NLL as the KL divergence between the empirical label distribution and the model's, and understand why minimizing KL ≡ minimizing NLL.
6. Derive softmax regression as the multiclass generalization of logistic regression and show it reduces to the sigmoid for K = 2.
7. Convert probabilistic outputs to hard predictions, compute accuracy, and explain when accuracy is uninformative.
8. Read a confusion matrix; define and compute sensitivity, specificity, balanced accuracy, precision, recall, F1; choose between the (precision, recall) and (sensitivity, specificity) pairs.
9. Understand thresholding of class probabilities and the ROC curve as the TPR-FPR trade-off as the threshold varies.

### Ordered concept walkthrough

**p1 — Title.** "Lecture 6 MLE and Classification Evaluation".

**p2 — Recap: Classification vs Regression.** In classification, classes are associated with regions of feature space; the goal is to find boundaries between regions; the output of a classification model represents the probability that a point belongs to a class. Figure: 2-D scatter of red/blue points in $(x_1, x_2)$ with an irregular red region, plus a 3-D schematic of a probability "bump" over a plane. STATED-ONLY (conceptual).

**p3 — The Logistic Function: Properties.** Sigmoid plot of $f(x) = \frac{1}{1+e^{-x}}$ on $x\in[-8,8]$. Bounded between 0 and 1; tends to 1 as $z\to\infty$, 0 as $z\to-\infty$; output interpreted as probability:
$$P_\theta(y=1|x) = \sigma(\theta^T x),\qquad P_\theta(y=0|x) = 1-\sigma(\theta^T x).$$
STATED-ONLY (limits are obvious; the platform can show $\sigma(-z) = 1-\sigma(z)$ and $\sigma'(z) = \sigma(z)(1-\sigma(z))$, which are needed later).

**p4 — Recap: The Maximum Likelihood Principle.** Given $\mathcal{D} = \{(X_i, y_i)\,|\, i = 1,2,\dots,n\}$, choose a model $P_\theta(y|X)$ for the distribution of $y|X$; $\theta$ are the parameters; estimate $\theta$ such that $P_\theta(y|X)$ best "fits" $\mathcal{D}$, hoping it also represents data outside the training set. STATED-ONLY.

**p5 — Defining the "Best fit": Maximum Likelihood.** The data are generated by draws from the distribution. Assumption (highlighted): "The world is a boring place" — the observed data are very typical of the process; consequent assumption: the distribution has a high probability of generating the observed data ("not necessarily true"). So select the distribution with the highest probability of generating the data; it should assign lower probability to less frequent observations and vice versa. STATED-ONLY (philosophical motivation).

**p6 — Estimating the Model: Logistic Regression.** DERIVED. Given $\mathcal{D}$, total probability of the data assuming independence:
$$P\big((X_1,y_1),\dots,(X_n,y_n)\big) = \prod_{i=1}^n P(X_i, y_i) = \prod_{i=1}^n P(y_i|X_i)\,P(X_i) = \prod_{i=1}^n \big[y_i\sigma(\theta^T X_i) + (1-y_i)(1-\sigma(\theta^T X_i))\big]\,P(X_i).$$
Yellow callout at $P(X_i,y_i)$: "Express this term in terms of the things that we know." Note the professor writes the Bernoulli likelihood in *mixture* form $y\sigma + (1-y)(1-\sigma)$, not product form $\sigma^{y}(1-\sigma)^{1-y}$; these agree for $y\in\{0,1\}$ but the subsequent log step silently relies on that (see gaps).

**p7 — Maximum Likelihood Estimation.** DERIVED (up to the final form). Log likelihood:
$$\log P\big((X_1,y_1),\dots,(X_n,y_n)\big) = \sum_i \log\big[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))\big] + \sum_i \log P(X_i).$$
MLE: $\hat\theta = \arg\max_\theta \log P((y_1,X_1),\dots,(y_n,X_n))$. "Focusing on the bits that invoke the parameters":
$$\hat\theta = \arg\max_\theta \log P((y_1|X_1),\dots,(y_n|X_n)) = \arg\max_\theta \sum_i \log[\cdot] = \arg\min_\theta \sum_i -\log\big[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))\big].$$
The step "drop $\sum_i\log P(X_i)$ because it does not depend on $\theta$" is implied (L5 had the annotation "fixing the data. This is a constant!").

**p8–p11 — Maximum Likelihood Exercise: Coin Flip.** DERIVED, worked numerical example. Biased coin with unknown head probability $\theta$; outcomes H or T; observe 6 independent flips $\mathcal{D} = \{x_1,\dots,x_6\} = \{H,T,H,T,T,T\}$; objective: determine $\theta$.
- Step 1 (write the likelihood): $P_\theta(\mathcal{D}) = \prod_{i=1}^6 P_\theta(x_i) = \theta(1-\theta)\theta(1-\theta)(1-\theta)(1-\theta) = \theta^{\#H}(1-\theta)^{\#T} = \theta^2(1-\theta)^4$.
- Step 2 (take log): $\log P_\theta(\mathcal{D}) = \#H\log\theta + \#T\log(1-\theta)$.
- Step 3 (maximize: derivative = 0). Slide p11 writes
$$\frac{\partial \log P_\theta(\mathcal{D})}{\partial\theta} = \frac{\#H}{\theta} + \frac{\#T}{1-\theta} = 0,\qquad \theta^* = \frac{\#H}{\#H+\#T}.$$
**Slide typo:** the derivative of $\#T\log(1-\theta)$ is $-\frac{\#T}{1-\theta}$; the correct stationarity condition is $\frac{\#H}{\theta} - \frac{\#T}{1-\theta} = 0$, which does give $\theta^* = \#H/(\#H+\#T) = 2/6 = 1/3$. Conclusion on slide: "Maximum likelihood of Bernoulli Distribution is the empirical count."
- Figure (p10): "Likelihood of the Data" vs "Parameter Theta" on $[0,1]$; unimodal curve peaking at $\theta\approx 0.333$ with peak value $\approx 0.022$ (indeed $(1/3)^2(2/3)^4 \approx 0.0219$); a dot marks the maximum. On p10 the figure partly occludes the sentence "Maximum likelihood of Bernoulli Distribution is the empirical count" (confirmed from text dump).

**p12–p14 — Maximum Likelihood Exercise: OLS.** DERIVED in outline, with constants hidden. Recall linear regression $y = \theta^T X$; "What is the likelihood of the data?" First make it probabilistic:
$$y = \theta^T X + \epsilon,\qquad \epsilon \sim \mathcal{N}(0,\sigma^2)$$
(the $\epsilon$ and $\mathcal{N}$ glyphs are missing from the rendered slide/text dump due to a font issue; this is the intended equation). Density of $\epsilon$: $P(\epsilon;\sigma) = \frac{1}{\sqrt{2\pi}\sigma}\exp\!\big(-\frac{\epsilon^2}{2\sigma^2}\big)$. "This implies that"
$$P_\theta(y|X) = \frac{1}{\sqrt{2\pi}\sigma}\exp\!\left(-\frac{(y-\theta^TX)^2}{2\sigma^2}\right).$$
Learn $\theta$ by maximum likelihood:
$$-\log P_\theta(y|X;\mathcal{D}) = \sum_{i=1}^n c_1\cdot(y_i - \theta^TX_i)^2 + c_2,\quad\text{for some positive } c_1.$$
"This is the least square objective!" The constants are not given: $c_1 = \frac{1}{2\sigma^2}$, $c_2 = n\log(\sqrt{2\pi}\sigma)$ (platform should derive). Figure (p12): the classic picture of a regression line with Gaussian bells $P(y_i|\theta)$ drawn vertically at $x_1,\dots,x_6$, red predicted $\hat y_i$ on the line, black observed points, green residuals $\epsilon_i$.

**p15 — Maximum Likelihood Estimate.** STATED-ONLY (the key claim of the lecture). Restates $\hat\theta = \arg\min_\theta\sum_i -\log[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))]$ ("note argmin rather than argmax"); "Identical to minimizing the **KL divergence** between the desired output $y$ and actual output $\sigma(\theta^TX)$"; "Maximum likelihood learning of a logistic minimizes the KL divergence between its output and the target output"; "Cannot be solved directly, needs gradient descent" (no closed form; gradient not derived here).

**p16 — KL Divergence.** STATED-ONLY. "KL divergence: measure the distance between two distributions." In logistic regression the objective is to minimize the distance between the desired output $y$ and actual output $\sigma(\theta^TX)$.
$$D(p|q) = \sum_x p(x)\log\frac{p(x)}{q(x)}$$
(professor's notation: single bar $D(p|q)$; the imported figure uses $D_{KL}(P\|Q)$). $p(x), q(x)$: two target distributions we are comparing. Properties: non-negative; $D(p|q) = 0$ iff $p(x) = q(x)$ for all $x$. No proof.

**p17 — KL Divergence (figure).** Top row: two Gaussian pdfs $p(x)$ (blue, centered 0) and $q(x)$ (red, shifted right, $\sigma\approx 1$) → right panel "KL Area to be Integrated": the integrand $p(x)\log\frac{p(x)}{q(x)}$, positive lobe left of 0, negative lobe right, shaded. Bottom row: $p$ fixed and three $q$'s at increasing shifts (≈1, 2, 3) → three integrand curves whose peaks grow (≈0.5, 1.0, 2.0): KL grows with the shift. Demonstrates: KL is an integral of a signed integrand whose total is ≥ 0 and increases with mismatch.

**p18 — KL Divergence & Maximum Likelihood.** STATED-ONLY (substitution). $p(x)\to p(y,x)$: joint distribution of the true label and feature $x$, "constant when data is fixed". $q(x)\to q_\theta(y,x)$: joint distribution of $\hat y$ given the feature $x$ and model parameter $\theta$.
$$\arg\min_\theta D(p|q) = \arg\min_\theta \sum_x p(y,x)\log\frac{p(y,x)}{q_\theta(y,x)}.$$

**p19 — KL Divergence & Maximum Likelihood (handwritten).** Partially DERIVED. 
$$\arg\min_\theta D(p|q) = \arg\min_\theta \sum_{x,y} p(y,x)\log\frac{p(y,x)}{q_\theta(y,x)} = \arg\min_\theta \sum_{(y_i,X_i)\sim P_{y,x}} \frac{1}{N}\big(\log p(y_i,X_i) - \log q_\theta(y_i,X_i)\big) = \arg\min_\theta \sum_{(y_i,X_i)\sim P_{y,x}} -\log q_\theta(y_i,X_i).$$
Handwritten annotations: sum over "possible values that x & y can take"; "weigh each point by $p(y,x)$ || sample from distribution $p(y,x)$ and take the average"; "where $N$ = # of data points"; the sum over $(y_i,X_i)\sim P_{y,x}$ is labeled "empirical distribution"; the $\frac{1}{N}$ is inserted by hand. Yellow box: "To make the same argument for the conditional expectation $p(y|x)$, it is better to use expectations than sum -> see homework." So: the expectation-under-$p$ → empirical-average step (Monte Carlo / LLN) and the conditional version are *assigned as homework*, not derived.

**p20 — Poll Everywhere (MLE).** See quiz section.

**p21 — Recap: In Supervised Learning.** Four summary bullets: MLE is a general principle for defining the objective/loss; it is based on "the world is a boring place"; maximizing total likelihood reduces to maximizing the conditional likelihood of $y$ given $X$; maximizing log-likelihood ≡ minimizing KL between the true label distribution and the predicted label distribution.

**p22–p23 — Multiclass Classification: Softmax Regression.** DERIVED (constructively). Target has $>2$ categories. Naive approach: one linear regression per category, $y_1 = \theta_1^TX,\ y_2 = \theta_2^TX,\ y_3 = \theta_3^TX,\dots$ — same issue as binary: outputs not bounded in $[0,1]$. To make outputs positive, pass each through an exponential: $y_1 = \exp(\theta_1^TX),\ y_2 = \exp(\theta_2^TX),\dots$ (handwritten sketch of $y = e^x$). To make outputs bounded in $[0,1]$, normalize:
$$P(Y = y_i) = \frac{\exp(\theta_i^TX)}{\sum_{j=1}^K \exp(\theta_j^TX)}\quad\text{("AKA the softmax function")}.$$
Code: `from sklearn.linear_model import LogisticRegression; logreg = LogisticRegression(C=1e5, multi_class='multinomial')` (link to sklearn `plot_iris_logistic` example). Note: $C$ in sklearn is inverse regularization strength — ties to L7.

**p24 — Poll (softmax).** See quiz section.

**p25 — Softmax Regression Generalizes Logistic Regression.** DERIVED (short). Apply softmax to binary classification: predict $P(Y=0)$ and $P(Y=1)$ with parameters $\theta_0,\theta_1$. Reparametrization: $\tilde\theta_0 = 0$ and $\tilde\theta_1 = \theta_1 - \theta_0$. Substituting:
$$P(Y=1) = \frac{\exp(\tilde\theta_1 X)}{1+\exp(\tilde\theta_1 X)} = \frac{1}{1+\exp(-\tilde\theta_1 X)}.$$
Why the reparametrization is without loss of generality (softmax is invariant to subtracting a common vector from all $\theta_k$) is not shown.

**p26 — Classification Evaluation (1).** Output of a classifier is $[p_{y_1},\dots,p_{y_K}]$ with $\sum_{i=1}^K p_{y_i} = 1$. MLE optimizes parameters and returns a loss value, but "this value does not tell us how well we are doing in terms of the classification task"; first convert output to a prediction: predicted output = most likely class $\arg\max_i p_{y_i}$. STATED-ONLY.

**p27 — Classification Evaluation (2): Accuracy.** 
$$acc(f) = \frac{1}{n}\sum_{i=1}^n \mathbb{I}\big(f(X^{(i)}) = y^{(i)}\big),$$
$\mathbb{I}(\cdot)$ the indicator (1 if true, 0 otherwise). When is accuracy not informative? When classes are imbalanced; when it is more costly to miss a positive label than a negative. STATED-ONLY.

**p28 — Confusion Matrix for Binary Classification.** Table rows = true class ($y=1$ positive, $y=0$ negative), columns = predicted ($\hat y = 1$, $\hat y = 0$): TP, FN / FP, TN. "Negative or positive refers to the classification our model produces; True or False refers to whether that classification was correct." False positives = Type I errors; false negatives = Type II errors. $\text{Accuracy} = \frac{TP+TN}{TP+FP+TN+FN}$; "or 'accuracy' on each class separately". STATED-ONLY.

**p29 — Confusion matrix numeric example.** Dataset of size 100: TP = 31, FN = 20, FP = 14, TN = 35 (positives = 51, negatives = 49). The slide gives no derived metrics; useful derived values for lessons: accuracy = 66/100 = 0.66; sensitivity = 31/51 ≈ 0.608; specificity = 35/49 ≈ 0.714; balanced accuracy ≈ 0.661; precision = 31/45 ≈ 0.689; F1 = 2(31)/(2·31+14+20) = 62/96 ≈ 0.646; FPR = 14/49 ≈ 0.286.

**p30 — Sensitivity and Specificity.** Confusion matrix with the two *rows* highlighted.
$$\text{Sensitivity} = \frac{TP}{\text{positive class}} = \frac{TP}{TP+FN}\ (\text{AKA recall, true positive rate}),\qquad \text{Specificity} = \frac{TN}{\text{negative class}} = \frac{TN}{FP+TN}\ (\text{true negative rate}),$$
$$\text{Balanced accuracy} = \tfrac12(\text{specificity} + \text{sensitivity}).$$
STATED-ONLY.

**p31 — Precision and Recall.** Confusion matrix with the predicted-positive *column* (blue box) and the positive *row* (red dashed box) highlighted.
$$\text{Precision} = \frac{TP}{\text{predicted positive}} = \frac{TP}{TP+FP}\ (\text{fraction predicted positive truly positive}),\qquad \text{Recall} = \frac{TP}{\text{positive class}} = \frac{TP}{TP+FN}\ (\text{TPR}).$$
Search-engine framing: positives = pages relevant to the user; precision = of pages returned, how many were truly relevant; recall = how many relevant pages did we find; these "don't directly report the performance on negatives". STATED-ONLY.

**p32 — Precision/Recall vs Sensitivity/Specificity.** Precision & recall are useful when we don't care about true negatives (search engine) and only care about identifying correct positives and not missing any. Sensitivity & specificity are useful if negatives also matter (e.g., accurately detecting absence of cancer). STATED-ONLY.

**p33 — F-Score.** Harmonic mean of precision and recall:
$$F_1 = \frac{2}{\frac{1}{\text{precision}} + \frac{1}{\text{recall}}}.$$
Bounded in $[0,1]$; equals 1 at perfect precision and recall; equals 0 if TP = 0. STATED-ONLY (no justification of why harmonic rather than arithmetic mean).

**p34 — Trading off Sensitivity and Specificity.** Suppose true positives matter more than true negatives (cancer: make sure we identify the person). We may output the positive class only on very confident samples. Default threshold for class 1 is output $> 0.5$; we can set it higher or lower; this increases performance on positives and decreases it on negatives (sic — raising the threshold does the opposite; the slide's direction is loose). Most classifiers provide "confidence scores": logistic/softmax regression give class probabilities. STATED-ONLY.

**p35 — Receiver Operating Characteristic (ROC).** The ROC curve plots the true positive rate (TPR) and false positive rate (FPR) as the threshold for labeling a positive varies.
$$\text{TPR} = \text{sensitivity} = \frac{TP}{\text{positive class}} = \frac{TP}{TP+FN},\qquad \text{FPR} = 1-\text{specificity} = 1-\frac{TN}{\text{negative class}} = \frac{FP}{FP+TN}.$$
Confusion matrix with TP and FP cells highlighted (blue/red). STATED-ONLY.

**p36 — ROC on the Iris dataset.** "Suppose we want to improve sensitivity for Class 2 on the Iris dataset": compute $P(y = 2|X)$ for each input; for any threshold $t > 0$ label $X$ as Class 2 if $P(y=2|X) > t$. Small $t$: identify all positives → high TPR and high FPR (many are false). Large $t$: few positives → low TPR, low FPR (only the most confident inputs). STATED-ONLY.

**p37 — ROC Visualization.** Properties: bottom-left corner = predict only negatives, TPR = FPR = 0; top-right = predict only positives, TPR = FPR = 1; blue diagonal = randomly guessing "positive" with $p = $ TPR; ideal classifier = top(-left) corner TPR = 1, FPR = 0. Figure: an orange staircase ROC (sklearn style) from (0,0) to (1,1), dashed blue diagonal; handwritten thresholds along the curve: $t = \infty$ at (0,0), then $t = 0.61, 0.46, 0.4369, 0.4367, 0.41, 0.40, 0.38, 0.36, 0.33, 0.22, 0.18, 0.17, 0.16, 0.02, 0.01, 0.00$ at (1,1) — i.e., thresholds decrease monotonically as we move up/right. Mini confusion matrix with TP/FP highlighted. STATED-ONLY (monotonicity and the diagonal claim are not proven).

**p38 — Poll (evaluation).** See quiz section.

### Running examples and datasets (L6)
- **Coin flip**: $\{H,T,H,T,T,T\}$, $\#H = 2$, $\#T = 4$, $\theta^* = 1/3$, peak likelihood ≈ 0.022.
- **Linear regression with Gaussian noise**: 6 abstract points $x_1..x_6$ in the figure; no numbers.
- **Confusion matrix of size 100**: TP 31, FN 20, FP 14, TN 35.
- **Search engine** (precision/recall framing) and **cancer detection** (sensitivity/specificity and thresholding framing).
- **Iris dataset, Class 2 one-vs-rest** for ROC thresholds (handwritten thresholds listed above); sklearn multinomial logistic regression code with `C=1e5`.

### Figures (L6)
1. p2: 2-D red/blue scatter with region boundary; 3-D probability bump.
2. p3: sigmoid $f(x) = 1/(1+e^{-x})$, $x\in[-8,8]$, $f\in[0,1]$.
3. p10: Bernoulli likelihood $\theta^2(1-\theta)^4$ vs $\theta$ with maximum marked.
4. p12: regression line with vertical Gaussian likelihood bells at each $x_i$ and residuals $\epsilon_i$.
5. p17: two Gaussians + KL integrand (signed, shaded); family of shifted $q$'s + growing integrands.
6. p22: $y = e^x$ sketch.
7. p28–31, p35, p37: confusion-matrix tables with highlighted rows/columns/cells matching each metric.
8. p37: staircase ROC with threshold annotations and diagonal.

### Notation table (L6)
| Symbol | Meaning |
|---|---|
| $\mathcal{D} = \{(X_i,y_i)\}_{i=1}^n$ | training data; $X_i$ feature vector, $y_i$ label; also written $(X^{(i)}, y^{(i)})$ on p27 |
| $n$ (also $N$ on p19) | number of data points |
| $\theta$, $\hat\theta$, $\theta^*$ | parameters; MLE estimate; optimum |
| $\sigma(z) = 1/(1+e^{-z})$ | logistic/sigmoid; $z = \theta^TX$ |
| $P_\theta(y|X)$ | model conditional distribution |
| $P(X_i)$ | marginal of features (constant in $\theta$) |
| $\#H, \#T$ | counts of heads/tails |
| $\epsilon\sim\mathcal{N}(0,\sigma^2)$ | Gaussian noise; $\sigma$ its std (clashes with $\sigma(\cdot)$ sigmoid) |
| $c_1>0, c_2$ | hidden constants in OLS NLL |
| $D(p|q)$, $D_{KL}(P\|Q)$ | KL divergence |
| $p(y,x)$, $q_\theta(y,x)$ | true joint; model joint |
| $P_{y,x}$ | the (empirical) joint distribution sampled from |
| $\theta_1,\dots,\theta_K$; $\tilde\theta_0,\tilde\theta_1$ | per-class softmax parameters; reparametrized binary ones |
| $K$ | number of classes |
| $p_{y_i}$ | predicted probability of class $y_i$ |
| $\mathbb{I}(\cdot)$ | indicator function |
| $acc(f)$ | accuracy of classifier $f$ |
| TP, FN, FP, TN | confusion-matrix cells |
| $\hat y$ | predicted label |
| TPR, FPR | true/false positive rate |
| $t$ | decision threshold on $P(y=2|X)$ |
| $F_1$ | F-score |

### Prerequisite / sticky-note concepts (L6)
- **i.i.d. and the product rule** (p6, p8): independent draws ⇒ joint probability is the product of marginals. Refresher: if events/observations are independent, $P(A_1,\dots,A_n) = \prod P(A_i)$; "identically distributed" means each uses the same $P_\theta$; this is what lets a dataset likelihood factorize into per-example terms.
- **Chain rule / conditional probability** (p6): $P(X,y) = P(y|X)P(X)$. Refresher: conditional probability is defined by $P(y|X) = P(X,y)/P(X)$; rearranging gives the chain rule; it lets us separate what the model explains ($y|X$) from what it does not ($X$).
- **Bernoulli distribution** (p6, p8): $P(x) = \theta^{x}(1-\theta)^{1-x}$ for $x\in\{0,1\}$; mean $\theta$. The slide's mixture form $y\theta + (1-y)(1-\theta)$ is the same function on $\{0,1\}$.
- **Logarithm is monotone; log of product = sum of logs** (p7, p9): maximizing $\log L$ maximizes $L$; turns products into sums, which are easier to differentiate and numerically stable.
- **First-order condition and concavity** (p11): a differentiable function's interior maximum has zero derivative; to confirm a maximum check the second derivative (here $-\#H/\theta^2 - \#T/(1-\theta)^2 < 0$, so the log-likelihood is strictly concave).
- **Gaussian pdf** (p13): $\mathcal{N}(\mu,\sigma^2)$ density $\frac{1}{\sqrt{2\pi}\sigma}e^{-(x-\mu)^2/2\sigma^2}$; a linear shift of a Gaussian is Gaussian, so $y|X\sim\mathcal{N}(\theta^TX,\sigma^2)$.
- **Expectation vs empirical average / law of large numbers** (p19): $\mathbb{E}_{p}[g] \approx \frac1N\sum g(x_i)$ for $x_i\sim p$; justifies replacing the sum over all $(x,y)$ weighted by $p(y,x)$ with the average over the dataset.
- **Entropy / cross-entropy** (p15–19, implicit): $H(p) = -\sum p\log p$; cross-entropy $H(p,q) = -\sum p\log q$; $D(p\|q) = H(p,q) - H(p)$.
- **Jensen's inequality / $\log t \le t - 1$** (p16): needed to prove $D\ge 0$.
- **Argmax / argmin and invariance under positive affine transforms** (p7, p14): $\arg\min_\theta (c_1 g(\theta) + c_2) = \arg\min_\theta g(\theta)$ for $c_1>0$.
- **Exponential function positivity; normalization to a simplex** (p22–23): $e^z>0$; dividing positive numbers by their sum gives a probability vector.
- **Indicator function, Type I/II errors, harmonic mean** (p27–33).

### Derivation gaps (L6)
1. Mixture-form to cross-entropy: show $-\log[y\sigma + (1-y)(1-\sigma)] = -y\log\sigma - (1-y)\log(1-\sigma)$ for $y\in\{0,1\}$ (case analysis), so the NLL is the binary cross-entropy. This is the unstated bridge to "KL divergence."
2. Fix and complete the coin-flip derivative (sign error on p11); verify it is a maximum via the second derivative; handle edge cases $\#H = 0$ or $\#T = 0$.
3. OLS as MLE: exhibit $c_1 = 1/(2\sigma^2)$ and $c_2 = n\log(\sqrt{2\pi}\sigma)$; show the argmin is independent of $\sigma$; optionally derive $\hat\sigma^2 = \frac1n\sum(y_i - \hat\theta^TX_i)^2$ and remark that heavier-tailed noise (Laplace) gives L1 loss instead.
4. KL properties: prove $D(p\|q)\ge 0$ with equality iff $p = q$ (Gibbs' inequality via Jensen or $\log t\le t-1$); note asymmetry $D(p\|q)\ne D(q\|p)$ and that it is not a metric (the slide calls it a "distance").
5. KL ⇒ NLL, rigorously: $D(p\|q_\theta) = \underbrace{\sum p\log p}_{\text{const}} - \mathbb{E}_{p}[\log q_\theta]$; replace the expectation by the empirical average (LLN); for the conditional model write $q_\theta(y,x) = q_\theta(y|x)p(x)$ so $p(x)$ cancels and one gets $\mathbb{E}_{x\sim p}\big[D(p(y|x)\|q_\theta(y|x))\big]$ — exactly the "see homework" item. Also show for one-hot $p$ the KL reduces to $-\log q_\theta(y_i|X_i)$.
6. Logistic-regression gradient: $\nabla_\theta\,\text{NLL} = \sum_i(\sigma(\theta^TX_i) - y_i)X_i$, using $\sigma' = \sigma(1-\sigma)$; convexity of NLL (Hessian $\sum_i\sigma_i(1-\sigma_i)X_iX_i^T\succeq 0$), which is why GD works and why there is no closed form.
7. Softmax: show shift invariance ($\theta_k\to\theta_k - c$ for all $k$ leaves probabilities unchanged), hence setting $\tilde\theta_0 = 0$ loses nothing; derive the softmax NLL $-\sum_i\log\frac{e^{\theta_{y_i}^TX_i}}{\sum_j e^{\theta_j^TX_i}}$ (cross-entropy with one-hot targets) and its gradient $\nabla_{\theta_k} = \sum_i\big(P_\theta(k|X_i) - \mathbb{I}[y_i = k]\big)X_i$ — the poll on p24 asserts this is possible but the slides never write it.
8. Metrics: $F_1 = \frac{2PR}{P+R} = \frac{2TP}{2TP+FP+FN}$; why harmonic mean (≤ arithmetic mean, dominated by the smaller of P and R; bound $\min(P,R)\le F_1\le \sqrt{PR}$); balanced accuracy = accuracy under equal class weighting; relationship accuracy = $\pi\cdot$sens + $(1-\pi)\cdot$spec with $\pi$ the positive prevalence (explains why imbalance makes accuracy misleading).
9. ROC: prove TPR and FPR are non-decreasing as $t$ decreases (hence the curve is monotone from (0,0) to (1,1)); prove the random classifier "predict positive with probability $p$ independent of $x$" has TPR = FPR = $p$ (the diagonal); show the staircase structure for finite data (each step moves up by $1/\#\text{pos}$ or right by $1/\#\text{neg}$).
10. Counterexample for the poll: two classifiers with equal accuracy but different sensitivity/specificity (e.g., on the 51/49 split: (TP,FN,FP,TN) = (31,20,14,35) vs (45,6,28,21) both give 66% accuracy).

### Poll Everywhere questions (L6) — with suggested answer keys (my judgment; not shown on slides)
- **p20 "Select all correct statements"**: (a) MLE is a general principle for defining the objective/loss of a supervised ML problem; works beyond logistic regression — TRUE. (b) MLE can always be solved directly without GD — FALSE (logistic regression has no closed form). (c) When deriving the MLE we need to write down the likelihood of data given the model parameters under the modeling assumptions — TRUE. (d) The goal of MLE is to find the parameters within the chosen model class most likely to generate the data; we do so by *maximizing the negative log-likelihood* — FALSE (minimize NLL / maximize LL).
- **p24 "Are the following statements correct?"**: (a) Softmax regression generalizes logistic regression from binary to multiclass — TRUE. (b) We can write down the objective/loss of softmax regression as we did for logistic regression — TRUE. (c) We can optimize softmax parameters using GD — TRUE.
- **p38 "Are the following statements correct?"** (repeated as L7 p7): (a) Classifiers with the same accuracy are guaranteed to have the same sensitivity and specificity — FALSE. (b) It is always a good idea to decompose accuracy — likely intended TRUE (per-class accuracies carry strictly more information; the lecture recommends it), but the word "always" makes it debatable; flag for the instructor. (c) Varying the threshold of the predicted label can change sensitivity and specificity and does not change the model parameters — TRUE. (d) The ROC curve captures the trade-off between sensitivity and specificity as the threshold varies and lies between ideal and random — TRUE (for any classifier better than chance; a curve can dip below the diagonal, which is worth a remark).

### Continuity (L6)
Backward: L5 ended with the exact slides p6–p7 and p15 (MLE for logistic regression and the "needs gradient descent" remark); L6 re-derives them and generalizes. Forward: p28–p38 (confusion matrix through ROC poll) are re-shown verbatim as L7 p2–p7, and L7 continues with AUC. The KL discussion (p15–p19) is the seed of L7's "choice of divergence" section. Softmax (p22–p25) is recapped again in L8 before generative models. Unit grouping suggestion: **Unit "Probabilistic learning": L5 (logistic regression & GD) + L6 (MLE, KL, softmax); Unit "Evaluating & regularizing": L6 p26–38 + L7 + L8**. The natural seam is L6 p26.

### Concept-graph edges (L6; "A -> B" = B depends on A)
- i.i.d. assumption -> likelihood factorization
- conditional probability / chain rule -> likelihood factorization
- Bernoulli distribution -> logistic likelihood
- sigmoid (L5) -> logistic likelihood
- likelihood factorization -> log-likelihood
- log monotonicity -> log-likelihood
- log-likelihood -> MLE principle
- MLE principle -> coin-flip MLE
- first-order condition -> coin-flip MLE
- Gaussian pdf -> OLS likelihood
- linear regression (L2/L3) -> OLS likelihood
- OLS likelihood -> least squares = MLE
- MLE principle -> logistic NLL (cross-entropy)
- logistic NLL -> gradient descent for logistic regression (L5)
- entropy / cross-entropy -> KL divergence
- Jensen's inequality -> KL non-negativity
- KL divergence -> MLE ≡ min KL
- empirical distribution / LLN -> MLE ≡ min KL
- MLE ≡ min KL -> choice of divergence (L7)
- exponential function -> softmax
- logistic regression -> softmax regression
- softmax regression -> softmax reduces to sigmoid (K=2)
- softmax regression -> class probabilities -> argmax prediction
- argmax prediction -> accuracy
- indicator function -> accuracy
- accuracy -> confusion matrix
- confusion matrix -> sensitivity/specificity, precision/recall, Type I/II errors
- sensitivity/specificity -> balanced accuracy
- precision/recall -> F1
- harmonic mean -> F1
- class probabilities -> decision threshold
- decision threshold + sensitivity/specificity -> ROC curve
- ROC curve -> AUC (L7)
- softmax regression -> multiclass metrics (L7), generative models (L8–L10)

### Suggested interactive widgets (L6)
1. **Coin-flip MLE explorer**: enter/flip a sequence; live plot of $\theta^{\#H}(1-\theta)^{\#T}$ and its log; slider for $\theta$ shows the tangent slope; the maximum snaps to $\#H/(\#H+\#T)$.
2. **Gaussian-noise regression ⇒ least squares**: drag a line through points; show vertical Gaussian bells, per-point likelihoods, their product, and the NLL as $c_1\sum r_i^2 + c_2$; slider for $\sigma$ showing the argmin does not move.
3. **KL divergence between two Gaussians / two histograms**: sliders for mean/variance of $q$; shaded signed integrand; readouts $D(p\|q)$ vs $D(q\|p)$ to show asymmetry.
4. **Mixture vs product Bernoulli form**: toggle $y\in\{0,1\}$, see both expressions collapse to the same number.
5. **Softmax playground**: K logits with sliders; bars of $\exp$ and normalized probabilities; a "subtract constant from all logits" button to show invariance; K=2 mode showing the sigmoid.
6. **Confusion-matrix calculator**: editable TP/FN/FP/TN (pre-loaded with 31/20/14/35); live accuracy, sensitivity, specificity, balanced accuracy, precision, recall, F1, FPR; highlight the cells each metric uses (matching the slides' colored boxes).
7. **Threshold slider over two overlapping score histograms** (positives/negatives): moves the cut, updates confusion matrix, traces the ROC point; builds the staircase ROC; a "random classifier" toggle that draws the diagonal.

---

## L7: Classification Evaluation, Choice of Divergence, Regularization (54 pages)

### Summary and place in the course arc
L7 finishes evaluation (AUC-ROC and multiclass macro/micro averaging), then returns to the training objective $\ell(\theta) = \frac1N\sum div(f_\theta(X_i),y_i)$ to ask two questions the course has so far taken for granted: *which divergence* should the loss use (L2 vs KL — and why the answer depends on whether one looks at the loss as a function of the sigmoid output $y$ or of its argument $z$), and *what goes wrong when the model has far more parameters than the data can pin down* (underspecification → overfitting), leading to regularization as "smoothness through weight constraints": L2/ridge (with closed form and GD update), L1/lasso (sparsity), the constrained-optimization view and the ball-vs-diamond geometry. It sets up L8 (cross-validation / model selection) and the later generative-model lectures.

### Learning objectives
1. Define AUC-ROC, its ideal/random values, and its probabilistic interpretation.
2. Extend binary metrics to K classes via one-vs-rest and macro vs micro averaging.
3. Explain what properties make a divergence good for gradient descent (smooth, steep far away, quadratic near optimum).
4. Compare L2 and KL divergences for classification, and explain why KL (cross-entropy) is convex in the logit $z$ but L2-on-sigmoid is not.
5. Define overfitting/underfitting, training vs generalization error, and relate them to model complexity.
6. Explain why large weights produce irregular/steep functions and why constraining weights smooths them.
7. Write L2- and L1-regularized objectives; derive ridge's closed form and gradient; explain lasso's sparsity.
8. Understand $\lambda$ as a hyperparameter chosen on a development set / by cross-validation.
9. Interpret regularization as constrained optimization and read the level-set/constraint-region picture.

### Ordered concept walkthrough

**p1 — Title.**

**p2–p6 — Recap (verbatim from L6 p29, p30, p31+p33, p35, p37).** Confusion matrix with the 31/20/14/35 example; sensitivity/specificity/balanced accuracy; precision/recall ("useful when the negatives don't matter") with $F_1$ on the same slide; ROC definitions; ROC visualization with handwritten thresholds. All STATED-ONLY; see L6.

**p7 — Poll (same four evaluation statements as L6 p38).**

**p8 — Area Under the ROC Curve (AUC-ROC).** STATED-ONLY. "AUC: a single measure of classifier performance." The ideal classifier has AUC-ROC of 1; the random classifier 0.5. Highlighted: **AUC-ROC: 0.8555** for the example curve. "AUC is a unit-free measure of classification — similar to $R^2$ for linear regression." Figure: the same staircase ROC with the area under it shaded orange, the ideal classifier drawn as a magenta path (0,0)→(0,1)→(1,1), dashed diagonal.

**p9 — Poll (AUC).** See quiz section. The first statement *is* the probabilistic interpretation of AUC; it is never derived.

**p10–p11 — Multiclass Generalizations.** STATED-ONLY. Define each class in turn as "positive" ($y=1$) and all others negative ($y=0$); compute sensitivity/specificity per class with the usual formulas; combine in many ways:
$$\text{precision}_{\text{macro}} = \frac1K\sum_{k=1}^K\frac{TP_k}{TP_k+FP_k},\qquad \text{precision}_{\text{micro}} = \frac{\sum_{k=1}^K TP_k}{\sum_{k=1}^K(TP_k+FP_k)}.$$
(macro: average the one-vs-all metrics per class; micro: pool counts across classes.)

**p12–p14 — Recap: loss, training, gradient descent (handwritten).** 
$$\ell(\theta) = \frac1N\sum_{i=1}^N div(f_\theta(X_i),y_i)$$
"Average divergence between true and desired outputs over training inputs; approximation to 'true' risk: expected divergence between desired and true outputs." Handwritten labels on p13: "total loss"; "average over all training instances"; "divergence btw desired output and actual output for a given input $X_i$"; "output of a ML in response to input $X_i$" ($f_\theta(X_i)$); "desired output in response to input $X_i$" ($y_i$); pink box $\hat\theta = \arg\min_\theta\ell(\theta)$. Define a total loss, quantify the difference between desired and actual output as a function of the weights, find the weights that minimize it. p14: minimize via gradient descent,
$$\nabla_\theta\ell(\theta) = \frac1N\sum_{i=1}^N\nabla_\theta div(f_\theta(X_i),y_i)\quad\text{(handwritten: "computed through autograd")},$$
handwritten update $\theta_k = \theta_{k-1} - \eta_k\nabla_\theta\ell(\theta)$ ("solved through gradient descent as"). STATED-ONLY (recap of L3–L4).

**p15 — Training Gradient Descent is an Art.** Vanilla GD easily gets stuck in local minima with small enough step sizes; quality depends on loss-surface shape, initial position, step sizes; online methods (SGD: update after individual random instances; minibatch: after random minibatches) make quicker updates; red: "Require shrinking learning rates to converge." STATED-ONLY.

**p16 — Topics for the day:** Divergence metric; Overfitting.

**p17–p18 — General Approach to Supervised Learning.** Figure: a wavy surface $f(\mathbf{x},\mathbf{W})$ over a 2-D input box with sample points; blue stems = error when the function is below the desired output, black stems = error when above; $E = \sum_i(d_i - f(\mathbf{x}_i,\mathbf{W}))^2$ (imported notation: $d_i$ desired, $\mathbf{W}$ weights). "Define a divergence between the actual output for any parameter value and the desired output; typically L2 or KL; in linear regression MLE = L2 divergence; in logistic regression MLE = KL divergence." p18: convergence of GD depends on the divergence; ideally it has a shape giving a significant gradient in the right direction away from the optimum, to "guide" the algorithm. STATED-ONLY.

**p19–p20 — Desiderata for a Good Divergence.** Three cartoons: a jagged random-walk-like loss (crossed out); a loss with a narrow deep spike (frowning face: flat far away, steep near optimum); a smooth bowl (smiling face). Must be smooth without many poor local optima; low slopes far from the optimum = bad (initial estimates far away take forever); high slopes near the optimum = bad (steep gradients). p20 shows GD trajectories: on the spiky function, tiny steps on the plateau then overshoot in the spike; on the bowl, steady convergence. "Functions that are **shallow** far from the optimum → very small steps, slow convergence; **steep** near the optimum → large steps, overshoot, GD will not converge easily. The best divergence is steep far from the optimum but shallow at the optimum — but not too shallow: ideally quadratic in nature." STATED-ONLY (qualitative).

**p21 — Choices for Divergence in Supervised Learning (table).** Image-only table with handwritten corrections. Columns: regression (desired output $d$) and classification (desired output one-hot $[0,0,\dots,1,\dots,0]$). Rows:
- L2: $Div = \frac12(y-d)^2$ (regression); $Div = \frac12\sum_i(y_i-d_i)^2$ (classification).
- KL: binary/regression cell printed as $Div = -d\log(y) - (1-d)\log(1-y)$; classification cell printed as (cross-entropy) $Div = -\sum_i d_i\log(y_i)$ in the source these slides are adapted from. **Important:** this table uses the imported convention $y$ = model output, $d$ = desired output — opposite to the rest of the course ($y$ = true label). The professor's handwriting *swaps the letters in the KL row* ($d\leftrightarrow y$) to match her convention, but leaves the header "Desired output: $d$" and the L2 row untouched, and the rendered classification KL cell is garbled (it appears as something like $\sum_i y_i\log(d_i) - \sum_i(1-y_i)\log(1-y_i)$ with a missing leading minus). The platform should present this table in one consistent convention: with $y$ = true label and $\hat y = f_\theta(x)$: L2 regression $\frac12(\hat y - y)^2$; L2 classification $\frac12\sum_k(\hat y_k - y_k)^2$; KL/cross-entropy binary $-y\log\hat y - (1-y)\log(1-\hat y)$; multiclass $-\sum_k y_k\log\hat y_k$. Bullets: most common choices are L2 and KL; L2 is popular for numeric prediction/regression; KL for classification. STATED-ONLY.

**p22–p24 — L2 or KL?** Figures (p22, left): "KL as a function of y" — for target $p = 0.5$, $-0.5\log y - 0.5\log(1-y)$ (plotted minus its minimum) on $y\in(0,1)$: U-shaped, flat near 0.5, blowing up to ≈4.5 at the edges. "L2 as a function of y": $\frac12(y-0.5)^2$-like parabola with max 0.25 at the edges. Text: we can also compute L2 between target and actual output probabilities for classification; "both are convex, and L2 may appear more bowl-like and 'nice' (KL appears to flatten badly near the minimum)." p23 (highlighted): "**But as a function of the argument $z$ of the sigmoid, only one of them is convex**": right column shows "KL as a function of z" on $z\in[-10,10]$ — a convex V-ish curve (≈$|z|/2$ asymptotically, smooth at 0), and "L2 as a function of z" — a non-convex inverted-bell: 0 at $z = 0$, saturating at 0.25 for $|z|\gtrsim 5$ (zero gradient when saturated). p24: L2 has long been favored and is appropriate for regression/numeric prediction; KL is better when the intent is classification (output is a probability vector). STATED-ONLY — the convexity claims are shown graphically, not proven.

**p25 — Gradient Descent Revisited.** GD can be sped up by incremental updates (SGD); convergence improved by smoothed updates ("GD clipping: taking the average of the gradient in the last few steps" — the slide's description actually matches momentum/averaging rather than clipping); red: "The choice of divergence affects both the learned parameters and the results." STATED-ONLY.

**p26 — The Problem of Data Underspecification.** "The figures shown to illustrate the learning problem so far were fake news…" (meme image). p27 — Learning a ML algorithm: left, the surface with sample stems; right, only the stems (no surface): "We attempt to learn an entire function from just a few snapshots of it." p28 repeats the general-approach figure. STATED-ONLY.

**p29 — Overfitting.** Figure: dotted blue true function; red vertical bars at 5 sample x-locations; a red learned curve that passes through the samples but collapses to ~0 between them. "ML algorithms may just learn the values of the inputs if the number of parameters in a model is **a lot more than** the true function; learn the red curve instead of the dotted blue one given only the red bars; **the loss on a new unseen datapoint will be large!**" STATED-ONLY.

**p30–p33 — Example: polynomial regression.** 1-D data $\{(x^{(i)},y^{(i)})\}_{i=1}^n$; model
$$f_\theta(x) = \theta_1 + \theta_2x + \theta_3x^2 + \dots + \theta_{p+1}x^p$$
(degree $p$); "compared with linear model, polynomial fits the data better." p31: generate 30 samples from an unknown true generating function `true_fn`; slide says $X,\epsilon\sim Unif(0,1)$ — **the notebook actually uses** $X\sim Unif(0,1)$ and $\epsilon = 0.1\cdot\mathcal{N}(0,1)$ with `true_fn(X) = cos(1.5πX)`; plot of the true cosine and the noisy points on $[0,1]$. p32: fits of degree 1, 2, 3 (data fixed) with learned coefficients boxed in red: degree 1 `[-1.60931179]`; degree 2 `[-7.31956683 5.55955392]`; degree 3 `[-2.19617614 -7.05669992 8.202858]`; panels show the linear fit underfitting, the cubic nearly matching the true function. p33: degree 30: wild oscillations off the data (y clipped to $[-2,2]$) and coefficients of magnitude up to $\sim 10^{12}$ (full array printed on the slide, identical to the notebook output). DERIVED empirically (code), no theory.

**p34 — Poll (generalization).** See quiz section.

**p35 — Underfitting / Optimum / Overfitting curve.** Classic figure: loss vs model complexity; training loss decreasing monotonically; generalization loss U-shaped; dotted vertical line at the optimum. "Underfitting: generalization error could be reduced further by ↓ the training error; happens when training and testing errors are close; model is overly simple. Overfitting: ↓ training error results in ↑ generalization error; training error ≪ testing error; too many model parameters." STATED-ONLY.

**p36 — Overfitting vs Underfitting: Polynomial Regression.** Three panels on the cosine data with light-blue (train) and red (held-out) samples: "Underfitting (Degree 1) Holdout MSE: 0.2060"; "Overfitting (Degree 20) Holdout MSE: 196.2713"; "A Good Fit (Degree 5) Holdout MSE: 0.0134". (Not generated by the companion notebook; needs its own code — a train/holdout split.)

**p37 — repeat of p32.** p38 — Overfitting (2): same figure as p29; "Need additional '**smoothing**' constraints that will 'fill in' the missing regions acceptably → Generalization."

**p39–p41 — Smoothness through Weight Manipulation.** Illustrative binary classifier: 1-D $x$, labels 0/1 as dots on $y = 0$ and $y = 1$ (overlapping in the middle), the "desired" output is a smooth sigmoid (capture statistical/average trends). p40: an unconstrained model models individual instances instead — a purple square-wave that flips 0/1 at every data point ("e.g., running a high-degree polynomial regression first and then passing it through a sigmoid"). p41: plot of $\sigma(wx)$ for $w = 0.5$ (gentle) vs $w = 5$ (near-step) on $x\in[-10,10]$: "Steep changes that enable overfitted responses are facilitated by over-parametrized models with large parameters; constraining the parameters to be low will force smoother output response." STATED-ONLY (the slope-at-origin $w/4$ argument is implicit).

**p42 — Poll (generalization 2).** See quiz section.

**p43 — Objective for Supervised Learning.** Training loss
$$\ell(f_\theta) = \frac1n\sum_{i=1}^n Div\big(y^{(i)}, f_\theta(x^{(i)})\big)\quad\text{(Learning Objective)},\qquad \hat\theta = \arg\min_\theta\ell(f_\theta).$$
"Smoothness through weight constraints: minimize the loss while also minimizing the weights." (Note the order of arguments is now $Div(y, f_\theta(x))$ — true label first.)

**p44 — Smoothness Through Weight Constraints: L2 Regularization.** 
$$\ell(f_\theta) = \frac1n\sum_{i=1}^n Div\big(y^{(i)},f_\theta(x^{(i)})\big) + \underbrace{\tfrac12\lambda\|\theta\|_2^2}_{\text{L2 penalty}},\qquad \|\theta\|_2^2 = \sum_{j=1}^d\theta_j^2.$$
$\lambda$: tunable regularization parameter; increasing $\lambda$ assigns greater importance to shrinking the parameters, making greater error on training data to obtain more acceptable parameters. STATED-ONLY.

**p45 — L2 Regularization Example.** Highlighted: "Uniformly reduces weights to prevent high-degree polynomials from learning irregular functions." Three panels "Dataset sample #0/#1/#2" (three re-sampled 30-point datasets, degree-15 polynomial): blue "No Regularization" curve oscillating wildly vs orange "L2 Regularization" (ridge, `alpha=0.1`) curve smooth; printed: non-regularized first four weights `[-3.02370887e+03 1.16528860e+05 -2.44724185e+06 3.20288837e+07]` vs regularized `[-2.70114811 -1.20575056 -0.09210716 0.44301292]`. Empirical only.

**p46 — How to Choose λ? Hyperparameter Search.** $\lambda$ is a hyperparameter ("a high-level parameter that controls the value of other parameters"); choose the $\lambda$ that performs best on the development set, or by cross-validation ("more on this later" → L8). STATED-ONLY.

**p47 — L2 Regularization in Linear Regression Can be Solved in Closed-Form.** 
$$\ell(\theta) = \tfrac12(X\theta - y)^T(X\theta - y) + \tfrac12\lambda\|\theta\|_2^2;\quad\text{take gradient, set to zero:}\quad \theta^* = (X^TX + \lambda I)^{-1}X^Ty,$$
"$X^TX + \lambda I$: always invertible"; "also known as the ridge regression." STATED-ONLY (gradient steps and invertibility not shown). Note the scaling inconsistency with p44: here there is no $\frac1n$ in front of the data term, so $\lambda$ here corresponds to $n\lambda$ of p44.

**p48 — L2 Regularized Update in Gradient Descent.** 
$$\ell(\theta) = \frac1n\sum_{i=1}^n Div(y^{(i)},f_\theta(x^{(i)})) + \tfrac12\lambda\|\theta\|_2^2,\qquad \nabla_\theta\ell(\theta) = \frac1n\sum_{i=1}^n\nabla_\theta Div(y^{(i)},f_\theta(x^{(i)})) + \lambda\theta^T.$$
STATED-ONLY (the $\theta^T$ reflects a row-gradient convention; the update itself $\theta\leftarrow\theta - \eta(\dots)$ is not written).

**p49 — L1 Regularization (Lasso).** L2 penalty $\frac12\lambda\|\theta\|_2^2$ vs L1 regularization:
$$\ell(\theta) = \frac1n\sum_{i=1}^n Div(y^{(i)},f_\theta(x^{(i)})) + \lambda\cdot\|\theta\|_1,\qquad \|\theta\|_1 = \sum_{j=1}^d|\theta_j|.$$
"Forces weights to decay to zero rather than being small." Optimizers: subgradient descent, coordinate descent, least angle regression, etc. STATED-ONLY.

**p50 — Sparsity.** Definition: a vector is sparse if a large fraction of its entries is zero; Lasso introduces sparsity on $\theta$. STATED-ONLY (why is never explained beyond the p54 picture).

**p51–p52 — UCI diabetes dataset.** p51: "Ridge coefficients as a function of the regularization" — 10 colored lines (one per feature), x = regularization parameter $\lambda$ on a log axis $10^{-5}..10^2$, y = coefficient magnitude in $[-800, 800]$; all curves shrink smoothly toward 0 as $\lambda$ grows, some crossing zero and changing sign along the way, none exactly zero. p52: side-by-side ridge path (log axis) vs "LASSO coefficients as a function of regularization strength λ" (linear x-axis 0..3500): lasso paths are piecewise-linear and hit exactly 0 one by one, staying at 0. "Lasso parameters become progressively smaller; stay at zero when the parameters reach 0." (See notebook notes: the lasso x-axis is a proxy, $3500 - \|\theta\|_1$, not an actual $\lambda$.)

**p53 — Regularizing via Constraints: example.** 
$$\min_{\theta\in\Theta}\frac1n\sum_{i=1}^n Div(y^{(i)},f_\theta(x^{(i)}))\quad\text{such that}\quad\|\theta\|\le\lambda',\qquad \|\cdot\|\text{ either L1 or L2 norm}.$$
STATED-ONLY (equivalence to the penalized form not shown).

**p54 — Constraint-region geometry (handwritten).** Two panels in $(\theta_1,\theta_2)$: nested ellipses = "$\theta$s with constant $\ell(\theta)$ (level sets of $\ell(\theta)$)" labeled $C_1 < C_2 < C_3$ around the unconstrained optimum $\hat\theta$; left: orange disk "$\theta$s with constant l2 norm", handwritten $\|\theta\|_2^2 = \theta_1^2+\theta_2^2\le\lambda'$; right: pink diamond "$\theta$s with constant l1 norm", $\|\theta\|_1 = |\theta_1|+|\theta_2|\le\lambda'$. Handwritten top: $\frac1n\sum_i Div(y^{(i)},f_\theta(x^{(i)})) = C_i$ for some constant $C_i$; bottom: "optimization objective: find the smallest $C_i$ such that [ellipse] intersects [disk] or [diamond]." The visual implication (ellipse tends to touch the diamond at a corner where a coordinate is 0 → sparsity; touches the disk at a generic point → small but nonzero) is left for the viewer. STATED-ONLY.

### Running examples and datasets (L7)
- The 100-sample confusion matrix (31/20/14/35) recap.
- Iris Class-2 ROC with AUC-ROC = **0.8555**.
- Cosine toy dataset: `true_fn(X) = cos(1.5πX)`, $n = 30$, $X\sim Unif(0,1)$ sorted, noise $0.1\cdot\mathcal{N}(0,1)$, `np.random.seed(0)`; degrees 1/2/3/30 with the coefficients listed above; degree-15 ridge demo with seeds 0,1,2 and `Ridge(alpha=0.1)`; train/holdout variant with degrees 1/20/5 and holdout MSE 0.2060 / 196.2713 / 0.0134.
- 1-D binary classification cartoon with $\sigma(wx)$, $w\in\{0.5, 5\}$.
- UCI diabetes dataset (sklearn `load_diabetes`, 10 features, 442 samples) for ridge and lasso coefficient paths.

### Figures (L7)
1. p8: ROC with shaded AUC (0.8555), ideal path in magenta, diagonal.
2. p13–p14: annotated loss formula (handwriting).
3. p17/p28: 3-D surface with signed error stems.
4. p19–p20: three loss-shape cartoons; GD trajectories on spike vs bowl.
5. p22–p23: four plots — KL and L2 vs sigmoid output $y\in(0,1)$ (target 0.5), and vs logit $z\in[-10,10]$.
6. p26: "fake news" meme. p27: surface with stems vs stems only.
7. p29/p38: true (dotted blue) vs overfit (red) curve through 5 red bars.
8. p31: cosine true function with 30 noisy points. p32/p37: degree 1/2/3 fits with coefficient boxes. p33: degree 30 fit with giant coefficients.
9. p35: training vs generalization loss vs complexity.
10. p36: underfit/overfit/good fit with holdout MSE.
11. p39–p41: 1-D classifier dots, smooth sigmoid, square-wave overfit, $\sigma(0.5x)$ vs $\sigma(5x)$.
12. p45: three dataset re-samples, unregularized vs ridge degree-15 fits.
13. p51–p52: ridge path (log-λ) and lasso path (linear proxy axis).
14. p54: level-set ellipses with L2 disk and L1 diamond.

### Notation table (L7, additions to L6)
| Symbol | Meaning |
|---|---|
| $TP_k, FP_k$ | one-vs-rest counts for class $k$ |
| $\text{precision}_{\text{macro/micro}}$ | averaged multiclass precision |
| $\ell(\theta)$, $\ell(f_\theta)$ | training loss (average divergence) |
| $div(\cdot,\cdot)$, $Div(\cdot,\cdot)$ | per-example divergence (argument order varies: $div(f_\theta(X_i),y_i)$ on p12, $Div(y^{(i)},f_\theta(x^{(i)}))$ from p43) |
| $f_\theta(X_i)$ | model output |
| $\eta_k$ | learning rate at step $k$ |
| $d$, $d_i$ | desired output (imported slides p17, p21) |
| $\mathbf{W}$, $f(\mathbf{x}_i,\mathbf{W})$ | weights / model in imported figure |
| $y$ (p22–23) | sigmoid output (imported convention!) ; $z$ its argument (logit) |
| $p$ (p22) | target probability 0.5 |
| $p$ (p30) | polynomial degree; $\theta_1..\theta_{p+1}$ its coefficients |
| $\epsilon$ | noise; `true_fn` the generator |
| $\lambda$ | regularization strength; $\lambda'$ constraint radius |
| $\|\theta\|_2^2 = \sum_j\theta_j^2$, $\|\theta\|_1 = \sum_j|\theta_j|$ | squared L2 norm; L1 norm |
| $d$ (p44) | number of parameters |
| $X$ ($n\times d$), $y$ ($n$-vector), $I$ | design matrix, label vector, identity (p47) |
| $\theta^*$ | ridge solution |
| $w$ | sigmoid slope parameter (p41) |
| $\Theta$ | parameter space; $C_i$ level-set constants |
| MSE | mean squared error on holdout |

### Prerequisite / sticky-note concepts (L7)
- **Area under a curve / Riemann sum** (p8): AUC is the integral of TPR d(FPR); for a staircase it is a sum of rectangles (trapezoids).
- **Probability that a random positive outranks a random negative** (p9): the Mann–Whitney/U-statistic view of AUC.
- **Convexity** (p22–23): $f$ convex iff $f(\lambda a+(1-\lambda)b)\le\lambda f(a)+(1-\lambda)f(b)$, equivalently $f''\ge 0$ in 1-D; convex functions have no spurious local minima so GD converges; composition with a non-affine map (the sigmoid) can destroy convexity.
- **Chain rule and $\sigma'(z) = \sigma(1-\sigma)$** (p23): needed to differentiate losses with respect to $z$.
- **Polynomial basis expansion / linearity in parameters** (p30): $f_\theta(x) = \theta^T\phi(x)$ with $\phi(x) = [1,x,\dots,x^p]$ is linear in $\theta$ so OLS applies.
- **Generalization vs training error; holdout set** (p34–36): train on one subset, measure on an unseen subset to estimate expected loss on new data.
- **Vector norms** (p44, p49): $\|\theta\|_2$, $\|\theta\|_1$, unit balls (disk vs diamond), norms are convex.
- **Matrix calculus** (p47): $\nabla_\theta\frac12\|X\theta-y\|^2 = X^T(X\theta-y)$, $\nabla_\theta\frac12\lambda\|\theta\|^2 = \lambda\theta$.
- **Positive (semi)definiteness, eigenvalues, invertibility** (p47): $X^TX\succeq 0$; adding $\lambda I$ with $\lambda>0$ makes all eigenvalues $\ge\lambda>0$.
- **Subgradient** (p49): $\partial|\theta_j|$ at 0 is $[-1,1]$; optimality means $0\in\partial\ell$.
- **Lagrange multipliers / KKT** (p53–54): a constrained convex problem $\min g(\theta)$ s.t. $h(\theta)\le c$ has the same solution as $\min g(\theta)+\lambda h(\theta)$ for some $\lambda\ge 0$.
- **Level sets** (p54): $\{\theta:\ell(\theta) = C\}$; for a quadratic loss they are ellipses centered at the unconstrained optimum.
- **Hyperparameter vs parameter; development set** (p46).

### Derivation gaps (L7)
1. **AUC as a probability**: prove $\text{AUC} = P(s(X^+) > s(X^-))$ (+½ ties) by writing TPR and FPR as functions of the threshold and integrating; show random scores give ½ and perfectly separable scores give 1; show the staircase AUC equals the fraction of (positive, negative) pairs ranked correctly (Mann–Whitney U).
2. **Micro vs macro**: in single-label multiclass, $\sum_k FP_k = \sum_k FN_k$, hence micro-precision = micro-recall = micro-F1 = accuracy; macro weights classes equally (sensitive to rare classes). Also define macro/micro recall and F1 (slides only show precision).
3. **Convexity of KL vs L2 in $z$**: with $\hat y = \sigma(z)$ and target $d$: $\text{KL}(z) = -d\log\sigma(z) - (1-d)\log(1-\sigma(z))$ has $\frac{d}{dz} = \sigma(z) - d$ and $\frac{d^2}{dz^2} = \sigma(z)(1-\sigma(z))>0$ ⇒ convex, gradient bounded by 1, never vanishes unless $\hat y = d$ (steep far away, quadratic near the optimum — exactly the desiderata of p19–20). $\text{L2}(z) = \frac12(\sigma(z)-d)^2$ has $\frac{d}{dz} = (\sigma-d)\sigma(1-\sigma)\to 0$ as $|z|\to\infty$ (vanishing gradient on the plateaus) and a sign-changing second derivative ⇒ non-convex. This is the real content of "L2 or KL?" and is only shown as pictures.
4. **The "ideal divergence is quadratic" claim** vs GD convergence: relate to the step-size condition $\eta<2/L$ for an $L$-smooth function and to why plateaus ⇒ slow progress and cliffs ⇒ overshoot (ties back to L4).
5. **Why large weights ⇒ irregular functions**: slope of $\sigma(wx)$ at 0 is $w/4$; for polynomials, the Lipschitz constant of $\theta^T\phi(x)$ on $[0,1]$ is bounded by $\|\theta\|\cdot\sup\|\phi'(x)\|$, so bounding $\|\theta\|$ bounds how fast the function can wiggle. The slides call this "an empirical fact."
6. **Ridge closed form**: differentiate $\frac12\|X\theta-y\|^2+\frac12\lambda\|\theta\|^2$, get $(X^TX+\lambda I)\theta = X^Ty$; prove invertibility (for $v\ne 0$, $v^T(X^TX+\lambda I)v = \|Xv\|^2+\lambda\|v\|^2>0$); show strict convexity ⇒ unique minimizer; recover OLS as $\lambda\to 0$ and $\theta\to 0$ as $\lambda\to\infty$; reconcile the $\frac1n$ scaling between p44/p48 and p47 (penalty $\lambda$ on p47 equals $n\lambda$ of p44). Optional: shrinkage view via SVD, $\theta^* = \sum_j\frac{\sigma_j}{\sigma_j^2+\lambda}(u_j^Ty)v_j$, which explains the smooth paths on p51.
7. **L2-regularized GD = weight decay**: $\theta\leftarrow(1-\eta\lambda)\theta - \eta\nabla_\theta\text{(data loss)}$; show the penalty multiplicatively shrinks weights each step.
8. **Why L1 ⇒ sparsity (analytically)**: in the orthonormal-design case the lasso solution is soft-thresholding $\theta_j = \text{sign}(\hat\theta_j)(|\hat\theta_j|-\lambda)_+$ versus ridge $\hat\theta_j/(1+\lambda)$; in general, $\theta_j = 0$ is optimal iff $|\partial_j\text{(data loss)}|\le\lambda$ (subgradient condition) — a whole interval of gradients maps to 0, whereas for ridge only gradient exactly 0 does. Also explain why lasso paths are piecewise linear (LARS) and ridge paths are smooth.
9. **Constrained ⇔ penalized**: Lagrangian/KKT equivalence between $\min\ell$ s.t. $\|\theta\|\le\lambda'$ and $\min\ell+\lambda\|\theta\|$ (monotone map $\lambda'\mapsto\lambda$); prove the level-set/constraint-set tangency condition $\nabla\ell\parallel\nabla\|\theta\|$ (or $\in$ normal cone at a diamond corner), which is the rigorous version of p54's picture.
10. **Bayesian / MAP interpretation — ABSENT from L6–L8 slides** but requested for the platform: $\hat\theta_{MAP} = \arg\max_\theta[\log P(\mathcal{D}|\theta)+\log P(\theta)]$; Gaussian prior $\theta\sim\mathcal{N}(0,\tau^2I)$ with Gaussian noise gives ridge with $\lambda = \sigma^2/\tau^2$; Laplace prior $P(\theta_j)\propto e^{-|\theta_j|/b}$ gives lasso with $\lambda = \sigma^2/b$ (in the p47 scaling). This closes the loop with L6's MLE: regularization = MLE + prior. Should be written as a derived lesson section, clearly marked "beyond the slides".
11. **Training vs generalization curve (p35)**: state and (optionally) derive the bias–variance decomposition of expected squared error to justify the U-shape; define generalization error as $\mathbb{E}_{(x,y)\sim p}[Div(y,f_{\hat\theta}(x))]$ and the holdout estimate as its Monte Carlo approximation (connects to L6 p19 and L7 p12's "true risk").
12. **Direction of the thresholding effect (L6 p34)**: prove raising $t$ weakly lowers both TPR and FPR (improves specificity, hurts sensitivity), correcting the loose wording.

### Poll Everywhere questions (L7) — with suggested answer keys
- **p7**: identical to L6 p38 (see above).
- **p9 "are the following statements correct?"**: (a) For a random positive observation and a random negative observation, the AUC is the likelihood that the model correctly differentiates which is which — TRUE (probabilistic interpretation; derive it). (b) AUC measures the model's discriminative ability — the ability to differentiate between samples with positive and negative labels — TRUE.
- **p34 "Are the following statements on generalization correct?"**: (a) The generalization error measures performance on unseen data and can be approximated by holding out a portion of the data during training — TRUE. (b) By splitting into training and testing sets we can determine whether the current model overfits *the testing dataset* by comparing performance on both — FALSE as worded (we diagnose overfitting to the *training* set; the test set is only a measuring device). (c) Training and generalization error depend on model complexity — TRUE.
- **p42 "Are the following statements on generalization correct?"**: (a) The solution to overfitting is to use 1) more features, 2) a more expensive model family (poly vs linear), 3) better optimization — FALSE (those address underfitting). (b) The solution to underfitting is 1) simpler model class, 2) collect more data, 3) penalize overly complex models — FALSE (those address overfitting). (c) When thought of as global evaluation metrics, overfitting and underfitting cannot happen at the same time — TRUE (globally a model sits on one side of the optimum on p35's curve; locally both can occur in different regions of input space, which is the nuance "global" is excluding).

### Continuity (L7)
Backward: p2–p7 are a verbatim recap of L6 p29–p38; p12–p15 recap L3–L4's loss/GD framework; "MLE = L2 for linear regression, MLE = KL for logistic regression" (p17) is the payoff of L6's two MLE exercises. Forward: p46 defers choosing $\lambda$ to cross-validation (L8 "regularization and model selection", which opens with "Recap: Overfitting" and re-shows the Lasso slides, then K-fold CV); p49–p52 lasso/sparsity are repeated in L8; softmax + Bayes rule in L8 lead into generative models (L9–L10). Suggested unit: **L7 + L8 = "Generalization: divergences, overfitting, regularization, model selection"**, with L6's evaluation half (p26–38) folded in as the unit's opening.

### Concept-graph edges (L7)
- ROC curve (L6) -> AUC-ROC
- integral / Riemann sum -> AUC-ROC
- AUC-ROC -> probabilistic (ranking) interpretation of AUC
- confusion matrix (L6) -> one-vs-rest multiclass metrics
- one-vs-rest metrics -> macro averaging; -> micro averaging
- empirical risk (L3/L4) -> loss as average divergence
- gradient descent (L4) -> SGD / minibatch; -> desiderata for a good divergence
- convexity -> desiderata for a good divergence
- MLE (L6) -> L2 divergence (regression); -> KL divergence (classification)
- KL divergence (L6) -> cross-entropy loss in the divergence table
- sigmoid + chain rule -> convexity of KL in z; non-convexity of L2 in z
- convexity of KL in z -> "KL for classification" recommendation
- polynomial features / linearity in parameters -> polynomial regression example
- polynomial regression example -> overfitting
- data underspecification -> overfitting
- overfitting -> training vs generalization error; -> holdout evaluation
- training vs generalization error -> underfitting/optimum/overfitting curve
- large weights ⇒ steep functions -> smoothness via weight constraints
- vector norms -> L2 penalty; -> L1 penalty
- smoothness via weight constraints -> L2 regularization (ridge); -> L1 regularization (lasso)
- matrix calculus + positive definiteness -> ridge closed form
- ridge closed form -> OLS normal equations (L2/L3) as λ→0
- L2 regularization -> L2-regularized GD update (weight decay)
- subgradient -> lasso optimization; -> sparsity
- L1 regularization -> sparsity -> feature selection
- Lagrange multipliers / KKT -> constrained view of regularization
- constrained view -> ball-vs-diamond geometry -> sparsity (geometric explanation)
- hyperparameter λ -> development set -> cross-validation (L8)
- MLE (L6) + prior -> MAP -> ridge/lasso as MAP (platform addition)
- softmax (L6) -> Bayes rule / generative models (L8–L10)

### Suggested interactive widgets (L7)
1. **ROC + AUC builder**: same overlapping-histogram threshold slider as L6 widget 7, now shading the area and showing the AUC numerically, plus a "sample a random positive and random negative" button that empirically estimates $P(s^+>s^-)$ and converges to the AUC.
2. **Macro vs micro calculator**: editable K×K confusion matrix; per-class TP/FP/FN; macro and micro precision/recall/F1 side by side; a toggle to make one class rare to show the divergence between macro and micro.
3. **Divergence-shape sandbox**: choose a 1-D loss (bowl, spike, plateau, L2-on-sigmoid, KL-on-sigmoid), a start point and a step size; animate GD; show how plateaus stall and cliffs overshoot.
4. **"L2 or KL?" dual-view plot**: target slider $d\in[0,1]$; left panel loss vs $\hat y = \sigma(z)$, right panel loss vs $z$; overlay the derivative; highlight the vanishing-gradient tails of L2 and the convex KL.
5. **Polynomial-degree slider on the cosine data**: degree 0–30, resample noise/seed, show coefficients' magnitudes (log scale) and train vs holdout MSE live; reproduce the 0.2060 / 196.27 / 0.0134 figures.
6. **Weight-magnitude ⇒ steepness**: slider for $w$ in $\sigma(wx)$; and a "high-degree polynomial through a sigmoid" demo that morphs from smooth sigmoid to square wave as $\|\theta\|$ grows.
7. **Ridge vs lasso geometry**: 2-D level-set ellipses (adjustable eccentricity/orientation and $\hat\theta$) with a radius slider $\lambda'$ for the disk or diamond; show the tangency point; counter how often the lasso solution lands on an axis.
8. **Regularization-path explorer** on the diabetes data: $\lambda$ slider; coefficient bars for ridge and lasso; the ridge path on a log axis and the lasso path on a true $\lambda$ axis (fix the notebook's proxy axis); a "non-zero count" readout for sparsity.
9. **Ridge closed-form calculator**: small $X,y$; show $X^TX$, eigenvalues, $X^TX+\lambda I$, and $\theta^*$ as $\lambda$ varies; show $\theta^*\to$ OLS and $\to 0$ at the extremes.
10. **MAP view**: prior-shape slider (Gaussian ↔ Laplace) with the resulting penalty curve $-\log P(\theta)$ overlaid on $\|\theta\|_2^2$ and $\|\theta\|_1$.

---

## Code companion notebook (`Code_Companions__L6_code_companion.ipynb`)

**Title in notebook:** "Lecture 6: Model Evaluation and Generalization Error — Applied Machine Learning — Kyra Gan, Cornell Tech." Despite the "Lecture 6" title, every figure it produces appears in the **L7** slides (p31–p33, p37, p45, p51–p52); nothing from L6's MLE/evaluation content (no coin flip, no confusion matrix, no ROC) is in this notebook.

**Libraries:** `numpy`, `matplotlib.pyplot`, `warnings`, `sklearn.pipeline.Pipeline`, `sklearn.preprocessing.PolynomialFeatures`, `sklearn.linear_model.LinearRegression`, `sklearn.linear_model.Ridge`, `sklearn.linear_model.lars_path`, `sklearn.datasets.load_diabetes`.

**Datasets:** (1) synthetic cosine data: `true_fn(X) = np.cos(1.5*np.pi*X)`, `np.random.seed(0)`, `n_samples = 30`, `X = np.sort(np.random.rand(30))`, `y = true_fn(X) + np.random.randn(30)*0.1`, test grid `X_test = np.linspace(0,1,100)`; (2) UCI diabetes via `load_diabetes(return_X_y=True)` (442×10).

**Sections, key code, outputs, and slide correspondence:**
1. *Review: polynomial functions* — markdown: a degree-$p$ polynomial $a_px^p+\dots+a_1x+a_0$; three plots ($x^2$, $x^3$, $x^3+2x^2+x+1$) on $[-2,2]$. Not on slides.
2. *Polynomial regression as a linear model* — defines the feature map $\phi(x) = [1,x,x^2,\dots,x^p]^T$ and $f_\theta(x) = \sum_{j=0}^p\theta_jx^j = \theta^T\phi(x)$; stresses non-linear in $x$, linear in $\theta$ (so OLS applies). Corresponds to L7 p30 (which indexes coefficients $\theta_1..\theta_{p+1}$ instead of $\theta_0..\theta_p$).
3. *Generate data* — plots the true function, then the 30 noisy samples. → L7 p31 (note the slide's "$X,\epsilon\sim Unif(0,1)$" is inaccurate for $\epsilon$).
4. *Fit degrees 1, 2, 3* — `Pipeline([("pf", PolynomialFeatures(degree, include_bias=False)), ("lr", LinearRegression())])`; prints `linear_regression.coef_`: `[-1.60931179]`, `[-7.31956683 5.55955392]`, `[-2.19617614 -7.05669992 8.202858]`; three-panel figure with true function, model, samples, axes $[0,1]\times[-2,2]$. → L7 p32/p37.
5. *Degree 30* — same pipeline; prints 30 coefficients of magnitude up to $3.5\times10^{12}$; wildly oscillating fit. → L7 p33.
6. *L2 regularization on polynomial regression* — for `idx in 0,1,2`: reseed (`np.random.seed(idx)`), resample 30 points, fit degree-15 `LinearRegression` and degree-15 `Ridge(alpha=0.1)` ("sklearn uses alpha instead of lambda"); plot "No Regularization" vs "L2 Regularization" per "Dataset sample #idx"; prints first four coefficients of the last dataset: unregularized `[-3.02362708e+03 1.16525845e+05 -2.44718111e+06 3.20281169e+07]`, ridge `[-2.70114811 -1.20575056 -0.09210716 0.44301292]` (slide values differ in the 5th significant digit — a different run). Markdown: "It's an empirical fact that in order to define a very irregular function, we need very large polynomial weights. Forcing the model to use small weights prevents it from learning irregular functions." → L7 p45.
7. *Visualizing weights in ridge and lasso* — ridge: `alphas = np.logspace(-5, 2, )` (trailing comma; default `num=50`), loop `Ridge(alpha=a, fit_intercept=False).fit(X,y)`, collect `coef_`, plot vs `alphas` on a log x-axis ("Ridge coefficients as a function of the regularization"). → L7 p51. Lasso: `_, _, lasso_coefs = lars_path(X, y, method='lasso')`; `xx = np.sum(np.abs(lasso_coefs.T), axis=1)` (the L1 norm of the coefficients along the path); plots `lasso_coefs.T` against **`3500 - xx`** labeled "Regularization Strength (lambda)". **Caveat for widget builders:** this x-axis is a monotone proxy (3500 minus the L1 norm), not a true $\lambda$; an honest version should use `lasso_path` with an explicit `alphas` grid. Markdown: "the Ridge model does not produce sparse weights — the weights are never exactly zero." → L7 p52.

**Not in the notebook but on slides:** the holdout-MSE three-panel figure (L7 p36, degrees 1/20/5, MSE 0.2060/196.2713/0.0134) requires a train/holdout split; the ROC/AUC figures (L6 p37, L7 p8, Iris class 2, AUC 0.8555) presumably come from an sklearn `roc_curve`/`roc_auc_score` script on `LogisticRegression` Iris probabilities; the "L2 or KL" plots (L7 p22–23) are MATLAB figures from an external deep-learning course.

**Plots generated (7 figures):** polynomial shapes (3 panels); true cosine; cosine + samples; degree 1/2/3 fits (3 panels); degree-30 fit; ridge vs no-regularization on three datasets (3 panels); ridge path; ridge path + lasso path (2 panels).

---

## Cross-cutting notes for lesson authors
- **Notation drift to normalize platform-wide:** $y$ = true label everywhere *except* the imported slides L7 p17, p21–23 where $y$ = model output and $d$ = desired; argument order of $div/Div$ flips between L7 p12 and p43; $N$ vs $n$; $\sigma$ denotes both the sigmoid and the noise std in L6 p12–14; the gradient on L7 p48 is written as a row vector ($\lambda\theta^T$); the $\frac1n$ factor is present on L7 p44/p48 but absent on p47 (changes the meaning of $\lambda$ by a factor of $n$); sklearn's `alpha` = our $\lambda$ and `C` = $1/\lambda$.
- **Slide errors to correct silently in lessons (but keep as "spot the error" quiz items):** sign in the coin-flip derivative (L6 p11); "$\epsilon\sim Unif(0,1)$" (L7 p31); the garbled KL row in the divergence table (L7 p21); "increase performance on positive samples" direction when raising the threshold (L6 p34); "GD clipping" described as gradient averaging (L7 p25).
- **Items explicitly deferred by the professor:** conditional-expectation version of KL ⇒ NLL ("see homework", L6 p19); cross-validation ("more on this later", L7 p46).
