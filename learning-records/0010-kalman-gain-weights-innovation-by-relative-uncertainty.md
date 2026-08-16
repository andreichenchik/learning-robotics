# Kalman gain weights innovation by relative uncertainty

The learner understands that the scalar Kalman gain controls how much of the innovation is applied: `K→1` trusts the measurement, while `K→0` trusts the prediction. Increasing measurement variance `R` reduces the gain; equal prediction and measurement variances produce a midpoint correction but do not guarantee truth. They also understand that an outlier can corrupt the estimate when the configured `R` incorrectly claims that the sensor is precise.

## Evidence

In lesson 0009, the learner correctly explained the danger of an inaccurate GPS value presented as precise. They initially reversed the trust direction of `K` and interpreted “where will the mean lie” as a statement about truth rather than location, then acknowledged both corrections.

## Implications

The complete-filter lesson can combine prediction and correction, but should begin with a short retrieval check on the direction of `K` and the equal-variance midpoint before adding recursion.
