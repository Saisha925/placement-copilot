# Machine Learning: Model Evaluation Metrics

Choosing the right evaluation metric is crucial — a model optimized for accuracy on an imbalanced dataset can be misleading.

---

## Confusion Matrix

For binary classification (Positive = class of interest, Negative = other class):

```
                  Predicted Positive    Predicted Negative
Actual Positive       TP (True Pos)       FN (False Neg)
Actual Negative       FP (False Pos)      TN (True Neg)
```

- **True Positive (TP)**: Correctly predicted positive.
- **True Negative (TN)**: Correctly predicted negative.
- **False Positive (FP)**: Incorrectly predicted positive (Type I Error).
- **False Negative (FN)**: Incorrectly predicted negative (Type II Error).

---

## Core Metrics

### Accuracy
`Accuracy = (TP + TN) / (TP + TN + FP + FN)`

- Proportion of all correctly classified samples.
- **Misleading for imbalanced datasets**: A model predicting 99% negative on a dataset with 1% positives has 99% accuracy but is useless.

### Precision (Positive Predictive Value)
`Precision = TP / (TP + FP)`

- Of all samples **predicted as positive**, what fraction were actually positive?
- **High precision** = few false alarms.
- Use when **false positives are costly**: Spam filter (don't want legitimate emails marked as spam).

### Recall (Sensitivity, True Positive Rate)
`Recall = TP / (TP + FN)`

- Of all **actual positives**, what fraction were correctly identified?
- **High recall** = few missed positives.
- Use when **false negatives are costly**: Cancer detection (don't want to miss cancer cases), fraud detection.

### F1 Score
`F1 = 2 × (Precision × Recall) / (Precision + Recall)`

- **Harmonic mean** of precision and recall.
- Balances both metrics — useful when classes are imbalanced.
- **F-beta score**: Gives more weight to either precision (β < 1) or recall (β > 1).

### Precision-Recall Trade-off
- Increasing the classification threshold → fewer positives predicted → **higher precision, lower recall**.
- Decreasing the threshold → more positives predicted → **higher recall, lower precision**.

---

## Threshold-Agnostic Metrics

### ROC Curve (Receiver Operating Characteristic)
Plots **True Positive Rate (Recall)** vs **False Positive Rate** at various threshold settings.

`FPR = FP / (FP + TN)`

### AUC-ROC (Area Under the Curve)
- Area under the ROC curve. Range: 0.5 (random) to 1.0 (perfect).
- **AUC = 0.5**: Random classifier.
- **AUC = 1.0**: Perfect classifier.
- AUC measures the probability that the model ranks a random positive sample higher than a random negative sample.
- **Disadvantage**: Can be misleading for heavily imbalanced datasets.

### PR-AUC (Precision-Recall AUC)
- Better metric than ROC-AUC for **highly imbalanced datasets**.
- Higher PR-AUC = better at identifying the minority class.

---

## Regression Metrics

### Mean Absolute Error (MAE)
`MAE = (1/n) Σ|yᵢ - ŷᵢ|`
- Average absolute difference. Robust to outliers.
- Interpretable in the same unit as the target.

### Mean Squared Error (MSE)
`MSE = (1/n) Σ(yᵢ - ŷᵢ)²`
- Penalizes large errors more. Sensitive to outliers.

### Root Mean Squared Error (RMSE)
`RMSE = √MSE`
- In same unit as target. More interpretable than MSE. Commonly used.

### R² (Coefficient of Determination)
`R² = 1 - SS_res / SS_tot`
- Proportion of variance in target explained by the model.
- R² = 1: Perfect fit. R² = 0: Model no better than predicting mean.
- Can be negative if model is worse than predicting the mean.

---

## Cross-Validation

### K-Fold Cross-Validation
1. Split data into K equal folds.
2. Train on K-1 folds, evaluate on the remaining fold.
3. Repeat K times, rotating the test fold.
4. Average the K scores.

Reduces overfitting to a single train-test split. Gives a more robust estimate of model performance.

### Stratified K-Fold
Like K-Fold but each fold maintains the same class distribution as the full dataset. Essential for imbalanced datasets.

### Leave-One-Out Cross-Validation (LOOCV)
K-Fold with K = n (number of samples). Exhaustive but computationally expensive.

---

## Handling Imbalanced Datasets

### Techniques
- **Oversampling (SMOTE)**: Synthetically generate minority class samples.
- **Undersampling**: Remove majority class samples.
- **Class Weights**: Penalize misclassification of minority class more heavily (`class_weight='balanced'`).
- **Use the right metric**: Prefer F1, PR-AUC over plain accuracy.
- **Threshold tuning**: Adjust decision threshold to optimize recall or precision.

## Key Interview Questions
1. What is the difference between precision and recall? When would you optimize for each?
2. What is the F1 score and why is it the harmonic mean and not the arithmetic mean of precision and recall?
3. Why is accuracy not a good metric for imbalanced datasets?
4. What does an AUC-ROC of 0.85 mean?
5. What is K-Fold cross-validation and why is it better than a single train-test split?
