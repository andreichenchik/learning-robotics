(function exposeCovariance(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Covariance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCovarianceApi() {
  "use strict";

  /** Builds a 2D covariance matrix from marginal standard deviations and correlation. */
  function fromStandardDeviations(xStandardDeviation, yStandardDeviation, correlation) {
    return {
      xx: xStandardDeviation ** 2,
      xy: correlation * xStandardDeviation * yStandardDeviation,
      yy: yStandardDeviation ** 2,
    };
  }

  /** Returns the principal standard deviations and orientation of a 2D covariance. */
  function principalAxes(covariance) {
    const halfTrace = (covariance.xx + covariance.yy) / 2;
    const radius = Math.hypot(
      (covariance.xx - covariance.yy) / 2,
      covariance.xy
    );
    const majorVariance = halfTrace + radius;
    const minorVariance = halfTrace - radius;

    return {
      majorStandardDeviation: Math.sqrt(Math.max(0, majorVariance)),
      minorStandardDeviation: Math.sqrt(Math.max(0, minorVariance)),
      angle: Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy) / 2,
    };
  }

  /** Maps independent standard-normal samples into a Gaussian with the given mean and covariance. */
  function sample(mean, covariance, standardNormalSamples) {
    const firstScale = Math.sqrt(covariance.xx);
    const sharedScale = covariance.xy / firstScale;
    const secondScale = Math.sqrt(Math.max(0, covariance.yy - sharedScale ** 2));

    return {
      x: mean.x + firstScale * standardNormalSamples.x,
      y: mean.y + sharedScale * standardNormalSamples.x + secondScale * standardNormalSamples.y,
    };
  }

  /** Returns squared distance from the mean measured in covariance-scaled coordinates. */
  function mahalanobisSquared(point, mean, covariance) {
    const xError = point.x - mean.x;
    const yError = point.y - mean.y;
    const determinant = covariance.xx * covariance.yy - covariance.xy ** 2;

    return (
      covariance.yy * xError ** 2 -
      2 * covariance.xy * xError * yError +
      covariance.xx * yError ** 2
    ) / determinant;
  }

  /** Returns a point on a covariance ellipse at the requested Mahalanobis radius. */
  function ellipsePoint(mean, covariance, radius, phase) {
    const axes = principalAxes(covariance);
    const alongMajor = radius * axes.majorStandardDeviation * Math.cos(phase);
    const alongMinor = radius * axes.minorStandardDeviation * Math.sin(phase);
    const cosine = Math.cos(axes.angle);
    const sine = Math.sin(axes.angle);

    return {
      x: mean.x + alongMajor * cosine - alongMinor * sine,
      y: mean.y + alongMajor * sine + alongMinor * cosine,
    };
  }

  return { fromStandardDeviations, principalAxes, sample, mahalanobisSquared, ellipsePoint };
});
