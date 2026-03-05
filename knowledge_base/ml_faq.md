# Machine Learning FAQ

## What is Machine Learning?
Machine Learning (ML) is a subset of Artificial Intelligence where systems learn patterns from data to make predictions or decisions without being explicitly programmed. Instead of writing rules by hand, you let the algorithm discover them from examples.

## What is the difference between supervised and unsupervised learning?

**Supervised Learning**: The training data includes labeled examples (input-output pairs). The model learns to map inputs to outputs. Examples: classification, regression.

**Unsupervised Learning**: The data has no labels. The model finds hidden structure on its own. Examples: clustering (K-Means), dimensionality reduction (PCA).

**Semi-supervised Learning**: A mix of labeled and unlabeled data.

## What is overfitting vs underfitting?

**Overfitting** occurs when a model learns the training data *too well*, including noise. It performs great on training data but poorly on new, unseen data. Signs: high training accuracy, low test accuracy.

**Underfitting** occurs when a model is too simple to capture the underlying patterns. It performs poorly on both training and test data. Signs: high bias, low accuracy everywhere.

**The goal**: Find the "sweet spot" (bias-variance tradeoff) where the model generalizes well.

## How do I choose between Logistic Regression and Random Forest?

| Factor | Logistic Regression | Random Forest |
|--------|---------------------|---------------|
| Interpretability | High (coefficients) | Medium (feature importance) |
| Training speed | Fast | Slower |
| Non-linear patterns | No | Yes |
| Overfitting risk | Low | Medium |
| Feature scaling needed | Yes | No |

Start with Logistic Regression as your baseline. Use Random Forest when you need to capture complex, non-linear relationships.

## What is the F1 Score?

F1 Score is the harmonic mean of Precision and Recall:

```
F1 = 2 × (Precision × Recall) / (Precision + Recall)
```

- **Precision**: Of all predicted positives, how many are actually positive?
- **Recall**: Of all actual positives, how many did we correctly identify?

**F1-Macro** averages the F1 score across all classes, treating each class equally. This is essential for imbalanced datasets.

## What is cross-validation?

Cross-validation is a technique to evaluate model performance more reliably by training and testing on different data splits.

**k-Fold Cross-Validation**: Divide data into k equal parts (folds). Train on k-1 folds, test on the remaining fold. Repeat k times. Average the results.

This gives a more robust estimate of generalization performance than a single train/test split.

## What is the bias-variance tradeoff?

- **Bias**: Error from wrong assumptions (underfitting). High bias = too simple model.
- **Variance**: Error from sensitivity to training data (overfitting). High variance = too complex model.

Reducing bias typically increases variance and vice versa. The optimal model balances both for best generalization.

## What is regularization?

Regularization prevents overfitting by adding a penalty to the model's complexity:

- **L1 (Lasso)**: Penalizes the absolute value of coefficients. Can set some to zero (feature selection).
- **L2 (Ridge)**: Penalizes squared coefficients. Shrinks all coefficients toward zero.
- **Elastic Net**: Combines L1 and L2.
