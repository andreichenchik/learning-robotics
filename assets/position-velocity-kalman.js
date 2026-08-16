(function exposePositionVelocityKalman(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.PositionVelocityKalman = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPositionVelocityKalmanApi() {
  "use strict";

  function requirePositive(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive finite number.`);
    }
  }

  function requireNonNegative(value, name) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative finite number.`);
    }
  }

  /** Predicts a corrected position–velocity estimate through one constant-velocity step. */
  function predict(estimate, timeStep, accelerationStandardDeviation) {
    requirePositive(timeStep, "timeStep");
    requireNonNegative(accelerationStandardDeviation, "accelerationStandardDeviation");

    const { mean, covariance } = estimate;
    const accelerationVariance = accelerationStandardDeviation ** 2;
    const processPositionVariance = 0.25 * timeStep ** 4 * accelerationVariance;
    const processCovariance = 0.5 * timeStep ** 3 * accelerationVariance;
    const processVelocityVariance = timeStep ** 2 * accelerationVariance;

    return {
      mean: {
        position: mean.position + mean.velocity * timeStep,
        velocity: mean.velocity,
      },
      covariance: {
        positionVariance:
          covariance.positionVariance +
          2 * timeStep * covariance.positionVelocityCovariance +
          timeStep ** 2 * covariance.velocityVariance +
          processPositionVariance,
        positionVelocityCovariance:
          covariance.positionVelocityCovariance +
          timeStep * covariance.velocityVariance +
          processCovariance,
        velocityVariance: covariance.velocityVariance + processVelocityVariance,
      },
    };
  }

  /** Corrects a predicted position–velocity estimate using one direct position measurement. */
  function correctPosition(predicted, measurement, measurementVariance) {
    requirePositive(measurementVariance, "measurementVariance");

    const { mean, covariance } = predicted;
    const innovation = measurement - mean.position;
    const innovationVariance = covariance.positionVariance + measurementVariance;
    const gain = {
      position: covariance.positionVariance / innovationVariance,
      velocity: covariance.positionVelocityCovariance / innovationVariance,
    };

    return {
      innovation,
      innovationVariance,
      gain,
      mean: {
        position: mean.position + gain.position * innovation,
        velocity: mean.velocity + gain.velocity * innovation,
      },
      covariance: {
        positionVariance:
          covariance.positionVariance -
          gain.position * covariance.positionVariance,
        positionVelocityCovariance:
          covariance.positionVelocityCovariance -
          gain.position * covariance.positionVelocityCovariance,
        velocityVariance:
          covariance.velocityVariance -
          gain.velocity * covariance.positionVelocityCovariance,
      },
    };
  }

  return { predict, correctPosition };
});
