# Lectures 4–5: Empirical risk, gradient descent, logistic regression, maximum likelihood

<!--
  COURSE MAP — generated 2026-10-06 by subject-explorer agents that read every slide
  page visually (equations are images in the PDFs, so text extraction alone misses them).
  This file is the source of truth for lesson authors: it records exactly what the
  professor's slides state vs. derive, her notation, slide errors to correct, Poll
  Everywhere questions (quiz bank seeds), concept-graph edges, and widget ideas.
  Do NOT re-read the PDFs to write a lesson unless this file is ambiguous.
  Source material: "AML Course Material/" in this repo (lectures L1–L10, code companions, HW1–HW2).
-->

# Content Map: Lectures 4 and 5 (CS 5785 Applied Machine Learning, Fall 2026, Prof. Kyra Gan)

Source files (all read page-by-page visually):

- `AML Course Material/Lectures/L4 empirical risk_GD.pdf` (53 pages)
- `AML Course Material/Lectures/L5 GD, LogReg and Classification.pdf` (50 pages)
- `Code_Companions__lecture4-code_companion.ipynb` ("Lecture 4 Code Companion: Gradient Descent and Logistic Regression")
- `Code_Companions__L5_code_companion.ipynb` ("Lecture 5: Classification and Maximum Likelihood Estimation")

Neighboring lectures for context: L3 is "Linear Regression and Data Generating Distribution" (loss functions, MSE/RMSE/R², notation, first mention of GD and empirical risk). L6 is "MLE and Classification Evaluation" (recaps L5's MLE derivation, derives Bernoulli MLE, KL divergence, softmax regression, accuracy/confusion matrix/precision/recall/ROC).

Global notation conventions used by the professor (and inconsistencies to be aware of):

- Capital $X$ for inputs, $Y$ or $y$ for targets, $\theta$ for model parameters, $f(X;\theta)$ or $f_\theta(x)$ for the model, $g(X)$ for the true (unknown) function, $\mathcal{D}$ for the dataset.
- Superscript $k$ is the iteration index: $X^k$, $\theta^k$, $\eta^k$ (L4 slides 34–44), and later $w^{(k)}$ with parentheses (L4 slides 48–53, L5 slides 4–8). Both conventions mean the same thing.
- Dimension of the input is $d$ on L4 slide 15 but $n$ on L4 slide 22 (Hessian); the number of samples is $n$ in $\mathcal{D}$ but the averaging factor is written $\frac{1}{N}$ (L4 slides 7, 10, 43). Lesson writers should normalize to $n$ samples, $d$ features.
- Slide typos worth not propagating: L4 slide 5 writes $g(\theta)$ inside the true risk where $g(X)$ is meant; L4 slide 51 writes $\frac{\partial E}{d\partial \mathrm{w}}$ for $\frac{\partial E}{\partial w_i}$.

---

## L4: Empirical Risk and Gradient Descent (53 pages)

### One-paragraph summary and where it sits in the course arc

L4 is the bridge between "what is a model and a loss" (L3) and "how do we actually find the parameters" (L4–L5). It opens by restating the supervised learning problem in the language of the data-generating process: the true risk $R(\theta)$ is an expectation we cannot compute because $g(X)$ is unknown, so we replace it with the empirical risk (a sample average over the training set) and minimize that over $\theta$. The rest of the lecture builds gradient descent from first principles: derivatives as local linearization, the gradient as a column vector of partials, the inner-product argument that the gradient is the direction of steepest ascent, the Hessian and second-order conditions for minima, why closed-form root-finding of $\nabla f = 0$ is usually impossible, and finally the iterative update $X^{k+1} = X^k - \eta^k \nabla_X f(X^k)$ with stopping criteria. The last third analyzes convergence on a 1-D quadratic (optimal step size $\eta_{opt} = a^{-1}$, the $2\eta_{opt}$ divergence threshold), then shows that for a multi-dimensional quadratic each coordinate has its own optimal rate, which motivates the learning-rate discussion that spills into L5. A PyTorch autograd implementation of GD for linear regression is shown on slides 45–46.

### Learning objectives (stated or clearly implied)

1. Explain why the true risk $R(\theta) = E_{(X,Y)\sim P}[\text{error}(f(X;\theta), Y)]$ cannot be computed and why the empirical risk is the practical surrogate.
2. State the supervised learning problem as $\hat\theta = \arg\min_\theta Loss(\theta)$ with $Loss(\theta) = \frac{1}{N}\sum_i \text{error}(f(X_i;\theta), Y_i)$, and recognize that for a fixed dataset the loss is a function of $\theta$ only.
3. Define derivative, partial derivative, gradient (column vector), and Hessian, and know their shapes.
4. Prove (via the inner-product property) that the gradient is the direction of fastest increase and $-\nabla f$ the direction of fastest decrease.
5. State first- and second-order conditions for local minima/maxima/inflection points in 1-D and in $\mathbb{R}^n$ (Hessian positive/negative definite).
6. Write the gradient descent algorithm with initialization, update rule, and stopping criteria.
7. Analyze GD on a quadratic: derive the optimal step size $\eta_{opt} = 1/a$, and classify behavior for $\eta < \eta_{opt}$, $\eta_{opt} < \eta < 2\eta_{opt}$, $\eta > 2\eta_{opt}$.
8. Understand why a single learning rate is problematic when curvature differs across coordinates.
9. Implement GD with PyTorch autograd (`requires_grad`, `.backward()`, `.grad`, `torch.no_grad()`).

### Ordered concept walkthrough

**Slides 1–2: Title, announcements.** HW1 due Wednesday 9/16.

**Slide 3: Recap — Data Generating Process.** STATED-ONLY. The DGP lets us describe learning in the language of generalization error, true risk, empirical risk. Data are generated according to some unknown function $f$:
$$Y = f(X) + \epsilon$$
(Note: on later slides the unknown truth is renamed $g(X)$ and $f(X;\theta)$ becomes the model.)

**Slide 4: How to learn an ML model?** Figure: blue dotted curve $g(X)$ (true mechanism), red dashed curve $f(X;\theta)$ (current fitted function), five sample points $X_1..X_5$ with handwritten $y_1..y_5$ at the blue curve and vertical red bars showing the gap $f(X_i;\theta)$ vs $y_i$; the shaded region between the curves is the total error.

**Slide 5: Problem — $g(X)$ is unknown.** STATED-ONLY. To compute the total error you would need the whole function:
$$\int_{-\infty}^{\infty} error\big(f(X;\theta), g(X)\big)\, dX$$
"Aka True risk":
$$R(\theta) = E_{(X,Y)\sim P}\, \text{error}\big(f(X;\theta), g(\theta)\big)$$
(handwritten "DGP" annotation pointing at $P$; the $g(\theta)$ is a slide typo for $g(X)$ / $Y$.) "In practice we will not have such specification."

**Slide 6: Solution — Sampling the function.** Sample $g(X)$: get input–output pairs for a number of inputs (figure: 3-D surface with red vertical sticks at sample locations; right panel shows only the sticks labeled $d_i$ at $X_i$). "We must learn the entire function from these few examples" — the training samples.

**Slides 7–8: The Empirical Error.** STATED-ONLY (definition). The empirical estimate of the error is the average over training samples:
$$EmpiricalError(\theta) = \frac{1}{N}\sum_{i=1}^{N} error\big(f(X_i;\theta), y_i\big)$$
$$\hat\theta = \arg\min_\theta EmpiricalError(\theta)$$
Slide 8 is identical with handwritten "LOSS" replacing "EmpiricalError" — the professor's point is that *loss function = empirical risk*.

**Slide 9: Learning the function from training samples.** Estimate parameters to "best fit" the training points; hope it generalizes where we have no samples; "More about generalization errors / training and testing split later!"

**Slide 10 (repeated verbatim as slide 43): Supervised Learning Problem Restated.** STATED-ONLY (this is the canonical formulation for the whole course):
- Training set of input–label pairs $\mathcal{D} = \{(X_i, Y_i)\,|\, i = 1,2,\dots,n\}$
- Select a model class parametrized by $\theta$
- Quantify error on the $i$-th sample: $error(f(X_i;\theta), Y_i)$
- Empirical risk: $$Loss(\theta) = \frac{1}{N}\sum_{i=1}^{n} error\big(f(X_i;\theta), Y_i\big)$$
- Estimate parameters: $$\hat\theta = \arg\min_\theta Loss(\theta)$$
"i.e., minimize the empirical risk over the drawn samples."

**Slide 11: Poll Everywhere (see poll section).**

**Slide 12: Recap.** When the dataset is **fixed**, the loss is only a function of $\theta$. This is an optimization problem: find where $\nabla_X f(X) = 0$ then check the Hessian. Finding roots of $\nabla_X f(X) = 0$ is not easy (intractable form) → iterative solutions → gradient descent.

**Slide 13: A Brief Note on Derivatives.** STATED-ONLY. Figure: convex-ish curve with tangent line, $\Delta x$ and $\Delta y$ marked. "A derivative of $f(x)$ at $x$ tells us how much a small increment $\Delta x$ will increment the value $\Delta y$":
$$\Delta y = \alpha \Delta x \quad\text{where } \alpha \text{ is the derivative of } f(x) \text{ at } x$$
"At a fine enough resolution, any smooth, continuous function is locally linear at any point."

**Slide 14: Scalar $x$ and $y$.** Figure: sinusoid with "+" marks where slope is positive (red-shaded regions), "−" where negative (blue), "0" with horizontal tangents at peaks/troughs. $f'(x)$ is the rate of change; magnitude = steepness; positive where increasing, negative where decreasing, 0 where locally flat.

**Slide 15: Multivariate $X$, scalar $y$.** STATED-ONLY (definition of gradient).
$$\Delta y = \alpha_1\Delta x_1 + \alpha_2 \Delta x_2 + \cdots + \alpha_d \Delta x_d, \qquad \alpha_i = \frac{\partial y}{\partial x_i}$$
Gradient $\nabla_X y$ is a **column vector** of all partials:
$$\nabla_X y = \left[\frac{\partial y}{\partial x_1} \;\cdots\; \frac{\partial y}{\partial x_d}\right]^T$$
$\Delta X$ is a column vector of the $\Delta x_i$'s. Then
$$\Delta y = \langle \nabla_X y, \Delta X\rangle = \nabla_X y^T \Delta X$$
Figure: 3-D bowl $y(x_1,x_2)$ with $\Delta \mathbf{x}$ and $\Delta y$ marked. Highlighted: "To understand its behavior, let's consider a well-known property of inner products."

**Slides 16–17: A Well-Known Vector Property.** STATED-ONLY (no proof; this is Cauchy–Schwarz / $\langle A,B\rangle = \|A\|\|B\|\cos\phi$). Left figure: unit circle with red vector $A$ and blue vector $B$ (handwritten $\langle A,B\rangle$); right figure: "Inner Product" vs "Angle (degrees)" from 0 to 360 — a cosine curve from 1.00 at 0° to −1.00 at 180° back to 1.00. "The inner product between two vectors of fixed lengths is maximum when the two vectors are aligned (angle equals 0)." Slide 17 relabels $A = \nabla_X f(X)$, $B = \Delta X$: for an increment $\Delta X$ of any given length, $\Delta y$ is max if $\Delta X$ is aligned with $\nabla_X y$. **Highlighted conclusion: "The gradient is the direction of fastest increase in $f(X)$."**

**Slides 18–21 (and 35): Gradient on a surface.** Figure: colorful 3-D terrain $f(X)$ over a $[0,20]\times[0,30]$ grid with a contour map projected on the floor; a point on the surface drops a vertical line to the floor where a black arrow shows $\nabla_X f(X)$ ("moving in this direction *increases* $f(X)$ fastest"); slide 20 adds $-\nabla_X f(X)$ ("decreases fastest"). Slide 21: two points (one at the floor of a valley, one at a peak) labeled "Gradient here is 0."

**Slide 22: The Hessian.** STATED-ONLY (definition).
$$\nabla^2_x f(x_1,\dots,x_n) := \begin{bmatrix} \frac{\partial^2 f}{\partial x_1^2} & \frac{\partial^2 f}{\partial x_1 \partial x_2} & \cdots & \frac{\partial^2 f}{\partial x_1\partial x_n}\\ \frac{\partial^2 f}{\partial x_2 \partial x_1} & \frac{\partial^2 f}{\partial x_2^2} & \cdots & \frac{\partial^2 f}{\partial x_2 \partial x_n} \\ \vdots & \vdots & \ddots & \vdots \\ \frac{\partial^2 f}{\partial x_n \partial x_1} & \frac{\partial^2 f}{\partial x_n \partial x_2} & \cdots & \frac{\partial^2 f}{\partial x_n^2}\end{bmatrix}$$
"given by the second derivative."

**Slides 23–24: Polls (see poll section).**

**Slide 25: The Problem of Optimization.** Figure (left): 1-D $f(x)$ with labeled global minimum, inflection point, global maximum, local minimum. Right: convex bowl surface and the non-convex terrain. "Given a function $f(X)$ of $X$, find the value of $X$ where $f(X)$ is minimum."

**Slide 26: Finding the Minimum of a Function.** Find $X$ at which $f'(X) = 0$. "Both maxima and minima have zero derivative." Figure: $f(x)$ (black) and $f'(x)$ (red) overlaid; yellow circles mark where $f'$ crosses zero at extrema of $f$.

**Slide 27: Derivative of the Derivative.** Adds $f''(x)$ (blue): "The second derivative $f''(X)$ is **negative at maxima** and **positive at minima**."

**Slide 28: A Note on Derivatives of Functions of Single Variable.** Three stacked plots sharing an $x$-axis (0–6000): $f(x)$ with labeled maximum (~1000), inflection point (~3100), minimum (~5200) — handwritten "critical points"; $\frac{df(x)}{dx}$ crossing zero at all three (handwritten "derivative is 0"); $\frac{d^2 f(x)}{dx^2}$ negative at the max, zero at the inflection, positive at the min. Text: all locations with 0 derivative are critical points (local maxima, local minima, or inflection points); second derivative $> 0$ at minima, $< 0$ at maxima, $= 0$ at inflection point; "More complicated for functions of multiple variables…"

**Slide 29: Functions of Multiple Variables.** For smooth functions, at the max/min the gradient is 0 ("really tiny shifts will not change the function value"). Find the location where the gradient is 0.

**Slide 30: Unconstrained Minimization (Multivariate).** STATED-ONLY.
- Solve $\nabla_X f(X) = 0$.
- Compute Hessian $\nabla^2_X f(X)$ at the candidate and verify: positive definite (eigenvalues positive) → local minimum; negative definite (eigenvalues negative) → local maximum. (Saddle/indefinite case is not mentioned here; it is mentioned in L5 slide 13 as "saddle points".)

**Slide 31: Closed-form solutions not always available.** Figure: a 1-D function with flat shoulders and a basin. "Often it is not possible to simply solve $\nabla_X f(X) = 0$ (intractable form). In these situations iterative solutions are used: begin with a 'guess' for the optimal $X$ and refine it iteratively."

**Slide 32: Iterative Solutions.** Figure left: 1-D curve with iterates $x_0, x_1, x_2, x_3, x_4, x_5$ hopping toward the basin (blue arrows on the curve, red on the axis); right: terrain with $X_0, X_1, X_2$ descending. Start from initial guess $X^0$; update toward a (hopefully) better value of $f(X)$; stop when $f(X)$ no longer decreases. **Problem: which direction to step in; how big must the steps be.**

**Slide 33: The Approach of Gradient Descent.** Figure ("E" vs $x$ curve with "NEGATIVE SLOPE" and "POSITIVE SLOPE" labels, red dots stepping down toward green dots, yellow "GLOBAL MINIMUM"): Start at some point; find direction to shift to decrease error using the gradient: negative derivative → moving right decreases error; positive derivative → moving left decreases error. Shift point in this direction.

**Slide 34: Trivial algorithm (1-D).** DERIVED (the sign-case form collapses to the general rule):
- Initialize $X^0$
- While $f'(X^k) \neq 0$: if $\text{sign}(f'(X^k))$ is positive: $X^{k+1} = X^k - \Delta X$; else $X^{k+1} = X^k + \Delta X$
- "What should $\Delta X$ be?" $\Delta X = \eta^k f'(X^k)$ where $\eta^k$ is the **step size**
- Handwritten: $X^{k+1} = X^k - \eta^k f'(X^k)$

