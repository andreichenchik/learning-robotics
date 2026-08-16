# A Kalman filter recursively predicts and corrects state and covariance

The learner understands the complete linear Kalman loop: the corrected state estimate `x̂⁺` and covariance `P⁺` seed the next prediction; prediction propagates and generally grows uncertainty, while a GPS update reduces it. They also understand that a position-only measurement can correct velocity when non-zero position–velocity covariance produces a non-zero velocity component of the Kalman gain.

## Evidence

In lesson 0010, the learner explained that position and velocity error coupling allows a position correction to feed into velocity, identified the corrected state estimate and uncertainty as the next iteration's input, and described covariance growth between GPS updates followed by contraction on measurement.

## Implications

The final estimation lesson can apply the same recursive structure to planar robot localization and focus on pose, nonlinear motion, and local linearization rather than reteaching the Kalman cycle.
