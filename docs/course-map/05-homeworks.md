# Homework map: HW1, HW2, HW3, skill inventory, readiness checklists

<!--
  COURSE MAP — generated 2026-10-06 by subject-explorer agents that read every slide
  page visually (equations are images in the PDFs, so text extraction alone misses them).
  This file is the source of truth for lesson authors: it records exactly what the
  professor's slides state vs. derive, her notation, slide errors to correct, Poll
  Everywhere questions (quiz bank seeds), concept-graph edges, and widget ideas.
  Do NOT re-read the PDFs to write a lesson unless this file is ambiguous.
  Source material: "AML Course Material/" in this repo (lectures L1–L10, code companions, HW1–HW3).
  HW3 section added 2026-10-14 from the original assignment PDF.
-->

# Homework map

Source material read: HW1 Part I (rendered solution PDF + notebook), HW1 Part II (26-page rendered solution PDF + notebook + Kaggle data), HW2 part1 (written) and part2 (programming) notebooks, the HW2 leaderboard screenshot, all HW2 phase CSVs and both submission files, the syllabus, and the L1-L10 lecture text dumps / code companions (for the lecture mapping).

Important caveat on provenance: none of the files is the original assignment PDF. The HW1 Part I "PDF" is a nbconvert export of the student's solved notebook (titled "Part_I, September 15, 2026") and contains only section numbers (1, 2, 3a, 3b, 3c, 4, 5), so the Part I problem statements below are reconstructed from the solution code. The HW1 Part II and HW2 part1 notebooks quote the question text verbatim, so those are reliable. HW2 part2 has only sub-part labels "(a)"-"(i)", so its task statements are reconstructed from the solution structure plus the HW2 description given in the Lecture 5 announcements. Lecture numbers refer to the files in `extracted/lectures/`: L1 Introduction; L2 Supervised Learning + Linear Regression; L3 Linear Regression and Data Generating Distribution; L4 Empirical Risk and Gradient Descent; L5 GD, Logistic Regression, Classification; L6 MLE and Classification Evaluation; L7 Classification Evaluation, Choice of Divergence, Regularization; L8 Model Selection and Generative Models I; L9 Generative Model and Text Classification; L10 GDA, Unsupervised Learning, K-Means.

## Course assessment structure (from syllabus)

- Grade weights: Class participation 10% (Poll Everywhere + in-class Q&A); 5 Homeworks + Homework 0 = 40%; Group Midterm Kaggle Competition 25%; Group Final Project 25%.
- Each homework has three components: (1) questions on lecture material, delivered as a Canvas quiz ("HW1: Quiz", "HW2: Quiz" are separate Canvas items; L3 notes the quiz has "no automated feedback per attempt, unlimited attempts, most recent score"), (2) programming questions, (3) written/math questions. Report + code go to Gradescope.
- Due dates: HW0 Sep 2; HW1 + HW1 Quiz Wed Sep 16; HW2 + HW2 Quiz Mon Oct 5; HW3 Mon Oct 19. HW4/HW5 not yet scheduled. Lecture participation items exist for L2, L4-L9.
- Late policy: 6 slip days total, max 2 per assignment, then additive 20% per day.
- Homeworks are individual; midterm/final are groups of up to 3.
- Midterm Kaggle rubric: 70% relative performance vs baselines and leaderboard, 30% report quality. Final project rubric: 2% one-paragraph description, 3% revised one-pager, 20% writing quality, 25% problem novelty, 25% method, 25% numerical evaluation.
- Both HW1 and HW2 already culminate in a Kaggle submission with a required leaderboard screenshot, so the Kaggle workflow (download data, build submission CSV in the required format, submit, screenshot rank) is itself a recurring skill.

## HW1 (due Sep 16, 2026)

### Part I — numpy / PyTorch warm-up (5 problems)

Lecture mapping for the whole part: L1 (course tooling: "python + jupyter; packages: matplotlib, numpy, pandas, sklearn, pytorch"), the L2 code companion (numpy arrays, sklearn `LinearRegression`), and the L4 code companion (PyTorch autograd: `requires_grad=True`, `.backward()`, `.grad`; the GD loop with `mse_loss`, `step_size`, `threshold`). Linear-algebra items (matrix products, Frobenius norm) rely on the corequisite, but L2/L3 use the same notation (theta^T x, ||.||).

**Problem 1 (numpy reshape).** Reconstructed: create the array [1..8] and reshape it to 2x4. Solution: `np.array([1,...,8]).reshape(2,4)` -> `[[1 2 3 4],[5 6 7 8]]`. Skills: numpy array creation, `reshape`, row-major ordering. Pitfall: confusing `reshape(2,4)` with `reshape(4,2)`; students who use `.T` get the transpose, not the row-major fill.

**Problem 2 (elementwise tensor ops).** Reconstructed: with `a = tensor([1,3,5,6])`, `b = tensor([5,6,8,9])`, write functions for addition, multiplication, exponentiation (a^b), dot product, exp, log, and the composition log(exp(x)); print each. Solution outputs: add `[6,9,13,15]`; mul `[5,18,40,54]`; pow `[1,729,390625,10077696]`; dot `117`; exp(a) `[2.7183, 20.0855, 148.4132, 403.4288]`; log(a) `[0, 1.0986, 1.6094, 1.7918]`; log(exp(a)) returns `[1,3,5,6]` as floats. Skills: `torch.add/mul/pow/dot/exp/log`, understanding that elementwise ops differ from the dot product, integer vs float dtype promotion (exp of an int tensor returns float). Pitfalls: using `*` when a dot product is wanted; `torch.pow(a,b)` overflow for larger ints; the student redefined `exponent` twice (once as pow, once as exp) which is harmless but sloppy.

**Problem 3a (autograd of a scalar function of a vector).** Reconstructed: let g(p) = sum_i c_i e^{p_i} p_i^2 with c = (1,3,5,6) and evaluate the gradient at p = (5,6,8,9). Solution: build `point` with `requires_grad=True`, compute `torch.sum(coeffs*torch.exp(p)*p**2)`, call `.backward()`, read `point.grad` -> `[5194.46, 58093.75, 1192383.25, 4813232.0]`. Verified analytically: dg/dp_i = c_i e^{p_i}(p_i^2 + 2p_i); for i=1: 1*e^5*(25+10) = 5194.46. Skills: autograd mechanics, scalar loss requirement for `.backward()`, hand-checking a gradient. Maps to L4 (gradient of empirical risk, autograd companion). Pitfall: forgetting `requires_grad`, calling backward on a non-scalar, integer tensors (autograd needs float).

**Problem 3b (matrix function, autograd).** Reconstructed: with A = [[4,3],[7,9]] (requires_grad) and B = [[3,5],[1,11]], compute f(A) = log( || A^T A B^T A A^T A B ||_F^2 ) and (almost certainly) its gradient with respect to A. Solution computes `inside = A.T @ A @ B.T @ A @ A.T @ A @ B`, `f = log(norm(inside, p=2)**2)` = 34.8454 and prints f. Notable: the solution never calls `f.backward()` or prints `A.grad`, even though A was created with `requires_grad=True`. If the question asked for the gradient (the presence of `requires_grad` strongly suggests it did), this answer is incomplete. Skills: `@` chaining, `torch.norm` (with a numeric p on a 2-D tensor it computes the flattened vector norm, i.e. Frobenius), log of squared norm, autograd through matrix products. Pitfall: `torch.norm(X, p=2)` vs `torch.linalg.matrix_norm(X, 2)` (spectral) are different; forgetting backward.

