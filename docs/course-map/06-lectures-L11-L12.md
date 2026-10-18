# Lectures 11–12: Choosing K, Gaussian mixtures, EM, and density estimation

<!--
  COURSE MAP — generated 2026-10-18 by the lecture-ingester agent, which rendered and read
  every slide page visually (equations are images in the PDFs; the PDF text layer was used
  only to cross-check transcriptions). Same template and status as 04-lectures-L8-L10.md:
  this file is the source of truth for lesson authors. It records what the professor's
  slides state vs. derive, her notation, slide errors to correct, Poll Everywhere questions
  (quiz bank seeds), concept-graph edges, and widget ideas.
  Do NOT re-read the PDFs to write a lesson unless this file is ambiguous.
  Source material: "AML Course Material/" (added in commit c40676b).
-->

# Content Map: Lectures L11–L12 (CS 5785 Applied Machine Learning, Fall 2026, Prof. Kyra Gan)

Source files (all pages read visually):
- `AML Course Material/Lectures/L11 K-Means, Unsupervised GMM.pdf` (55 pp.)
- `AML Course Material/Lectures/L12  EM algorithm and density estimation.pdf` (53 pp.; two spaces after "L12" in the file name)
- Notebooks: `AML Course Material/Code Companions/lecture11,13-GMM-and-EM code companion.ipynb` (new; 42 cells). `AML Course Material/Code Companions/lecture10-unsupervised-learning code companion.ipynb` is a byte-identical copy of `AML Course Material/Lectures/lecture10-unsupervised-learning code companion.ipynb`, already mapped in `04-lectures-L8-L10.md` (Notebooks §4); it is not new content.

## Global findings that affect unit design (read first)