**Slide 36:** same figure, clean statement: Initialize $X^0$; while $f'(X^k) \neq 0$: $$X^{k+1} = X^k - \eta^k f'(X^k)$$

**Slide 37: Gradient Descent/Ascent (Multivariate).** STATED-ONLY (justified by slides 16–17).
- To find a maximum: $X^{k+1} = X^k + \eta^k \nabla_X f(X^k)$
- **To find a minimum, move exactly opposite the gradient:** $$X^{k+1} = X^k - \eta^k \nabla_X f(X^k)$$
- "Many solutions to choosing step size $\eta^k$." Discussion prompt: "Why do we want to yield the largest change in the objective function?"

**Slide 38: Convergence of Gradient Descent.** Definition: an iterative algorithm **converges** if the value updates arrive at a fixed point — where the gradient is 0 and further updates do not change the estimate. Figure: blue contour blob with white arrows spiraling into the center, labeled "converging."

**Slide 39: Convergence Criteria.** STATED-ONLY. GD converges when one of:
$$\big|f(X^{k+1}) - f(X^k)\big| < \epsilon_1 \qquad\text{or}\qquad \big\|\nabla_X f(X^k)\big\| < \epsilon_2$$
Figure: 1-D bowl $f(x)$ with "Starting Point", "Iteration 3", "Iteration 4", "Convergence", "Final Value" labeled; steps shrink as the slope flattens.

**Slide 40: Overall Gradient Descent Algorithm.**
- Initialize $X^0$, $k = 0$
- While $\big|f(X^k) - f(X^{k-1})\big| > \epsilon$ do: $X^{k+1} = X^k - \eta^k \nabla_X f(X^k)$; $k = k+1$

**Slide 41: Convergence (convex vs non-convex).** STATED-ONLY. "For **appropriate step size**, for convex (bowl-shaped) functions gradient descent will always find the minimum. For non-convex functions it will find a local minimum or an inflection point." Figure: a bowl with a blue wiggly path descending to the bottom; a non-convex curve where the path gets stuck on a plateau/inflection before the true minimum.

**Slide 42: Poll (see poll section).**

**Slide 43:** repeat of slide 10.

**Slide 44: Gradient Descent to Learn a Supervised Learning Model.** Substitution $X \to \theta$, $f \to Loss$:
- Initialize $\theta^0$, $k = 0$
- While $\big|Loss(\theta^k) - Loss(\theta^{k-1})\big| > \epsilon$ do: $$\theta^{k+1} = \theta^k - \eta^k \nabla_\theta Loss(\theta^k)$$ $k = k+1$

**Slides 45–46: Gradient Descent for Linear Regression (PyTorch).** Pseudocode (slide 45):
```
from torch.nn.functional import mse_loss
X_train = torch.tensor(X_train.to_numpy()); y_train = torch.tensor(y_train.to_numpy())
theta, theta_prev = random_initialization()
while abs(J(theta) - J(theta_prev)) > conv_threshold:
    loss = mse_loss(prediction, y_train)
    loss.backward()
    theta_prev = theta
    theta = theta_prev - step_size * theta.gradient
    theta = theta.require_grad_()
```
Highlighted: **"HW1 autograd equivalent": cannot use `nn.Sequential()`; you should reuse most of the code in class.** Slide 46 is the real code: `threshold = 1e-5`, `step_size = 0.1`, `theta = torch.tensor(np.array([2.,1.]), requires_grad=True)`, loop `while torch.linalg.norm(theta - theta_prev) > threshold`, compute `prediction = f(X_train, theta)`, `loss = mse_loss(prediction, y_train)`, `loss.backward()`, then inside `torch.no_grad()`: `theta = theta_prev - step_size * theta.grad; theta = theta.requires_grad_()`, print MSE every 100 iterations. Note the stopping rule in code is a *parameter-change* criterion $\|\theta^{k} - \theta^{k-1}\| < 10^{-5}$, a third criterion not listed on slide 39.

**Slide 47: Convergence — may not converge.** Three contour figures: "converging" (arrows spiral in), "jittering" (zigzag around the minimum without settling), "diverging" (arrows bounce out with growing amplitude). "The algorithm may not actually converge; it may jitter around the local minimum; it may even diverge. Conditions for convergence?"

**Slide 48: Convergence for Quadratic Surfaces.** STATED-ONLY (key result, no derivation).
$$\text{Minimize } E = \tfrac{1}{2} a w^2 + b w + c$$
$$w^{(k+1)} = w^{(k)} - \eta \frac{dE(w^{(k)})}{dw}$$
"Gradient descent with fixed step size $\eta$ to estimate **scalar** parameter $w$." Figure: parabola $E(\omega)$ with $\omega_{min}$, arrows descending from $w^{(k)}$ labeled $\eta < \eta_{opt}$. "What is the optimal step size to get there fastest? Can arrive at the optimum in a single step using the optimal step size":
$$\eta_{opt} = E''(w^{(k)})^{-1} = a^{-1}$$

**Slide 49: With Non-Optimal Step Size.** STATED-ONLY. Four panels (a)–(d) of a parabola: (a) $\eta < \eta_{opt}$: small monotone steps down one side; (b) $\eta = \eta_{opt}$: one arrow straight to $\omega_{min}$; (c) $\eta > \eta_{opt}$: arrows overshoot and alternate sides with shrinking amplitude; (d) $\eta > 2\eta_{opt}$: arrows alternate sides with growing amplitude.
- For $\eta < \eta_{opt}$ the algorithm will converge monotonically
- For $\eta_{opt} < \eta < 2\eta_{opt}$ we have oscillating convergence
- For $2\eta_{opt} < \eta$ we get divergence

**Slide 50: "Descents" are Uncoupled.** STATED-ONLY. For a quadratic with diagonal curvature, the energy restricted to each coordinate is its own parabola:
$$E = \tfrac{1}{2} a_{11} w_1^2 + b_1 w_1 + c + C(\neg w_1), \qquad \eta_{1,opt} = a_{11}^{-1}$$
$$E = \tfrac{1}{2} a_{22} w_2^2 + b_2 w_2 + c + C(\neg w_2), \qquad \eta_{2,opt} = a_{22}^{-1}$$
($C(\neg w_1)$ = terms not involving $w_1$.) Figures: three parabolas in $w_1$ (narrow, range $-20..20$, values up to 450) and three in $w_2$ (wider, values up to 350) at different offsets — the shape (curvature) does not depend on the other coordinate. "The optimum of each coordinate is not affected by the other coordinates — we could optimize each coordinate independently. **Optimal learning rate is different for the different coordinates.**"

**Slide 51: Vector Update Rule.** STATED-ONLY.
$$\mathbf{w}^{(k+1)} \leftarrow \mathbf{w}^{(k)} - \eta \nabla_{\mathbf{w}} E^\top \qquad\qquad w_i^{(k+1)} = w_i^{(k)} - \eta \frac{\partial E(w_i^{(k)})}{\partial w_i}$$
Figure: elliptical contour plot (tall ellipses centered near $(2, 8)$ on a $[-20,20]^2$ grid) with $\mathbf{w}^{(k)} \to \mathbf{w}^{(k+1)}$ arrow. "Conventional vector update: update the entire vector against the direction of the gradient. **Note: gradient is perpendicular to equal-value contour.** The same learning rate is applied to all components."

**Slide 52: Problem with Vector Update Rule.** STATED-ONLY (slide is a stub; the bullets appear on L5 slide 7).
$$\eta_{i,opt} = \left(\frac{\partial^2 E(w_i^{(k)})}{\partial w_i^2}\right)^{-1} = a_{ii}^{-1}$$

