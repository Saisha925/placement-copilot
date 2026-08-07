# Machine Learning: Bias-Variance Tradeoff and Regularization

## The Bias-Variance Tradeoff

The **generalization error** of a model can be decomposed into:
**Total Error = Bias² + Variance + Irreducible Noise**

### Bias
**Error from wrong assumptions** in the learning algorithm. A high-bias model underfits — it misses relevant relations between features and outputs.

- High bias: Model too simple, can't capture patterns.
- Symptoms: High training error, high test error.
- Example: Fitting a straight line to data that follows a curve.

### Variance
**Error from sensitivity to small fluctuations** in the training set. A high-variance model overfits — it models noise in the training data.

- High variance: Model too complex, memorizes training data.
- Symptoms: Low training error, but high test error (large gap).
- Example: High-degree polynomial that passes through every training point perfectly.

### The Tradeoff
Increasing model complexity **reduces bias but increases variance** (and vice versa).

```
               │
Error          │ ← Total Error
               │      ╲
               │   Variance ╲
               │              ───────
               │   Bias²     ╱
               │       ╲    ╱
               │        ╲──╱
               │         ↑
               │    Optimal Complexity
               └─────────────────────────
                    Model Complexity
```

**Goal**: Find the sweet spot — low enough bias and variance — which gives the best generalization.

---

## Overfitting and Underfitting

### Underfitting
- Model too simple, high bias.
- Poor performance on both training and test sets.
- Fix: More complex model, more features, more training, less regularization.

### Overfitting
- Model too complex, high variance.
- Excellent training performance, poor test performance.
- Fix: More data, regularization, simpler model, dropout, early stopping, cross-validation.

---

## Regularization

Regularization adds a **penalty term to the loss function** to discourage overly complex models.

**Regularized Loss = Original Loss + λ × Penalty**

`λ` (lambda) is the **regularization strength hyperparameter**:
- Too small → little regularization → overfitting risk.
- Too large → too much penalty → underfitting risk.

### L1 Regularization (Lasso — Least Absolute Shrinkage and Selection Operator)

**Penalty**: Sum of absolute values of weights: `λ Σ|wᵢ|`

**Properties**:
- Produces **sparse models** — drives many coefficients to **exactly zero** (feature selection).
- Useful when you suspect many features are irrelevant.
- Not differentiable at zero (use coordinate descent or subgradient methods).

```python
from sklearn.linear_model import Lasso
model = Lasso(alpha=0.1)  # alpha = λ
```

### L2 Regularization (Ridge)

**Penalty**: Sum of squared weights: `λ Σwᵢ²`

**Properties**:
- Shrinks all coefficients toward zero, but **rarely exactly zero**.
- More stable when features are correlated (distributes weight across correlated features).
- Differentiable everywhere — works well with gradient descent.
- Closed-form solution exists.

```python
from sklearn.linear_model import Ridge
model = Ridge(alpha=1.0)
```

### Elastic Net
**Combines L1 and L2**: `λ₁ Σ|wᵢ| + λ₂ Σwᵢ²`

Best of both worlds — sparsity from L1, stability from L2. Useful when there are many correlated features.

### L1 vs L2 Comparison

| Aspect | L1 (Lasso) | L2 (Ridge) |
|---|---|---|
| Penalty | Sum of absolute weights | Sum of squared weights |
| Sparsity | Yes — drives weights to zero | No — shrinks weights but not to zero |
| Feature selection | Built-in (eliminates features) | Not built-in |
| Correlated features | Selects one, ignores others | Distributes weight equally |
| Computationally | Harder (not differentiable at 0) | Easier (differentiable) |

---

## Dropout (Neural Network Regularization)

During training, randomly set a fraction `p` of neurons to zero at each forward pass.
- Prevents neurons from co-adapting (relying on specific other neurons).
- Effectively trains an ensemble of many different network architectures.
- At test time, all neurons are used but their outputs are scaled by `p`.

```python
# Keras/PyTorch
model.add(Dropout(rate=0.5))  # 50% of neurons dropped per training step
```

## Early Stopping

Monitor validation loss during training. Stop training when validation loss begins to increase (even if training loss is still decreasing).
- Prevents the model from memorizing the training set.
- Effectively keeps the model at the optimal complexity point.

## Key Interview Questions
1. What is the bias-variance tradeoff? How does it relate to underfitting and overfitting?
2. What is the difference between L1 and L2 regularization?
3. Why does L1 regularization produce sparse models?
4. What is dropout and why does it work as a regularization technique?
5. How does the regularization strength hyperparameter λ affect the model?
