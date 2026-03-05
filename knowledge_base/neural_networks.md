# Deep Learning & Neural Networks

## What is a Neural Network?

A neural network is a computational model inspired by the human brain. It consists of layers of interconnected **neurons** (nodes) that transform input data into meaningful output through learned weights.

### Architecture Components

- **Input Layer**: Receives raw features (one neuron per feature)
- **Hidden Layers**: Learn complex representations (1+ layers)
- **Output Layer**: Produces final prediction
- **Weights (W)**: Parameters the network learns
- **Biases (b)**: Offsets added to each neuron's output
- **Activation Functions**: Non-linear functions that allow the network to learn complex patterns

## Activation Functions

| Function | Formula | Use Case |
|----------|---------|----------|
| ReLU | max(0, x) | Hidden layers (default) |
| Sigmoid | 1/(1+e^-x) | Binary output (0-1) |
| Softmax | e^xi / Σe^xj | Multi-class output (probabilities) |
| Tanh | (e^x - e^-x)/(e^x + e^-x) | Hidden layers (older models) |

## Gradient Descent

Gradient descent is the optimization algorithm that trains neural networks. It minimizes the **loss function** by iteratively adjusting weights in the direction that reduces error.

**The update rule**:
```
w = w - learning_rate × ∂Loss/∂w
```

### Variants
- **Batch Gradient Descent**: Uses all training data per update. Stable but slow.
- **Stochastic Gradient Descent (SGD)**: Uses one sample per update. Fast but noisy.
- **Mini-batch GD**: Uses small batches (32-256 samples). Best of both worlds. ← **Standard practice**

## Backpropagation

Backpropagation is the algorithm that computes gradients efficiently using the chain rule of calculus. It propagates the error signal backward through the network to update each weight.

**Steps**:
1. Forward pass: Compute predictions
2. Compute loss: Compare predictions to true labels
3. Backward pass: Compute gradients via chain rule
4. Update weights: Apply gradient descent

## Loss Functions

| Task | Loss Function | When to Use |
|------|--------------|-------------|
| Binary classification | Binary Cross-Entropy | Two classes |
| Multi-class | Categorical Cross-Entropy | 3+ classes |
| Regression | Mean Squared Error (MSE) | Continuous output |
| Regression (robust) | Mean Absolute Error (MAE) | With outliers |

## Building a Neural Network with PyTorch

```python
import torch
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(MLP, self).__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.3),  # Regularization
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, output_size),
            nn.Sigmoid()  # Binary classification
        )
    
    def forward(self, x):
        return self.layers(x)

# Instantiate and train
model = MLP(input_size=14, hidden_size=64, output_size=1)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
criterion = nn.BCELoss()
```

## Convolutional Neural Networks (CNNs)

CNNs are specialized for processing grid-like data (images, sequences). Key components:

- **Conv Layer**: Applies learned filters to detect local patterns (edges, textures)
- **Pooling**: Reduces spatial dimensions (MaxPool, AvgPool)
- **Fully Connected**: Final classification layers

## Recurrent Neural Networks (RNNs) and LSTMs

RNNs process sequential data by maintaining a hidden state that captures past information. **LSTMs** (Long Short-Term Memory) solve the vanishing gradient problem with gates:

- **Forget Gate**: What to discard from cell state
- **Input Gate**: What new information to add
- **Output Gate**: What to output

## Transformers and Attention

The Transformer architecture (2017) revolutionized NLP and is now the foundation of all modern LLMs.

**Self-Attention** allows each token to attend to all other tokens:
```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

Where Q (Query), K (Key), V (Value) are linear projections of the input.

**Multi-Head Attention** runs attention multiple times in parallel to capture different relationships.
