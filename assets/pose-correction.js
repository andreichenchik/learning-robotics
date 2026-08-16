(function exposePoseCorrection(root, factory) {
  const odometry = typeof module !== "undefined" && module.exports
    ? require("./odometry.js")
    : root.Odometry;
  const api = factory(odometry.normalizeAngle);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PoseCorrection = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPoseCorrectionApi(normalizeAngle) {
  "use strict";

  /** Returns the world-frame discrepancy from a predicted pose to an absolute measurement. */
  function poseInnovation(predictedPose, measurement) {
    return {
      x: measurement.x - predictedPose.x,
      y: measurement.y - predictedPose.y,
      heading: normalizeAngle(measurement.heading - predictedPose.heading),
    };
  }

  /** Moves a predicted pose toward an absolute measurement by `weight` of its innovation. */
  function correctPose(predictedPose, measurement, weight) {
    const innovation = poseInnovation(predictedPose, measurement);
    return {
      x: predictedPose.x + weight * innovation.x,
      y: predictedPose.y + weight * innovation.y,
      heading: normalizeAngle(predictedPose.heading + weight * innovation.heading),
    };
  }

  /** Produces a noisy absolute pose from independent standard-normal samples. */
  function measurePose(truth, positionStandardDeviation, headingStandardDeviation, samples) {
    return {
      x: truth.x + positionStandardDeviation * samples.x,
      y: truth.y + positionStandardDeviation * samples.y,
      heading: normalizeAngle(truth.heading + headingStandardDeviation * samples.heading),
    };
  }

  return { poseInnovation, correctPose, measurePose };
});