**Slide 53: Dependence on Learning Rate.** Worked numerical example. Five contour panels on $[-20,20]^2$ (tall ellipses, so curvature is high along the horizontal axis). Parameters: $\eta_{1,opt} = 1$; $\eta_{2,opt} = 0.33$ (i.e., $a_{11} = 1$, $a_{22} = 3$). Trajectories start near $(-15, 15)$:
- $\eta = 2.1\,\eta_{2,opt}$: horizontal zigzag with growing amplitude → divergence along the stiff coordinate
- $\eta = 2\,\eta_{2,opt}$: horizontal zigzag of constant amplitude (never settles)
- $\eta = 1.5\,\eta_{2,opt}$: damped horizontal zigzag → converges
- $\eta = \eta_{2,opt}$: one step lands exactly on the stiff coordinate's optimum, then a straight vertical descent along the slow coordinate
- $\eta = 0.75\,\eta_{2,opt}$: smooth, slightly curved monotone path, slowest

### Running examples and datasets used

- **Abstract "blue curve vs red curve" function-learning cartoon** (slides 4, 7–9): true $g(X)$, fitted $f(X;\theta)$, five samples $X_1..X_5$. No numbers.
- **UCI Diabetes dataset** (slides 45–46 via the notebook): `sklearn.datasets.load_diabetes`, last 20 patients, features = `bmi` (standardized, roughly $[-0.1, 0.1]$) plus a constant 1; target = diabetes risk divided by 300. GD from $\theta^0 = (2, 1)$ with $\eta = 0.1$ runs >10,000 iterations to MSE $\approx 0.024179$ and $\theta \approx (3.714, 0.458)$; sklearn OLS gives slope 3.738, intercept 0.458, MSE 0.024178.
- **1-D quadratic $E = \frac12 a w^2 + bw + c$** (slides 48–49): symbolic only.
- **2-D diagonal quadratic** (slides 50–53): $\eta_{1,opt} = 1$, $\eta_{2,opt} = 0.33$, five learning rates $\{2.1, 2, 1.5, 1, 0.75\}\times\eta_{2,opt}$.

### Figures/visualizations shown on slides

1. (4, 7, 8) True curve vs fitted curve with sample error bars and shaded gap — "empirical error = average bar length; true risk = shaded area."
2. (5, 6) 3-D surface $g(X)$ in a box; sampled sticks $d_i$ at $X_i$.
3. (13) Tangent line / $\Delta x$, $\Delta y$ on a smooth curve.
4. (14, 26, 27) Sinusoid with sign-of-slope regions; overlays of $f, f', f''$ with zero-crossings circled.
5. (15) 3-D bowl with $\Delta\mathbf{x}$ and $\Delta y$.
6. (16, 17) Unit circle with two vectors; inner product vs angle (cosine curve).
7. (18–21, 29, 32, 35) 3-D terrain over $[0,20]\times[0,30]$ with floor contour map; gradient and negative gradient arrows; zero-gradient points at peak and valley; iterates $X_0, X_1, X_2$.
8. (25, 29) Convex bowl surface with arrow to the minimum; 1-D curve labeled with global/local min/max and inflection.
9. (28) Three stacked panels $f$, $f'$, $f''$ vs $x \in [0, 6000]$.
10. (31, 32) 1-D basin with flat shoulders; iterate hops $x_0..x_5$.
11. (33, 34, 36) "E" curve with negative/positive slope regions, red → green dots, global minimum.
12. (38, 47) Contour blobs: converging / jittering / diverging arrow paths.
13. (39) 1-D bowl with labeled iterations and shrinking steps.
14. (41) Blue wiggly path on a convex bowl vs stuck on a non-convex plateau.
15. (48, 49) Parabola $E(\omega)$ with $\omega_{min}$; four step-size regimes (a)–(d).
16. (50) Two triples of parabolas in $w_1$ and $w_2$ at different vertical offsets.
17. (51) Elliptical contour map with a single update arrow.
18. (53) Five elliptical contour maps with GD trajectories for five learning rates.

### Notation table

| Symbol | Meaning |
|---|---|
| $Y = f(X) + \epsilon$ | DGP: target = unknown function + noise (slide 3) |
| $g(X)$ | true, unknown data-generating function (slides 4–9) |
| $f(X;\theta)$, $f_\theta(x)$ | model from a parametric class |
| $\theta$, $\hat\theta$ | parameters; the estimate (argmin of the loss) |
| $error(\cdot,\cdot)$ | per-sample error function |
| $R(\theta)$ | true risk $E_{(X,Y)\sim P}[\text{error}]$ |
| $P$ | data-generating distribution (DGP) |
| $\mathcal{D} = \{(X_i, Y_i)\}_{i=1}^n$ | training set |
| $Loss(\theta)$, $EmpiricalError(\theta)$ | empirical risk $\frac1N\sum_i error(f(X_i;\theta), Y_i)$ |
| $\Delta x, \Delta y, \alpha$ | increment, response, local slope |
| $\partial y / \partial x_i$ | partial derivative |
| $\nabla_X y$, $\nabla_X f(X)$ | gradient, a $d\times 1$ column vector |
| $\langle \cdot,\cdot\rangle$ | inner product |
| $\nabla^2_x f$ | Hessian matrix of second partials |
| $X^k$, $\theta^k$, $w^{(k)}$, $\mathbf{w}^{(k)}$ | iterate at step $k$ |
| $\eta^k$, $\eta$ | step size / learning rate (possibly iteration-dependent) |
| $\epsilon, \epsilon_1, \epsilon_2$ | convergence tolerances |
| $E(w)$, $E(\omega)$ | the objective ("energy") in the quadratic analysis |
| $a, b, c$; $a_{ii}$, $b_i$ | quadratic coefficients; per-coordinate curvature |
| $\eta_{opt}$, $\eta_{i,opt}$ | optimal step size $=1/a$; per-coordinate $=1/a_{ii}$ |
| $C(\neg w_i)$ | terms of $E$ not involving $w_i$ |
| $\omega_{min}$ | minimizer of the parabola |

### Prerequisite / "sticky-note" concepts invoked

- **Expectation over a joint distribution** (slide 5, $E_{(X,Y)\sim P}$). Refresher: $E[h(X,Y)] = \int h\, dP$ averages $h$ with weights given by how likely each $(X,Y)$ is; it is a number, not a random variable; the sample mean over i.i.d. draws estimates it (law of large numbers), which is exactly why the empirical risk approximates the true risk.
- **Sample average as an estimator / LLN** (slides 7–10). Refresher: if $Z_i$ are i.i.d. with mean $\mu$, $\frac1n\sum Z_i \to \mu$; the empirical risk is such an average with $Z_i = error(f(X_i;\theta), Y_i)$; so for each fixed $\theta$ the loss is an unbiased estimate of $R(\theta)$.
- **argmin notation** (slides 7, 10). Refresher: $\arg\min_\theta L(\theta)$ is the *argument* achieving the smallest value, not the value; may be non-unique; contrast with $\min$.
- **Derivative as local linear approximation / Taylor first order** (slide 13). Refresher: $f(x+\Delta x) \approx f(x) + f'(x)\Delta x$; "smooth" means this approximation error is $o(\Delta x)$; the derivative is the slope of the tangent.
- **Partial derivatives and the total differential** (slide 15). Refresher: $\partial y/\partial x_i$ holds the other coordinates fixed; for differentiable $f$, $\Delta y \approx \sum_i (\partial y/\partial x_i)\Delta x_i$; this is the multivariate chain of first-order terms.
- **Inner product, norm, angle, Cauchy–Schwarz** (slides 15–17). Refresher: $\langle A,B\rangle = \sum_i A_iB_i = \|A\|\|B\|\cos\phi$; so $|\langle A,B\rangle| \le \|A\|\|B\|$ with equality iff $A \parallel B$; this is the whole reason the gradient is the steepest-ascent direction.
- **Column vs row vectors and transposes** (slides 15, 24, 51). Refresher: the course writes gradients as $d\times 1$ columns so $\nabla y^T\Delta X$ is a $1\times1$ scalar; some slides write $\nabla_w E^\top$ to flip a row-convention gradient into a column.
- **Second derivative, concavity, inflection points** (slides 27–28). Refresher: $f'' > 0$ means slope increasing (locally convex, minimum at a critical point); $f'' < 0$ locally concave; $f'' = 0$ at a critical point is inconclusive (could be inflection or a flat extremum like $x^4$).
- **Hessian, symmetric matrices, eigenvalues, positive definiteness** (slides 22, 30). Refresher: for $C^2$ functions the Hessian is symmetric so it has real eigenvalues and orthogonal eigenvectors; $H \succ 0$ means $v^T H v > 0$ for all $v \neq 0$, equivalently all eigenvalues positive; at a critical point, $H \succ 0$ gives a strict local minimum (second-order sufficient condition).
- **Convexity** (slide 41, "bowl-shaped"). Refresher: $f$ convex iff $f(\lambda x + (1-\lambda)y) \le \lambda f(x) + (1-\lambda) f(y)$; for $C^2$ functions iff Hessian is PSD everywhere; every local minimum of a convex function is global, which is what makes "GD always finds the minimum" true.
- **Fixed point of an iteration** (slide 38). Refresher: $X^*$ is a fixed point of $T$ if $T(X^*) = X^*$; for GD, $T(X) = X - \eta\nabla f(X)$ so fixed points are exactly the stationary points $\nabla f = 0$.
- **Norms** $\|\cdot\|$ (slide 39, 46). Refresher: Euclidean norm $\|v\| = \sqrt{\sum v_i^2}$; used to measure gradient size and parameter change.
- **Quadratic functions and completing the square** (slides 48–53). Refresher: $E = \frac12 a w^2 + bw + c$ has $E' = aw + b$, $E'' = a$, minimizer $w^* = -b/a$ when $a > 0$.
- **Automatic differentiation / computational graph** (slides 45–46). Refresher: PyTorch records operations on tensors with `requires_grad=True`; `.backward()` applies the chain rule in reverse to fill `.grad`; `torch.no_grad()` suspends recording for the parameter update; gradients accumulate unless zeroed/reassigned.

### Derivation gaps (propositions used without full proof)

