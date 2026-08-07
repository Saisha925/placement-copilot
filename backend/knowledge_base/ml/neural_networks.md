# Machine Learning: Neural Networks and Deep Learning

## Neural Network Basics

### Biological Inspiration
Artificial neural networks loosely model the human brain — neurons receive inputs, apply a transformation, and pass the output to the next layer.

### Architecture

**Input Layer**: Receives raw features (e.g., pixel values, numerical features). One neuron per feature.

**Hidden Layer(s)**: Intermediate computation. Each neuron:
1. Computes a weighted sum: `z = Σ(wᵢxᵢ) + b`
2. Applies an activation function: `a = f(z)`

**Output Layer**:
- **Regression**: 1 neuron, linear activation.
- **Binary Classification**: 1 neuron, sigmoid activation.
- **Multi-class Classification**: K neurons, softmax activation.

---

## Activation Functions

### Why Activation Functions?
Without non-linear activation functions, a stack of linear layers is equivalent to a single linear layer — unable to learn complex patterns.

### Sigmoid
`σ(z) = 1 / (1 + e⁻ᶻ)`
- Output range: (0, 1).
- Used in output layer for binary classification.
- **Problem**: Vanishing gradient — gradient approaches 0 for large |z|, making deep networks hard to train.

### Tanh
`tanh(z) = (eᶻ - e⁻ᶻ) / (eᶻ + e⁻ᶻ)`
- Output range: (-1, 1) — zero-centered (better than sigmoid).
- Still suffers from vanishing gradient for large |z|.

### ReLU (Rectified Linear Unit)
`ReLU(z) = max(0, z)`
- Simple and fast.
- No vanishing gradient for positive values.
- **Problem**: Dying ReLU — neurons can permanently output 0 if z is always negative.

### Leaky ReLU
`LeakyReLU(z) = z if z > 0 else 0.01z`
- Fixes dying ReLU by allowing small negative outputs.

### Softmax
`softmax(zᵢ) = e^zᵢ / Σe^zⱼ`
- Converts a vector of raw scores (logits) into probabilities summing to 1.
- Used in the output layer for multi-class classification.

---

## Backpropagation

The algorithm for computing gradients of the loss function with respect to each weight in the network, used to update weights via gradient descent.

### Steps
1. **Forward Pass**: Compute output of network, calculate loss.
2. **Backward Pass**: Use the chain rule to compute ∂L/∂w for every weight — propagate gradients from output layer back to input layer.
3. **Weight Update**: `w = w - η × ∂L/∂w` (η = learning rate)

### Chain Rule
`∂L/∂w = ∂L/∂a × ∂a/∂z × ∂z/∂w`

Each gradient is the product of gradients through the layers.

### Vanishing Gradient Problem
In deep networks with sigmoid/tanh, gradients become exponentially small as they propagate backward — earlier layers learn very slowly. 

**Solutions**: ReLU activations, Batch Normalization, Residual connections (skip connections).

### Exploding Gradient Problem
Gradients become exponentially large — weights update wildly and the network diverges.

**Solutions**: Gradient clipping (cap gradient norm), proper weight initialization.

---

## Loss Functions

### Mean Squared Error (MSE) — Regression
`L = (1/n) Σ(yᵢ - ŷᵢ)²`
- Penalizes large errors heavily. Sensitive to outliers.

### Cross-Entropy Loss — Classification
**Binary**: `L = -[y log(p) + (1-y) log(1-p)]`

**Categorical**: `L = -Σ yᵢ log(pᵢ)`

- Measures the divergence between true labels and predicted probabilities.
- Standard loss for classification tasks.

---

## Convolutional Neural Networks (CNNs)

### Architecture (for images)
1. **Convolutional Layer**: Applies learned filters (kernels) that slide over the input, detecting local features (edges, textures, shapes).
2. **Activation (ReLU)**: Introduces non-linearity.
3. **Pooling Layer**: Reduces spatial dimensions (max pooling, average pooling).
4. **Flatten**: Convert feature maps to 1D vector.
5. **Fully Connected Layer**: Standard neural network layers.
6. **Output**: Softmax for classification.

### Key Concepts
- **Kernel/Filter**: Small matrix (e.g., 3×3) that detects a specific feature.
- **Stride**: Step size when sliding the kernel.
- **Padding**: Add zeros around input to preserve spatial dimensions.
- **Feature Map**: Output of a convolutional layer — each filter produces one feature map.
- **Parameter Sharing**: Same filter applied across all positions — fewer parameters than fully connected.
- **Translation Invariance**: Features detected regardless of position in image.

### Famous Architectures
- **LeNet**: First CNN for digit recognition.
- **AlexNet**: Popularized deep learning (ImageNet 2012).
- **VGG**: Very deep CNNs with small 3×3 filters.
- **ResNet**: Residual/skip connections solving vanishing gradient in very deep networks.
- **Inception/GoogLeNet**: Parallel convolutions of different sizes.

---

## Transformers (Modern — increasingly asked in 2025)

### Self-Attention
For each element in a sequence, computes how much to attend to every other element.
- Query (Q), Key (K), Value (V) projections of each input.
- `Attention(Q, K, V) = softmax(QK^T / √d_k) × V`
- Captures long-range dependencies better than RNNs.

### Transformer Architecture
- **Encoder**: Self-attention + feed-forward layers → encodes input sequence.
- **Decoder**: Self-attention + cross-attention (to encoder output) + feed-forward.
- **Positional Encoding**: Since attention has no order, add position information to embeddings.

### Large Language Models (LLMs)
- BERT: Encoder-only, bidirectional context. Used for classification, NER, QA.
- GPT: Decoder-only, left-to-right generation. Used for text generation.
- T5, BART: Encoder-decoder, used for translation, summarization.

## Key Interview Questions
1. What is the vanishing gradient problem and how do ReLU and residual connections help?
2. Explain backpropagation step by step.
3. Why are CNNs better than fully connected networks for image data?
4. What is the difference between max pooling and average pooling?
5. What is self-attention and why is it key to transformers?