**Problem 3c (gradient of sum tanh).** Reconstructed: compute the gradient of sum_i tanh(x_i) at x = (3,7). Solution: `[9.8660e-03, 3.3379e-06]`, which equals 1 - tanh^2(x). Skills: autograd, recognising saturation (tiny gradients far from 0, a vanishing-gradient preview). Pitfall: integer input tensor.

**Problem 4 (tensor <-> numpy, dtype).** Reconstructed: create a tensor, convert to numpy, convert to float. Solution: `a.numpy()` -> `[1 2 3]`, `a.float()` -> `tensor([1.,2.,3.])`. Skills: `.numpy()`, `.float()`, awareness that `.numpy()` fails on tensors with `requires_grad=True` (needs `.detach()` first; this bites in Part II Q5).

**Problem 5 (numpy matrix product and Frobenius norm).** Reconstructed: compute X Y for X (2x3) = [[1,3,5],[2,1,5]] and Y (3x2) = [[8,4],[3,6],[2,7]], and the Frobenius norm of (100,2,1). Solution: `x @ y` = `[[27,57],[29,49]]`; `LA.norm(frob.reshape(1,3),'fro')` = 100.025 = sqrt(10005). Skills: shape compatibility, `@`, `numpy.linalg.norm` with `'fro'` (requires a 2-D array, hence the reshape). Pitfall: `np.dot` on mismatched shapes; `'fro'` on a 1-D array raises.

### Part II — "The Housing Prices" (8 questions)

**Dataset.** Confirmed as the Kaggle "House Prices - Advanced Regression Techniques" competition (the Ames, Iowa dataset of De Cock). `train.csv` is 1460 rows x 81 columns (`Id`, 79 attributes, `SalePrice`); `test.csv` is 1459 x 80 (no `SalePrice`); `submission.csv` is 1459 x 2 (`Id`, `SalePrice`). `data_description.txt` (523 lines) documents every column and is essential because many "NA" strings mean "feature absent", not "unknown". Column types after dropping Id/target: 43 object (nominal/ordinal strings), 25 int64, 11 float64. Target: `SalePrice`, continuous, strongly right-skewed (Kaggle scores RMSE between log(pred) and log(actual)). Missingness in train (string "NA" read as NaN by pandas): PoolQC 1453, MiscFeature 1406, Alley 1369, Fence 1179, FireplaceQu 690, LotFrontage 259, GarageType/GarageYrBlt/GarageFinish/GarageQual/GarageCond 81 each, BsmtExposure/BsmtFinType2 38, BsmtQual/BsmtCond/BsmtFinType1 37, MasVnrType/MasVnrArea 8, Electrical 1. Test adds sporadic genuine gaps: MSZoning 4, Utilities 2, BsmtFullBath/BsmtHalfBath/Functional 2, and 1 each in Exterior1st/2nd, BsmtFinSF1/2, BsmtUnfSF, TotalBsmtSF, KitchenQual, GarageCars, GarageArea, SaleType. Two numeric columns are really categorical codes (`MSSubClass`, `MoSold`). About 14 ordinal quality columns share the Ex/Gd/TA/Fa/Po scale.

**Q1.** "Join the House Prices - Advanced Regression Techniques competition on Kaggle. Download the training and test data." Skill: Kaggle account, data download. Lecture: L1 (midterm/Kaggle logistics).

**Q2.** "Give 3 examples of continuous and categorical features in the dataset; choose one feature of each type and plot the histogram to illustrate the distribution." Solution: continuous LotArea, TotalBsmtSF, 1stFlrSF; categorical Foundation, RoofMatl, Heating; `hist(bins=50)` of LotArea (long right tail, max ~215k sq ft) and `value_counts().plot(kind="bar")` of Foundation (PConc ~650, CBlock ~630, BrkTil ~150, Slab, Stone, Wood), done on train and again on train+test. Skills: pandas loading, dtype inspection, matplotlib histogram vs bar chart, continuous vs categorical vs ordinal attribute types. Lecture: L2 (attributes vs features, categorical variables, data representation). Pitfall: histogramming a categorical column, or calling an ordinal code like OverallQual "continuous".

**Q3.** "Pre-process your data, explain your pre-processing steps, and the reasons why you need them. (Hint: ... dealing with missing values, normalizing numerical values, dealing with categorical values etc.)" Solution pipeline (this is the bulk of the work):
1. Drop two documented outliers: rows with GrLivArea > 4000 and SalePrice < 300000 (Ids 524 and 1299, both Partial sales) -> 1458 train rows.
2. Concatenate train features and test features into one 2917 x 79 frame so every transform is applied identically to both.
3. "NA means none" string columns (15: Alley, MasVnrType, BsmtQual/Cond/Exposure/FinType1/FinType2, FireplaceQu, GarageType/Finish/Qual/Cond, PoolQC, Fence, MiscFeature) -> fill "None".
4. Companion numeric columns (MasVnrArea, BsmtFinSF1/2, BsmtUnfSF, TotalBsmtSF, BsmtFullBath, BsmtHalfBath, GarageCars, GarageArea) -> fill 0; GarageYrBlt -> YearBuilt, and a typo year > 2010 reset to YearBuilt.
5. Remaining true gaps in 8 categoricals (MSZoning, Utilities, Exterior1st/2nd, Electrical, KitchenQual, Functional, SaleType) -> mode; LotFrontage (486 missing in combined) -> median within Neighborhood via `groupby().transform`.
6. Fix dtypes: MSSubClass and MoSold cast to string so they get one-hot encoded.
7. Ordinal encoding: Ex/Gd/TA/Fa/Po/None -> 5..0 for 10 quality columns; BsmtExposure Gd/Av/Mn/No/None -> 4..0; BsmtFinType1/2 GLQ..Unf/None -> 6..0; GarageFinish Fin/RFn/Unf/None -> 3..0.
8. Feature engineering: TotalSF = TotalBsmtSF + 1stFlrSF + 2ndFlrSF; TotalBath = Full + 0.5 Half + BsmtFull + 0.5 BsmtHalf; HouseAge = YrSold - YearBuilt; RemodAge = YrSold - YearRemodAdd; TotalPorchSF = sum of five porch columns. Justification given: "a linear model can't add or subtract columns on its own".
9. Target transform: y = log1p(SalePrice), justified by the long right tail and by Kaggle's log-RMSE metric.
10. Skew handling: for numeric non-ordinal, non-count columns with |skew| > 0.75, apply log1p and keep it only if |skew| fell by at least 25% (kept for MiscVal, LotArea, LowQualFinSF, BsmtFinSF2, EnclosedPorch, ScreenPorch, MasVnrArea, OpenPorchSF, WoodDeckSF, 1stFlrSF, GrLivArea, TotalSF, BsmtFinSF1, 2ndFlrSF; rejected for PoolArea, 3SsnPorch, TotalPorchSF, LotFrontage, BsmtUnfSF).
11. Standardize all numeric columns with `StandardScaler` fit on the training rows only (correctly avoiding test leakage).
12. `pd.get_dummies` on everything -> 2917 x 273; split back into X_train (1458 x 273) and X_test (1459 x 273); verify no NaNs and lengths match.
Skills: pandas missing-value handling (`fillna`, `mode`, `groupby.transform`), reading a data dictionary, ordinal vs nominal encoding, feature engineering, log transforms and skewness, standardization and why it matters for gradient descent (L4/L5: step size depends on feature scale), leakage avoidance. Lecture: L2 (features, categorical variables, one-hot), L3/L4 (feature scaling implicitly via GD conditioning). Pitfalls: treating "None" as missing and imputing a garage quality for a house with no garage; fitting the scaler on train+test; dropping test rows with NaN (you must predict all 1459); one-hot encoding before concatenation so train and test get different columns; forgetting to transform the target back.

