# External corrections balance drift and measurement noise

The learner understands the predict–correct structure for pose estimation: `α=0` discards the innovation, `α=1` replaces the prediction with the complete noisy measurement, and an intermediate weight applies only part of the discrepancy. They also recognize that sparse accurate corrections do not prevent odometry drift from accumulating again between measurements.

## Evidence

In lesson 0006, the learner explained all four simulator regimes in their own words: why zero weight produces no correction, why full weight creates measurement-driven jumps, why partial correction reduces both drift and visible jitter, and why drift reappears before the next rare measurement.

## Implications

The next estimation lesson can introduce covariance and derive a Kalman gain as a principled, uncertainty-dependent replacement for the fixed correction weight without repeating the predict–correct architecture.
