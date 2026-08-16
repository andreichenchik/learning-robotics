(function exposeScalarKalman(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ScalarKalman = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createScalarKalmanApi() {
  "use strict";

  function requirePositiveVariance(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive finite variance.`);
    }
  }

  /** Returns the measurement residual z - x̂⁻ for a direct scalar observation. */
  function innovation(predictedMean, measurement) {
    return measurement - predictedMean;
  }

  /** Returns the expected variance of the measurement residual. */
  function innovationVariance(predictedVariance, measurementVariance) {
    requirePositiveVariance(predictedVariance, "predictedVariance");
    requirePositiveVariance(measurementVariance, "measurementVariance");
    return predictedVariance + measurementVariance;
  }

  /** Computes how strongly a direct scalar measurement should affect the estimate. */
  function kalmanGain(predictedVariance, measurementVariance) {
    return predictedVariance /
      innovationVariance(predictedVariance, measurementVariance);
  }

  /** Moves the predicted mean toward the measurement by the supplied gain. */
  function correctMean(predictedMean, measurement, gain) {
    return predictedMean + gain * innovation(predictedMean, measurement);
  }

  /** Returns corrected variance for a direct scalar measurement. */
  function correctVariance(predictedVariance, gain) {
    requirePositiveVariance(predictedVariance, "predictedVariance");
    return (1 - gain) * predictedVariance;
  }

  /** Performs one direct scalar Kalman measurement correction. */
  function correct(predictedMean, predictedVariance, measurement, measurementVariance) {
    const residual = innovation(predictedMean, measurement);
    const residualVariance = innovationVariance(predictedVariance, measurementVariance);
    const gain = predictedVariance / residualVariance;
    return {
      innovation: residual,
      innovationVariance: residualVariance,
      gain,
      mean: predictedMean + gain * residual,
      variance: (1 - gain) * predictedVariance,
    };
  }

  return {
    innovation,
    innovationVariance,
    kalmanGain,
    correctMean,
    correctVariance,
    correct,
  };
});
