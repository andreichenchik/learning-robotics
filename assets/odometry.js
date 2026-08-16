(function exposeOdometry(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Odometry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createOdometryApi() {
  "use strict";

  /** Returns an angle in the half-open interval `[-π, π)`. */
  function normalizeAngle(angle) {
    return ((angle + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  }

  /** Returns left and right wheel travel for a chassis command held over one time step. */
  function wheelTravel(command, stepSize, trackWidth) {
    return {
      left: (command.linearVelocity - trackWidth * command.angularVelocity / 2) * stepSize,
      right: (command.linearVelocity + trackWidth * command.angularVelocity / 2) * stepSize,
    };
  }

  /** Updates a differential-drive pose from left and right wheel travel in metres. */
  function updatePose(pose, leftTravel, rightTravel, trackWidth) {
    const distance = (leftTravel + rightTravel) / 2;
    const headingChange = (rightTravel - leftTravel) / trackWidth;
    const midpointHeading = pose.heading + headingChange / 2;

    return {
      x: pose.x + distance * Math.cos(midpointHeading),
      y: pose.y + distance * Math.sin(midpointHeading),
      heading: normalizeAngle(pose.heading + headingChange),
    };
  }

  /** Applies encoder scale bias and distance-dependent noise to one wheel increment. */
  function measureTravel(actualTravel, scaleBias, noisePerRootMeter, noiseSample) {
    const noise = noiseSample * noisePerRootMeter * Math.sqrt(Math.abs(actualTravel));
    return actualTravel * (1 + scaleBias) + noise;
  }

  /** Returns position and absolute heading error between two planar poses. */
  function poseError(truth, estimate) {
    return {
      position: Math.hypot(estimate.x - truth.x, estimate.y - truth.y),
      heading: Math.abs(normalizeAngle(estimate.heading - truth.heading)),
    };
  }

  return { normalizeAngle, wheelTravel, updatePose, measureTravel, poseError };
});
