# Planar pose and differential drive

The learner understands that heading `θ` is part of the pose because it determines the direction of the linear velocity. They can predict which pose components change for straight motion, rotation in place, and motion along an arc, and they understand that a differential-drive robot cannot command an independent instantaneous lateral velocity.

## Evidence

In lesson 0003, the learner explained that straight motion at `θ = 30°` changes `x` and `y` while leaving `θ` unchanged; identified `v ≠ 0, ω = 0` as straight motion, `v = 0, ω ≠ 0` as rotation in place, and `v ≠ 0, ω ≠ 0` as an arc; and connected the inability to choose `ẋ` and `ẏ` independently to the wheels' no-sideways-motion constraint.

## Implications

The next lesson can introduce wheel encoder odometry, estimated pose, and accumulated drift without repeating planar pose or differential-drive kinematics.
