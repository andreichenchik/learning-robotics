(function exposeDifferentialDrive(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DifferentialDrive = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDifferentialDriveApi() {
  "use strict";

  /** Returns an angle in the half-open interval `[-π, π)`. */
  function normalizeAngle(angle) {
    return ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  }

  /** Returns `value` limited to the inclusive `[minimum, maximum]` interval. */
  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  /** Advances the planar pose under constant linear and angular velocity commands. */
  function stepPose(pose, command, stepSize) {
    return {
      x: pose.x + stepSize * command.linearVelocity * Math.cos(pose.heading),
      y: pose.y + stepSize * command.linearVelocity * Math.sin(pose.heading),
      heading: normalizeAngle(pose.heading + stepSize * command.angularVelocity),
    };
  }

  /** Converts chassis velocity commands to left and right wheel angular speeds. */
  function wheelSpeeds(command, wheelRadius, trackWidth) {
    return {
      left: (command.linearVelocity - trackWidth * command.angularVelocity / 2) / wheelRadius,
      right: (command.linearVelocity + trackWidth * command.angularVelocity / 2) / wheelRadius,
    };
  }

  /** Computes a bounded turn-then-drive command toward a waypoint. */
  function waypointCommand(pose, target, configuration) {
    const deltaX = target.x - pose.x;
    const deltaY = target.y - pose.y;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance <= configuration.positionTolerance) {
      return { linearVelocity: 0, angularVelocity: 0 };
    }

    const desiredHeading = Math.atan2(deltaY, deltaX);
    const headingError = normalizeAngle(desiredHeading - pose.heading);
    const alignment = Math.max(0, Math.cos(headingError));

    return {
      linearVelocity:
        clamp(configuration.moveGain * distance, 0, configuration.maxLinearSpeed) * alignment,
      angularVelocity: clamp(
        configuration.turnGain * headingError,
        -configuration.maxAngularSpeed,
        configuration.maxAngularSpeed
      ),
    };
  }

  return { normalizeAngle, stepPose, wheelSpeeds, waypointCommand };
});
