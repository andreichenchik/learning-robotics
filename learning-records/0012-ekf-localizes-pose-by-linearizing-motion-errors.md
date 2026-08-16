# EKF localization propagates pose and local error geometry differently

The learner understands that the nonlinear motion function updates the mean pose, while the local Jacobian propagates covariance through `F P Fᵀ + Q`. They can explain that heading-dependent `sin` and `cos` projections make the same forward increment affect world `x` and `y` differently, causing heading uncertainty to become position uncertainty that a covariance-weighted camera pose update can reduce.

## Evidence

In lesson 0011, the learner correctly related coordinate changes to robot heading, assigned the motion function to the mean and the Jacobian to covariance, and explained how uncertain heading couples into both position coordinates.

## Implications

The five-lesson state-estimation sequence is complete. Subsequent work should move to learner-written implementation tasks with requirements, tests, and review rather than another prepared estimation simulator.