1. **Empirical risk is an unbiased, consistent estimator of true risk** (slides 5–10). Prove $E[Loss(\theta)] = R(\theta)$ for fixed $\theta$ and LLN convergence; note the subtlety that $\hat\theta$ depends on the data so $Loss(\hat\theta)$ is biased downward (foreshadows generalization/train-test split).
2. **Gradient is the direction of steepest ascent** (slides 15–17). Full proof: $\Delta y \approx \nabla y^T \Delta X = \|\nabla y\|\|\Delta X\|\cos\phi$, maximized at $\phi = 0$ by Cauchy–Schwarz; and the directional derivative $D_u f = \nabla f^T u$ for unit $u$ is maximized at $u = \nabla f/\|\nabla f\|$. Also derive "gradient is perpendicular to level sets" (slide 51's remark).
3. **First-order necessary condition** $\nabla f(X^*) = 0$ at an interior extremum (slides 26, 29–30). Proof via 1-D restriction along each coordinate.
4. **Second-order conditions**: $f''>0$ ⇒ local min in 1-D (slide 27); Hessian PD ⇒ strict local min, ND ⇒ strict local max, indefinite ⇒ saddle (slide 30). Proof via second-order Taylor expansion $f(X^*+v) = f(X^*) + \frac12 v^T H v + o(\|v\|^2)$ and the eigen-characterization of definiteness. Also note "eigenvalues positive ⇔ PD" needs the spectral theorem for symmetric $H$.
5. **Descent lemma / why GD decreases $f$ for small $\eta$**: $f(X - \eta\nabla f) \approx f(X) - \eta\|\nabla f\|^2 < f(X)$. Not shown at all; underpins slides 33–37.
6. **Convergence of GD on convex functions with "appropriate step size"** (slide 41). A rigorous version: for $L$-smooth convex $f$ and $\eta \le 1/L$, $f(X^k) - f^* \le \frac{\|X^0 - X^*\|^2}{2\eta k}$. The slides never define $L$-smoothness; the platform should introduce it as the multivariate analog of "$a$" in the quadratic analysis.
7. **Optimal step size on a quadratic, $\eta_{opt} = 1/a$** (slide 48). Derivation: $E'(w) = aw + b$; one GD step gives $w^{(k+1)} - w^* = (1 - \eta a)(w^{(k)} - w^*)$ where $w^* = -b/a$; the contraction factor $|1 - \eta a|$ is 0 at $\eta = 1/a$. This same identity proves slide 49: $|1-\eta a| < 1 \iff 0 < \eta < 2/a$; $0 < 1 - \eta a < 1$ (monotone) iff $\eta < 1/a$; $-1 < 1 - \eta a < 0$ (oscillating but convergent) iff $1/a < \eta < 2/a$; $|1 - \eta a| > 1$ (divergence) iff $\eta > 2/a$. Newton's method connection: $\eta_{opt} = 1/E''$ is exactly a Newton step.
8. **Uncoupled descents for a diagonal quadratic** (slide 50) and the per-coordinate rates $\eta_{i,opt} = 1/a_{ii}$ (slide 52). Show that for $E = \frac12 w^T A w + b^T w + c$ with diagonal $A$, the GD iteration separates coordinate-wise. Then extend (L5 slide 8) to general symmetric $A$ by diagonalizing: in the eigenbasis each mode has rate $1/\lambda_i$, so the global condition $\eta < 2/\lambda_{max}$ and the convergence speed is governed by the condition number $\lambda_{max}/\lambda_{min}$.
9. **Gradient is perpendicular to equal-value contours** (slide 51). Proof: along a level curve $f(\gamma(t)) = c$, so $\nabla f^T \gamma'(t) = 0$.
10. **Gradient of MSE for linear regression** (slides 45–46 rely on autograd). The platform should derive $\nabla_\theta \frac1n\|X\theta - y\|^2 = \frac2n X^T(X\theta - y)$ by hand and tie it to the LMS/Widrow–Hoff rule mentioned in the notebook, and show that this quadratic loss has Hessian $\frac2n X^TX$, so $\eta_{opt}$ analysis applies directly (explains why the diabetes example converges slowly: the `one` column and `bmi` column have very different scales → ill-conditioned $X^TX$).

### Poll Everywhere / in-class questions

**Slide 11 — "Select all correct statements":**
1. To optimize the loss function, we want $error(f, g)$ to be differentiable with respect to $f$. *(True — needed for gradient-based optimization.)*
2. We call $error(f,g)$ the empirical risk because it is only an empirical approximation to the true risk (the shaded area between $f$ and $g$). *(False as worded — the empirical risk is the *average* of per-sample errors, not the per-sample error function itself.)*
3. For a given training set, the loss is only a function of $\theta$. *(True.)*
4. Minimizing the loss function $loss(\theta)$ with respect to $\theta$ is a problem of function minimization, which is an instance of optimization and can be solved using gradient descent. *(True.)*
5. The loss function quantifies the mismatch between the model output and the target function. *(True — the professor's framing.)*
6. The error function should satisfy: 1. $error(f(X_i;\theta), g(X_i)) > 0$ if $f(X_i,\theta) = g(X_i)$; 2. $error(f(X_i,\theta), g(X_i)) = 0$ if $f(X_i,\theta) \ne g(X_i)$. *(False — the conditions are reversed; error should be 0 when they agree and positive otherwise.)*

**Slide 23 — "Select all that are true about derivatives of a scalar function $f(X)$ of multivariate inputs":**
1. At any location $X$, there may be many directions in which we can step such that $f(X)$ increases. *(True — any direction with positive inner product with the gradient.)*
2. The direction of the gradient is the direction in which the function increases the fastest. *(True.)*

**Slide 24 — "$y = f(X)$ is a scalar function of an $N\times1$ column vector variable $X$. What is the shape of the gradient of $y$ with respect to $X$?"** Options: Scalar / $N\times1$ column vector / $1\times N$ row vector. *(Answer per the course convention: $N\times 1$ column vector.)*

**Slide 42 — "$y = f(X)$ is a scalar function of an $N\times1$ column vector $X$. Starting from $X = X^0$, in which direction must we move in the space of $X$ to achieve the maximum decrease in $f$?"** Options: exactly in the direction of the gradient at $X^0$ / exactly perpendicular / exactly opposite. *(Answer: exactly opposite.)*

**Discussion prompt (slide 37):** "Why do we want to yield the largest change in the objective function?"

### Continuity

- **From L3:** L3 introduced model class, loss functions (absolute error, MSE, RMSE, $R^2$), the diabetes/BMI linear regression example, and a first mention of gradient descent and the data-generating distribution. L4 starts with "Recap: Data Generating Process" and formalizes true risk vs empirical risk, then makes GD rigorous.
- **To L5:** L4 ends mid-argument — slide 52 ("Problem with Vector Update Rule") shows only the formula $\eta_{i,opt} = a_{ii}^{-1}$ with no bullets, and slide 53 shows the five-learning-rate experiment. L5 slides 3–7 repeat L4 slides 47, 49, 50, 53, and complete slide 52 with the condition $\eta < 2\min_i \eta_{i,opt}$. **L4 and L5's first 16 slides form one continuous "Gradient Descent" unit.**
- **Grouping recommendation:** Unit "Empirical Risk & Gradient Descent" = L4 slides 1–53 + L5 slides 1–16. Unit "Logistic Regression & Maximum Likelihood" = L5 slides 17–50 + L6 (which re-derives MLE, adds KL divergence, softmax, and classification metrics).

### Concept-graph edges (A -> B means B depends on A)

- Data-generating process (L3) -> True risk
- Expectation -> True risk
- True risk -> Empirical risk
- Law of large numbers / sample mean -> Empirical risk
- Loss function (L3: MSE) -> Empirical risk
- Empirical risk -> Supervised learning as optimization ($\hat\theta = \arg\min Loss$)
- Derivative (1-D) -> Partial derivative
- Partial derivative -> Gradient
- Inner product / Cauchy–Schwarz -> Gradient is steepest ascent
- Gradient -> Gradient is steepest ascent
- Gradient is steepest ascent -> Gradient descent update rule
- Derivative -> Critical points ($f' = 0$)
- Second derivative -> 1-D second-order conditions
- Gradient -> Hessian
- Eigenvalues / positive definiteness -> Multivariate second-order conditions
- Hessian -> Multivariate second-order conditions
- Critical points -> Closed-form minimization (solve $\nabla f = 0$)
- Closed-form minimization fails -> Iterative solutions
- Iterative solutions -> Gradient descent algorithm
- Fixed point -> Convergence definition
- Norm -> Convergence criteria
- Gradient descent algorithm -> GD for supervised learning ($\theta^{k+1} = \theta^k - \eta^k\nabla_\theta Loss$)
- GD for supervised learning -> GD for linear regression (PyTorch)
- Autograd -> GD for linear regression (PyTorch)
- Convexity -> Convergence guarantee of GD
- Quadratic function / second derivative -> Optimal step size $\eta_{opt} = 1/a$
- Optimal step size -> Step-size regimes ($<\eta_{opt}$, $(\eta_{opt}, 2\eta_{opt})$, $>2\eta_{opt}$)
- Step-size regimes -> Per-coordinate optimal rates (uncoupled descents)
- Per-coordinate optimal rates -> Problem with a single learning rate (L5 slide 7)
- Hessian eigenvalues -> Condition number & convergence speed (L5 slides 8–9)
- GD for supervised learning -> Logistic regression optimization (L5)
- Empirical risk -> MLE as a way to define the loss (L5)

### Suggested interactive widgets

1. **True vs empirical risk explorer:** draw a hidden $g(X)$, sample $n$ points with noise, overlay a parametric $f(X;\theta)$ with sliders; show shaded true-risk area vs the bar-average empirical risk; a "resample" button shows the empirical risk fluctuating around the true risk; a slider for $n$ shows the LLN.
2. **Tangent-line / local-linearity zoom:** zoom into a smooth curve at a point and watch it become a line; display $\Delta y \approx f'(x)\Delta x$.
3. **Inner-product dial:** fixed gradient vector, draggable unit $\Delta X$; live readout of $\langle\nabla f, \Delta X\rangle$ and the cosine plot from slide 16 with a moving marker.
4. **Gradient on a surface:** 2-D contour map (the slide-18 terrain or a user-picked function); hover shows $\nabla f$ arrow, $-\nabla f$ arrow, and the perpendicularity to the contour; mark zero-gradient points.
5. **$f, f', f''$ triple-panel:** draggable point on $f$; highlight sign of $f'$ and $f''$ and label the critical-point type (slide 28 recreated interactively).
6. **Hessian classifier:** enter a 2×2 symmetric matrix (or drag eigenvalues); render the quadratic surface and label min/max/saddle.
7. **GD on a 1-D parabola with $\eta$ slider** ($E = \frac12 a w^2 + bw + c$): show the contraction factor $1 - \eta a$, iterates, and the four regimes from slide 49; markers at $\eta_{opt}$ and $2\eta_{opt}$.
8. **GD on a 2-D elliptical bowl with $\eta$ slider and $a_{11}, a_{22}$ sliders:** reproduce slide 53's five panels; display condition number $a_{22}/a_{11}$ and the per-coordinate $\eta_{i,opt}$; toggle "rotate the ellipse" to show that the analysis holds in the eigenbasis.
9. **Stopping-criterion comparator:** run GD on a chosen function and show when each of the three criteria ($|\Delta f| < \epsilon_1$, $\|\nabla f\| < \epsilon_2$, $\|\Delta\theta\| < \epsilon_3$) would trigger.
10. **Autograd step-through:** a tiny computational graph for $\ell(\theta) = 0.5(2\theta_1 - 2)^2 + 0.5(\theta_0 - 3)^2$ showing forward values and reverse-mode gradient accumulation, matching the notebook output $(-5, 8)$ at $\theta = (-2, 3)$.
11. **Diabetes GD trainer:** replay the notebook's 10,000-iteration loss curve; sliders for $\eta$ and for feature scaling to show how rescaling `bmi` fixes the slow convergence.

---

## L5: GD, Logistic Regression, Classification (50 pages)

### One-paragraph summary and where it sits in the course arc

L5 has two halves. Slides 1–16 finish the gradient-descent story started in L4: the single learning rate must satisfy $\eta < 2\min_i \eta_{i,opt}$, a Taylor expansion shows the same analysis governs any smooth convex function via the Hessian's eigenvalues, convergence is slow when the ratio of largest to smallest $\eta_{i,opt}$ (the condition number) is large, large learning rates can escape local optima in non-convex problems, decaying learning-rate schedules (linear, quadratic, exponential) are introduced, and SGD/minibatch SGD plus the `torch.optim` zoo are presented as the practical fix. Slides 17–50 introduce binary classification through the Iris dataset, show that linear regression thresholded at 0.5 is a poor classifier (unbounded outputs), introduce the sigmoid and logistic regression $f_\theta(x) = \sigma(\theta^T x)$, argue through a 1-D non-separable example that the right target is $P(Y=1|X)$, explain why 0/1 error is not differentiable so a new objective is needed, introduce the maximum likelihood principle (dice and Gaussian intuition examples), and derive the logistic-regression log-likelihood from the factorization $P(X_i, y_i) = P(y_i|X_i)P(X_i)$, ending with $\hat\theta = \arg\min_\theta \sum_i -\log[y_i\sigma(\theta^T X_i) + (1-y_i)(1-\sigma(\theta^T X_i))]$ and the claim that this equals minimizing KL divergence and must be solved with gradient descent.

### Learning objectives (stated or clearly implied)

1. State the condition $\eta < 2\min_i \eta_{i,opt}$ for convergence of fixed-step GD on a quadratic and explain why one global rate is slow and oscillatory.
2. Use the second-order Taylor expansion to relate step-size behavior on general convex functions to Hessian eigenvalues; explain why a large condition number slows convergence.
3. Describe decaying learning-rate schedules and when a large learning rate helps (escaping local optima) or hurts (never converging).
4. Describe SGD and minibatch SGD ("noisy but unbiased") and the standard PyTorch optimizer loop.
5. Distinguish classification from regression (regions of feature space vs curve through outputs) and explain why classifiers output class probabilities.
6. Explain why thresholded linear regression is unsatisfactory for binary labels and how the sigmoid fixes boundedness.
7. Define the sigmoid $\sigma(z) = 1/(1+\exp(-z))$, its limits, its probabilistic interpretation $P_\theta(y=1|X) = \sigma(\theta^TX)$, and its derivative $\sigma'(z) = \sigma(z)(1-\sigma(z))$.
8. Explain why the 0/1 error $|\hat y_i - y_i|$ cannot be optimized by gradient descent.
9. State the maximum likelihood principle and apply it to derive the logistic-regression objective (negative log-likelihood), including why $\sum_i \log P(X_i)$ can be dropped.
10. Recognize that logistic regression has no closed-form solution and is trained by GD.

### Ordered concept walkthrough

**Slide 1–2: Title, announcements.** HW2 released on Canvas by Friday; Quiz, Report & Code due Mon Oct 5, 11:59 PM ET on Gradescope. HW2 Q1(d): observe by experiments; Q1(e) bonus: mathematical proof; Q2: **clinical trial success rate prediction**; part (i) bonus: top 10 on leaderboard, "Key: combine the datasets."

**Slides 3–6: Recap of L4 slides 47, 49, 50, 53** (converging/jittering/diverging; non-optimal step size regimes; uncoupled descents; dependence on learning rate). Identical content.

**Slide 7: Problem with Vector Update Rule (completed).** STATED-ONLY.
$$\mathbf{w}^{(k+1)} \leftarrow \mathbf{w}^{(k)} - \eta\nabla_{\mathbf{w}}E^T, \qquad w_i^{(k+1)} = w_i^{(k)} - \eta\frac{\partial E(w_i^{(k)})}{\partial w}, \qquad \eta_{i,opt} = \left(\frac{\partial^2 E(w_i^{(k)})}{\partial w_i^2}\right)^{-1} = a_{ii}^{-1}$$
"The learning rate must be lower than twice the smallest optimal learning rate for any component:
$$\eta < 2\min_i \eta_{i,opt}$$
Otherwise the learning will diverge. This, however, makes the learning very slow, and will oscillate in all directions where $\eta_{i,opt} \le \eta < 2\eta_{i,opt}$."

**Slide 8: Generic Differentiable Multivariate Convex Functions.** STATED-ONLY. Figures: a rounded-square contour plot with a yellow start point and the minimum at the origin; a 3-D surface with values up to $6\times10^4$. "For generic convex multivariate functions (not necessarily quadratic), we can employ quadratic Taylor series expansions and much of the analysis still applies":
$$E(\mathbf{w}) \approx E(\mathbf{w}^{(k)}) + \nabla_{\mathbf{w}}E(\mathbf{w}^{(k)})(\mathbf{w} - \mathbf{w}^{(k)}) + \tfrac{1}{2}(\mathbf{w} - \mathbf{w}^{(k)})^T H_E(\mathbf{w}^{(k)})(\mathbf{w} - \mathbf{w}^{(k)})$$
"**The optimal step size is inversely proportional to the eigenvalues of the Hessian.**"

**Slide 9: Convergence.** STATED-ONLY. Convergence behaviors become increasingly unpredictable as dimensions increase. For the fastest convergence, ideally $\eta$ must be close to both the largest $\eta_{i,opt}$ and the smallest $\eta_{i,opt}$ (to ensure convergence in every direction) — generally infeasible. "Convergence is particularly slow if $\dfrac{\max_i \eta_{i,opt}}{\min_i \eta_{i,opt}}$ is large." (This ratio equals the Hessian condition number $\lambda_{max}/\lambda_{min}$.)

**Slide 10: The Learning Rate.** Figure: a wiggly non-convex 1-D loss with red arrows bouncing between two shallow local basins. "For complex models the loss function is often not convex. Having $\eta > 2\eta_{opt}$ can actually help escape local optima. However, always having $\eta > 2\eta_{opt}$ will ensure that you never ever actually find a solution."

**Slide 11: Decaying Learning Rate.** STATED-ONLY. Figure: same wiggly curve; a large first jump out of a basin, then progressively smaller jumps settling into the deeper left basin (annotation: "Note: this is actually a *reduced* step size"). "Start with a large learning rate (greater than 2 [i.e. $>2\eta_{opt}$]); gradually reduce it with iterations. Typical decay schedules":
- Linear decay: $\eta_k = \dfrac{\eta_0}{k+1}$
- Quadratic decay: $\eta_k = \dfrac{\eta_0}{(k+1)^2}$
- Exponential decay: $\eta_k = \eta_0 e^{-\beta k}$, where $\beta > 0$

**Slide 12: Poll (see poll section).**

**Slide 13: Story So Far — Convergence.** GD can miss obvious answers (and this may be a good thing). Convergence issues abound: the loss surface has many **saddle points** (GD can stagnate on them); vanilla GD may not converge or may converge "tooooo slowly"; the optimal learning rate for one component may be too high or too low for others.

**Slide 14: Solution — Stochastic gradient descent (SGD).** STATED-ONLY. Approximate the gradient at each step using either 1 sample (true SGD) or a few (minibatch SGD); **noisy but unbiased**; still guaranteed to converge to the global minimum for convex loss surfaces; much faster to compute the gradient at each step since only a subset of the data is used.

**Slide 15: Solution — Other optimizers.** Link to `https://pytorch.org/docs/stable/optim.html`; `torch.optim` list: Adadelta, Adagrad, Adam, AdamW, SparseAdam, Adamax, ASGD, LBFGS, NAdam, RAdam, RMSprop, Rprop, SGD. Standard loop:
```
for input, target in dataset:
    optimizer.zero_grad()
    output = model(input)
    loss = loss_fn(output, target)
    loss.backward()
    optimizer.step()
```

**Slide 16: Take Away.** Given a fixed dataset, the loss function is only a function of $\theta$; we can use gradient descent to identify the "best" $\theta$ that minimizes the loss.

**Slide 17: Section title — Logistic Regression.**

**Slides 18–19: Binary Classification Refresher.** Binary classification: target $y \in \{0,1\}$. Iris dataset photos (Iris setosa, Iris versicolor, Iris virginica with petal/sepal labeled). Task: distinguish class 0 (Iris Setosa) from the other two classes. Slide 19 scatter: Sepal Length ($x$, 4.3–8.0) vs Sepal Width ($y$, 2.0–4.4); light-blue "Setosa" cluster upper-left, brown "Non-Setosa" to the right.

**Slides 20–21: Classification vs Regression.** In regression the goal is to fit a curve through the output space close to the targets $y^{(i)}$. In classification, classes are associated with **regions of the feature space**; goal: find the boundaries between these regions; output of classification models: **probabilities** that a data point belongs to a given class. Figures: $x_1$–$x_2$ scatter with red points inside two gray polygons among blue points; 3-D version with red polyhedral regions on a plane; slide 21 shows the same with fuzzy/blurred region edges (probabilistic boundary).

**Slides 22–23: First Attempt — Linear Regression.** Set $\mathcal{Y} = \{0,1\}$. Run a linear regression $Y = \theta^T X$ and minimize MSE. Slide 23: color plot of the decision regions — predict 1 if regression outcome $> 0.5$, 0 if $< 0.5$; a straight diagonal boundary; one Setosa point (~sepal length 4.5, width 2.3) falls on the wrong side.

**Slide 24: Issues with Linear Regression.** The predicted output $\hat y_i$ might be negative; no guarantee the output is bounded between 0 and 1. **Solution: pass the output through a sigmoid function to force the output between 0 and 1.** Figure: sigmoid plot $f(x) = \frac{1}{1+e^{-x}}$ over $x \in [-8, 8]$.

**Slide 25: Logistic Regression — The Model.** STATED-ONLY.
$$\text{Sigmoid function: } \sigma(z) = \frac{1}{1 + \exp(-z)}$$
$$\text{Logistic regression: } f_\theta(x) = \sigma(\theta^T x) = \frac{1}{1 + \exp(-\theta^T x)}$$
Highlighted: "This is a binary classification algorithm."

**Slide 26: The Logistic Function — Properties.** STATED-ONLY. Bounded between 0 and 1; tends to 1 as $z \to \infty$ and 0 as $z \to -\infty$; the output resembles a probability.

**Slide 27: Non-linearly separable data — 1-D example.** Figure: $x$-axis with blue dots at $y = 0$ (spanning roughly $x \in [-4, 1.5]$) and red dots at $y = 1$ (spanning roughly $x \in [-1.5, 4]$), overlapping around the origin. All red dots at $Y=1$ are class 1; blue at $Y=0$ class 0. The data are not linearly separable: in 1-D a linear separator is a threshold, and no threshold cleanly separates red and blue.

**Slide 28: Undesired Function.** Green piecewise-constant function that jumps between 0 and 1 to match every single point — an overfit "staircase" — labeled undesired.

**Slide 29: What if?** Zoom into a single $x$ with 90 red instances and 10 blue instances stacked at the same location. "What must the value of the function be at this $X$? 1 because red dominates? 0.9: the average?" Yellow box: **Estimate $\approx P(Y=1|X)$** — "potentially much more useful than a simple 1/0 decision; also potentially more realistic."

**Slide 30: What if? (continued).** "Should an infinitesimal nudge of the red dot change the function estimate entirely? If not, how do we estimate $P(1|X)$? (since the positions of the red and blue $X$ values are different)."

**Slide 31: The Probability of $Y=1$.** Figure: the 1-D data with big blue dots forming an S-shaped curve from 0 (left) to 1 (right); a yellow window highlights a local neighborhood. "At each point look at a small window around that point; plot the average value within the window — this is an approximation of the probability of $Y=1$ at that point." (Kernel-smoothing intuition.)

**Slide 32: The Probability of $Y=1$ (model).** The blue S-curve is now $f_\theta(x) = \sigma(\theta^T x) = \frac{1}{1+\exp(-\theta^T x)}$. "Class 1 becomes increasingly probable going left to right. Given the training data $\mathcal{D} = \{(X_i, y_i)\,|\,i = 1,\dots,n\}$, estimate $\theta_0$ and $\theta_1$ for the curve. Given $\theta_0, \theta_1$, can calculate how probable the actual classes are given the features. What is the probability of seeing $Y=1$ given input $X$ here? What about $Y=0$?" (Here $\theta = (\theta_0, \theta_1)$ with $\theta_0$ the intercept, i.e. $\theta^T x = \theta_0 + \theta_1 x$.)

**Slide 33: Probabilistic Interpretations.** STATED-ONLY.
$$P_\theta(y = 1\,|\,X) = \sigma(\theta^T X), \qquad P_\theta(y = 0\,|\,X) = 1 - \sigma(\theta^T X)$$

**Slide 34: Properties — derivative.** STATED-ONLY.
$$\frac{d\sigma}{dz} = \sigma(z)\big(1 - \sigma(z)\big)$$
"Sigmoid is easy to take derivative — can use gradient descent to optimize."

**Slide 35: How Do We Optimize Logistic Regression?** Which optimizer? Some variants of gradient descent. Which objective function? "What is my prediction $\hat y_i$? I can threshold my output probability to make the output binary. The error $|\hat y_i - y_i|$ is **not continuous**; small perturbation in the model parameter might not yield any change in the error!"

**Slide 36: How Do We Optimize Classification?** Need to think about the **likelihood** of seeing this data given the model parameters instead. Within my model class, find the parameters most likely to **generate** the data. **Maximum Likelihood Estimation defines the "best fit."**

**Slide 37: Story so far.** Given a loss function differentiable w.r.t. parameters, we can always optimize with GD. To define the loss we need the maximum likelihood estimator: the parameters most likely to generate the data. Highlighted: "**Maximum likelihood estimator defined the loss function in many cases!**"

**Slide 38: Poll (see poll section).**

**Slide 39 (repeated as 43): The Maximum Likelihood Principle.** STATED-ONLY. Given observed data $\mathcal{D} = \{(X_i, y_i)\,|\,i=1,\dots,n\}$; choose a model $P_\theta(y|X)$ for the distribution of $y|X$, with $\theta$ the parameters; estimate the $\theta$ such that $P_\theta(y|X)$ best "fits" the observations $\mathcal{D}$, hoping it also represents data outside the training set.

**Slide 40: An Example — Multinomials.** A dice roller rolls dice ("6 3 1 5 4 1 2 4 …") and you plot the histogram of outcomes $n_1,\dots,n_6$. The distribution is a multinomial with parameters $p_1,\dots,p_6$. Two candidate distributions are shown as bar charts (one roughly matching the histogram's shape with $p_2, p_4$ tall; one not). "Which of the two is more likely to be the distribution for the dice? Why?"

**Slide 41: An Example — Gaussian.** Left: histogram of observations (bell-shaped, centered ~0, range $[-5, 5]$, counts up to ~450). We model it as Gaussian with parameters mean $\mu$ and variance $\sigma^2$. Right: three candidate Gaussians overlaid (green: shifted left; red: matches; yellow: too wide). "Which is most likely the actual PDF of the RV? Why?"

**Slide 42: Defining the "Best fit" — Maximum Likelihood.** The data are generated by draws from the distribution. **Assumption: the world is a boring place** — the data you have observed are very typical of the process. Consequent assumption: the distribution has a high probability of generating the observed data (not necessarily true). Select the distribution that has the highest probability of generating the data; it should assign lower probability to less frequent observations and vice versa.

**Slides 44–47: Estimating the Model — Logistic Regression.** DERIVED (step by step, including handwritten work on slide 46).
Given $\mathcal{D} = \{(X_i, y_i)\}_{i=1}^n$, total probability of the data **(assuming independence)**:
$$P\big((X_1,y_1),\dots,(X_n,y_n)\big) = \prod_{i=1}^n P(X_i, y_i) = \prod_{i=1}^n P(y_i|X_i)\,P(X_i)$$
"Express this term in terms of the things that we know":
$$= \prod_{i=1}^n \big[y_i\,\sigma(\theta^T X_i) + (1-y_i)\big(1 - \sigma(\theta^T X_i)\big)\big]\,P(X_i)$$
Slide 45: split the product: $= \prod_i [\cdots]\;\prod_i P(X_i)$. "How to make this easier to calculate? **Linearize this by taking the logarithm.**" Slide 46 (handwritten): $\log(ab) = \log a + \log b$, so
$$\log(\cdots) = \log\Big(\prod_i [y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))]\Big) + \log\Big(\prod_i P(X_i)\Big) = \sum_{i=1}^n \log\big[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))\big] + \sum_{i=1}^n \log P(X_i)$$
Slide 47 (typed): same, with the $\sum_i \log P(X_i)$ term circled: "**fixing the data. This is a constant!**"

