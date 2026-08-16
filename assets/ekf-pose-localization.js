(function exposeEkfPoseLocalization(root, factory) {
  const odometry = typeof module !== "undefined" && module.exports
    ? require("./odometry.js")
    : root.Odometry;
  const api = factory(odometry.normalizeAngle);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.EkfPoseLocalization = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createEkfPoseLocalizationApi(normalizeAngle) {
  "use strict";

  const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  function transpose(matrix) {
    return matrix[0].map((_, column) => matrix.map((row) => row[column]));
  }

  function add(left, right) {
    return left.map((row, rowIndex) =>
      row.map((value, columnIndex) => value + right[rowIndex][columnIndex])
    );
  }

  function subtract(left, right) {
    return left.map((row, rowIndex) =>
      row.map((value, columnIndex) => value - right[rowIndex][columnIndex])
    );
  }

  function multiply(left, right) {
    return left.map((row) => right[0].map((_, columnIndex) =>
      row.reduce((sum, value, index) => sum + value * right[index][columnIndex], 0)
    ));
  }

  function multiplyVector(matrix, vector) {
    return matrix.map((row) =>
      row.reduce((sum, value, index) => sum + value * vector[index], 0)
    );
  }

  function inverse3(matrix) {
    const [a, b, c] = matrix[0];
    const [d, e, f] = matrix[1];
    const [g, h, i] = matrix[2];
    const determinant =
      a * (e * i - f * h) -
      b * (d * i - f * g) +
      c * (d * h - e * g);

    if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) {
      throw new RangeError("Innovation covariance must be invertible.");
    }

    return [
      [e * i - f * h, c * h - b * i, b * f - c * e],
      [f * g - d * i, a * i - c * g, c * d - a * f],
      [d * h - e * g, b * g - a * h, a * e - b * d],
    ].map((row) => row.map((value) => value / determinant));
  }

  function symmetrize(matrix) {
    return matrix.map((row, rowIndex) => row.map((value, columnIndex) =>
      (value + matrix[columnIndex][rowIndex]) / 2
    ));
  }

  /** Predicts a planar pose and its covariance through one measured body-frame motion. */
  function predict(estimate, control, processCovariance) {
    const { distance, headingChange } = control;
    const midpointHeading = estimate.mean.heading + headingChange / 2;
    const transition = [
      [1, 0, -distance * Math.sin(midpointHeading)],
      [0, 1, distance * Math.cos(midpointHeading)],
      [0, 0, 1],
    ];
    const propagated = multiply(
      multiply(transition, estimate.covariance),
      transpose(transition)
    );

    return {
      mean: {
        x: estimate.mean.x + distance * Math.cos(midpointHeading),
        y: estimate.mean.y + distance * Math.sin(midpointHeading),
        heading: normalizeAngle(estimate.mean.heading + headingChange),
      },
      covariance: symmetrize(add(propagated, processCovariance)),
      transition,
    };
  }

  /** Corrects a predicted planar pose with one world-frame pose measurement. */
  function correctPose(predicted, measurement, measurementCovariance) {
    const innovation = [
      measurement.x - predicted.mean.x,
      measurement.y - predicted.mean.y,
      normalizeAngle(measurement.heading - predicted.mean.heading),
    ];
    const innovationCovariance = add(predicted.covariance, measurementCovariance);
    const gain = multiply(predicted.covariance, inverse3(innovationCovariance));
    const correction = multiplyVector(gain, innovation);
    const remaining = subtract(identity, gain);
    const josephCovariance = add(
      multiply(multiply(remaining, predicted.covariance), transpose(remaining)),
      multiply(multiply(gain, measurementCovariance), transpose(gain))
    );

    return {
      innovation,
      innovationCovariance,
      gain,
      mean: {
        x: predicted.mean.x + correction[0],
        y: predicted.mean.y + correction[1],
        heading: normalizeAngle(predicted.mean.heading + correction[2]),
      },
      covariance: symmetrize(josephCovariance),
    };
  }

  /** Returns the principal axes of the position covariance ellipse. */
  function positionEllipse(covariance, standardDeviations = 2) {
    const xx = covariance[0][0];
    const xy = (covariance[0][1] + covariance[1][0]) / 2;
    const yy = covariance[1][1];
    const separation = Math.sqrt((xx - yy) ** 2 + 4 * xy ** 2);
    const majorVariance = Math.max(0, (xx + yy + separation) / 2);
    const minorVariance = Math.max(0, (xx + yy - separation) / 2);

    return {
      major: standardDeviations * Math.sqrt(majorVariance),
      minor: standardDeviations * Math.sqrt(minorVariance),
      angle: 0.5 * Math.atan2(2 * xy, xx - yy),
    };
  }

  return { predict, correctPose, positionEllipse };
});
