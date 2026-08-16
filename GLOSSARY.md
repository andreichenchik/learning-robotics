# Robotics Glossary

Canonical terms whose meaning has already been demonstrated in exercises.

## Terms

**Proportional controller**:
A controller whose command is proportional to the current error: `u = Kₚe`.
_Avoid_: Proportional algorithm, P-regulation

**Closed loop**:
A control system in which the measured result of an action is used to compute the next command.
_Avoid_: Isolated system, system without external influence

**Open-loop control**:
Control in which the actual result of an action does not change subsequent commands.
_Avoid_: Stopped controller, broken feedback

**State**:
The minimal set of variables about the present that, together with future inputs, is sufficient to predict the model's future.
_Avoid_: All system data, full history

**Measurement**:
A value `y` available to the controller that provides information about state `x`; delay and noise can make `y` differ from `x`.
_Avoid_: True state, exact state

**Time step**:
The interval `Δt` between two consecutive updates of a discrete model or controller.
_Avoid_: Step number, index `k`

**Measurement delay**:
The lag between an available measurement and the system's current state.
_Avoid_: Sensor error, sensor noise

**Covariance matrix**:
A matrix describing the expected spread and linear coupling of state-estimation errors. Diagonal entries are marginal error variances; off-diagonal entries describe how signed errors tend to vary together.
_Avoid_: The current actual error, a guarantee that the state lies inside an ellipse

**State-transition matrix**:
A compact map of linear influence from the previous state to the next state. Columns represent previous variables, rows represent next variables, diagonal entries carry each variable forward, and off-diagonal entries couple different variables.
_Avoid_: A stored trajectory, a table of actual errors
