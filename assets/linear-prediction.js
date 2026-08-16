(function exposeLinearPrediction(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LinearPrediction = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createLinearPredictionApi() {
  "use strict";

  /** Predicts 1D position and velocity under constant acceleration for one time step. */
  function predictState(state, acceleration, timeStep) {
    return {
      position: state.position + state.velocity * timeStep + 0.5 * acceleration * timeStep ** 2,
      velocity: state.velocity + acceleration * timeStep,
    };
  }

  /** Returns the state covariance added by uncertain constant acceleration. */
  function accelerationNoiseCovariance(accelerationStandardDeviation, timeStep) {
    const variance = accelerationStandardDeviation ** 2;
    return {
      xx: 0.25 * timeStep ** 4 * variance,
      xy: 0.5 * timeStep ** 3 * variance,
      yy: timeStep ** 2 * variance,
    };
  }

  /** Propagates position–velocity covariance through the constant-velocity transition. */
  function predictCovariance(covariance, timeStep, processNoise) {
    return {
      xx:
        covariance.xx +
        2 * timeStep * covariance.xy +
        timeStep ** 2 * covariance.yy +
        processNoise.xx,
      xy: covariance.xy + timeStep * covariance.yy + processNoise.xy,
      yy: covariance.yy + processNoise.yy,
    };
  }

  return { predictState, accelerationNoiseCovariance, predictCovariance };
});