1. **Titles.** L11's title slide reads "Lecture 11 K-Means, unsupervised GMM, EM" (the file name omits EM). L12's reads "L12 EM algorithm and density estimation". Both match the 10/7 and 10/14 schedule rows in topic; L12 reaches kernels only on its last slide (p.53, kernel density estimation, no formula), so "kernels" continues into L13.
2. **L11 opens by finishing Unit 8, not by repeating it.** pp.2–5 are a four-slide recap of L10 (unsupervised tasks, two k-means facts that were L10 poll keys, Lloyd's algorithm verbatim from L10 p.47, the Wikipedia animation from L10 p.42). pp.6–14 are new k-means material the existing lesson 8.1 only partly has: choosing $K$ on **Iris** (slides) rather than on blobs (lecture10 companion), the elbow at $K = 3$, "generalization" in unsupervised learning as $P = F + E$, how to detect over- and underfitting without labels, and a poll. The section divider on p.15 ("Gaussian Mixture Models: overcoming deficiencies in k-Means") is where the lecture turns to a new model.
3. **pp.16–24 are framed as GMM motivation.** The k-means failure cases (a duplicated feature, elongated correlated clusters, unequal variances, local minima, no confidence) sit under the GMM section divider and are paired with GMM results on the same data (pp.28–29). They open Unit 9 rather than closing Unit 8.
4. **EM spans the lecture boundary.** L11 pp.51–55 state EM, the E-step formula, and the M-step objective; L12 pp.3–12 re-show L11 pp.29–55 verbatim, then pp.13–30 derive (partially) the M-step and walk an Old Faithful animation by hand. L12 pp.31–38 then evaluate GMMs on a holdout set, completing the "detect overfitting with log-likelihood" bullet left open on L11 p.13. L12 pp.39–53 open density estimation (histograms, then the first KDE slide). Unit boundary: L12 p.39.
5. **Content that is absent and must be authored (see "Derivation gaps").** No proof that EM increases the likelihood (no Jensen, no ELBO; p.30 just says "guaranteed to converge"); no derivation of the weighted M-step formulas ("compute the derivative, set it to zero"); no Lagrange step for $\phi_k$; no discussion of label switching or the unbounded GMM likelihood; no histogram normalization proof; no KDE formula or bandwidth.
6. **Notebook ↔ lecture.** The new "lecture11,13" companion covers L11 pp.40–48 (GDA warm-up on Iris, then EM formulas as markdown only) and L12 pp.31–38 (GMM holdout log-likelihood on `make_blobs`). It never implements EM; it calls `sklearn.mixture.GaussianMixture`. Its GDA prediction function is wrong (see Notebooks). Nothing in it is labeled L13; cells 36, 40, 41 appear on no released slide and are the likeliest L13 material. **L13 is not released: re-map this notebook when it lands.**
7. **HW3 safety (live until 2026-10-19).** HW3 Programming 2(e) asks whether k-means clusters on a two-feature Iris subset differ from GDA's and why. L11 pp.16–29 teach the general reason (k-means favors round, equal-variance clusters; a Gaussian model fits ellipses of different sizes). Lessons may teach that general result; they must not apply it to Iris features or quote Iris cluster/GDA numbers before 2026-10-19. The companion's Iris GDA (cells 7–15) uses the sepal pair; do not reproduce its plots as worked answers until after the due date.

---

## L11: K-Means, Unsupervised GMM, EM (55 pages)

### Summary and place in the course arc
L11 finishes k-means and builds its probabilistic successor. It recaps L10, then asks how to pick $K$: it plots Iris k-means fits for $K = 4, 10, 20$ with falling objectives, states a signal-plus-noise view of generalization ($P = F + E$), shows the elbow curve, and lists how over/underfitting can be detected without labels (accuracy if labels exist; train-vs-holdout log-likelihood if the model is probabilistic). It then catalogues k-means's failures with paired before/after scatterplots (duplicating a feature $M$ times tilts the split; elongated correlated clusters and clusters of unequal variance are cut wrongly) and introduces the Gaussian mixture model as the fix: a latent cluster index $z$, $P(x \mid z = k) = \mathcal N(\mu_k, \Sigma_k)$, $P(z = k) = \phi_k$. It shows that with known $z$ fitting a GMM is GDA, derives that without $z$ the objective becomes the marginal log-likelihood $\frac1n\sum_i \log\sum_z P_\theta(x^{(i)}, z)$, says it has no closed form, gives the posterior $P(z = k \mid x)$ by Bayes' rule, and states EM: E-step soft assignments, M-step maximizing the expected complete-data log-likelihood.

### Learning objectives (stated or clearly implied)
- Read an elbow curve and explain why the k-means objective cannot by itself choose $K$.
- Describe under- and overfitting in unsupervised learning in signal ($F$) and noise ($E$) terms; say how each can be detected with and without labels.
- Explain, with the duplicated-column example, why k-means distances weight features and why correlated or unequal-variance clusters defeat it.
- Define a Gaussian mixture as a latent-variable model $P_\theta(x, z) = P_\theta(x \mid z)P_\theta(z)$ with parameters $\theta = \{\mu_k, \Sigma_k, \phi_k\}_{k=1}^K$.
- Show that a GMM with observed cluster labels is fit exactly as GDA.
- Write the marginal log-likelihood and explain why the log of a sum blocks a closed form.
- Compute the cluster posterior $P_\theta(z = k \mid x)$ with Bayes' rule.
- State the EM algorithm and the M-step objective $\sum_i \sum_k P_{\theta_t}(z = k \mid x^{(i)}) \log P_\theta(x^{(i)}, z = k)$.

### Ordered concept walkthrough

**p.1 – Title.** "Lecture 11 K-Means, unsupervised GMM, EM".

**p.2 – Recap: Unsupervised Learning (STATED).** Verbatim list from L10 pp.22–28: dataset without labels, learn structure; clusters (customer segmentation); outliers ("particularly unusual or interesting datapoints"); denoised signals; dimensionality reduction.

**p.3 – Recap: K-Means (STATED).** "The performance of K-Means is sensitive to the scale of the variables." "K-means performs the best when the variables are uncorrelated (i.e., they form circular clusters) and have the same variances across clusters." These are the keys to L10 p.45(a) and p.49(b), now stated as facts: the course map's suggested keys are confirmed.

**p.4 – k-Means Clustering (algorithm, STATED).** Verbatim L10 p.47: set $k$; randomly select $k$ centroids; repeat: $f(x(i)) = \operatorname{argmin}_k \lVert x(i) - c_k\rVert_2$ ("the cluster of the closest centroid to $x(i)$"); set each $c_k$ to the average of $\{x(i) \mid f(x(i)) = k\}$; terminate when no observation is reassigned. Slide writes $x(i)$ for $x^{(i)}$; the un-squared norm is harmless in an argmin.

**p.5 – Wikipedia animation, "Iteration #0" (figure).** Same frame as L10 p.42: orange + / yellow × / blue ○ clusters, three large centroid markers, black Voronoi boundary lines; axes $[0,1]\times[0.1,0.9]$.

**p.6 – Section divider.** "k-Means Clustering: Selecting the Number of Clusters k".

**p.7 – Iris with $K = 2$ (figure).** "Dataset of Iris flowers", sepal length × sepal width, points coloured by `iris.target` (viridis: purple/teal/yellow), two red diamonds labelled "Probability peaks" at about $(5.2, 3.1)$ and $(6.6, 3.0)$. The code is not shown; by the next slide it is `KMeans(n_clusters=2)` on `iris.data[:,[0,1]]`. (The "Probability peaks" legend is inherited from L10; k-means centroids are not probability peaks, see lesson 8.1.)

**p.8 – Code.** `Ks = [4, 10, 20]`; for each: `cluster.KMeans(n_clusters=k)`, `model.fit(iris.data[:,[0,1]])`, scatter coloured by target, centroids as red diamonds, `score = model.score(iris.data[:,[0,1]])`, title `'K-Means Objective: %.2f' % -score`.

**p.9 – Three panels (EMPIRICAL).** $K = 4$: objective **28.01**; $K = 10$: **9.74**; $K = 20$: **4.22**. The "objective" is sklearn's inertia $= \sum_i \lVert x^{(i)} - c_{z^{(i)}}\rVert_2^2$, i.e. $nJ$ with $n = 150$ in our normalized convention (STYLE_GUIDE §2.1). These are **Iris** numbers; the lecture10 companion ran the same loop on `make_blobs` (L10 map, Notebooks §4, item 7), so the slide's numbers come from no released notebook. Seeds are not shown; treat them as illustrative, not reproducible.

**p.10 – Generalization in Unsupervised Learning (DEFINITION, STATED).** "Generalization measures the performance of predictive models on new, unseen data that is distinct from the training set." "In unsupervised learning, think of data distribution as the sum of two distinct components $P = F + E$": $F$ a signal component ("hidden clusters, speech, low-dimensional data space, etc."), $E$ a random noise component. (Informal: "sum" of distributions is not defined; see gaps.)

**p.11 – Under/overfit (STATED).** "Underfit: does not learn signal F. Generalizes: learns signal F. Overfit: mistaken E for F." (Same text as the lecture10 companion's closing markdown.)

**p.12 – Elbow Method (STATED + figure).** "Plot the objective function as a function of the hyper-parameter $K$. The 'elbow' of the curve happens when its rate of decrease substantially slows down. The 'elbow' is a good guess for the hyperparameter." Plot "Objective Function Value" vs "Number of clusters K", $K = 1..10$, values read off the plot ≈ 130, 58, **37 (red-circled, $K = 3$)**, 28, 21, 17.5, 15, 13, 11, 9.7. $K = 4$ and $K = 10$ agree with p.9, so this is the Iris sepal pair; the elbow lands on $K = 3$, the number of species. (The lecture10 companion's elbow is at $K = 4$ on four blobs; lesson 8.1 uses that one.)

**p.13 – Detecting Overfitting and Underfitting (STATED).** "More difficult to quantify than supervised learning. Performance may depend on our intuition and require human evaluation. If we know the true labels, we can measure the accuracy of the clustering. If not, and the model is probabilistic, can detect overfitting without labels by comparing the log-likelihood between the training set and a holdout set." (The last bullet is executed on L12 pp.31–38.)

**p.14 – Poll (unsupervised learning).** See poll section.

**p.15 – Section divider.** "Gaussian Mixture Models: Overcoming deficiencies in k-Means".

**p.16 – k-Means and Correlation (figure).** "Here's a scatterplot that is particularly well suited to k-Means clustering": "Before" (black) and "After, 2 Clusters" (blue/orange): two round clouds of about 500 points each, centred near $(0, 0)$ and $(5.5, 1)$, axes $x \in [-4, 9]$, $y \in [-3, 3.5]$; k-means splits them perfectly.

**p.17 – Duplicated columns (STATED, the derivation is a gap).** "Suppose I create a new data set with $M+1$ columns where: $x$ is the 1st column; $y$ is repeated in the remaining $M$ columns. After doing this, I run k-Means as before on this new data set. Distance between two points $a$ and $b$ is $\sqrt{\sum_{j=1}^{M+1}(a_j - b_j)^2}$, $j$ is the $j$th column." Not said: this equals $\sqrt{(a_x - b_x)^2 + M(a_y - b_y)^2}$, so duplicating $y$ multiplies its weight by $M$, exactly a rescaling of $y$ by $\sqrt M$.

**p.18 – $M = 1$ vs $M = 30$ (figure).** $M = 1$: the same perfect left/right split. $M = 30$: the boundary is now roughly horizontal at $y \approx 0.5$, cutting **both** clouds into top (orange) and bottom (blue). Lesson: perfectly correlated (duplicated) features silently re-weight the distance; k-means has no notion of correlation.

**p.19 – Question slide (figure).** Three long, thin, parallel clouds along lines of slope ≈ −1 (axes $x \in [-3, 8]$, $y \in [-4, 5]$). "How many clusters do you think there are? What shape are the clusters? Is there strong or weak correlation between the variables within each cluster?" (Intended: three; elongated ellipses; strong negative correlation.)

**p.20 – k-means result: "Rough times" (figure).** "After, 3 Clusters": the three k-means clusters cut **across** the bands (the upper-left ends of two bands are orange, their middles blue, the third band green); k-means cannot follow elongated shapes.

**p.21 – "Another Example" (question slide).** Same three questions on a new cloud: a small tight cluster near $(3, 0)$, a large diffuse one near $(0, 0)$, a medium dense one near $(-3, -3)$.

**p.22 – k-Means and Unequal Variances (figure).** "OK for the most part, but we can spot some rough spots": the outer right edge of the large diffuse cluster is assigned to the small tight cluster (blue), and its lower-left edge to the green one. Reason (not stated): k-means boundaries are perpendicular bisectors between centroids (lesson 8.1, der-8-1-5), so the boundary sits halfway between centres regardless of each cluster's spread.

**p.23 – k-Means and Correlation, summary (STATED).** "k-Means does best when the clusters are 1. circular/spherical shaped (uncorrelated variables); and 2. have the same variances across clusters. Unfortunately, oftentimes clusters are 1. best described by ellipsoids (correlated variables); and/or 2. have different variances. In these situations, k-Means will often not perform well!"

**p.24 – k-Means Other Limitations (STATED).** "Can get stuck at local minima; measuring clustering quality is hard and relies on heuristics; clustering assignment is binary and does not estimate confidence." (= L10 p.49 poll statements (c), (d), (e), now stated: keys confirmed.)

**p.25 – Gaussian Mixture Models (STATED + figures).** "GMMs provide an improved algorithm for clustering when clusters are elliptical and/or may have different variances. Clustering is based upon the multivariate analogue of the normal, or Gaussian, distribution." Figures = L10 p.12 (3-D bell surface on a 100×100 grid, peak ≈ 0.0012; scatter with a green covariance ellipse and red/blue marginal densities on $[-5, 5]^2$).

**p.26 – GMM assumptions (STATED).** "Assume data is generated according to K distinct multivariate normal distributions with **unknown** means, variances, and correlation structure. We don't know which data point came from which distribution. We can find out the values for the means, variances, and correlations that would make the data the most likely to be observed, using the Expectation-Maximization (EM) algorithm."

**p.27 – GMM prediction (STATED).** "Once we have the most likely K clusters, we can calculate the **probability** that an individual is from a given cluster. We assign an individual to the cluster with the highest probability."

**p.28 – Comparing GMMs and k-Means (figure).** Left "k-Means" = p.20 (bands cut across). Right "GMM": each band is its own cluster (blue upper band, orange lower-left band, green right band), with only one stray point near $(3.7, -1.3)$ mis-coloured blue.

**p.29 – Comparing GMMs and k-Means (figure).** Left "k-Means" = p.22. Right "GMM": the diffuse cluster (orange) keeps its own outer points; blue is only the tight cluster; green the lower-left cluster.

**p.30 – Unsupervised Probabilistic Model (DEFINITION, STATED).** "Probability distribution $P_\theta(x): \chi \to [0,1]$. $\theta$: model parameter, e.g., Bernoulli if binary observations, e.g., Gaussian when observations are continuous. Density estimation: learn $P_\theta(x)$ from data to approximate true data generating distribution $P_{data}$." (Codomain $[0,1]$ is right for a pmf; a density can exceed 1. The slide's $\chi$ is $\mathcal X$.)

**p.31 – = p.25 (repeat).**

**p.32 – Multivariate Gaussian (STATED).** "Multivariate Gaussian Distribution $N(\boldsymbol u, \boldsymbol\Sigma)$; $\boldsymbol u$: vector of length $d$ ($u_1$: age; $u_2$: height …); $\boldsymbol\Sigma$: $d$ by $d$ matrix denote the covariance." Same two figures. No density formula (it first appears on p.44).

**p.33 – Covariance Matrix (DEFINITION + figure).** $\mathrm{cov}(X, Y) = \mathrm E[(X - \mathrm E[X])(Y - \mathrm E[Y])]$; the $2\times2$ matrix $\begin{bmatrix} var(x) & cov(x,y) \\ cov(x,y) & var(y)\end{bmatrix}$ with rows/columns labelled $x$, $y$. The scatter quartet of L10 p.14, **now with the matrices printed on each panel**: top-left $\Sigma = \begin{bmatrix}5&4\\4&6\end{bmatrix}$ (tilted up), top-right $\begin{bmatrix}5&-4\\-4&6\end{bmatrix}$ (tilted down), bottom-left $\begin{bmatrix}5&0\\0&1\end{bmatrix}$ (wide), bottom-right $\begin{bmatrix}1&0\\0&5\end{bmatrix}$ (tall); axes $[-10, 10]^2$. **This contradicts the L10 map's note "No matrices given"** (true of L10 p.14 but not of this slide), and lesson 7.1 / node `covariance-quartet` use our own matrices ($\begin{bmatrix}4&3\\3&4\end{bmatrix}$, …). Recommend switching 7.1 to the slide's matrices.

**p.34 – GMM Notation (DEFINITION + annotated figure).** "Let $z$ be the index for clusters. For each cluster $z$, we model the data as a multivariate Gaussian distribution $P(x \mid z = k) = N(\boldsymbol u_k, \boldsymbol\Sigma_k)$, $x, \boldsymbol u_k \in \mathbb R^d$, $\boldsymbol\Sigma_k \in \mathbb R^{d\times d}$." Figure: the p.19 bands, handwritten $z = 1$ (right band), $z = 2$ (upper), $z = 3$ (lower), $(\mu_1, \Sigma_1)$ at the centre of band 1, and "how to learn $(\mu_1, \Sigma_1)$?"

**p.35 – Gaussian Mixture (DEFINITION).** $P_\theta(x, z) = P_\theta(x \mid z) P_\theta(z)$ where $P_\theta(z = k) = \phi_k$; "the parameters $\theta$ are the $\mathbf u_k, \boldsymbol\Sigma_k, \phi_k$ for all $k = 1, 2, \dots, K$". Figures: a 3-D surface with three bumps; a 1-D mixture with three weighted components (blue centred at 0, orange at 2, green at 4) and the red total $p(x)$ (peaks ≈ 0.20, 0.14, 0.27 on $x \in [-6, 6]$).

**p.36 – Unsupervised GMM Setup (STATED).** "K distinct multivariate Gaussian distributions generating data: $P(x \mid z = k) = N(\boldsymbol u_k, \boldsymbol\Sigma_k)$. Unknown means, variances, and correlation structures: need to learn $(\boldsymbol u_k, \boldsymbol\Sigma_k)$. Unlabeled data → unknown cluster mixture: $P_\theta(z = k) = \phi_k$."

**p.37 – GMM Notation (annotated).** As p.34–35 with $P_\theta(x, z = k) = P_\theta(x \mid z = k)P_\theta(z = k)$. Handwritten on the p.29 GMM panel: "(colors)" next to "$z$ is the index"; $Z_1$ (yellow), $Z_2$, $Z_3$ (blue); $\Sigma_1 = \begin{bmatrix}var(x_1) & cov(x_1,x_2)\\ cov(x_1,x_2) & var(x_2)\end{bmatrix}$; $\mu_1 = (x_1, y_1)$ at the yellow centre; "$\phi_1$ = % data points in the yellow cluster".

**p.38 – Unsupervised GMM Learning (STATED).** "Given dataset, find the values for the means, variances, correlations, and cluster proportion that would make the data the most likely to be observed. $P_\theta(x, z = k) = P_\theta(x \mid z = k)P_\theta(z = k)$. Using the EM algorithm to learn $\boldsymbol u_k, \boldsymbol\Sigma_k, \phi_k$. Model postulates that our observed data is comprised of $K$ clusters with proportions specified by $\phi_1, \dots, \phi_K$. Points within each cluster follow a Normal distribution $P(x \mid z = k)\ N(\boldsymbol u_k, \boldsymbol\Sigma_k)$" (the "=" or "∼" is missing on the slide).

**p.39 – Unsupervised GMM Inference (DERIVED, one line).** "Calculate the probability that a datapoint is from a given cluster; assign datapoint to the cluster with the highest probability. $z^{(i)}$ is the cluster label for data point $x^{(i)}$. Cluster assignment probability can be obtained from $P(z^{(i)} \mid x^{(i)})$. Bayes rule."
$$P_\theta(x) = \sum_{k=1}^K P_\theta(z = k)P_\theta(x \mid z = k) = \phi_1\mathcal N(x; \mu_1, \Sigma_1) + \dots + \phi_K\mathcal N(x; \mu_K, \Sigma_K).$$
The notation switches from $\boldsymbol u_k$ to $\mu_k$ here and stays $\mu_k$ to the end of L12.

**p.40 – Warm-Up: Clustering with Known Cluster Assignments (STATED).** $\mathcal D = \{(x^{(1)}, z^{(1)}), \dots, (x^{(n)}, z^{(n)})\}$; "$x^{(i)} \in \mathbb R$ are the datapoints we cluster" (**slide error**: $\mathbb R^d$; the same error is in the companion, cell 4); "$z^{(i)} \in \{1, 2, \dots, K\}$ are the cluster IDs; we will fit a GMM, the $\mu_k$ will represent the cluster centroids. How do we do this?"

**p.41 – GDA (annotated figure).** "If we are provided with the clustering assignment as below, how do we learn the parameters $\mathbf u_k, \boldsymbol\Sigma_k, \phi_k$?" The p.29 GMM panel with the same handwriting as p.37 ($\Sigma_1$ matrix, $\mu_1 = (x_1, y_1)$, "$\phi_1$ = % data points in the yellow cluster").

**p.42 – Gaussian Discriminative Analysis (STATED; recalls L10 pp.15–20).** [Title says "Discriminative"; elsewhere "Discriminant".] $\mathcal D$ as p.40; "fix cluster IDs for sample $x^{(i)}$, $z^{(i)} \in \{1, \dots, K\}$"; objective $\max_\theta \frac1n\sum_{i=1}^n \log P_\theta(x^{(i)}, z^{(i)})$ (a pink handwritten $z$ overwrites the original $y$); "fit a GMM. Let $\mu_k$ represent the cluster centroids: 1. fit $\phi_k$ to be % of each class $k$ in D. 2. fit $\mu_k, \Sigma_k$ to be empirical means and variances of each class $k$. 3. infer the cluster ID $z$ of new points using $P(z \mid x)$."

**p.43 – From Labeled to Unlabeled Clustering (STATED).** "Learn GMM from unlabeled data. Jointly learn cluster parameters and labels: 1. We will define an objective that does not require cluster labels $z^{(i)}$. 2. We will define an optimizer that jointly infers both labels $z^{(i)}$ and cluster parameters $\mu_k, \Sigma_k$." (Same wording as companion cell 17.)

**p.44 – Maximum Marginal Likelihood Learning (STATED; first full Gaussian density on any slide).** "Goal: maximize the total likelihood of the data $\frac1n\sum_{i=1}^n\log P_\theta(x^{(i)})$. Obtain joint probability of $x^{(i)}$ and $z$: $P_\theta(x^{(i)} \mid z)$. From GDA, we kind of know how to write down $P_\theta(x^{(i)} \mid z)$, but get an extra $z$ term when compared with objective."
$$p\big(x^{(i)} \mid z^{(i)} = j; \mu, \Sigma\big) = \frac{1}{(2\pi)^{n/2}\lvert\Sigma_j\rvert^{1/2}}\exp\Big(-\tfrac12\big(x^{(i)} - \mu_j\big)^T\Sigma_j^{-1}\big(x^{(i)} - \mu_j\big)\Big).$$
**Slide error:** $(2\pi)^{n/2}$ should be $(2\pi)^{d/2}$ ($n$ is the number of examples; the exponent is the dimension). The cluster index is $j$ here (our $k$; $j$ is reserved for features).

**p.45 – Marginalize (DERIVED, two lines, with handwritten arrow).** $P_\theta(x^{(i)} \mid z)P_\theta(z) = P_\theta(x^{(i)}, z)$; "Marginalize over the cluster ID $z$": $\sum_{z=1}^K P_\theta(x^{(i)}, z) = P_\theta(x^{(i)})$. An orange loop links the marginal back to $P_\theta(x^{(i)})$ inside the objective.

**p.46 – The marginal log-likelihood (DERIVED).**
$$\frac1n\sum_{i=1}^n\log P_\theta(x^{(i)}) = \frac1n\sum_{i=1}^n\log\sum_{z=1}^K P_\theta(x^{(i)}, z).$$
"This asks $P_\theta$ to assign a high probability to the training data in D. $z$ encodes the cluster id; we ask $P_\theta$ to be high for **at least one** $z$. Need to use $P(x) = \sum_{z\in Z} P(x, z)$ to compute this probability because $z$ is **not observed**."

**p.47 – Optimizing Marginal Likelihood (STATED-ONLY).** $\max_\theta \frac1n\sum_{i=1}^n\log\sum_{z=1}^K P_\theta(x^{(i)}, z)$. "No closed-form solutions because we cannot slip [split] the sum and the log. The objective now has many local **minima**!" (**slide error**: the objective is maximized, so local *maxima*; poll p.50(d) says maxima). "The optimization would have been easier if $P_\theta(z)$ is known" (loose: what would help is knowing each $z^{(i)}$, as p.51 says). "Unknown $P_\theta(z)$: creates dependency between the learned covariate distribution conditioned on the cluster ID $(\mu_k, \Sigma_k)$ and the cluster assignments as they now depend on model parameters. Can best compute $P_\theta(z \mid x^{(i)})$ at each iteration!"

**p.48 – Learn GMM from unlabeled data (STATED).** "Jointly learn cluster parameters and labels: 1. Objective marginalized over the cluster labels $z^{(i)}$. 2. Optimizer jointly infers both labels $z^{(i)}$ and cluster parameters $\mu_k, \Sigma_k$." $\max_\theta\frac1n\sum_i\log\big(\sum_{z\in\mathcal Z}P_\theta(x^{(i)}, z)\big)$. "The above objective is hard to solve, so we use the EM algorithm."

**p.49 – Recovering Clusters from GMMs (DERIVED, Bayes + marginalization).** "Use Bayes rule to calculate the posterior probability. Given a trained GMM model $P_\theta(x, z) = P_\theta(x \mid z)P_\theta(z)$, compute the probability of a point $x$ belonging to class $k$":
$$P_\theta(z = k \mid x) = \frac{P_\theta(z = k, x)}{P_\theta(x)} = \frac{P_\theta(x \mid z = k)P_\theta(z = k)}{\sum_{l=1}^K P_\theta(x \mid z = l)P_\theta(z = l)}.$$
"Probabilistic cluster assignment."

**p.50 – Poll (unsupervised GMM).** See poll section.

**p.51 – EM: Intuition (STATED).** $\max_\theta\frac1n\sum_i\log\big(\sum_{z\in\mathcal Z}P_\theta(x^{(i)}, z)\big)$. "If we know the true $z^{(i)}$ for each $x^{(i)}$, we maximize $\max_\theta\sum_{x^{(i)}, z^{(i)}\in\mathcal D}\log\big(P_\theta(x^{(i)}, z^{(i)})\big)$" (the $\frac1n$ is dropped here). "If we know $\theta$, we can estimate the cluster assignments $z^{(i)}$ for each $i$ by computing $P_\theta(z \mid x^{(i)})$."

**p.52 – EM (algorithm, STATED).** "Randomly initialize $\theta$. Repeat until convergence: (E-step) Given the current estimate $\theta_t$ compute $P_\theta(z \mid x^{(i)})$. Use it to obtain cluster assignment $z^{(i)}$. Similar to making a prediction [in] GDA. (M-step) Find a new $\theta_{t+1}$ that maximizes the marginal log-likelihood by optimizing $P_\theta(z^{(i)}, x^{(i)})$, given the $z^{(i)}$ from E-step. Similar to calculating the mean and covariance for a fixed cluster assignment." Two looseness points for the lesson: (i) the wording reads like a hard assignment, but the E-step on p.54 is soft; (ii) the M-step maximizes the *expected complete-data* log-likelihood (p.55), not the marginal log-likelihood; it only guarantees the marginal does not decrease (gap).

**p.53 – EM animation (figure, from Wikipedia).** Scatter of "Duration" (1–6) vs "Delay" (40–100), yellow × and red +, with two very wide, horizontally elongated Gaussian ellipses near Delay ≈ 79 (yellow, centre ≈ (3.6, 79)) and ≈ 74 (red, ≈ (3.3, 74)): the random initialization. These are Old Faithful eruptions (eruption duration in minutes vs waiting time); the slide does not name the dataset.

**p.54 – E-Step (STATED formula).** "Given the learned/initialized parameters $\boldsymbol\phi, \boldsymbol\mu, \boldsymbol\Sigma$. Assign cluster $z^{(i)}$ in the E-step. $P_{\theta_t}(z \mid x^{(i)})$ defined 'soft' assignment. Compute a vector of class probabilities for each $x^{(i)}$."
$$p\big(z^{(i)} = j \mid x^{(i)}; \phi, \mu, \Sigma\big) = \frac{p(x^{(i)} \mid z^{(i)} = j; \mu, \Sigma)\,p(z^{(i)} = j; \phi)}{\sum_{l=1}^{k}p(x^{(i)} \mid z^{(i)} = l; \mu, \Sigma)\,p(z^{(i)} = l; \phi)}.$$
Upper limit written lowercase $k$ (means $K$); cluster index $j$.

**p.55 – M-Step (DERIVED, one line).** "Given the cluster assignment probabilities $P_{\theta_t}(z \mid x^{(i)})$, we update the model parameters $\boldsymbol\phi, \boldsymbol\mu, \boldsymbol\Sigma$ that maximizes the expected likelihood of the data under this assignment":
$$\theta_{t+1} = \arg\max_\theta\sum_{i=1}^n\mathbb E_{z^{(i)}\sim P_{\theta_t}(z\mid x^{(i)})}\log P_\theta(x^{(i)}, z^{(i)}) = \arg\max_\theta\sum_{i=1}^n\sum_{k=1}^K P_{\theta_t}(z = k \mid x^{(i)})\log P_\theta(x^{(i)}, z = k).$$
Handwritten over the circled weight: "our current inaccurate guess of the cluster likelihood". "Trackable [Tractable] for many interesting models."

### Running examples and datasets
- **Iris**, sepal length × sepal width ($n = 150$): k-means $K = 2$ centroids ≈ (5.2, 3.1), (6.6, 3.0) (p.7); inertia 28.01 / 9.74 / 4.22 at $K = 4/10/20$ (p.9); elbow curve $K = 1..10$ ≈ 130, 58, 37, 28, 21, 17.5, 15, 13, 11, 9.7 with the elbow at $K = 3$ (p.12). Not reproducible from any released notebook.
- **Two round blobs** (~500 points each, centres ≈ (0, 0), (5.5, 1)) and the duplicated-$y$ experiment with $M = 1$ and $M = 30$ (pp.16–18).
- **Three parallel elongated bands** (slope ≈ −1) clustered by k-means vs GMM (pp.19–20, 28, 34).
- **Three clusters of unequal variance** (tight at (3, 0), diffuse at (0, 0), dense at (−3, −3)) clustered by k-means vs GMM (pp.21–22, 29, 37, 41).
- **Covariance quartet with matrices** $\begin{bmatrix}5&4\\4&6\end{bmatrix}$, $\begin{bmatrix}5&-4\\-4&6\end{bmatrix}$, $\begin{bmatrix}5&0\\0&1\end{bmatrix}$, $\begin{bmatrix}1&0\\0&5\end{bmatrix}$ (p.33).
- **1-D three-component mixture** (components at 0, 2, 4) (p.35).
- **Old Faithful** EM initialization frame (p.53).

### Figures to rebuild interactively
1. Iris objective vs $K$ with the elbow at 3 (pp.8–9, 12): slider on $K$, live centroids and inertia.
2. Duplicated-feature experiment (pp.16–18): slider $M = 1..30$, watch the k-means split rotate from vertical to horizontal; show the equivalent rescaling $y \to \sqrt M\,y$.
3. k-means vs GMM on bands and on unequal variances (pp.19–22, 28–29): same data, toggle the method, show the linear bisector boundaries vs the GMM's quadratic boundaries and ellipses.
4. Covariance quartet with the slide's matrices (p.33): edit entries, see the cloud.
5. 1-D mixture builder (p.35) showing weighted components and their sum, and the posterior $P(z = k \mid x)$ curves underneath.
6. EM on Old Faithful-like data from the p.53 initialization (continued in L12).

### Notation table
| Symbol (slide) | Meaning | STYLE_GUIDE §2.1 normalization |
|---|---|---|
| $f(x(i))$, $c_k$ | k-means assignment and centroid | $z^{(i)}$, $c_k$; $x^{(i)}$ |
| "K-Means Objective" in code | sklearn inertia $\sum_i\lVert x^{(i)} - c_{z^{(i)}}\rVert_2^2$ | $nJ$ (we keep $J$ with $\frac1n$) |
| $P = F + E$ | data distribution as signal plus noise | informal; say so |
| $M$ | number of duplicated $y$ columns (p.17) | keep $M$ locally (not a dataset size) |
| $z$, $z^{(i)}$ | latent cluster index of $x^{(i)}$, $z \in \{1..K\}$ | same; $z^{(i)}$ |
| $\boldsymbol u_k$ (pp.32–38), $\mu_k$ (p.39 on) | component mean | $\mu_k$ |
| $\boldsymbol\Sigma_k$ | component covariance | $\Sigma_k$ |
| $\phi_k = P_\theta(z = k)$ | mixing weight | $\phi_k$ (course notation; lesson 7.1 and 8.1 wrote $\pi_k$ for the mixture weight; see "Contradictions") |
| $\theta = \{\mathbf u_k, \Sigma_k, \phi_k\}_k$ | GMM parameters | $\theta$ |
| $N(\boldsymbol u, \boldsymbol\Sigma)$, $\mathcal N(x;\mu_k,\Sigma_k)$, $p(x^{(i)} \mid z^{(i)} = j;\mu,\Sigma)$ | Gaussian (density) | $\mathcal N(x;\mu_k,\Sigma_k)$, second argument a covariance |
| $j$ (pp.44, 54) | cluster index | $k$ ($j$ is the feature index) |
| $P_\theta(x): \chi \to [0,1]$ | unsupervised probabilistic model | $p_\theta(x)$ on $\mathcal X$; densities are not bounded by 1 |
| $P_{data}$ | true data-generating distribution | $P$ (as in Unit 2) or $P_{\text{data}}$ when contrasting with $p_\theta$ |
| $\theta_t$ | EM iterate | $\theta^{(t)}$ |
| $P_{\theta_t}(z \mid x^{(i)})$ | E-step posterior ("soft assignment") | responsibility $r_k^{(i)} = P_{\theta^{(t)}}(z = k \mid x^{(i)})$ (name it once; slides never say "responsibility") |
| $\mathbb E_{z^{(i)}\sim P_{\theta_t}(z\mid x^{(i)})}$ | expectation over the posterior | same |
| $\mathcal Z$, $Z$ | set of cluster ids | $\{1, \dots, K\}$ |

### Prerequisite / sticky-note concepts
- **Law of total probability / marginalization** – pp.39, 45–46. Refresher: $p(x) = \sum_z p(x, z) = \sum_z p(x \mid z)p(z)$ for a discrete $z$. It turns a joint model into a model of what we observe. In a GMM it is what makes the likelihood a log of a sum. (glossary: `mixture-distribution` covers the mixture case; consider a new `law-of-total-probability` term.)
- **Bayes' rule** – pp.39, 49, 54 (glossary `bayes-rule`). Refresher: $p(z \mid x) = p(x \mid z)p(z)/p(x)$ with $p(x)$ from marginalization. The denominator normalizes the $K$ scores. Same computation as GDA prediction (lesson 7.2).
- **Multivariate Gaussian density** – p.44 (glossary `multivariate-gaussian`). Refresher: $\mathcal N(x;\mu,\Sigma) = (2\pi)^{-d/2}\lvert\Sigma\rvert^{-1/2}\exp(-\tfrac12(x-\mu)^\top\Sigma^{-1}(x-\mu))$. The exponent is a quadratic form; contours are ellipses set by $\Sigma$. The power of $2\pi$ is $d/2$, the dimension, not $n/2$.
- **Covariance matrix** – p.33 (glossary `covariance-matrix`). Refresher: diagonal entries are variances, off-diagonal entries covariances; symmetric and PSD. The sign of the off-diagonal sets the tilt. The slide's four matrices are concrete instances.
- **Maximum likelihood / log-likelihood** – pp.42, 44–48 (glossary `maximum-likelihood-estimation`, `log-likelihood`). Refresher: pick $\theta$ maximizing $\frac1n\sum_i\log p_\theta(x^{(i)})$. Logs turn products over IID examples into sums. With observed labels the GMM likelihood splits per class (GDA, lesson 7.2).
- **Expectation of a discrete random variable** – p.55 (glossary `expectation`). Refresher: $\mathbb E_{z\sim q}[g(z)] = \sum_k q(k)g(k)$. The M-step objective is this with $q$ the posterior and $g$ the complete-data log-likelihood. It is a weighted sum, so the weights can be fixed while we optimize.
- **Local optimum / non-convexity** – pp.24, 47 (glossary `local-minimum`, `convex-function`). Refresher: a non-concave objective can have several local maxima; iterative methods stop at one that depends on the start. For mixtures, permuting the component labels gives $K!$ equally good maxima. Restarts help.
- **Euclidean distance and feature weighting** – p.17 (glossary `euclidean-distance`). Refresher: $\lVert a - b\rVert_2^2 = \sum_j(a_j - b_j)^2$ adds features with equal weight. Duplicating a feature $M$ times multiplies its weight by $M$. Rescaling a feature by $s$ multiplies its weight by $s^2$.
- **Train/holdout split** – p.13 (glossary `train-test-split`). Refresher: a quantity optimized on the training set is optimistic there; evaluate on data the fit never saw.

### Derivation gaps (to be derived in full by the platform)
1. **Duplicated features re-weight the distance** (pp.17–18): $\sum_{j=1}^{M+1}(a_j - b_j)^2 = (a_x - b_x)^2 + M(a_y - b_y)^2$, so k-means on the augmented data is k-means on $(x, \sqrt M\,y)$; connect to lesson 8.1's feature-scaling share $s_j^2/\sum_l s_l^2$ (der-8-1-6).
2. **Why k-means fails on unequal variances** (p.22): the boundary between two centroids is their perpendicular bisector (der-8-1-5), independent of cluster spread; the GMM posterior boundary $\{x : \phi_1\mathcal N(x;\mu_1,\Sigma_1) = \phi_2\mathcal N(x;\mu_2,\Sigma_2)\}$ is a quadric that bends around the tight cluster (reuse der-7-3-4).
3. **Elbow curve is non-increasing in $K$** (pp.9, 12) for the *optimal* $J^\star(K)$ (adding a centroid cannot hurt), and is 0 at $K = n$; Lloyd's local optima can violate monotonicity in practice. (Lesson 8.1 states this; link, do not repeat.)
4. **Make $P = F + E$ precise** (p.10): it is a heuristic, not an equation between distributions; one reading is $x = f + \varepsilon$ (a point on the signal plus noise), another is a mixture of a structured part and a diffuse part. Present it as a picture, not a formula.
5. **Training log-likelihood is optimistic; with nested models it is non-decreasing in $K$** (p.13): a $(K+1)$-component mixture contains every $K$-component mixture (set one weight to 0), so the maximum training likelihood cannot fall; the holdout likelihood can. Mirror of training-risk optimism (Unit 2, `training-risk-optimism`).
6. **The Gaussian density with the right normalizer** (p.44): $(2\pi)^{-d/2}$, and its log $-\tfrac d2\log 2\pi - \tfrac12\log\lvert\Sigma_k\rvert - \tfrac12(x-\mu_k)^\top\Sigma_k^{-1}(x-\mu_k)$ (reuse der-7-1-3).
7. **The mixture is the marginal of the joint** (pp.39, 45): one-line law of total probability (reuse der-7-1-6).
8. **Responsibilities by Bayes' rule, computed in log space** (pp.49, 54): $\log r_k^{(i)} = s_k - \log\sum_l e^{s_l}$ with $s_k = \log\phi_k + \log\mathcal N(x^{(i)};\mu_k,\Sigma_k)$ (log-sum-exp; the densities underflow in high $d$).
9. **Why no closed form** (p.47): differentiate $\sum_i\log\sum_k\phi_k\mathcal N(x^{(i)};\mu_k,\Sigma_k)$ in $\mu_k$ to get $\sum_i r_k^{(i)}\Sigma_k^{-1}(x^{(i)} - \mu_k) = 0$, whose solution $\mu_k = \sum_i r_k^{(i)}x^{(i)}/\sum_i r_k^{(i)}$ still contains $\mu_k$ inside $r_k^{(i)}$: a fixed-point equation. Freezing $r$ and solving is exactly EM's M-step; this is the cleanest bridge from p.47 to EM.
10. **Non-concavity and label switching** (p.47; poll p.50(d)): permuting component labels leaves the likelihood unchanged, so any maximum with distinct components has $K!$ copies; the objective cannot be concave. Correct the slide's "local minima" to "local maxima".
11. **The GMM likelihood is unbounded** (beyond the slides): put $\mu_k = x^{(1)}$ and let $\Sigma_k = \sigma^2 I \to 0$; that term grows like $\sigma^{-d}$ while the others stay bounded below, so the "maximum likelihood" does not exist without a floor on $\Sigma_k$ (why sklearn adds `reg_covar`). Same root cause as the singular-covariance node in Unit 7 (`gda-covariance-singularity`).
12. **M-step objective as an expectation** (p.55): $\mathbb E_{z\sim q}\log p_\theta(x, z) = \sum_k q_k\log p_\theta(x, z = k)$; one step, but name the rule.
13. **Why EM increases the marginal likelihood** (absent from both lectures; L12 p.30 "guaranteed to converge" is stated only): for any $q$, $\log p_\theta(x) = \sum_z q(z)\log\frac{p_\theta(x,z)}{q(z)} + D_{\mathrm{KL}}(q\,\|\,p_\theta(\cdot\mid x)) \ge$ ELBO (Jensen, or Gibbs' inequality `gibbs-inequality`); the E-step makes the bound tight at $\theta^{(t)}$, the M-step raises it, so $\log p_{\theta^{(t+1)}}(\mathcal D) \ge \log p_{\theta^{(t)}}(\mathcal D)$. The M-step objective differs from the ELBO only by the entropy of $q$, which does not depend on $\theta$.
14. **k-means is hard EM / the $\sigma\to0$ limit** (pp.24, 52): already proved in lesson 8.1 ("k-means as a limit of a Gaussian mixture", Proof, `kmeans-gmm-limit`); Unit 9 should link back rather than re-derive, and add the hard-EM reading (replace $r$ by its argmax).

### Poll Everywhere questions (verbatim; answers not shown on slides; suggested keys in brackets)
- **p.14 "Are the following questions on unsupervised learning correct?"** (a) "Overfitting in unsupervised learning can be reduced by reducing the model complexity (e.g., reduce $K$ in $K$-Means)" [True]. (b) "Overfitting in unsupervised learning can be reduced by using a probabilistic model and penalizing the number of clusters in the objective function." [True: penalized likelihood such as BIC/AIC; the slides never name these.]
- **p.50 "Are the following questions on unsupervised GMM correct?"** (a) "In GMM clustering, we start by randomly initializing the centers and covariances of the clusters; we then compute the likelihood of each data point belonging to each cluster $P(x^{(i)} \mid z)$." [True as intended: initialize, then evaluate each component density; caveat for the explanation: the weights $\phi_k$ are initialized too, and the E-step goes on to normalize $\phi_k P(x^{(i)} \mid z = k)$ into the posterior $P(z \mid x^{(i)})$.] (b) "We then update the centers and covariances of each cluster by only looking at the points that are more likely to belong to this cluster" [False: the M-step uses **every** point, weighted by its responsibility; using only the more-likely points is hard EM / k-means-style]. (c) "Given the parameters of the learned Gaussian mixtures, we can update the clustering assignment based on Bayes rule $P(z \mid x) = P(x \mid z)P(z)/P(x)$" [True]. (d) "The loss function of the mixture model is non-convex and it has many local maxima, making optimization hard." [True; strictly the log-likelihood is non-concave, and the slide p.47 says "minima".]

### Continuity
Backward: pp.2–5 recap L10 pp.22–28, 45, 47, 49; pp.25, 31–33 re-show L10 pp.12–14 (now with $\Sigma$ printed); pp.40–42 recall GDA (L10 pp.15–20, Unit 7) as the "known labels" special case; p.13 extends L8's train/dev/test idea to unsupervised learning; the duplicated-column example extends L10 p.46's normalization point. Forward: p.13's holdout log-likelihood is executed on L12 pp.31–38; pp.51–55 are re-shown as L12 pp.8–12 and then derived; p.30's "density estimation" heads L12 pp.39–53. The companion's GDA cells (7–15) and EM markdown (18–20) belong here. Midterm Kaggle (semi-supervised, due 11/2): EM with some labeled points is the natural method; lessons 9.2–9.3 should mention that observed $z^{(i)}$ simply fix those points' responsibilities to one-hot (general, not a competition answer).

### Concept-graph edges (A -> B means B depends on A)
Recap k-means (Unit 8) -> Choosing $K$; k-means objective -> Elbow method (Iris version); Generalization (Unit 2/5) -> Unsupervised generalization ($P = F + E$); Unsupervised generalization -> Detecting over/underfitting without labels; Train/holdout split -> Detecting over/underfitting without labels; Euclidean distance -> Duplicated-feature weighting; Feature scaling for k-means -> Duplicated-feature weighting; k-means Voronoi cells -> k-means shape limitations; k-means shape limitations -> GMM for clustering; Multivariate Gaussian + Covariance matrix -> GMM for clustering; Gaussian mixture (Unit 7) -> GMM for clustering; Latent variable -> GMM for clustering; GMM + Bayes rule -> Cluster posterior (responsibility); GDA MLE (Unit 7) -> Known-labels GMM = GDA; Known-labels GMM -> Marginal likelihood; Marginalization -> Marginal likelihood; Marginal likelihood -> No closed form / non-concavity; Responsibility + Known-labels GMM -> EM; Expectation -> M-step objective; k-means (Lloyd) -> EM (generalizes); k-means assignment step <-> E-step (contrasts: hard vs soft).

### Suggested interactive widgets
- **Duplicate-and-cluster** (pp.16–18): two blobs; slider $M$; k-means boundary; readout of the effective weight $M$ on $y$; toggle "rescale $y$ by $\sqrt M$ instead" to show the two are identical.
- **k-means vs GMM** (pp.19–22, 28–29): three preset datasets (round, bands, unequal variances); side-by-side assignments, boundaries, and GMM ellipses; a "seed" control to show both methods' local optima.
- **Posterior painter** (p.49): drag the means and covariances of a 2-component 1-D or 2-D GMM; colour every point by $P(z = 1 \mid x)$; show where the hard assignment flips.
- **Elbow on Iris** (p.12): $K$ slider and the inertia curve; contrast with the holdout log-likelihood curve from L12 p.38.

---

## L12: EM Algorithm and Density Estimation (53 pages)

### Summary and place in the course arc
L12 completes EM and opens density estimation. After an announcement (midterm project soon, teams up to three), pp.3–12 re-show the end of L11 (GMM setup, posterior, EM, E-step, M-step). pp.13–16 then derive the M-step for a GMM: the expected complete-data log-likelihood splits into a class-conditional part and a prior part, each $(\mu_k, \Sigma_k)$ is a Gaussian fitted to all points with weights $P(z = k \mid x^{(i)})$, and $\phi_k$ is the soft class proportion (closed forms stated, not derived). pp.19–28 run one EM iteration by hand on the Old Faithful animation, with illustrative responsibilities. p.18/29 give EM's general definition for any latent-variable model; p.30 lists pros and cons. pp.31–38 measure generalization with train vs holdout log-likelihood on `make_blobs` as $K$ grows. pp.39–42 define density estimation and outlier detection, recap MLE, and pp.43–53 introduce nonparametric estimation: a hand-computed histogram of 20 points from a two-Gaussian mixture, its sensitivity to bin position and width, the curse of dimensionality, and a first look at kernel density estimation (formula deferred to L13).

### Learning objectives
- Derive the GMM M-step from the expected complete-data log-likelihood: the split into $\mu_k, \Sigma_k$ terms and $\phi$ terms, and the weighted-mean, weighted-covariance, and soft-proportion updates.
- Run one EM iteration by hand: compute responsibilities, then the weighted mean and weight of a component.
- State EM for a general latent-variable model and its pros and cons (local optima; posterior may be intractable).
- Use train vs holdout log-likelihood to detect under- and overfitting of a GMM as $K$ varies.
- Define density estimation; use a fitted density for outlier detection.
- Contrast parametric (MLE) and nonparametric density estimation; build a histogram density estimate and normalize it correctly.
- Explain the histogram's limitations (not smooth; depends on bin position and width; cells grow exponentially in $d$) and the idea of kernel density estimation.

### Ordered concept walkthrough

**p.1 – Title.** "L12 EM algorithm and density estimation".

**p.2 – Announcements.** "Midterm project will be released soon. If you want to work with a team up to size three, find group mates now!"

**p.3 – = L11 p.29** (k-means vs GMM, unequal variances). **p.4 – = L11 p.36.** **p.5 – = L11 p.37** (with the handwritten annotations).

**p.6 – GMM for Clustering (DERIVED, one line; variant of L11 p.39).** "$z^{(i)}$ is the cluster label for data point $x^{(i)}$; can be **obtained from model parameters** by calculating $P(z^{(i)} = k \mid x^{(i)}) = \frac{P_\theta(Z = k, X)}{P_\theta(X)}$. Bayes rule." Then $P_\theta(x, z = k) = P_\theta(x \mid z = k)P_\theta(z = k)$ and $P_\theta(x) = \sum_k P_\theta(z = k)P_\theta(x \mid z = k) = \phi_1\mathcal N(x;\mu_1,\Sigma_1) + \dots + \phi_K\mathcal N(x;\mu_K,\Sigma_K)$. (Mixes capital $Z, X$ with lowercase.)

**p.7 – = L11 p.48.** **p.8 – = L11 p.51.** **p.9 – = L11 p.52.** **p.10 – = L11 p.53** (Old Faithful initialization). **p.11 – = L11 p.54** (E-step formula). **p.12 – = L11 p.55, partially rendered** (an animation build: the second line of the M-step equation and most of the "Trackable…" bullet are blank; only a fragment of the handwriting shows). Use L11 p.55 for the content.

**p.13 – Deriving the M-step (DERIVED, partial).** "At the M-step, we optimize the expected log-likelihood of our model."
$$\max_\theta\sum_{x\in D}\mathbb E_{z\sim P_{\theta_t}(z\mid x)}\log P_\theta(x, z) = \max_\theta\Big(\sum_{k=1}^K\sum_{x\in D}P_{\theta_t}(z_k\mid x)\log P_\theta(x\mid z_k) + \sum_{k=1}^K\sum_{x\in D}P_{\theta_t}(z_k\mid x)\log P_\theta(z_k)\Big).$$
Handwritten under the circled weights: "if data were drawn according to our current guess." "As in supervised learning, we can optimize the two terms above separately." The moves (expectation as a weighted sum; $\log$ of a product; exchange of finite sums) are not shown individually. $z_k$ abbreviates $z = k$; the sum runs over $x \in D$ instead of $i$.

**p.14 – Find mean and covariance for each cluster (STATED reduction).** "We will start with $P_\theta(x \mid z = k) = N(x;\mu_k,\Sigma_k)$. Find $\mu_k, \Sigma_k$ that optimize $\max_\theta\sum_{x^{(i)}\in D}P(z = k \mid x^{(i)})\log P_\theta(x^{(i)} \mid z = k)$. This corresponds to fitting a Gaussian to a dataset whose elements $x^{(i)}$ each have a weight $P(z = k \mid x^{(i)})$." (The reason only the $k$-th term matters, that $(\mu_k, \Sigma_k)$ appears in no other term, is the same decomposition argument as L10 p.18; not repeated.)

**p.15 – Closed forms (STATED-ONLY; method named).** "Compute the derivative, set it to zero, and obtain closed form solutions":
$$\mu_k = \frac{\sum_{i=1}^n P(z = k \mid x^{(i)})\,x^{(i)}}{n_k},\qquad \Sigma_k = \frac{\sum_{i=1}^n P(z = k \mid x^{(i)})\,(x^{(i)} - \mu_k)(x^{(i)} - \mu_k)^\top}{n_k},\qquad n_k = \sum_{i=1}^n P(z = k \mid x^{(i)}).$$
"Empirical mean and covariance of the dataset D when each element $x^{(i)}$ has a weight $P(z = k \mid x^{(i)})$." Note $n_k$ is now a **soft count** (a real number), where L10's $n_k$ was an integer class count; with one-hot weights these reduce to the GDA MLE (L10 p.20).

**p.16 – Class priors (STATED-ONLY).** "Similarly, the class priors are $\phi_k = \frac{n_k}{n}$, $n_k = \sum_{i=1}^n P(z = k \mid x^{(i)})$." (The simplex constraint and Lagrange multiplier are not shown; $\sum_k n_k = n$ because each point's responsibilities sum to 1.)

**p.17 – Poll (GMM/EM).** See poll section.

**p.18 – Expectation Maximization: Definition (STATED).** "Formally, EM learns the parameters $\theta$ of a latent-variable model $P_\theta(x, z)$ over a dataset $D = \{x^{(i)} \mid i = 1, 2, \dots, n\}$ as follows. For $t = 0, 1, 2, \dots$ repeat until convergence: (E-Step) For each $x^{(i)} \in D$ compute $P_{\theta_t}(z \mid x^{(i)})$. (M-Step) Compute new weights $\theta_{t+1}$ as $\theta_{t+1} = \arg\max_\theta\sum_{i=1}^n\mathbb E_{z^{(i)}\sim P_{\theta_t}(z\mid x^{(i)})}\log P_\theta(x^{(i)}, z^{(i)})$ using the previous formulas. Each assignment $P_\theta(z \mid x^{(i)})$ are 'soft' → M-step involves an expectation." ("weights" means parameters.)

**pp.19–20 – Step 1 (annotated animation).** Old Faithful frame; handwritten "Step 1: randomly initialize cluster means $\mu_k$, covariance $\Sigma_k$, $P(z = k) = \phi_k$." p.20 is the same frame with the red ellipse whited out by an annotation-eraser artifact (no new content).

**p.21 – E-step (annotated).** "E-step: given $\mu_k, \Sigma_k, \phi_k$, calculate $P(z = k \mid x) = \frac{P(x\mid z)P(z)}{P(x)}$ with $P(x) = \sum_z P(x \mid z)P(z)$." Two circled points: "$P(z = \text{yellow} \mid \text{this point}) = 0.2$" (at about duration 3.3, delay 83) and "$= 0.05$" (about 2.9, 63).

**p.22 – E-step (annotated).** Seven points labelled with yellow responsibilities 0.2, 0.18, 0.19 (upper left of the yellow cloud) and 0.06, 0.08, 0.05, 0.07 (between the clouds). "For the yellow cluster, we can calculate $P(z = \text{yellow} \mid x^{(i)})$ for each data point." "And I can similarly do so for the red cluster." **These numbers are hand-written illustrations, not computed**; points at delay ≈ 83–87, which sit above the yellow mean, would get a yellow responsibility near 1 under the drawn ellipses, not 0.2. A lesson should recompute them from a stated initialization or label them "illustrative".

**p.23 – M step (annotated).** "Given $P(z = \text{yellow} \mid x^{(i)})$ for all $x^{(i)}$ & $P(z = \text{red} \mid x^{(i)})$ for all $x^{(i)}$, update parameters $\mu_{\text{yellow}}, \Sigma_{\text{yellow}}, \phi_{\text{yellow}}$, $\mu_{\text{red}}, \Sigma_{\text{red}}, \phi_{\text{red}}$."

**p.24 – Weighted mean (annotated, DERIVED by example).** Points named $x_1..x_7$ (the slide's subscripts are point labels, not features):
$$\mu_{\text{yellow}} = \frac{0.2x_1 + 0.18x_2 + 0.19x_3 + 0.06x_4 + 0.05x_5 + 0.08x_6 + 0.07x_7 + \cdots}{0.2 + 0.18 + 0.19 + 0.06 + 0.05 + 0.08 + 0.07 + \cdots}$$
with the denominator labelled "data point mass in yellow".

**p.25 – $\mu_k$ formula** (= p.15, mean and $n_k$ only): "Empirical mean of the dataset D when each element $x^{(i)}$ has a weight $P(z = k \mid x^{(i)})$."

**p.26 – (annotated).** "We can similarly calculate $\Sigma_{\text{yellow}}$. What is $\phi_{\text{yellow}}$?" $\phi_{\text{yellow}} = \frac{0.2 + 0.18 + 0.19 + 0.06 + 0.05 + 0.08 + 0.07 + \cdots}{\#\text{ of data points}}$.

**p.27 – $\Sigma_k$ formula** (= p.15) plus $\phi_k = n_k/n$: "Empirical covariance of the dataset D when each element $x^{(i)}$ has a weight $P(z = k \mid x^{(i)})$."

**p.28 – = p.10** (clean animation frame).

**p.29 – = p.18** (EM definition; "using the formulas").

**p.30 – Pros and Cons of EM (STATED-ONLY).** "EM is a very important optimization algorithm in machine learning. Pros: easy to implement and is guaranteed to converge; works in a lot of important ML models. Cons: can get stuck in local optima; may not be able to compute $P_{\theta_t}(z \mid x^{(i)})$ in every model. Considerations: How to choose initial cluster centers?" (Convergence is not proven and is subtler than stated: the likelihood sequence is non-decreasing, but can diverge to $+\infty$ when a component collapses; see gaps.)

**p.31 – Generalization in Probabilistic Models (code).** "Consider the following synthetic dataset generated from 4 Gaussian distributions": `np.random.seed(0)`; `X_all, y_all = datasets.make_blobs(150, centers=4)`; "use the first 100 points as the main dataset" `X, y = X_all[:100], y_all[:100]`; scatter. (= companion cell 23.)

**p.32 – Scatter of the 100 points** ($x \in [-3.2, 4.4]$, $y \in [-0.5, 9.5]$). **p.33 – Same, coloured by true blob** (yellow top-left, green left, purple centre, blue right).

**p.34 – "Generate 50 holdout data points"** (scatter of `X_all[100:]`).

**p.35 – Underfitting (code + output).** "GMM: not capturing all clusters. Can calculate objective on the training and testing data." Code prints `model.score(X)` and `model.score(X_holdout)`: **Training −4.09, Holdout −4.22** ("higher is better"). The model is `GaussianMixture(n_components=2)` (fit code not on the slide; companion cell 30). `score` is the **average** per-point log-likelihood, $\frac1n\sum_i\log p_\theta(x^{(i)})$, matching the slides' $\frac1n$ convention.

**p.36 – Underfitting (figure).** Same printout; scatter coloured by true blob with two red diamond means at about $(-1.75, 5.4)$ and $(1.4, 2.95)$: two components straddle four blobs.

**p.37 – Overfitting: "Increase the number of clusters" (figure).** Three panels (the $K$ values are not printed; counting diamonds gives $K = 4, 10, 20$, as in companion cell 34): Train LL **−3.89** | Holdout LL **−4.09**; **−3.65** | **−4.52**; **−2.92** | **−5.26**. Training log-likelihood rises with $K$; holdout falls after $K = 4$.

**p.38 – Measuring Generalization Using Log-Likelihood (STATED + figure).** "Probabilistic unsupervised models optimize an objective that can be used to detect overfitting and underfitting by comparing performance between training and holdout sets." Plot "Training and Holdout Negative Log-Likelihood (Lower is Better)", $K = 1..24$: training NLL falls from ≈ 4.27 to ≈ 2.1 (not monotone: bumps at $K = 12, 17, 19, 22$); holdout NLL ≈ 4.1–4.3 up to $K \approx 11$, then erratic and rising (≈ 5.5 at 12, 6.0 at 15, 7.4 at 21, 8.0 at 24). Read approximately; seeds of `GaussianMixture` are not fixed.

**p.39 – Density Estimation (DEFINITION, STATED).** "Given a set of data $D = \{x^{(i)} \mid i = 1, 2, \dots, n\}$, estimate the probability distribution of the data. E.g., Gaussian → learning the mean and covariance. GMM: density estimation + clustering."

**p.40 – Application: Outlier Detection (figure).** "Is the red point an outlier or not? Assume data is IID draw from distribution $P_{data}$." The p.34 holdout scatter with a red circle around the point at about $(3.25, 2.85)$ (the point itself is drawn blue).

**p.41 – Density Estimation (STATED + figure).** "Density estimation: approximating $P_{\text{data}}$ with $P_\theta$. Outlier detection: given $x'$, calculate $P_\theta(x')$ to decide whether $x'$ is an outlier." Figure: a 2-D standard-normal-like density surface on $[-3, 3]^2$ (peak ≈ 0.38? the axis tops at 0.4), coloured blue near the peak and red in the low-density tails, implying a density threshold (no threshold rule is given).

**p.42 – How to find $P_\theta$? (STATED; recap of MLE).** "Maximum Likelihood Estimation. Model parametrized by $\theta$. Log-likelihood objective: $\max_\theta\ell(\theta) = \max_\theta\frac1n\sum_{i=1}^n\log P_\theta(x^{(i)})$. Choose $\theta$ that maximizes the probability of seeing my data."

**p.43 – What if we do not want to parametrize the model? (STATED + figure).** "Can we learn the density of $P_{\text{data}}$ from data alone? Yes! We can take a non-parametric approach. Example: Histogram density estimation." Figure: a 3-D histogram (translucent blue bars) over a red 2-D Gaussian surface on $[-2, 3]\times[-2, 2]$, pdf axis to 0.14.

**p.44 – Histogram Density Estimation: example (STATED + figure).** "20 data points generating from mixture of two 1D Gaussians: $P_{data}(x) = 0.3 * N(x; \mu = 0, \sigma = 1) + 0.7 * N(x; \mu = 5, \sigma = 1)$." The plot shows the two **weighted components separately** (blue peak ≈ 0.12 at 0, orange peak ≈ 0.28 at 5) on $[-8, 10]$, not their sum. Here the second argument is written as a standard deviation $\sigma = 1$ (equal to the variance, so no ambiguity in this example; say so once).

**p.45 – The data and the bins (code).** The 20 values: `[1.62434536 -0.61175641 -0.52817175 -1.07296862 0.86540763 -2.3015387 6.74481176 4.2387931 5.3190391 4.75062962 6.46210794 2.93985929 4.6775828 4.61594565 6.13376944 3.90010873 4.82757179 4.12214158 5.04221375 5.58281521]` (the first six are `np.random.seed(1)` standard normals; consistent with six draws from the first component and fourteen from the second). "Partition the x-axis into intervals": `print(np.linspace(-5, 10, 10))` → edges −5, −3.333, −1.667, 0, 1.667, 3.333, 5, 6.667, 8.333, 10. "Count the number of data points in each interval."

**p.46 – Bin height (DERIVED by arithmetic).** "Interval width: 5/3. Each data point has 1/20 mass. Height of the bin (1/20)/(5/3)" (= 0.03 per point).

**p.47 – Histogram (code + figure).** Comment: "We set the number of bins to be equal to 10 − 1 = 9 (np.linspace gets us boundaries of the bins). Though the figure seems like it has less than 9 bins because some bins do not have any data." `plt.hist(X[:, 0], bins=bins, density=True)`; points plotted at $y = -0.01$; `xlim(-4, 9)`, `ylim(-0.02, 0.25)`. Bar heights (verified by recounting the 20 values): $[-3.33, -1.67)$: 1 point → 0.03; $[-1.67, 0)$: 3 → 0.09; $[0, 1.67)$: 2 → 0.06; $[1.67, 3.33)$: 1 → 0.03; $[3.33, 5)$: 7 → 0.21; $[5, 6.67)$: 5 → 0.15; $[6.67, 8.33)$: 1 → 0.03. Total 20.

**p.48 – Poll (nonparametric estimation).** See poll section.

**p.49 – Limitations of Histograms (STATED).** "The histogram is not 'smooth'. Expect elements in the same local region of the data distribution to have somewhat similar probabilities (no sudden changes). The shape of the histogram depends on the bin positions and bin width."

**p.50 – Example: shifted bins (figure).** "shifting the bin mean by 0.75" (means the bin *edges*). Left = p.47. Right: edges start at −2.583 with the same width 5/3; recounting gives 2, 2, 2, 2, 9, 3 points → heights 0.06, 0.06, 0.06, 0.06, 0.27, 0.09 (the four equal bars merge visually into one long low bar). Same data, different shape.

**p.51 – Example: decreased bin width (figure).** "decreasing the bin width to 1." Left = p.47. Right: heights are multiples of ≈ 0.0467 = $1/(20\cdot 15/14)$ and the first edge is ≈ −2.86, so the plotted width is $15/14 \approx 1.07$ (consistent with `np.linspace(-5, 10, 15)`), not exactly 1. Bars ≈ 0.047, 0.093, 0.047, …, 0.187, 0.28, 0.14. Minor slide imprecision; a widget should use width exactly 1 and say so.

**p.52 – Limitations of Histograms (STATED).** p.49 plus: "The number of grid cells increases exponentially with dimension $d$."

**p.53 – Solution: Kernel Density Estimation (STATED, no formula).** "Instead of stacking bins that represent each data point, we stack distributions. Example: Gaussian Kernel." Figure: the 20 points; a smooth blue KDE curve (bump ≈ 0.08 near −0.8, plateau ≈ 0.05 near 1–2, peak ≈ 0.23 near 4.7, long right shoulder); three dashed red kernels (centred near 1.0, 4.0, 5.0, peak ≈ 0.05) illustrating the stacked bumps. Bandwidth not stated. **L12 ends here; KDE continues in L13 (not released).**

### Running examples and datasets
- **Old Faithful** (Wikipedia EM animation; duration vs delay) with hand-written illustrative responsibilities 0.2, 0.18, 0.19, 0.06, 0.05, 0.08, 0.07 and the weighted-mean expression for $\mu_{\text{yellow}}$ (pp.19–27).
- **`make_blobs(150, centers=4)`, `np.random.seed(0)`**: 100 training points, 50 holdout points (pp.31–34); GMM $K = 2$: train −4.09, holdout −4.22 (p.35); $K = 4$: −3.89 / −4.09; $K = 10$: −3.65 / −4.52; $K = 20$: −2.92 / −5.26 (p.37); NLL vs $K = 1..24$ (p.38); outlier candidate at ≈ (3.25, 2.85) (p.40).
- **20-point sample** from $0.3\,\mathcal N(0, 1) + 0.7\,\mathcal N(5, 1)$ (values on p.45): histogram with 9 bins of width 5/3 on $[-5, 10]$ (heights 0.03, 0.09, 0.06, 0.03, 0.21, 0.15, 0.03), shifted by 0.75 (0.06 ×4, 0.27, 0.09), and width ≈ 1.07 (p.51); Gaussian KDE (p.53).

### Figures to rebuild interactively
1. One EM iteration on Old Faithful-like data (pp.19–27): show initial ellipses, colour points by responsibility, then move each mean to its weighted average with the weights visible.
2. Train/holdout log-likelihood vs $K$ (pp.35–38): slider for $K$; fitted means; the two curves.
3. Density + outlier threshold (pp.40–41): fitted GMM density contours; drag a query point; show $\log p_\theta(x')$ against a threshold.
4. Histogram explorer (pp.44–51): the 20 points; sliders for bin width and offset; bar heights as count/(n·width); overlay the true mixture density.
5. KDE explorer (p.53): bandwidth slider; show the individual kernels and their average (continues in L13).

### Notation table
| Symbol (slide) | Meaning | Normalization |
|---|---|---|
| $P_{\theta_t}(z_k \mid x)$, $P(z = k \mid x^{(i)})$ | responsibility of component $k$ for $x^{(i)}$ | $r_k^{(i)}$ |
| $n_k = \sum_i P(z = k \mid x^{(i)})$ | soft count | $n_k$ (say "soft count"; integer only when responsibilities are one-hot) |
| $\sum_{x\in D}$ | sum over examples | $\sum_{i=1}^n$ |
| $\theta_t$, $\theta_{t+1}$ | EM iterates | $\theta^{(t)}$, $\theta^{(t+1)}$ |
| "weights $\theta_{t+1}$" | parameters | parameters |
| $x_1, \dots, x_7$ (pp.24, 26) | labels for individual points | $x^{(1)}, \dots$ (subscripts are features in our convention) |
| $\mu_{\text{yellow}}$, $\phi_{\text{yellow}}$ | parameters of the yellow component | $\mu_k$, $\phi_k$ |
| `model.score(X)` | average log-likelihood per point | $\frac1n\sum_i\log p_\theta(x^{(i)})$ |
| $P_{data}$, $P_{\text{data}}$ | true distribution | $P$ (Unit 2) / $P_{\text{data}}$ |
| $\ell(\theta) = \frac1n\sum_i\log P_\theta(x^{(i)})$ | average log-likelihood (maximized) | same; note $\ell$ was a per-example loss in Unit 1 and a training objective in L8 |
| $N(x;\mu = 0, \sigma = 1)$ | Gaussian with **standard deviation** $\sigma$ written explicitly | $\mathcal N(x; 0, 1)$; flag that our second argument is a variance |
| $x'$ | query point for outlier detection | $x'$ |

### Prerequisite / sticky-note concepts
- **Weighted mean and weighted covariance** – pp.15, 24–27. Refresher: $\bar x_w = \sum_i w_ix^{(i)}/\sum_i w_i$ and $S_w = \sum_i w_i(x^{(i)} - \bar x_w)(x^{(i)} - \bar x_w)^\top/\sum_i w_i$. With 0/1 weights they are the ordinary class mean and covariance. The M-step is exactly these with $w_i = r_k^{(i)}$. (New glossary term suggested: `weighted-mean`.)
- **Lagrange multipliers on the simplex** – p.16 (glossary `lagrange-multipliers`). Refresher: maximize $\sum_k n_k\log\phi_k$ subject to $\sum_k\phi_k = 1$; the stationarity condition gives $\phi_k \propto n_k$. Same derivation as the categorical prior MLE (lesson 6.3, der-6-3-5), with real-valued $n_k$.
- **Matrix calculus for the Gaussian MLE** – p.15 (glossary `matrix-calculus-identities`). Refresher: $\nabla_\mu(x-\mu)^\top\Sigma^{-1}(x-\mu) = -2\Sigma^{-1}(x-\mu)$, $\nabla_\Sigma\log\lvert\Sigma\rvert = \Sigma^{-1}$. With weights, every term is multiplied by $r_k^{(i)}$. Reuse der-7-2-4 and der-7-2-5.
- **Jensen's inequality / Gibbs' inequality** – needed for EM's monotonicity (not on slides; glossary `gibbs-inequality`). Refresher: $\log$ is concave, so $\log\mathbb E[Y] \ge \mathbb E[\log Y]$. Applied to $p_\theta(x) = \mathbb E_{z\sim q}[p_\theta(x, z)/q(z)]$ it gives the ELBO. Equality holds when $q$ is the posterior.
- **Probability density vs probability** – pp.35, 41 (glossary `likelihood-vs-probability`). Refresher: a density can exceed 1, so a log-likelihood can be positive (companion cell 36 prints +1.43). Densities compare points; they are not probabilities of points. Outlier scores are densities.
- **Parametric vs nonparametric model** – pp.42–43. Refresher: a parametric model has a fixed number of parameters ($\theta$ for a Gaussian is $d + d(d+1)/2$ numbers); a nonparametric estimate grows with the data (a histogram stores counts, a KDE stores every point). More flexible, but needs more data. (New glossary term suggested.)
- **Histogram normalization** – pp.46–47. Refresher: a bar of width $h$ containing $c$ of $n$ points has height $c/(nh)$ so the total area is 1. `density=True` does this. Counts alone are not a density.
- **Curse of dimensionality** – p.52. Refresher: with $m$ bins per axis there are $m^d$ cells; most are empty unless $n$ grows exponentially in $d$. (New glossary term suggested.)

### Derivation gaps
1. **The M-step split** (p.13): $\sum_i\sum_k r_k^{(i)}\log p_\theta(x^{(i)}, z = k) = \sum_k\sum_i r_k^{(i)}\log\mathcal N(x^{(i)};\mu_k,\Sigma_k) + \sum_k\big(\sum_i r_k^{(i)}\big)\log\phi_k$, one move per step (expectation as weighted sum; chain rule of probability; log of a product; swap finite sums), and why $(\mu_k, \Sigma_k)$ appear only in the $k$-th term.
2. **Weighted mean** (pp.15, 25): gradient in $\mu_k$ of $\sum_i r_k^{(i)}\log\mathcal N(x^{(i)};\mu_k,\Sigma_k)$ is $\Sigma_k^{-1}\sum_i r_k^{(i)}(x^{(i)} - \mu_k)$; zero gives $\mu_k = \sum_i r_k^{(i)}x^{(i)}/n_k$; negative-definite Hessian $-n_k\Sigma_k^{-1}$ (reuse der-7-2-4 with weights).
3. **Weighted covariance** (pp.15, 27): the trace trick and $\nabla_{\Sigma^{-1}}$ (reuse der-7-2-5 with weights); note the M-step uses the *new* $\mu_k$.
4. **Soft prior** (p.16): Lagrange multiplier on $\sum_k\phi_k = 1$ gives $\phi_k = n_k/n$, using $\sum_k n_k = \sum_i\sum_k r_k^{(i)} = n$.
5. **One-hot responsibilities recover GDA** (pp.15–16 vs L10 p.20): substitute $r_k^{(i)} = \mathbb 1[z^{(i)} = k]$; this is also how labeled points enter semi-supervised EM.
6. **EM never decreases the likelihood** (p.30 "guaranteed to converge"): ELBO / Jensen proof (see L11 gap 13), in at most ~12 steps; then the honest statement of convergence: the likelihood sequence is non-decreasing, so it converges if bounded; for GMMs it is bounded only with a floor on $\Sigma_k$ (L11 gap 11); parameters converge to a stationary point under regularity, not necessarily a maximum.
7. **Hand-computed responsibilities that are consistent** (pp.21–22): replace the illustrative 0.2/0.05 with values computed from a stated initialization (two components, given $\mu_k, \Sigma_k, \phi_k$), and show one weighted-mean update numerically.
8. **`score` is an average log-density** (pp.35–38): $\frac1n\sum_i\log p_\theta(x^{(i)})$; why it can be positive; why training log-likelihood rises with $K$ (nested models, L11 gap 5) while holdout falls once components fit individual points.
9. **Outlier rule** (pp.40–41): flag $x'$ when $p_\theta(x') < \tau$; choose $\tau$ as a low quantile of $p_\theta$ on training or holdout data (e.g., the 1st percentile). Not on the slides.
10. **Histogram is a density** (pp.46–47): $\hat p(x) = \frac{c_b}{nh}$ for $x$ in bin $b$ integrates to $\sum_b\frac{c_b}{nh}h = 1$; recompute the p.47 heights. (Optional: it is the MLE among densities constant on the given bins.)
11. **Bias–variance in bin width** (pp.49–51): small $h$ high variance (few points per bin), large $h$ high bias (smears modes); a sketch, not a theorem.
12. **Cells grow as $m^d$** (p.52): with $m$ bins per axis, the expected count per cell is $n/m^d$.
13. **KDE formula** (p.53): $\hat p_h(x) = \frac1n\sum_i\frac1h K\big(\frac{x - x^{(i)}}{h}\big)$, integrates to 1 when $K$ does; the Gaussian KDE is a GMM with $n$ equal-weight components of variance $h^2$ centred at the data. Deferred to L13 (pending).
14. **Parametric vs nonparametric data efficiency** (poll p.48(b)): rates sketch, e.g. a parametric MLE error shrinks like $n^{-1/2}$, a 1-D histogram's like $n^{-1/3}$ at best. Beyond the slides; mark as such.

### Poll Everywhere questions (verbatim; suggested keys in brackets)
- **p.17 "Are the following statements on unsupervised GMM/EM algorithm correct?"** (a) "In unsupervised GMM, it is easy to optimize the clustering assignment and the parameters of the models at the same time because the objective function of GMM is convex" [False: non-concave log of a sum, many local maxima (L11 p.47)]. (b) "EM algorithm is an iterative procedure that guarantees to solve the log-likelihood objective to optimality" [False: it only never decreases the likelihood; it can stop at a local maximum or saddle]. (c) "EM algorithm guarantees the same solution regardless of the cluster initialization" [False]. (d) "We compute $P(Z \mid X^{(i)})$ at the E-step so we can connect our current belief on cluster assignment with the model parameters" [True]. (e) "Like in K-means, EM in GMM assigns the cluster assignment in one step and updates the model parameter in another" [True: both alternate; EM's assignment is soft]. (f) "Underfitting and overfitting in GMM can be detected through holding out datapoints" [True (pp.35–38)].
- **p.48 "Are the following statements on nonparametric estimation correct?"** (a) "Nonparametric density estimation can be combined with generative models to learn the distribution of the data. Compared with parametric models, e.g., Gaussian distributions, nonparametric methods are more robust and flexible." [True as intended: no assumed shape (flexible), less exposed to a misspecified family (robust to model misspecification); the explanation should add that they are *not* more robust to small samples or high dimension.] (b) "Nonparametric methods often require more data to estimate a target distribution well when compared with parametric methods" [True].

### Continuity
Backward: pp.3–12 re-show L11 pp.29, 36–37, 39, 48, 51–55; p.13–16 complete L11 p.55 using the GDA decomposition of L10 pp.16–20 (Unit 7); pp.31–38 execute L11 p.13 with the same `make_blobs` generator the lecture10 companion used for k-means; p.42 recaps MLE (Unit 3); the outlier and density-estimation bullets fulfil L10 p.25 ("model the data generating distribution; density estimation"). Forward: p.53's KDE and the "kernels" of the schedule row continue in L13 (with KNN, per the schedule); L14 (dimensionality reduction) is foreshadowed by p.52's curse of dimensionality. Midterm Kaggle (semi-supervised) is announced on p.2: Unit 9 is its main theory.

### Concept-graph edges
Responsibility (E-step) -> M-step objective; Expectation -> M-step objective; GDA log-likelihood decomposition -> M-step split; M-step split -> Weighted mean/covariance updates; GDA MLE mean/covariance -> Weighted updates (generalizes); Categorical prior MLE -> Soft prior $\phi_k = n_k/n$ (generalizes); Weighted updates + E-step -> EM algorithm (GMM); Latent-variable model -> EM algorithm (general); Gibbs/Jensen inequality -> EM monotone ascent; EM monotone ascent -> EM local optima; Training-risk optimism -> Holdout log-likelihood; GMM -> Holdout log-likelihood for choosing $K$; Holdout log-likelihood <-> Elbow method (contrasts); Unsupervised probabilistic model -> Density estimation; Density estimation -> Outlier detection; MLE -> Parametric density estimation; Parametric density estimation <-> Nonparametric density estimation (contrasts); Histogram estimator -> Histogram limitations; Histogram limitations -> Kernel density estimation; Gaussian mixture -> Kernel density estimation (uses: a Gaussian KDE is an equal-weight mixture).

### Suggested interactive widgets
- **EM stepper** (pp.19–29): 2-D data (Old Faithful-like, generated with a fixed seed); buttons "E-step" and "M-step"; points shaded by responsibility; ellipses at $1\sigma$/$2\sigma$; the log-likelihood trace that never goes down; "restart" with a new seed to show local optima; a $\sigma\to0$ toggle that turns EM into Lloyd's algorithm (links lesson 8.1).
- **Holdout log-likelihood vs $K$** (pp.35–38): fit GMMs with $K = 1..15$ on a seeded blobs set; curves for train and holdout; highlight the $K$ that maximizes holdout log-likelihood.
- **Density outlier detector** (pp.40–41): drag $x'$; readout of $\log p_\theta(x')$ and the percentile among training points.
- **Histogram / KDE explorer** (pp.44–53): the 20 values; bin width, bin offset, and bandwidth sliders; area readout (always 1); true mixture overlay.

---

## Notebooks

### 1. `Code Companions/lecture11,13-GMM-and-EM code companion.ipynb` (42 cells; matches **L11 pp.30–48** and **L12 pp.31–38**; L13 part pending)
Title cell: "Lecture 11: Unsupervised GMM and EM algorithm Code Companion". Libraries: numpy, pandas, `sklearn.datasets` (`load_iris(as_frame=True)`, `make_blobs`), `sklearn.mixture.GaussianMixture`, matplotlib (`figsize [12, 4]`, `LogNorm` imported unused).

Cells and correspondence:
- **0–3 (markdown).** Multivariate normal density with $\frac{1}{\sqrt{(2\pi)^d\lvert\Sigma\rvert}}$ (correct $d$, unlike L11 p.44) and its 1-D form; GMM as $P_\theta(x, z) = P_\theta(x \mid z)P_\theta(z)$, but cell 2 then writes $P_\theta(x \mid y = 0)$ and $P_\theta(y = 0) = \phi_0$ (mixes $y$ and $z$; indices start at 0); cell 3 writes the two-component marginal.
- **4–6 (markdown).** Warm-up with known assignments (= L11 p.40, including the $x^{(i)} \in \mathbb R$ error) and the three-step GDA recipe (= L11 p.42).
- **7.** Iris loaded as a DataFrame; `head()` prints the first five rows (5.1, 3.5, 1.4, 0.2, target 0; …).
- **8–9.** GDA on the **sepal pair** (`X = iris_X.to_numpy()[:,:2]`, $d = 2$, $K = 3$, $n = 150$): `mus[k] = np.mean(X_k, axis=0)`, `Sigmas[k] = np.cov(X_k.T)`, `phis[k] = X_k.shape[0]/n`. **`np.cov` divides by $n_k - 1$, not the MLE's $n_k$** (L10 p.20); the same pitfall HW3 P2(c) flags.
- **10–11.** `gda_predictions(x, mus, Sigmas, phis)`. **Bug:** the class-conditional density is computed as `np.sqrt(np.abs((2*np.pi)**d*np.linalg.det(Sigmas))) * -.5*np.exp(quad)`, i.e. $-\tfrac12\sqrt{(2\pi)^d\lvert\Sigma_k\rvert}\,e^{+q}$ with $q = (x-\mu_k)^\top\Sigma_k^{-1}(x-\mu_k)$, instead of $(2\pi)^{-d/2}\lvert\Sigma_k\rvert^{-1/2}e^{-q/2}$: the normalizer is multiplied instead of divided, the $-\tfrac12$ sits outside the exponential, and the result is negative. `argmax` of these negative numbers picks the class minimizing $\phi_k\sqrt{\lvert\Sigma_k\rvert}\,e^{q}$, which is not the GDA rule (wrong weighting of $\log\lvert\Sigma_k\rvert$ and the prior enters inverted; with equal Iris priors the prior error is invisible). Cell 13's `np.log(-1./3*pyx)` compensates for the sign only for plotting. Do not copy this function; lesson 7.2's prediction rule (der-7-2-7) is the correct one. (Record as a "spot the bug" item, not as an HW3 hint.)
- **12–13.** Plot: one contour per class of the transformed score over a grid, plus the Iris points coloured by species (`cmap=plt.cm.Paired`): three tilted ellipses, the setosa one separate, the other two overlapping.
- **14–15.** "What if we don't have labels?": the same contours over uncoloured points.
- **16–17 (markdown).** From labeled to unlabeled clustering (= L11 p.43).
- **18–20 (markdown).** EM definition (= L12 p.18) and the M-step formulas for $\mu_k, \Sigma_k, n_k, \phi_k$ (= L12 pp.15–16), "intuitively, … the empirical mean and covariance … when each element has a weight". **No EM code anywhere in the notebook.**
- **21–27.** Generalization in probabilistic models (= L12 pp.31–34): `np.random.seed(0)`, `make_blobs(150, centers=4)`, first 100 as training, last 50 as holdout; three scatter plots.
- **28–32.** Underfitting (= L12 pp.35–36): `GaussianMixture(n_components=2)`; printed **Training −4.08, Holdout −4.07** (the slide shows −4.09 / −4.22; `GaussianMixture` is not seeded, so the numbers vary run to run).
- **33–34.** $K \in \{4, 10, 20\}$ (= L12 p.37): plot titles **−3.89 | −4.09** (same as the slide), **−3.49 | −4.42** (slide: −3.65 | −4.52), **−2.93 | −5.73** (slide: −2.92 | −5.26).
- **35–36.** Overfitting with **$K = 50$**: "Clusters on Training Set | Log-Lik: **1.43**" and "Clusters on Holdout Set | Log-Lik: **−30.37**" (not on any released slide; the positive training value is a log-*density*).
- **37–39.** NLL vs $K = 1..24$ for train and holdout (= L12 p.38; similar shape, different noise).
- **40 (markdown).** "Warning: This process doesn't work as well as in supervised learning. For example, detecting overfitting with larger datasets will be paradoxically harder (try it!)" (not on any released slide).
- **41 (markdown).** Summary: reduce clustering to fitting a GMM with latent $z$; fit without labels by EM ("we alternate between hallucinating labels and optimizing the model"); detect overfitting by comparing training and holdout likelihood.

L13 status: the file name says "lecture11,13". Cells 21–39 are already on L12's slides; cells 35–36, 40, and 41 appear on no released slide and are the likeliest L13 content (or were cut from L12). Re-map when L13 is released.

Key functions/attributes: `gda_predictions` (buggy), `mixture.GaussianMixture(n_components=k).fit(X)`, `model.means_`, `model.score(X)` (average log-likelihood per point).

### 2. `Code Companions/lecture10-unsupervised-learning code companion.ipynb`
Byte-identical copy of `Lectures/lecture10-unsupervised-learning code companion.ipynb` (verified with `cmp`). Content mapped in `04-lectures-L8-L10.md`, Notebooks §4. Its cells 11–35 (make_blobs, $K = 2, 4, 10, 20, 50$, elbow on blobs) are the code-side counterpart of L11 pp.6–13, though the L11 slides themselves use Iris.

---

## Cross-lecture notation conventions and quirks to normalize on the platform
- **Mixture weights are $\phi_k$ on the slides** (L11 p.35 on, L12 throughout, matching the GDA prior $\phi_k$ of L9–L10). Lessons 7.1 and 8.1 and the `gaussian-mixture` / `kmeans-gmm-limit` node summaries write $\pi_k$. Unit 9 should use $\phi_k$ and add one line: "lesson 7.1 wrote $\pi_k$; it is the same number." Consider adding a row to STYLE_GUIDE §2.1 (GMM: $\phi_k$, $\mu_k$, $\Sigma_k$, latent $z^{(i)}$, responsibilities $r_k^{(i)}$); that file needs the other developer's review.
- Mean: $\boldsymbol u_k$ (L11 pp.32–38) then $\mu_k$ (L11 p.39 on); always $\mu_k$.
- Cluster index: $k$, but $j$ on L11 p.44 and p.54; never $j$ (feature index).
- Gaussian normalizer: $(2\pi)^{n/2}$ on L11 p.44 is wrong; $(2\pi)^{d/2}$.
- EM iterate: $\theta_t$ on slides; $\theta^{(t)}$ on the platform.
- Responsibility: slides write $P_{\theta_t}(z = k \mid x^{(i)})$, $P(z = k \mid x^{(i)})$, $P_{\theta_t}(z_k \mid x)$, $P(z^{(i)} = k \mid x^{(i)})$, $p(z^{(i)} = j \mid x^{(i)};\phi,\mu,\Sigma)$; define $r_k^{(i)}$ once and keep it.
- $n_k$ changes meaning between L10 (integer class count) and L12 (soft count); say so.
- k-means "objective" in code is sklearn inertia $= nJ$; GMM `score` is the average log-likelihood (already $\frac1n$).
- Gaussian second argument: L12 p.44 writes $\sigma = 1$ explicitly (standard deviation); our convention is variance; harmless here.
- Density vs probability: L11 p.30 types $P_\theta(x): \chi\to[0,1]$; densities can exceed 1, and log-likelihoods can be positive.