**Slide 48: Maximum Likelihood Estimation.** DERIVED.
Log likelihood (yellow box: $P((X_1,y_1),\dots,(X_n,y_n)) = \prod_{i=1}^n P(y_i|X_i)P(X_i)$):
$$\log P\big((X_1,y_1),\dots,(X_n,y_n)\big) = \sum_i \log[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))] + \sum_i \log P(X_i)$$
Maximum likelihood estimation:
$$\hat\theta = \arg\max_\theta \log P\big((y_1,X_1),\dots,(y_n,X_n)\big)$$
Focusing on the bits that invoke the parameters:
$$\hat\theta = \arg\max_\theta \log P\big((y_1|X_1),\dots,(y_n|X_n)\big)$$
$$\hat\theta = \arg\max_\theta \sum_i \log[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))]$$
$$\hat\theta = \arg\min_\theta \sum_i -\log[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))]$$

**Slide 49: Poll (see poll section).**

**Slide 50: Maximum Likelihood Estimate.** STATED-ONLY. "Equals (note argmin rather than argmax)"
$$\hat\theta = \arg\min_\theta \sum_i -\log[y_i\sigma(\theta^TX_i) + (1-y_i)(1-\sigma(\theta^TX_i))]$$
"Identical to minimizing the **KL divergence** between the desired output $y$ and actual output $\sigma(\theta^TX)$. Maximum likelihood learning of a logistic minimizes the KL divergence between its output and the target output. **Cannot be solved directly, needs gradient descent.**" (KL divergence is defined and this claim is expanded in L6.)

