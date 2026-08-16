# State, discrete time, and delay

The learner understands that state must contain the variables needed to predict the future: because of inertia, a rolling ball needs velocity as well as position. They also recognize the error's sign change after an overshoot, connect a large time step to an excessive state change, and distinguish the current state `xₖ` from the delayed measurement `yₖ` that the controller uses to compute its command.

## Evidence

Answers to lesson 0002's experiments and final questions: the error changes sign after crossing the target; delay produces an error relative to a past state; velocity is necessary to predict motion; a large `Δt` causes overshoot; the command is computed from measurement `yₖ`, which can differ from the actual `xₖ`.

## Implications

The next lesson can introduce pose `(x, y, θ)` as the state of a wheeled robot and construct its discrete update without repeating the fundamentals of state and time steps.
