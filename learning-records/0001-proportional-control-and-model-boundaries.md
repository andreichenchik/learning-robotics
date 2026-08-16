# Proportional control and model boundaries

Status: superseded by LR-0002

The learner correctly connected the decreasing command to the decreasing error in a proportional controller. They independently identified instantaneous response as an unrealistic simulation assumption and noted the delay of a real actuator. Future lessons can therefore build on `u = Kₚe` and explicitly introduce time, dynamics, and model imperfections.

## Evidence

Answers to lesson 0001's final questions: the command is directly proportional to the error; a real robot responds with a delay.

## Implications

At the time of this record, the term "closed loop" had not yet been understood: the learner associated it with the absence of external influence rather than feeding the measured result back into the computation of the next command. This understanding was later corrected in LR-0002.