**Important notational note for lesson writers:** the professor writes the Bernoulli likelihood in the *additive* form $y\sigma + (1-y)(1-\sigma)$ rather than the standard *multiplicative* form $\sigma^{y}(1-\sigma)^{1-y}$. For $y \in \{0,1\}$ these are pointwise equal, so $-\log[y\sigma + (1-y)(1-\sigma)] = -[y\log\sigma + (1-y)\log(1-\sigma)]$ — the usual binary cross-entropy. The slides never make this equivalence explicit; the platform should.

### Running examples and datasets used

- **Iris flower dataset** (slides 18–25, notebooks): 150 samples, 3 classes of 50; features sepal length, sepal width, petal length, petal width (cm). Binary task: class 0 (Setosa) vs classes 1–2 merged, using only the first two features (sepal length ∈ [4.3, 7.9], sepal width ∈ [2.0, 4.4]). Summary statistics from `iris.DESCR`: sepal length mean 5.84 SD 0.83; sepal width mean 3.05 SD 0.43; petal length mean 3.76 SD 1.76; petal width mean 1.20 SD 0.76.
- **1-D non-separable synthetic data** (slides 27–32): blue (class 0) and red (class 1) dots overlapping on the $x$-axis; the "90 red / 10 blue at one $x$" thought experiment giving $P(Y=1|X) = 0.9$.
- **Dice multinomial** (slide 40): roll sequence "6 3 1 5 4 1 2 4 …", counts $n_1..n_6$, parameters $p_1..p_6$.
- **Gaussian histogram** (slide 41): ~10k draws centered at 0, three candidate PDFs.
- **Clinical trial success rate prediction** is named as HW2 Q2 (slide 2) but not developed in the slides.
- **Diagonal 2-D quadratic** with $\eta_{1,opt}=1$, $\eta_{2,opt}=0.33$ (recap slide 6).

### Figures/visualizations shown on slides

1. (3–6) Recap figures from L4 (contour convergence types, four step-size parabolas, uncoupled parabolas, five learning-rate trajectories).
2. (8) Rounded-square contour plot of a non-quadratic convex function with start point; its 3-D surface.
3. (10–11) Wiggly non-convex 1-D loss with large-step arrows bouncing between basins; with decaying steps settling into the deep basin.
4. (18) Photos of the three Iris species with petal/sepal arrows.
5. (19, 22) Iris scatter: Sepal Length vs Sepal Width colored Setosa / Non-Setosa.
6. (20–21) Feature-space regions: polygonal class regions in $x_1$–$x_2$ and on a 3-D plane; fuzzy-edged version for probabilistic outputs.
7. (23) Linear-regression decision regions (blue vs brown halves separated by a diagonal line) over the Iris scatter; one misclassified Setosa point.
8. (24–26, 33–34) Sigmoid curve $f(x) = 1/(1+e^{-x})$ on $x \in [-8, 8]$, $f \in [0,1]$.
9. (27) 1-D two-class dots at $y=0$ and $y=1$.
10. (28) Green staircase "undesired function" fitting every point.
11. (29–30) Zoom: 90 red vs 10 blue instances stacked at one $x$.
12. (31) Sliding-window average forming an S-curve of large blue dots; yellow window ellipse.
13. (32) Fitted sigmoid $f_\theta(x)$ over the 1-D data.
14. (40) Dice histogram $n_1..n_6$ and two candidate $p$ bar charts.
15. (41) Gaussian histogram and three candidate Gaussian curves (green, red, yellow).

### Notation table

| Symbol | Meaning |
|---|---|
| $\eta_{i,opt} = a_{ii}^{-1}$ | optimal rate for coordinate $i$ of a diagonal quadratic |
| $\eta < 2\min_i \eta_{i,opt}$ | global stability condition for a single rate |
| $H_E(\mathbf{w}^{(k)})$ | Hessian of $E$ at the current iterate |
| $\max_i\eta_{i,opt} / \min_i\eta_{i,opt}$ | spread of optimal rates (condition number) |
| $\eta_k, \eta_0, \beta$ | decayed rate at step $k$, initial rate, exponential decay constant |
| $y \in \{0,1\}$, $\mathcal{Y} = \{0,1\}$ | binary label and label space |
| $y^{(i)}$ | target of sample $i$ (regression slide 20) — same as $y_i$ |
| $\hat y_i$ | predicted label |
| $\sigma(z) = 1/(1+\exp(-z))$ | sigmoid / logistic function |
| $z = \theta^T x$ | the linear score (logit) |
| $f_\theta(x) = \sigma(\theta^T x)$ | logistic regression model |
| $\theta_0, \theta_1$ | intercept and slope in the 1-D example |
| $P_\theta(y|X)$ | model's conditional distribution of the label |
| $P(Y=1|X)$, $P(1|X)$ | conditional probability of class 1 |
| $P(X_i)$ | marginal density of the input (a constant w.r.t. $\theta$) |
| $P((X_1,y_1),\dots,(X_n,y_n))$ | joint likelihood of the dataset |
| $p_1,\dots,p_6$; $n_1,\dots,n_6$ | multinomial parameters; observed counts |
| $\mu, \sigma^2$ | Gaussian mean and variance (slide 41 — note $\sigma$ clash with the sigmoid) |
| $\log$ | natural logarithm |
| KL divergence | named on slide 50, defined in L6 |
| true SGD / minibatch SGD | gradient from 1 sample / a few samples |

### Prerequisite / "sticky-note" concepts invoked

- **Second-order Taylor expansion in $\mathbb{R}^d$** (slide 8). Refresher: $f(w) \approx f(w_0) + \nabla f(w_0)^T(w-w_0) + \frac12 (w-w_0)^T H(w_0)(w-w_0)$; near a minimum the first-order term vanishes and the function looks like a quadratic with curvature matrix $H$; this is why the quadratic analysis transfers.
- **Eigen-decomposition of a symmetric matrix / condition number** (slides 8–9). Refresher: $H = Q\Lambda Q^T$ with orthonormal $Q$; in the rotated coordinates $v = Q^T(w - w^*)$ the quadratic becomes $\sum_i \frac12\lambda_i v_i^2$, so each eigen-direction is an uncoupled 1-D parabola with $\eta_{i,opt} = 1/\lambda_i$; $\kappa = \lambda_{max}/\lambda_{min}$ controls how slow the slowest direction is when $\eta$ is set by the fastest.
- **Saddle points** (slide 13). Refresher: critical points where the Hessian has both positive and negative eigenvalues; gradient is zero so GD stalls, though they are unstable to perturbation.
- **Unbiased estimator** (slide 14, "noisy but unbiased"). Refresher: an estimator $\hat g$ of $g$ is unbiased if $E[\hat g] = g$; a minibatch gradient $\frac1{|B|}\sum_{i\in B}\nabla \ell_i$ with $B$ sampled uniformly has expectation equal to the full gradient $\frac1n\sum_i \nabla\ell_i$.
- **Convergent series / learning-rate schedules** (slide 11). Refresher: Robbins–Monro conditions $\sum\eta_k = \infty$, $\sum \eta_k^2 < \infty$ (satisfied by $\eta_0/(k+1)$ but not by $\eta_0/(k+1)^2$ or exponential decay, which may stop too early) — not in the slides but needed for rigor.
- **Exponential function, limits** (slides 24–26). Refresher: $e^{-z} \to 0$ as $z \to \infty$ and $\to\infty$ as $z\to-\infty$, giving $\sigma \to 1$ and $\sigma \to 0$; $\sigma(0) = 1/2$; $\sigma(-z) = 1-\sigma(z)$.
- **Chain rule / quotient rule** (slide 34). Refresher: $\sigma(z) = (1+e^{-z})^{-1}$, so $\sigma'(z) = e^{-z}(1+e^{-z})^{-2} = \sigma(z)\cdot\frac{e^{-z}}{1+e^{-z}} = \sigma(z)(1-\sigma(z))$.
- **Bernoulli distribution** (slides 33, 44). Refresher: $Y \sim \text{Bernoulli}(p)$ has $P(Y=1)=p$, $P(Y=0)=1-p$, compactly $P(Y=y) = p^y(1-p)^{1-y}$; logistic regression sets $p = \sigma(\theta^TX)$.
- **Conditional probability and the product rule** (slide 44). Refresher: $P(X, y) = P(y|X)P(X)$; for a discriminative model we only parametrize $P(y|X)$, so $P(X)$ is a nuisance factor that drops out of the argmax.
- **Independence of samples (i.i.d.)** (slide 44). Refresher: the joint probability of independent draws factorizes into a product; this is what turns the dataset likelihood into $\prod_i P(X_i,y_i)$.
- **Logarithm properties and monotonicity** (slides 45–48). Refresher: $\log(ab) = \log a + \log b$; $\log$ is strictly increasing so $\arg\max \log L = \arg\max L$; and $\arg\max L = \arg\min(-L)$.
- **Likelihood vs probability** (slides 39–42). Refresher: the likelihood $L(\theta) = P_\theta(\text{data})$ is the same formula as the probability of the data but viewed as a function of $\theta$ with data fixed; it does not integrate to 1 over $\theta$.
- **Multinomial and Gaussian distributions** (slides 40–41). Refresher: multinomial likelihood $\propto \prod_k p_k^{n_k}$ with $\sum p_k = 1$ (MLE $\hat p_k = n_k/n$); Gaussian density $\frac{1}{\sqrt{2\pi\sigma^2}}e^{-(x-\mu)^2/2\sigma^2}$ (MLE $\hat\mu$ = sample mean, $\hat\sigma^2$ = sample variance with $1/n$).
- **Linear separability / threshold classifiers** (slides 23, 27). Refresher: data are linearly separable if some hyperplane $\theta^Tx = 0$ puts all class-1 points on one side; in 1-D a hyperplane is a single threshold.
- **Decision boundary of logistic regression** (poll slide 38). Refresher: predict 1 iff $\sigma(\theta^Tx) > 0.5$ iff $\theta^Tx > 0$ — a hyperplane in feature space, hence linear in $x$, but nonlinear in the original inputs if $x$ contains engineered features (e.g., $x^2$).
- **KL divergence** (slide 50). Refresher: $D_{KL}(p\|q) = \sum_y p(y)\log\frac{p(y)}{q(y)} \ge 0$ with equality iff $p = q$; with $p$ = empirical label distribution (a point mass at $y_i$) and $q = P_\theta(\cdot|X_i)$, $D_{KL} = -\log q(y_i)$ + const, so minimizing average KL equals minimizing the negative log-likelihood (cross-entropy).