**Q4.** "One common method of pre-processing categorical features is to use a one-hot encoding (OHE). Suppose that we start with a categorical feature x_j taking three possible values x_j in {R,G,B}. A one-hot encoding replaces x_j with three new features x_{jR}, x_{jG}, x_{jB}, each binary... Give some examples of features that you think should use a one-hot encoding and explain why. Convert at least one feature to a one-hot encoding (your own implementation, pandas, or scikit-learn) and visualize the results by plotting feature histograms of the original feature and its new one-hot encoding." Solution: Neighborhood (25 categories) -> 25 binary columns via `pd.get_dummies`; bar chart of the original counts and a 5x5 grid of 0/1 bar charts; then `get_dummies` on the whole frame. Skills: nominal vs ordinal (OHE for unordered categories like Neighborhood, MSZoning, SaleType; ordinal maps for quality scales), the dummy-variable trap (k columns are collinear with the intercept; sklearn's least-squares solver tolerates it but it slows GD). Lecture: L2 (explicit one-hot slide with the zipcode example).

**Q5.** "Using ordinary least squares (OLS), try to predict house prices on this dataset. Choose the features (or combinations of features) you would like to use or ignore, provided you justify your choice. Evaluate your predictions on the training set using the MSE and the R^2 score. For this question, you need to implement OLS in 2 ways: 1) using the scikit-learn package, and 2) using autograd from pytorch. Important: you should not use high-level abstractions such as nn.Sequential or the built-in linear layers. Instead, implement the solution from scratch using tensors and the code provided in the code companion as a starting point." (L4 slide says exactly this: "'HW1 autograd equivalent': cannot use nn.sequential(): You should reuse most of the code in class.") Solution: compute `corrwith(log price)` for all 273 columns (top: OverallQual 0.82, TotalSF 0.82, GrLivArea 0.74, ExterQual 0.68, GarageCars 0.68, TotalBath 0.68, KitchenQual 0.67 ...) and pairwise |corr| > 0.7 among the top 30 to prune redundancy (HouseAge~YearBuilt 0.999, GarageCars~GarageArea 0.89, TotalSF~GrLivArea 0.86 ...). Curated 17 features: OverallQual, TotalSF, GarageCars, TotalBath, KitchenQual, BsmtQual, GarageFinish, HouseAge, RemodAge, FireplaceQu, Foundation_PConc, HeatingQC, GarageType_Attchd, MasVnrArea, LotArea, MSSubClass_60, TotalPorchSF. sklearn `LinearRegression`: train MSE 0.018660, R^2 0.8831 (on log target); intercept 12.03, largest coefficients TotalSF 0.118 and OverallQual 0.110. PyTorch: append a column of ones, `theta = zeros(18, float64, requires_grad)`, loop `while ||theta - theta_prev|| > 1e-5 and iter < 50000`: predict `X @ theta`, `mse_loss`, `.backward()`, `theta = theta_prev - 0.05 * theta.grad` under `no_grad`, re-enable grad; stopped after 1212 iterations; MSE 0.018661, R^2 0.8831. Skills: feature selection by correlation, OLS via sklearn, the GD loop from the L4 companion (manual parameter update, convergence test on parameter change), float64 tensors, `mse_loss`, `.detach()` before numpy, MSE and R^2 definitions (L3: R^2 = 1 - RSS/TSS). Lecture: L2/L3 (linear regression, OLS, R^2), L4 (empirical risk, GD, autograd companion), L5 (step size and convergence). Pitfalls: unscaled features make eta = 0.05 diverge; omitting the intercept column; updating theta in place without `no_grad`; not resetting `.grad` (student sidesteps by rebuilding theta each step); comparing MSE on log scale with MSE on dollars.

**Q6.** "Compare and discuss the two results that you obtained in Q5. In addition, identify situations where applying gradient descent is more desirable in the context of linear regression." Solution: both reach the same optimum because MSE for linear regression is convex with a unique minimizer; sklearn solves least squares in closed form in one shot, GD took 1212 steps and stops when steps are tiny, so the tiny coefficient gap comes from early stopping in flat directions. GD preferred when n or d is too large for the closed-form solve (O(d^3) inversion, memory), with streaming/minibatch data, when the model/loss has no closed form (logistic regression, neural nets), or when adding penalties like L1. Lecture: L3 (closed form/normal equations), L4 (GD motivation), L5 (convergence, step size). 

**Q7.** "Train your model using all of the training data (all data points, but not necessarily all the features), and generate the predictions on the test set. Submit these test set predictions to Kaggle, as specified in the 'Evaluation' > 'Submission File Format' section. Please submit a screenshot that highlights your position on Kaggle." Solution: refit OLS on the 17 features, `np.expm1` the log predictions (range 50,396 to 727,245), write `submission.csv` with columns Id, SalePrice. Kaggle screenshot shows score 0.14910 (log-RMSE), rank 2240 ("Welcome to the leaderboard"). Pitfall: forgetting expm1 (submitting ~12.0 for every house), wrong column names, missing Ids.

**Q8.** "Select one model with poor performance and explain in words why the selected features are not predictive." Solution: OLS on 12 "weak" features (MoSold_2..6, YrSold, LotFrontage, MiscVal, PoolArea, 3SsnPorch, LowQualFinSF, Street_Pave): MSE 0.1351, R^2 0.1536, with |corr| to log price mostly < 0.08 (LotFrontage 0.37 is the only one above). Explanation: sale month/year do not describe the house; the 2006-2010 window is too short for market drift; LotFrontage says nothing about size/quality; the rare amenities are almost all zeros, so the column carries no information for most rows. Lecture: L2 (what makes a good feature), L3 (R^2 interpretation).

**To do this from scratch a student needs:** pandas I/O and groupby, a data dictionary reading habit, the four missingness strategies (constant "None"/0, mode, group median, derived from another column), ordinal vs nominal encoding, log1p/expm1 and skewness, standardization, OLS theory (MSE, R^2, closed form, uniqueness), the autograd GD template, and the Kaggle submission format. The solution's Kaggle score of 0.149 is a plain OLS baseline; regularized models (Ridge/Lasso, L6 companion, L7/L8) typically reach ~0.12 and would be a natural "level 2" exercise.

## HW2 (due Oct 5, 2026)

L5 announcements describe the assignment: "Quiz, Report & Code due Mon Oct 5 at 11:59PM ET on Gradescope. Programming part Q1, part (d): observe by experiments. Q1 Part (e) bonus: need to provide a mathematical proof. Q2: clinical trial success rate prediction. Part (i) bonus: top 10 on leaderboard, see detailed instruction on the PDF. Key: combine the datasets."

### Part 1 (written/math) — "Data generating distribution and convergence of linear regression"

This is literally the question posed on an L3 slide: "When the data generating process is indeed linear, what does R^2 converge to in a linear regression when the number of samples grows to infinity? DGP: Y = alpha + beta X + eps, X ~ N(168,30), eps ~ N(0,20). What does R^2 converge to? (Homework 2)". Lecture mapping: L3 (R^2 = 1 - RSS/TSS, data generating distribution, iid sampling), L4 (true risk vs empirical risk, Y = f(X) + eps), L2 (linear model class). Required concepts: sample variance, law of large numbers, variance of a sum of independent RVs, E[Y|X] as the squared-loss optimal predictor, consistency of OLS, overfitting vs irreducible error.

**(a)** "Generate a synthetic dataset with the following data generating process: Y ≈ α + βX + ε, where X ~ N(168, 30) and ε ~ N(0, 20). Let α = 20 and β = 0.5. [Hint: use numpy.random.normal, and X and Y should be a column vector. Think carefully what the shape of X and epsilon should be.]" Solution: `np.random.normal(168, 30, (n,1))`, `np.random.normal(0, 20, (n,1))`, `Y = alpha + beta*X + e`. Pitfall: shape (n,) vs (n,1) (sklearn needs 2-D X; broadcasting (n,)+(n,1) silently makes an n x n matrix); passing variance instead of standard deviation.

**(b)** "Run 5 linear regressions with sample sizes n = 10^2, 10^3, 10^4, 10^5, 10^6. Report the coefficients and R^2 of each run." Solution with sklearn `LinearRegression().fit(X,Y)`, `.score`: n=100: α̂ 39.89, β̂ 0.395, R^2 0.279; n=10^3: 23.54, 0.480, 0.314; n=10^4: 19.74, 0.4995, 0.363; n=10^5: 19.44, 0.503, 0.365; n=10^6: 20.06, 0.4997, 0.360. Skills: sklearn fit/score, `intercept_`, `coef_` indexing for 2-D targets.

**(c)** "What do you observe in part (b)? Do the coefficients converge to α and β? Does your R^2 converge to 0? If not, what number does it converge to?" Solution: coefficients converge to 20 and 0.5; R^2 converges to 0.36, not 0, because Var(Y) = β^2 Var(X) + Var(ε) = 0.25*900 + 400 = 625 and R^2 -> 1 - 400/625 = 0.36.

**(d)** "Recall that R^2 = 1 - Σ(y_i - ŷ_i)^2 / Σ(y_i - ȳ)^2 ... and the sample variance var(X) = (1/n) Σ (x_i - x̄)^2. Assuming that the coefficients of the linear regression converge to those in the true data generating distribution, establish that when the data generation is linear, R^2 of a linear regression converges to 1 - var(ε)/var(Y)." Solution sketch: divide numerator and denominator by n; denominator is the sample variance of Y; substitute y_i = α + βx_i + ε_i and ŷ_i = α̂ + β̂x_i so the residual is (α-α̂) + (β-β̂)x_i + ε_i; expand the square; every cross term is a coefficient error (-> 0) times a sample average that converges by the LLN (x̄, mean of x^2, mean of xε -> Cov = 0), so only (1/n) Σ ε_i^2 -> E[ε^2] = var(ε) survives. Skills: algebra of residuals, LLN, independence of X and ε. Pitfall: forgetting that ε has mean zero so (1/n)Σε^2 is the variance; not justifying why cross terms vanish.

**(e) [Bonus +2]** "Show that the coefficients of the linear regression converge to α and β in the data generating process." Not attempted by the student. Expected proof: β̂ = Ĉov(X,Y)/V̂ar(X) = (β V̂ar(X) + Ĉov(X,ε))/V̂ar(X) -> β because Ĉov(X,ε) -> Cov(X,ε) = 0 by LLN; α̂ = ȳ - β̂ x̄ -> (α + β E[X]) - β E[X] = α. Lecture: L3/L4 plus the MLE view in L6.

**(f)** "...do you think there exists another model such that you obtain a better (higher) R^2 asymptotically? If so, show such an example. If not, argue why. (No math needed.)" Solution: No. E[(Y - f(X))^2] = var(ε) + E[(α + βX - f(X))^2] ≥ var(ε), with equality for f = E[Y|X] = α + βX; linear regression attains it. Flexible models (high-degree polynomial, 1-NN) can push in-sample R^2 to 1 by fitting noise but their out-of-sample R^2 falls below 0.36 (overfitting). Only extra features correlated with ε could help, which changes the problem. Lecture: L4 (true risk vs empirical risk), L7/L8 (overfitting, generalization).

**(g)** "Based on this exercise, what are some important characteristics of the data generating distribution necessary for the presence of a 'good' model?" Solution: high signal-to-noise ratio (max R^2 = 1 - var(ε)/var(Y)); the observed features must drive Y (unobserved drivers become irreducible error); noise uncorrelated with features (else β̂ -> β + Cov(X,ε)/Var(X)); Var(X) > 0 for identifiability; model class must contain E[Y|X]; iid samples from a stable distribution and enough of them. Lecture: L3 (iid assumption, DGP), L2 (linear model assumptions: independence, monotonicity, uniform effects).

### Part 2 (programming) — "Binary Classification of Clinical-Trial Text"

**Dataset.** Kaggle class competition "CS5785 HW2: Clinical Trial Outcome Prediction" (leaderboard screenshot `HW2/image.png`: student rank 43 with score 0.73577, 1 entry; the metric is F1 given the solution's threshold tuning for F1). The data appears to be derived from ClinicalTrials.gov trial-outcome benchmarks (NCT identifiers, eligibility criteria, disease and drug lists, binary success label). Nine CSVs: for each phase k in {1,2,3}, `phase{k}_train.csv`, `phase{k}_valid.csv` (columns NCTID, criteria, diseases_cleaned, drugs, label) and `phase{k}_test.csv` (same minus label). `criteria` is free text (inclusion/exclusion bullets, multi-line); `diseases_cleaned` and `drugs` are stringified Python lists (e.g. `"['breast cancer']"`, `"['trastuzumab, docetaxel ...']"`); `label` is 1 = trial succeeded, 0 = failed. "Phases" are clinical-trial phases, so the three datasets are the same task on different trial populations: Phase 1 (safety, small, often healthy volunteers), Phase 2 (efficacy), Phase 3 (large confirmatory). What changes across phases is the sample size, the base success rate, and the vocabulary; some NCTIDs appear in two phase files (Phase 1/2 or 2/3 combined trials), which the bonus exploits. Verified shapes and positive rates: Phase 1 train 1044 (56.7% positive), valid 117 (57.3%), test 627; Phase 2 train 4005 (47.8%), valid 446 (46.6%), test 1654; Phase 3 train 3094 (65.3%), valid 344 (66.6%), test 1146; only phase3_train has missing criteria (2 rows). Submission: 3427 rows (627 + 1654 + 1146), columns `row_id` = `phase{k}_{NCTID}` and `label` in {0,1}. `hw2_submission.csv` predicts 2609 positives (76.1%); `hw2_submission_bonus.csv` predicts 2944 (85.9%); 615 rows differ.

**Tasks (reconstructed from the solution; the student does Phase 3 first in full, then repeats (a)-(g) for Phases 1 and 2 under (h)).**

**(a) Load and describe.** Report sizes of train/valid/test, percentage of label 0/1, and missing criteria. Solution: numbers above; drops the 2 rows with missing criteria from phase3_train (-> 3092). Lecture: L8 (train/validation/test roles and distributional consistency). Pitfall: dropping test rows (they must be predicted), or imputing text.

**(b) Splits.** State the train/validation/test split used. Solution: keep the provided split unchanged. Lecture: L8.

**(c) Text preprocessing.** Clean the criteria text and show a before/after example. Solution `preprocess()`: lowercase; regex tokenize `[a-z0-9]+` (strips bullets, punctuation, newlines); drop pure-digit tokens (keeps "hba1c"); remove sklearn ENGLISH_STOP_WORDS except a kept list of negations/comparatives/timing words ("no, not, nor, none, never, cannot, without, except, neither, less, more, least, than, above, below, over, under, before, after, within, during") because "no prior chemotherapy" must stay distinguishable from "prior chemotherapy"; drop single characters; Porter stem. Lecture: L9 ("Preprocess raw text: stemming, filtering common stopwords, exclude rare words"), L1 mentions tokenization. Pitfall: default stop-word lists delete negation; stemming the vocabulary of the test set with a different pipeline.

**(d) Bag-of-words with a minimum document frequency M.** Report vocabulary size as M varies and pick M. Solution: `CountVectorizer(binary=True, min_df=M)`; Phase 3 vocab 11,677 (M=1), 7,256 (2), 4,393 (5), 2,998 (10), 1,952 (20), 1,074 (50), 642 (100); chose M = 10 (2,998 words; rarer words are typos/one-offs, no validation loss). Phase 1: 7,273 -> chose M=3 (3,417). Phase 2: 13,103 -> chose M=10 (3,525). Fit the vectorizer on train only, transform valid. Lecture: L9 (bag-of-words phi(x) in {0,1}^V, `CountVectorizer(binary=True)`, `vocabulary_`), L8 code companion (`CountVectorizer(binary=True, max_features=1000)`). Pitfall: fitting the vectorizer on validation/test (leakage), using counts when the assignment says presence.

**(e) Logistic regression, three regularization settings; report train and validation F1, ROC-AUC, PR-AUC.**
- (i) No regularization (`penalty=None` / `C=np.inf`, `max_iter=10000`). Phase 3: train F1 0.999 / AUC 1.0 / PR 1.0 vs valid F1 0.754 / 0.634 / 0.743; worse than the all-ones baseline F1 0.799. Explanation: ~3,000 features vs ~3,000 rows -> separable, memorizes noise. Phase 1: valid 0.662/0.621/0.672 (baseline 0.728). Phase 2: valid 0.594/0.651/0.580 (baseline 0.636).
- (ii) L1 (`penalty="l1", solver="liblinear"`), sweep C in {0.001 ... 10}, also record number of nonzero weights. Phase 3 pick C=0.1: valid F1 0.805 / 0.723 / 0.841, 144 nonzero words. Phase 1 pick C=0.1: 0.769 / 0.701 / 0.725, 56 words (C <= 0.01 zeroes everything -> F1 0). Phase 2 pick C=1: 0.648 / 0.696 / 0.654, 1,563 words (still overfits: train F1 0.909).
- (iii) L2, sweep C. Phase 3 pick C=0.01: valid 0.811 / 0.735 / 0.848. Phase 1 pick C=0.03: 0.752 / 0.703 / 0.736. Phase 2 pick C=0.001: 0.654 / 0.730 / 0.702 (train 0.641, the gap vanishes).
- (iv) Compare. Phase 3 table: none 0.999 -> 0.754; L1 0.818 -> 0.805; L2 0.842 -> 0.811; chose L2 C=0.01 by validation F1. Phase 1 chose L1 C=0.1 (F1 favors L1, AUCs slightly favor L2; only 117 validation trials). Phase 2 chose L2 C=0.001.
- (v) Interpret the L1 model's 10 most positive / negative words. Phase 3 positives: exclus 0.515, control, copd, metformin, male, arthriti, appli, secondari, ocular, outpati; negatives: biopsi -0.343, stage, detect, scale, platelet, arteri, brain, class, statin, erythematosu -> model mostly learns disease area (oncology/neuro/cardio trials fail more). Phase 1 words are procedural ("screen", "subject", "opinion" vs "concurr", "biopsi", "scan"), weights < 0.29. Phase 2 (C=1) words are rare drug names/abbreviations with weights ~ ±2 -> memorization.
Lecture: L5/L6 (logistic regression, sigmoid, MLE), L6/L7 (confusion matrix, precision, recall, F1, ROC/AUC; PR-AUC is the natural extension of L7's precision-recall slides; the L5 companion plots ROC with `roc_curve`), L7/L8 (L2 vs L1 penalties, Lasso sparsity "stay at zero", overfitting), L8 (hyperparameter tuning on the development set), L6 code companion (Ridge/Lasso coefficient paths). Pitfalls: tuning C on the training set; reporting accuracy instead of F1; comparing F1 across datasets with different positive rates; using `predict` for AUC instead of `predict_proba`; forgetting that liblinear is needed for L1; sklearn 1.8 deprecation of `penalty` (use `l1_ratio`/`C`).

**(f) 2-gram features.** Repeat with `ngram_range=(2,2)`, choose M, show example bigrams, compare to unigrams. Phase 3: 140,254 bigrams at M=1 -> M=10 gives 6,943; valid F1 0.807 vs unigram 0.811 (train AUCs higher -> fits closer without generalizing). Phase 1: valid F1 0.753 for every M (L1 already zeroes rare bigrams), M=5 (7,336); unigram 0.769 wins on F1 but bigram wins on AUCs. Phase 2: M=20 (5,288), valid F1 0.686 beats unigram 0.654 -> bigram chosen. Lecture: L9 (feature representations for text; n-grams are a natural extension of the hand-crafted-feature slide). Pitfall: bigram vocab explodes (140k-195k) so M matters for memory.

**(g) Add diseases and drugs.** Concatenate criteria + diseases_cleaned + drugs, preprocess, redo unigram and bigram models. Phase 3: unigram M=5, valid F1 0.815 / AUC 0.745 / PR 0.856 (best Phase 3 model); bigram 0.812. Phase 1: combined unigram M=3 F1 0.759 (vs 0.769 criteria-only) but AUCs up; chosen. Phase 2: combined bigram M=20 F1 0.678 (vs 0.686), chosen over combined unigram 0.648. Explanation: only a few disease/drug tokens per trial vs hundreds of criteria tokens. Lecture: L2 (feature engineering), L9.

**(h) All three phases, comparison, Kaggle submission.** Repeat (a)-(g) for Phases 1 and 2; compare validation F1/ROC-AUC/PR-AUC across phases; retrain the chosen model per phase on train+valid; predict test; concatenate into one submission; screenshot. Solution's cross-phase observation: F1 and PR-AUC rank Phase 3 > 1 > 2, but ROC-AUC is nearly flat (0.715-0.745) and Phase 2 beats Phase 1, because F1 and PR-AUC depend on the positive rate (67% / 57% / 47%) while ROC-AUC does not. Final per-phase models: P1 unigram M=3 + L1 C=0.1; P2 bigram M=20 + L2 C=0.001; P3 unigram M=5 + L2 C=0.01. Leaderboard: 0.73577, rank 43. Lecture: L7 (metric properties, class balance), L8 (refit on train+dev before test).

**(i) Bonus (top-10 leaderboard; hint "combine the datasets").** Solution: pool all labelled rows of all phases (9,048 rows); text = criteria + diseases + drugs, same preprocessing; `TfidfVectorizer(ngram_range=(1,2), min_df=3, sublinear_tf=True)`; append five phase features (indicator per phase, plus flags for trials whose NCTID appears in two phase files, "span" 12 or 23); L2 logistic regression (C=2, liblinear dual); average its probability with a cosine-similarity-weighted k=40 nearest-neighbour vote over all labelled trials (weights squared, smoothed (sum w y + 0.15)/(sum w + 0.3)); average the score for a trial listed in two phases; 5-fold `GroupKFold` by NCTID for out-of-fold predictions; pick one decision threshold 0.41 maximizing pooled OOF F1 (0.754 vs 0.739 at 0.5; vs 0.720 for the per-phase models under the same CV); per-phase OOF ROC-AUC 0.724 / 0.744 / 0.801; also checked a time-based holdout of the newest trials (F1 0.790 -> 0.816). Writes `hw2_submission_bonus.csv` (85.9% positive). Skills beyond lectures: TF-IDF, kNN voting, group K-fold (K-fold itself is L8), threshold tuning for F1 (the L5 companion discusses moving the 0.5 threshold), sparse `hstack`. The bonus's actual leaderboard result is not recorded in the files (the on-disk screenshot shows 1 entry, consistent with the (h) submission).

## Cross-cutting

### Skill inventory

| Skill | HW problem(s) | Lecture / companion |
|---|---|---|
| numpy array creation, reshape, `@`, `linalg.norm('fro')` | HW1 I.1, I.5 | L1 tooling, L2 companion |
| torch elementwise ops, dot, exp/log, dtype casts, `.numpy()` | HW1 I.2, I.4 | L4 companion |
| autograd: `requires_grad`, `.backward()`, `.grad`, scalar outputs | HW1 I.3a-c, II.5 | L4 (companion), L3 gradients |
| hand-verify a gradient (chain rule on e^p p^2, tanh) | HW1 I.3a, I.3c | L3/L4 |
| matrix calculus / Frobenius norm of a matrix product | HW1 I.3b, I.5 | corequisite; L2 notation |
| pandas load, dtypes, `value_counts`, hist vs bar | HW1 II.2 | L2 (data representation) |
| reading a data dictionary; NA-means-none vs missing | HW1 II.3 | L2 |
| imputation: constant, 0, mode, group median, derived column | HW1 II.3 | L2 |
| ordinal encoding of quality scales | HW1 II.3 | L2 |
| one-hot encoding (`get_dummies`), dummy trap | HW1 II.3, II.4 | L2 (one-hot slide) |
| feature engineering (sums, ages) and justification | HW1 II.3, II.5 | L2 |
| log1p target / skew correction, expm1 back-transform | HW1 II.3, II.7 | L3 (loss on transformed target), Kaggle metric |
| standardization fit on train only (leakage) | HW1 II.3 | L4/L5 (GD conditioning), L8 (dev/test hygiene) |
| correlation-based feature selection, multicollinearity check | HW1 II.5, II.8 | L2/L3 |
| OLS with sklearn; MSE and R^2 | HW1 II.5, HW2 1.b | L2/L3 |
| implement GD in torch without nn layers; convergence test; step size | HW1 II.5, II.6 | L4 (companion template), L5 |
| closed form vs GD trade-offs | HW1 II.6 | L3/L4 |
| Kaggle submission file + screenshot | HW1 II.7, HW2 2.h | L1 logistics |
| explain non-predictive features | HW1 II.8 | L2/L3 |
| simulate a DGP with numpy (shapes, sd vs var) | HW2 1.a | L3 |
| convergence of OLS coefficients; LLN | HW2 1.b-e | L3/L4 |
| derive asymptotic R^2 = 1 - var(ε)/var(Y) | HW2 1.c-d | L3 (slide poses it) |
| Bayes-optimal predictor E[Y|X]; irreducible error; overfitting | HW2 1.f | L4, L7/L8 |
| conditions on the DGP for learnability | HW2 1.g | L2, L3 |
| describe a dataset (sizes, class balance, missing) | HW2 2.a | L8 |
| text preprocessing: tokenize, stopwords (keep negation), stem | HW2 2.c | L9 |
| bag-of-words with `CountVectorizer(binary, min_df)`; vocab vs M | HW2 2.d, 2.f | L9, L8 companion |
| logistic regression in sklearn; C vs lambda; solvers | HW2 2.e | L5/L6, L4 companion |
| F1, ROC-AUC, PR-AUC; `predict_proba`; baseline F1 | HW2 2.e, 2.h | L6/L7, L5 companion |
| L1 vs L2 regularization; sparsity; tuning C on validation | HW2 2.e | L7/L8, L6 companion |
| interpreting coefficients on words | HW2 2.e(v) | L8 (Lasso), L9 |
| n-gram features | HW2 2.f | L9 |
| combining text fields | HW2 2.g | L2/L9 |
| comparing metrics across datasets with different base rates | HW2 2.h | L7 |
| refit on train+valid; group-aware K-fold; threshold tuning | HW2 2.h, 2.i | L8 (K-fold), L5 companion (threshold) |
| TF-IDF, kNN vote, pooling datasets with indicator features | HW2 2.i | beyond lectures (bonus) |
| combine splits; drop training rows whose ID is in validation | HW3 P1 | L8 (dev/test hygiene) |
| tokenize non-word codes (ICD) without breaking them | HW3 P1 | L9 (beyond the slides) |
| Bernoulli NB from scratch: counts, add-α smoothing, absent-word terms, log space, log-sum-exp posteriors | HW3 P1a | L9, spam exercise |
| generative vs discriminative comparison on identical features | HW3 P1b | L8, L9, L10 |
| per-class means and covariances (MLE vs `np.cov`); GDA/QDA prediction with three classes | HW3 P2b-d | L10 pp.1–21 |
| choose and justify a multiclass metric | HW3 P2d | L6/L7 |
| k-means vs GDA on the same features | HW3 P2e | L10 pp.22–49 |
| Naive Bayes by hand from counts; effect of violating conditional independence | HW3 W1 | L9 pp.20–31 |
| categorical MLE via Lagrange multipliers, one simplex per feature and class | HW3 W2 | L8/L9 (prior MLE), L6 (MLE) |

### "Unit readiness" checklists

**HW1 (what a unit must teach, in order):**
1. Environment: numpy, pandas, matplotlib, torch imports; arrays vs tensors; dtypes; reshape and `@`.
2. Norms and matrix products (Frobenius, vector 2-norm), enough matrix calculus to sanity-check autograd.
3. Autograd: leaf tensors, `requires_grad`, scalar `.backward()`, reading `.grad`, `detach()`, `no_grad()`.
4. The ML recipe (L2): data, targets, model class, loss, optimizer; attributes vs features; continuous / ordinal / nominal.
5. Linear regression and MSE; R^2 = 1 - RSS/TSS and what it measures (L3).
6. Closed-form OLS and sklearn `LinearRegression`; why the optimum is unique.
7. Empirical risk and gradient descent (L4): the update rule, the convergence test, step size effects (L5).
8. Data preprocessing craft: reading a data dictionary; missing-value strategies; ordinal maps; one-hot; feature engineering; log transforms; standardization; leakage.
9. Feature selection by correlation and reasoning about non-predictive features.
10. Kaggle mechanics: submission format, back-transforming predictions, screenshot.

**HW2 (in order):**
1. Data generating distributions, iid sampling, Y = f(X) + ε (L3/L4); simulate with numpy with correct shapes.
2. Variance algebra and the law of large numbers; sample variance.
3. OLS consistency intuition and the R^2 limit (L3 slide) and its derivation.
4. True risk vs empirical risk; E[Y|X] as the squared-loss optimum; irreducible error; overfitting (L4, L7/L8).
5. Train / validation / test discipline and K-fold (L8).
6. Text to features: preprocessing choices, bag-of-words, vocabulary thresholds, n-grams (L9).
7. Logistic regression: sigmoid, MLE/cross-entropy, sklearn API, C = 1/lambda (L5/L6).
8. Classification metrics: confusion matrix, precision/recall/F1, ROC-AUC, PR-AUC, dependence on class balance, trivial baselines (L6/L7).
9. Regularization: L2 vs L1, sparsity, tuning on validation, reading coefficients (L7/L8).
10. Experimental hygiene: sweep one knob at a time, tabulate train vs valid, pick by validation metric, refit on train+valid, predict test.
11. (Bonus) pooling related datasets, TF-IDF, threshold selection, group-aware CV.

**HW3 (in order):**
1. Generative vs discriminative models and the Bayes classifier (L8).
2. Text to features, fit on training only; tokenization choices for codes (L9, HW2).
3. The Naive Bayes assumption; Bernoulli NB MLE by counting; the categorical MLE with a Lagrange multiplier (L9).
4. Zero counts and Laplace smoothing; log-space prediction; posteriors with log-sum-exp (L9, spam exercise).
5. Classification metrics: F1 at a threshold, ROC-AUC, PR-AUC, and class balance (L6/L7).
6. Logistic regression with no penalty, L1, and L2; `C = 1/λ` (L5–L8).
7. The multivariate Gaussian; per-class means and covariances; GDA prediction (L10).
8. k-means and how it differs from GDA (L10).

### HW3 (due Oct 19, 2026)

Source: `AML Course Material/Homeworks/HW3/Homework_3___F26.pdf`, the original 7-page assignment (added 2026-10-14). Unlike HW1 and HW2, the problem statements below are paraphrased from the assignment itself. No solution, notebook, or data files are in the repo yet; the "HW3 Code Companion" notebook (a GDA tutorial on an Iris subset) is on Canvas only. **HW3 is live until 2026-10-19 (VISION R17): this section records what is asked and what it needs, never an answer.** The forecast written on 2026-10-06 got the topics right but the shape partly wrong: there is no Kaggle submission, the text data is the HW2 clinical-trial data rather than the spam set, the GDA problem uses Iris with per-class covariances (not a shared one), and the written part is a small worked Naive Bayes problem plus the categorical Naive Bayes MLE, not the GDA MLE.

Submission: the "HW3: Quiz" on Canvas; a PDF report ("Homework 3 - Report") and a zipped `hw3` folder of notebooks ("Homework 3 - Code") on Gradescope; questions must be tagged on Gradescope.

#### Programming 1: binary classification of clinical-trial text

- **Data.** The HW2 phase files re-downloaded from the course Kaggle competition with an extra `icdcodes` column. Concatenate the three `phase*_train.csv` files into one training set and the three `phase*_valid.csv` files into one validation set; drop from the combined training set every row whose NCTID also occurs in the combined validation set (trials that span two phases); keep validation unchanged; no re-splitting, no Kaggle submission.
- **Preprocessing.** Text = `criteria`, `diseases_cleaned`, `drugs`, `icdcodes` joined by spaces. The student must choose and justify: lowercase, lemmatize/stem, punctuation, stop words, numbers and structural words ("inclusion", "exclusion"), stripping list-formatting from the stringified (possibly nested) lists, and how to tokenize ICD codes such as `R11.0` (keep the dot with a custom tokenizer, or remove it; optional `icd_` prefix). Must explain missing/empty handling and apply identical preprocessing to both sets. Only those four fields are predictive inputs (not NCTID, not phase).
- **Features.** Binary unigram bag of words, `CountVectorizer(binary=True, min_df=M, ngram_range=(1,1))`, fit once on training only; justify M and report the vocabulary size.
- **Evaluation.** As in HW2: F1 (threshold 0.5, label 1 positive), ROC-AUC, and PR-AUC as `average_precision_score`, on train and validation, for every model; select by validation F1.
- **(a) Bernoulli Naive Bayes, from scratch** (numpy only; no `sklearn.naive_bayes`). Laplace smoothing $\psi_{jk} = (n_{jk} + \alpha)/(n_k + 2\alpha)$ with $\alpha = 1$ (stated, with the zero-count motivation, in the assignment); priors from training labels; score both present and absent features; log space; normalize class scores to posteriors for the AUCs.
- **(b) Model comparison.** Logistic regression on the same matrices: `penalty=None`, `'l1'`, `'l2'` (compatible solvers; `C=1.0`, no search). Reflect: best LR by validation F1 vs NB; do the AUCs agree; generative vs discriminative pros and cons; Naive Bayes vs logistic-regression assumptions; is Bernoulli NB valid and efficient for text.
- Lectures: L9 (bag of words, Bernoulli NB, MLE, smoothing, log-space prediction), L8 (generative vs discriminative), L6/L7 (F1, ROC, PR), L7/L8 (L1/L2), L5/L6 (logistic regression). Companion: `NaiveBayes_Spam_exercise_sol.ipynb`.
- Pitfalls to teach (general, not answers): sklearn's default `token_pattern` `(?u)\b\w\w+\b` splits `R11.0` at the dot and drops one-character tokens; stripping digits destroys codes; refitting the vectorizer on validation; forgetting the $\log(1 - \psi_{jk})$ terms for absent words; exponentiating raw log scores (underflow) instead of log-sum-exp; reading PR-AUC without the positive rate; the overlap filter must use the combined validation set, not per phase.

#### Programming 2: Gaussian discriminant analysis on Iris

- `sklearn.datasets.load_iris(as_frame=True)`; 150 flowers, 3 classes, 4 features. Student chooses a train/test split; (a)–(c) and (e) use training data only, (d) the test set. No `sklearn.discriminant_analysis`; numpy/scipy allowed.
- **(a)** Scatter any two features colored and labeled by class; comment on clustering vs class. All four features thereafter.
- **(b)** Print priors $n_k / n$.
- **(c)** Per-class empirical mean $\mu_k$ and covariance $\Sigma_k$ (separate per class, i.e. QDA). Note for teaching: `np.cov` divides by $n_k - 1$ by default; the MLE (L10 p.20) divides by $n_k$.
- **(d)** Predict with $\argmax_y P(x \mid y)P(y)$; report a metric of the student's choice and justify it.
- **(e)** k-means with $K = 2$ on the two-feature subset from (a); will the clusters differ from GDA's, and why.
- Lectures: L10 pp.1–21 (multivariate Gaussian, GDA MLE, prediction), L10 pp.22–49 (k-means), L6/L7 (metric choice). Lessons 7.1–7.3, 8.1.

#### Written 1: Naive Bayes with binary features

50 students: 20 Master's ($y = 0$), 30 PhD ($y = 1$); counts of bikers ($x_1$) and skiers ($x_2$) per program are given. (a) State the NB assumption in context. (b) Under NB, the posterior probability of Master's for a student who neither bikes nor skis (a numeric answer: never publish while live). (c) Given that every PhD who skis also bikes, is conditional independence still reasonable for PhDs, and how does (b) change if NB is kept only for Master's. Lectures: L9 pp.20–31. Lesson 6.3; checks q-u6-l3-016, q-u6-l3-025.

#### Written 2: categorical Naive Bayes

Features $x_j \in \{1, \dots, L\}$, classes $y \in \{1, \dots, K\}$; prior $\phi_k$; $P_\theta(x_j = \ell \mid y = k) = \psi_{jk\ell}$; NB factorization. Show by maximum likelihood that (a) $\phi_k^* = n_k/n$ and (b) $\psi_{jk\ell}^* = n_{jk\ell}/n_k$ (both results are stated in the assignment; the derivation is the graded work). Required technique: split the log-likelihood (L8/L9), then one Lagrange multiplier per simplex, exactly the $\hat\phi_k$ derivation of lesson 6.3 (der-6-3-5) applied to each $(j, k)$; der-6-3-9 (multinomial NB) uses the same move. Do not publish a categorical-NB derivation before 2026-10-19; after it, the walkthrough can generalize der-6-3-5.

#### Gaps in the site that HW3 exposes (as of 2026-10-14)

- ROC-AUC and PR-AUC (average precision): no lesson; Unit 4 is unwritten. Highest priority.
- L1/L2 logistic regression and `C` vs $\lambda$: only the glossary and one 6.2 quiz item; Unit 5 is unwritten.
- Removing cross-split duplicates by ID (group leakage): not taught anywhere; belongs in Unit 5's model-selection lesson (L8 pp.1–18).
- Tokenizing non-word codes (ICD) with `CountVectorizer`: not covered; a natural Pitfalls item for lesson 6.2.
- Matching k-means cluster ids to classes (label permutation): not covered in 8.1.
- `np.cov` default normalization vs the MLE: in 7.2's bias section implicitly; worth one explicit pitfall.

#### Walkthrough plan (after 2026-10-19)

Flip `hw3.mdx` to `live: false`. Programming 1 and 2 walkthroughs need the student's notebooks (or a solution) in `Homeworks/HW3/` so code is shown with real output (STYLE_GUIDE §3). Written 1 can be worked from the counts in the PDF; Written 2 extends der-6-3-5 to $\psi_{jk\ell}$.

### Ideas for turning homework problems into platform exercises

- **Predict-the-output cells (HW1 Part I).** Show a tensor snippet, ask for the printed result (auto-checked numerically with tolerance). Variants randomize the input vectors so the answer key cannot be copied. Pair every autograd exercise with a "derive it by hand" step: the learner enters the symbolic derivative (e.g. c e^p (p^2 + 2p)) and the platform compares it against autograd at random points.
- **Gradient checker badge.** A sandbox where the learner writes `g(p)` and the platform runs finite differences vs `.backward()`; passing unlocks the 3b-style matrix-chain problem, which explicitly requires `A.grad` (fixing the gap in the student solution).
- **Imputation decision game (HW1 II.3).** Present a column and its data-dictionary entry; the learner picks "None category / 0 / mode / group median / derived", with immediate feedback and a score. Follow with a leakage spot-the-bug: three scaler/encoder pipelines, one fits on train+test.
- **One-hot visualizer (II.4).** Drag a categorical column, see the dummy matrix grow; quiz on how many columns, what happens to the intercept (dummy trap), and when ordinal maps are better.
- **GD playground (II.5-6).** Sliders for step size and standardization; live loss curve shows monotone convergence, oscillation, divergence (L5's eta_opt regimes). Auto-graded task: implement the update step inside a locked template (no `nn.Linear`), checked against the closed form to 1e-4.
- **Feature-drafting challenge (II.5, II.8).** Learners pick 10 features from a list; the platform fits OLS on a hidden split and reports R^2; a leaderboard inside the platform (not Kaggle) uses a private split so public Kaggle labels are not leaked. Include a "worst team" mode to make the II.8 explanation concrete.
- **R^2 convergence simulator (HW2 Part 1).** Sliders for Var(X), Var(ε), n; animate coefficient and R^2 trajectories; the learner must enter the limit before seeing it. Then a scaffolded proof with auto-checked intermediate claims (denominator = var(Y); cross terms vanish; survivor = var(ε)), and an optional (e) proof with a hint ladder.
- **"Can anything beat 0.36?" debate card (1.f).** Multiple-choice plus free-text justification graded by rubric keywords (irreducible, E[Y|X], overfitting).
- **Text-preprocessing unit tests (HW2 2.c).** Learner's `preprocess()` must pass hidden tests: negations preserved, numbers dropped, stems applied; show before/after diff.
- **Vocabulary vs M curve (2.d/2.f).** Interactive plot of vocab size and validation F1 vs min_df for unigrams and bigrams; the learner justifies a choice in one sentence (rubric-checked).
- **Regularization dial (2.e).** A C slider that live-updates train F1, valid F1, nonzero-coefficient count, and the top ±10 words; tasks: find the C where L1 zeroes everything, explain why unregularized F1 is below the all-positive baseline, identify disease-area words.
- **Metrics reasoning quiz (2.h).** Given three confusion matrices with different base rates, compute F1, precision, recall, and explain why ROC-AUC is flat while F1 moves; auto-checked numeric answers plus a short explanation.
- **Bonus lab track.** Optional challenges that mirror (i) without giving the solution: "add a phase indicator", "tune the threshold on out-of-fold predictions", "group folds by NCTID"; each is a pass/fail check on a hidden validation set with a points multiplier, keeping the Kaggle test labels untouched.
- **Readiness gates.** Each HW page lists the checklist above; completing the linked mini-exercises lights up the "ready for HW1/HW2" badge, which operationalizes "read a unit, then do the homework".
