# Machine Learning: Gradient Descent and Optimization

## The Optimization Problem
In machine learning, training a model means finding weights `w` that minimize a **loss function** `L(w)`. Gradient descent is the workhorse algorithm for this.

---

## Gradient Descent

### Core Idea
The gradient `∇L(w)` points in the direction of steepest increase of the loss. Moving in the **negative gradient direction** decreases the loss.

**Update Rule**: `w = w - η × ∇L(w)`

Where `η` (eta) is the **learning rate** — how large a step to take.

### Learning Rate
- **Too large**: Overshoots the minimum — loss oscillates or diverges.
- **Too small**: Very slow convergence — training takes too long.
- **Learning rate schedules**: Start high, decay over time.

---

## Variants of Gradient Descent

### Batch Gradient Descent
- Compute gradient using the **entire training dataset** before updating weights.
- **Pros**: Stable, guaranteed to converge (for convex problems).
- **Cons**: Very slow for large datasets; can't do online learning.

### Stochastic Gradient Descent (SGD)
- Compute gradient using **one training sample** at a time; update immediately.
- **Pros**: Very fast updates, can escape local minima due to noise.
- **Cons**: High variance in gradient estimates — noisy, oscillating path.

### Mini-Batch Gradient Descent
- Compute gradient using a **small batch** (e.g., 32, 64, 128 samples).
- **Pros**: Balance between batch and SGD — stable enough, fast enough.
- **Most commonly used in practice** (what people call "SGD" in deep learning).

| Variant | Gradient from | Speed | Stability |
|---|---|---|---|
| Batch GD | All data | Slow | Stable |
| SGD | 1 sample | Fast | Noisy |
| Mini-Batch | k samples | Fast | Moderate |

---

## Advanced Optimizers

### Momentum
Adds a fraction of the previous gradient update to the current update — builds velocity in consistent gradient directions, dampens oscillations.

`v = β × v + η × ∇L(w)`
`w = w - v`

- `β` typically 0.9.
- Helps navigate ravines (areas where loss surface curves differently in different directions).

### RMSProp
Adapts the learning rate per parameter — divides by the moving average of squared gradients.

`v = β × v + (1-β) × (∇L)²`
`w = w - (η / √(v + ε)) × ∇L`

- Parameters with large historical gradients get smaller updates.
- Good for non-stationary problems (RNNs).

### Adam (Adaptive Moment Estimation)
Combines Momentum (first moment) and RMSProp (second moment). **Most widely used optimizer.**

```
m = β₁m + (1-β₁)g          # First moment (mean)
v = β₂v + (1-β₂)g²         # Second moment (variance)
m̂ = m / (1-β₁ᵗ)            # Bias-corrected
v̂ = v / (1-β₂ᵗ)            # Bias-corrected
w = w - η × m̂ / (√v̂ + ε)
```

- Typical defaults: `β₁=0.9`, `β₂=0.999`, `ε=1e-8`, `η=0.001`.
- Adapts learning rate per parameter. Robust and fast.

### AdaGrad
Accumulates all past squared gradients — learning rate decreases over time.
- Good for sparse features (e.g., NLP).
- Problem: Learning rate can decay to zero too quickly.

---

## Challenges in Optimization

### Local Minima vs Saddle Points
- In high-dimensional loss surfaces, **true local minima** are rare.
- **Saddle points** (zero gradient but not minimum) are more common and harder to escape.
- SGD's noise helps escape saddle points.

### Vanishing and Exploding Gradients
(See neural_networks.md)

### Loss Surface Visualization
- **Convex**: Single global minimum — gradient descent guaranteed to converge. (e.g., linear regression, logistic regression)
- **Non-convex**: Many local minima and saddle points. (deep neural networks)

---

## Weight Initialization

Starting from the right weights is critical:
- **Zero initialization**: All neurons learn same gradients — breaks symmetry.
- **Random small values**: `N(0, 0.01)` — works but can cause vanishing gradients in deep nets.
- **Xavier/Glorot initialization**: `var(w) = 2/(n_in + n_out)` — good for sigmoid/tanh.
- **He initialization**: `var(w) = 2/n_in` — good for ReLU activations.

---

## Learning Rate Scheduling

Reduce learning rate over time to fine-tune convergence:
- **Step Decay**: Reduce by factor every N epochs.
- **Exponential Decay**: `η = η₀ × e^(-kt)`
- **Cosine Annealing**: Gradually decay following cosine curve.
- **Warm-up**: Start with small learning rate, increase gradually, then decay. Used in Transformer training.
- **ReduceLROnPlateau**: Automatically reduce when validation metric stops improving.

## Key Interview Questions
1. What is the difference between SGD, Mini-Batch GD, and Batch GD?
2. Why is Adam more popular than vanilla SGD?
3. What problem does Momentum solve in gradient descent?
4. Why should weights not be initialized to zero in a neural network?
5. What is the learning rate and what happens if it is too high or too low?
