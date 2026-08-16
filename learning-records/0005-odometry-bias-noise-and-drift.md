# Odometry, bias, noise, and drift

The learner understands odometry as repeated integration of measured wheel increments into an estimated pose. They can distinguish ideal simulated measurements from physical motion, explain how unequal encoder scale bias creates heading drift, and explain why zero-mean measurement noise does not guarantee zero final pose error.

## Evidence

In lesson 0004, the learner identified wheel slip, uneven ground, and imperfect measurements as reasons physical odometry diverges from ground truth. They explained that a persistent right-encoder bias repeatedly adds heading error to an already incorrect estimate. They also explained that noise applied at different points along a trajectory has different spatial effects and therefore does not necessarily cancel.

## Implications

The next lesson can introduce an external pose measurement as an absolute correction to drifting odometry, then motivate uncertainty weighting and sensor fusion without repeating encoder integration or the distinction between bias and noise.
