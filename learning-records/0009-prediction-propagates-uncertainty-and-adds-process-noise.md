# Prediction propagates existing uncertainty and adds process noise

The learner understands `P⁻ = F P⁺ Fᵀ + Q` as two distinct effects: `F P Fᵀ` carries existing uncertainty through the motion model, while `Q` adds uncertainty from motion the model cannot predict. They can explain how velocity uncertainty becomes position uncertainty and positive position–velocity covariance.

## Evidence

In lesson 0008, the learner explained that `Pvv` stays constant when velocity depends only on itself and no process noise acts on it; that prior velocity error influences future position error; and that non-zero acceleration noise makes velocity uncertainty grow. They identified wheel slip as a physical contribution to `Q` and correctly answered both retrieval questions.

## Implications

The next lesson can derive Kalman gain from predicted covariance and measurement covariance without re-teaching covariance propagation. Experiments should identify exact readouts and the expected comparison rather than ask for an underspecified visual comparison.
