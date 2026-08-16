# Covariance describes state-estimation uncertainty

The learner understands that a covariance matrix accompanies a state estimate at each time step: its diagonal entries describe the expected spread of estimation errors, while its off-diagonal entries describe how signed errors tend to vary together. They distinguish a probability contour from a guaranteed error bound.

## Evidence

After lesson 0007, the learner explained that two equal mean estimates can have different spread, that positive covariance means the errors “go in step,” and that a 2σ ellipse leaves a non-zero probability outside it.

## Implications

The next lesson can propagate a concrete covariance through a motion model and introduce process noise `Q`. It should start from a numerical robot example because the learner found the geometry-first presentation too abstract.