### Derivation gaps (propositions used without full proof)

1. **$\eta < 2\min_i\eta_{i,opt}$ is necessary and sufficient for fixed-step GD to converge on a diagonal quadratic** (slide 7). From the per-coordinate contraction $|1-\eta a_{ii}| < 1$ for all $i$.
2. **General quadratics and convex functions: the role of Hessian eigenvalues** (slide 8). Diagonalize $H$; show each eigen-mode contracts by $|1 - \eta\lambda_i|$; derive the stability condition $\eta < 2/\lambda_{max}$ and the best fixed rate $\eta^* = 2/(\lambda_{max}+\lambda_{min})$ with contraction factor $(\kappa-1)/(\kappa+1)$ — this makes slide 9's "slow if the ratio is large" precise.
3. **Why $\eta > 2\eta_{opt}$ can escape local optima but never converges** (slide 10). Explain via the local quadratic model at each basin.
4. **Decaying schedules: which ones guarantee convergence** (slide 11). Robbins–Monro conditions; show $\eta_0/(k+1)$ diverges in sum (good) while $\eta_0/(k+1)^2$ and $\eta_0 e^{-\beta k}$ have finite total travel $\sum\eta_k$, so they can stall before reaching the minimum.
5. **Minibatch gradient is unbiased** (slide 14) and **SGD converges for convex losses** (slide 14). Prove unbiasedness in two lines; state the SGD convergence rate $O(1/\sqrt{k})$ with decaying step, contrasting with full GD.
6. **Linear regression on 0/1 labels is unbounded** (slide 24). Show $\theta^Tx$ is unbounded as $\|x\|\to\infty$, and that OLS on $\{0,1\}$ targets estimates $P(Y=1|X)$ only if that function is linear in $x$ — the "linear probability model" caveat.
7. **Sigmoid properties** (slides 26, 34): limits, symmetry $\sigma(-z) = 1 - \sigma(z)$, derivative $\sigma' = \sigma(1-\sigma)$, and logit inverse $\sigma^{-1}(p) = \log\frac{p}{1-p}$ (log-odds interpretation of $\theta^Tx$ — never mentioned on slides but essential for interpreting coefficients).
8. **Why the 0/1 loss is not optimizable by GD** (slide 35). Show the thresholded error is piecewise constant in $\theta$, so its gradient is 0 almost everywhere and undefined on the boundary.
9. **Windowed average estimates $P(Y=1|X)$** (slide 31). Show the window average is the sample mean of Bernoulli variables, an estimate of $E[Y|X \in \text{window}] = P(Y=1|X \in \text{window})$.
10. **Equivalence of the additive Bernoulli form to the standard form and to cross-entropy** (slides 44–50): $y\sigma + (1-y)(1-\sigma) = \sigma^y(1-\sigma)^{1-y}$ for $y\in\{0,1\}$, so $-\log[\cdot] = -y\log\sigma(\theta^TX) - (1-y)\log(1-\sigma(\theta^TX))$.
11. **Gradient of the logistic log-likelihood** (needed for slide 50's "needs gradient descent" and for HW): derive $\nabla_\theta\,\text{NLL}(\theta) = \sum_i\big(\sigma(\theta^TX_i) - y_i\big)X_i$ using $\sigma' = \sigma(1-\sigma)$ and the chain rule; note its resemblance to the linear-regression gradient $\sum_i(\theta^TX_i - y_i)X_i$.
12. **Convexity of the logistic NLL** (never stated, but required to justify "GD finds the global minimum"): Hessian $\sum_i \sigma_i(1-\sigma_i)X_iX_i^T \succeq 0$.
13. **No closed-form solution** (slide 50, poll slide 38): explain that $\nabla\text{NLL} = 0$ is a transcendental system in $\theta$ (contrast with the normal equations $X^TX\theta = X^Ty$ from linear regression).
14. **MLE = minimizing KL divergence** (slide 50): derive $\frac1n\sum_i D_{KL}(\delta_{y_i}\,\|\,P_\theta(\cdot|X_i)) = \frac1n\sum_i -\log P_\theta(y_i|X_i)$; L6 covers this, but the L5 lesson should at least state the identity.
15. **MLE for the multinomial and Gaussian examples** (slides 40–41): derive $\hat p_k = n_k/n$ (Lagrange multiplier for $\sum p_k = 1$) and $\hat\mu, \hat\sigma^2$, to make the "which distribution is more likely" questions quantitative.
16. **Dropping $\sum_i\log P(X_i)$** (slide 47): justify that the argmax over $\theta$ is unaffected by adding a $\theta$-independent constant, and that this is precisely the discriminative-modeling choice (contrast with generative models in L9–L10).

### Poll Everywhere / in-class questions

**Slide 12 — "Select all correct statements":**
1. Step sizes greater than twice the inverse of the second derivative can cause gradient descent to diverge. *(True — $\eta > 2/E'' = 2\eta_{opt}$.)*
2. Diverging gradient is always a bad thing. *(False — slide 10: large steps can escape local optima.)*
3. Gradient descent will not converge without decaying learning rates. *(False — a fixed $\eta < 2\eta_{opt}$ converges on a quadratic/convex problem.)*
4. When the dataset size is large, we always want to start with a relatively small learning rate so that gradient descent will not explode. *(False — the stability condition depends on curvature, not on the number of samples; the loss is an average.)*
5. When the dimension of the dataset is large, we always want to start with a relatively small learning rate so that gradient descent will not explode. *(False — depends on the Hessian's largest eigenvalue, not dimension per se.)*
6. When the dimension of the model is large, we always want to start with a relatively small learning rate so that gradient descent will not explode. *(False — same reasoning; "always" is the trap.)*

**Slide 38 — "Select all correct statements":**
1. Logistic regression learns a linear decision boundary between 2 classes. *(True — boundary is $\theta^Tx = 0$.)*
2. Logistic regression can also learn nonlinear decision boundaries (nonlinear with respect to features). *(True if nonlinear features are engineered — e.g. polynomial features; the boundary is linear in the feature vector but nonlinear in the raw inputs.)*
3. We can derive closed-form optimal parameter for logistic regression given data, just like in a linear regression. *(False — needs iterative optimization.)*

**Slide 49 — "Select all correct statements":**
1. Maximum-likelihood estimation of probability distributions is based on the theory that the world is a terribly boring place. *(True per the professor's framing on slide 42: observed data are typical.)*
2. Maximum-likelihood estimation estimates the values of the parameters of a probability distribution such that they maximize the probability of the training data. *(True.)*

**Discussion prompts:** slide 29 "1 because red dominates? 0.9: the average?"; slide 30 "Should an infinitesimal nudge of the red dot change the function estimate entirely?"; slide 32 "What is the probability of seeing $Y=1$ given input $X$ here? What about $Y=0$?"; slides 40–41 "Which distribution is more likely? Why?"

### Continuity

- **From L4:** slides 3–7 literally finish L4's last three slides. The learning-rate analysis (L4 48–53, L5 7–11) is one argument and should be a single lesson.
- **Within L5:** slide 16 ("Take Away") closes the optimization unit; slide 17 opens classification. The hinge is slide 37: GD works on any differentiable loss, so the classification question becomes "what loss?" — answered by MLE.
- **To L6 ("MLE and Classification Evaluation"):** L6 opens with "Recap: Classification vs Regression", repeats L5 slides 26, 33, 39, 42, 44, 48, 50 verbatim, then derives the Bernoulli MLE ("maximum likelihood of Bernoulli distribution is the empirical [frequency]"), re-derives linear regression as MLE under Gaussian noise ("Recall linear regression"), defines KL divergence and proves the MLE–KL link, introduces softmax regression as the multi-class generalization, and covers accuracy, confusion matrix, sensitivity/specificity, precision/recall, F1, ROC. The **L5 code companion already contains the L6 evaluation material** (confusion matrix, ROC, AUC, classification report), so it should be attached to the L5→L6 unit rather than strictly to L5's slides.
- **Unit grouping recommendation:** Unit A "Empirical Risk & Gradient Descent" = L4 + L5 slides 1–16 (+ L4 notebook's autograd/GD half). Unit B "Logistic Regression & MLE" = L5 slides 17–50 + L6's MLE/KL/softmax portion (+ L4 notebook's Iris half). Unit C "Classification Evaluation" = L6's metrics portion + L5 notebook's metrics cells + L7.

### Concept-graph edges (A -> B means B depends on A)

- Per-coordinate optimal rates (L4) -> Global stability condition $\eta < 2\min_i\eta_{i,opt}$
- Taylor expansion (2nd order) -> Quadratic approximation of convex functions
- Hessian (L4) -> Quadratic approximation of convex functions
- Eigenvalues of symmetric matrices -> Optimal step size ∝ 1/eigenvalue
- Optimal step size ∝ 1/eigenvalue -> Condition number governs convergence speed
- Non-convexity -> Large learning rate escapes local optima
- Large learning rate escapes local optima -> Decaying learning-rate schedules
- Decaying learning-rate schedules -> SGD / minibatch SGD
- Unbiased estimator -> SGD / minibatch SGD
- SGD -> `torch.optim` optimizers (Adam, RMSprop, …)
- GD for supervised learning (L4) -> Take-away: GD finds best $\theta$ for a fixed dataset
- Supervised learning problem (L4) -> Binary classification ($y\in\{0,1\}$)
- Binary classification -> Classification vs regression (regions vs curves)
- Linear regression (L3) -> Thresholded linear regression as a classifier
- Thresholded linear regression -> Issues (unbounded outputs)
- Issues (unbounded outputs) -> Sigmoid function
- Sigmoid function -> Logistic regression model $f_\theta(x) = \sigma(\theta^Tx)$
- Sigmoid limits -> Probabilistic interpretation $P_\theta(y=1|X) = \sigma(\theta^TX)$
- Conditional probability -> Probabilistic interpretation
- Non-linearly separable data -> Need for probabilistic outputs $P(Y=1|X)$
- Windowed average -> $P(Y=1|X)$ intuition
- Chain rule -> Sigmoid derivative $\sigma(1-\sigma)$
- Sigmoid derivative -> Logistic regression trainable by GD
- 0/1 loss non-differentiability -> Need for a likelihood-based objective
- Likelihood -> Maximum likelihood principle
- Multinomial / Gaussian examples -> Maximum likelihood principle (intuition)
- "World is boring" assumption -> Maximum likelihood principle
- i.i.d. samples -> Joint likelihood factorizes as a product
- Product rule $P(X,y) = P(y|X)P(X)$ -> Likelihood in terms of $\sigma(\theta^TX_i)$
- Bernoulli distribution -> Likelihood in terms of $\sigma(\theta^TX_i)$
- Logarithm properties -> Log-likelihood as a sum
- Log-likelihood as a sum -> Dropping $\sum\log P(X_i)$ (constant)
- Monotonicity of log / argmax→argmin -> Negative log-likelihood objective
- Negative log-likelihood objective -> Binary cross-entropy (equivalence, derivation gap)
- Negative log-likelihood objective -> KL divergence interpretation (L6)
- Negative log-likelihood objective -> Softmax regression (L6)
- Negative log-likelihood objective -> Logistic regression gradient & GD training
- Empirical risk (L4) -> "MLE defines the loss function in many cases"
- Logistic regression -> Linear decision boundary $\theta^Tx = 0$
- Logistic regression -> Classification metrics (L6)

### Suggested interactive widgets

1. **Eigen-basis GD visualizer:** 2-D quadratic with adjustable Hessian (two eigenvalues and a rotation angle); show GD trajectory, each eigen-mode's contraction factor $|1-\eta\lambda_i|$, the stability bound $2/\lambda_{max}$, and the condition number; highlight that at $\eta = 1/\lambda_{max}$ the stiff mode converges in one step.
2. **Learning-rate schedule lab:** choose linear / quadratic / exponential decay with $\eta_0, \beta$ sliders on a non-convex 1-D loss; plot $\eta_k$, cumulative $\sum\eta_k$, and the iterate path; show which schedules stall.
3. **Escape-the-basin demo:** 1-D wiggly loss, slider for constant $\eta$; show bouncing between basins vs convergence.
4. **SGD noise explorer:** a 2-D convex loss over $n$ sample losses; batch-size slider from 1 to $n$; show the noisy gradient arrows, their mean equals the full gradient (unbiasedness), and the trajectory jitter.
5. **Linear regression vs logistic regression on Iris:** toggle model, show the decision boundary (threshold 0.5 vs $\theta^Tx = 0$), and the predicted value as a color map — expose the out-of-$[0,1]$ predictions of the linear model.
6. **Sigmoid with draggable decision boundary:** sliders for $\theta_0$ and $\theta_1$ in $\sigma(\theta_0 + \theta_1x)$ over the 1-D two-class data; show $P(Y=1|x)$, the boundary at $x = -\theta_0/\theta_1$, the log-odds line, and the live negative log-likelihood value.
7. **Windowed-average → sigmoid:** slider for window width over the 1-D data; show the staircase (tiny window), the smooth S-curve (medium), and the flat average (huge window); overlay the fitted logistic curve.
8. **90/10 thought experiment:** stack $k$ red and $100-k$ blue points at one $x$; show the NLL as a function of the predicted $p$ and that it is minimized at $p = k/100$.
9. **Likelihood surface explorer:** for the dice example, drag $p_1..p_6$ on a simplex and watch $\prod p_k^{n_k}$; for the Gaussian, sliders for $\mu, \sigma^2$ with the log-likelihood readout and the three candidate curves from slide 41.
10. **Log-likelihood derivation stepper:** click through product → log → sum → drop constant → negate, with each algebraic step justified (and the additive-vs-multiplicative Bernoulli form equivalence shown).
11. **NLL landscape for logistic regression:** 2-D contour of $\text{NLL}(\theta_0, \theta_1)$ over the 1-D data with a GD trajectory; show convexity and the absence of a closed form.
12. **0/1 loss vs NLL:** plot both as functions of $\theta_1$ for the 1-D data; the 0/1 loss is a staircase with zero gradient almost everywhere, the NLL is smooth.

---

## Code companion notebooks

### `Code_Companions__lecture4-code_companion.ipynb` — "Lecture 4 Code Companion: Gradient Descent and Logistic Regression"

**Libraries:** `numpy`, `matplotlib.pyplot` (figsize 8×4), `torch` (2.4.1), `torch.nn.functional.mse_loss`, `pandas`, `sklearn.datasets` (`load_diabetes`, `load_iris`), `sklearn.linear_model` (`LinearRegression`, `LogisticRegression`), `sklearn.metrics.mean_squared_error`, `warnings`.

**Section 1 — Autograd (corresponds to L4 slides 45–46 and the HW1 "autograd equivalent" note).** Toy loss $\ell(\theta) = 0.5(2\theta_1 - 2)^2 + 0.5(\theta_0 - 3)^2$. Create `theta_tensor = torch.tensor([-2., 3.], requires_grad=True)`, evaluate `f` → `tensor(20.5000, grad_fn=<AddBackward0>)`, call `f.backward()`, read `theta_tensor.grad` → `tensor([-5., 8.])`. Hand check: $\partial\ell/\partial\theta_0 = \theta_0 - 3 = -5$; $\partial\ell/\partial\theta_1 = 2(2\theta_1 - 2) = 8$. Demonstrates `requires_grad`, `.backward()`, `.grad`.

**Section 2 — Gradient Descent in Linear Models (L4 slides 43–46).** Model $f_\theta(x) = \sum_{j=0}^d\theta_jx_j = \theta^\top x$ implemented as `f(X, theta) = torch.matmul(X, theta)`. Dataset: **UCI Diabetes** via `datasets.load_diabetes(return_X_y=True, as_frame=True)`; add a column `one = 1`; keep the last 20 rows and columns `['bmi', 'one']`; target `y_train = y.iloc[-20:] / 300`. Scatter plot "Body Mass Index (BMI)" vs "Diabetes Risk". GD loop: `threshold = 1e-5`, `step_size = 0.1`, `theta = [2., 1.]` (requires_grad), `theta_prev = ones(2)`; `while torch.linalg.norm(theta - theta_prev) > threshold:` compute prediction, `mse_loss`, `loss.backward()`, update under `torch.no_grad()` as `theta = theta_prev - step_size * theta.grad`, re-attach `requires_grad_()`, print every 100 iterations. Output: MSE decreases from 0.030006 (iter 100) to 0.024179 (iter 10,000+; output truncated). Final `theta ≈ [3.71421938, 0.45772775]`. Plot of fitted line over `x_line = linspace(-0.1, 0.1, 10)`. Cross-check with `sklearn.LinearRegression`: MSE 0.024177787873230695, coefficients `[3.73788422, 0.]`, intercept 0.4579643832623464. Text notes this update rule "is also known as the Least Mean Squares (LMS) or Widrow-Hoff learning rule." Pedagogical takeaway: slow convergence of vanilla GD on an ill-conditioned 2-parameter problem (bmi column has tiny scale vs the constant column).

**Section 3 — Binary Classification with Iris (corresponds to L5 slides 18–25, despite being in the L4 notebook).** `datasets.load_iris(as_frame=True)`, prints `iris.DESCR`, samples 5 rows. Relabel `iris_y2[iris_y2==2] = 1` (Setosa = 0 vs Non-Setosa = 1). Scatter of sepal length vs sepal width (`cmap=plt.cm.Paired`, legend Setosa/Non-Setosa) — this is L5 slide 19's figure. **OLS as classifier:** `LinearRegression().fit(X[:, :2], Y)`; meshgrid with step 0.02 over $[x_{min}-0.5, x_{max}+0.5]$; predictions thresholded at 0.5 (`Z[Z>0.5]=1; Z[Z<0.5]=0`); `pcolormesh` decision regions + scatter — this is L5 slide 23's figure. Text: "Unbounded outputs … Performance issues: at least one point is misclassified." **Logistic regression:** `LogisticRegression(C=1e5).fit(X, Y)` (C large ⇒ essentially unregularized), meshgrid over $x\in[4, 8.2]$, $y\in[1.8, 4.5]$, decision-region plot — the logistic counterpart to slide 23 (not shown on the L5 slides but clearly the intended follow-up). Model text matches L5 slide 25 exactly.

**Plots generated:** (1) BMI vs diabetes risk scatter; (2) same with GD-fitted line; (3) Iris binary scatter; (4) OLS decision regions; (5) logistic-regression decision regions.

### `Code_Companions__L5_code_companion.ipynb` — "Lecture 5: Classification and Maximum Likelihood Estimation"

**Libraries:** `numpy`, `pandas`, `matplotlib.pyplot`, `sklearn.datasets.load_iris`, `sklearn.linear_model.LogisticRegression`, `sklearn.model_selection.train_test_split`, `sklearn.metrics` (`ConfusionMatrixDisplay`, `roc_curve`, `auc`, `classification_report`), `warnings`. No torch.

**Section 1 — Multi-class Iris and softmax decision regions.** Loads full 3-class Iris, prints `DESCR`, scatter of the first two features colored by class (legend Setosa/Versicolour/Virginica). Fits `LogisticRegression(C=1e5, multi_class='multinomial')` ("softmax") on the first two features and plots `pcolormesh` decision regions over a 0.02 meshgrid. Corresponds to the softmax-regression material that appears on L6 slides (foreshadowed by L5's "binary classification algorithm" remark).

**Section 2 — Imbalanced binary/multi-class setup and evaluation (L6 material; not on L5 slides).** `X, y = iris.data[:120, :2], iris.target[:120]` — deliberately **imbalanced** (50 Setosa, 50 Versicolor, 20 Virginica), first two features only; `train_test_split(test_size=50, random_state=0)`. Scatter (figsize 12×4). Fit `LogisticRegression()` (default C=1), predict on holdout. **Accuracy** defined as $\text{acc}(f) = \frac1n\sum_{i=1}^n\mathbb{I}\{f(x^{(i)}) = y^{(i)}\}$; output `Iris holdout set accuracy: 0.84`. **Confusion matrix** via `ConfusionMatrixDisplay.from_estimator` (true classes on y-axis, predicted on x-axis). Note: "Accuracy is a problematic metric when classes are imbalanced." **Class probabilities:** `model.predict_proba(X_holdout)[:10, 0]` → `[0.905, 0.163, 0.262, 0.919, 0.055, 0.982, 0.904, 0.875, 0.832, 0.124]`; discussion of thresholds other than 0.5. **ROC:** definitions $\text{TPR} = \frac{TP}{TP+FN}$ (recall, sensitivity), $\text{FPR} = 1 - \text{specificity}$ (the notebook's second equality is written as $\frac{FP}{TP+FP}$, which is a typo — should be $\frac{FP}{FP+TN}$). Class 2 (Virginica) taken as positive; `roc_curve(class2_y, class2_scores)` prints 19 thresholds from `inf` down to 0.0024, FPR from 0 to 1, TPR from 0 to 1. ROC plot (6×6, orange curve, navy dashed diagonal). **AUC:** `auc(fpr, tpr)` → `AUC-ROC: 0.8555`. **Multi-class averaging:** macro precision $\frac1K\sum_k\frac{TP_k}{TP_k+FP_k}$ vs micro precision $\frac{\sum_kTP_k}{\sum_k(TP_k+FP_k)}$. `classification_report`: Setosa P 0.95 / R 1.00 / F1 0.97 (n=19); Versicolor 0.79 / 0.92 / 0.85 (n=24); Virginica 0.50 / 0.14 / 0.22 (n=7); accuracy 0.84; macro avg 0.75 / 0.69 / 0.68; weighted avg 0.81 / 0.84 / 0.81 — a concrete demonstration that accuracy hides the collapse on the minority class.

**Plots generated:** (1) 3-class Iris scatter; (2) softmax decision regions; (3) imbalanced-subset scatter; (4) confusion matrix; (5) ROC curve.

**Slide correspondence:** Section 1 ↔ L5 slides 18–21 (and L6 softmax); Section 2 ↔ L6 "classification evaluation" slides (accuracy, confusion matrix, sensitivity/specificity, precision/recall, ROC). Nothing in this notebook implements the MLE derivation of L5 slides 44–50 directly; a platform exercise implementing logistic-regression NLL + GD in torch (mirroring the L4 notebook's linear-regression loop, which is what HW1/HW2 ask for) would fill that gap.
