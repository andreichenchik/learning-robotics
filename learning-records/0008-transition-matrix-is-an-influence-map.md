# A state-transition matrix is a linear influence map

The learner understands a transition matrix as a compact representation of how every previous state variable linearly influences every next state variable. They recognize diagonal entries as each variable's persistence and off-diagonal entries as coupling between different variables.

## Evidence

While interpreting the position–velocity model in lesson 0008, the learner independently summarized matrices as giving “the linear influence of all variables in the past on all variables in the future, just compactly.”

## Implications

Future lessons can read transition and observation matrices by rows and columns rather than reintroducing matrix multiplication mechanically. The covariance transformation `F P Fᵀ` can now be tied to the same influence map.
