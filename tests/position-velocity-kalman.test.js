const test = require("node:test");
const assert = require("node:assert/strict");
const {
  predict,
  correctPosition,
} = require("../assets/position-velocity-kalman.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

const correctedEstimate = {
  mean: { position: 0, velocity: 1 },
  covariance: {
    positionVariance: 0.04,
    positionVelocityCovariance: 0,
    velocityVariance: 0.09,
  },
};

test("prediction advances the state and propagates covariance", () => {
  const predicted = predict(correctedEstimate, 1, 0.2);

  assert.deepEqual(predicted.mean, { position: 1, velocity: 1 });
  assertClose(predicted.covariance.positionVariance, 0.14);
  assertClose(predicted.covariance.positionVelocityCovariance, 0.11);
  assertClose(predicted.covariance.velocityVariance, 0.13);
});

test("position correction matches the complete numerical cycle", () => {
  const predicted = predict(correctedEstimate, 1, 0.2);
  const corrected = correctPosition(predicted, 1.2, 0.25);

  assertClose(corrected.innovation, 0.2);
  assertClose(corrected.innovationVariance, 0.39);
  assertClose(corrected.gain.position, 0.14 / 0.39);
  assertClose(corrected.gain.velocity, 0.11 / 0.39);
  assertClose(corrected.mean.position, 1 + 0.2 * 0.14 / 0.39);
  assertClose(corrected.mean.velocity, 1 + 0.2 * 0.11 / 0.39);
  assertClose(corrected.covariance.positionVariance, 0.08974358974358976);
  assertClose(corrected.covariance.positionVelocityCovariance, 0.07051282051282051);
  assertClose(corrected.covariance.velocityVariance, 0.09897435897435898);
});

test("position measurement corrects velocity through positive covariance", () => {
  const predicted = {
    mean: { position: 5, velocity: 2 },
    covariance: {
      positionVariance: 0.5,
      positionVelocityCovariance: 0.2,
      velocityVariance: 0.4,
    },
  };
  const corrected = correctPosition(predicted, 6, 0.1);

  assert.ok(corrected.gain.velocity > 0);
  assert.ok(corrected.mean.velocity > predicted.mean.velocity);
});

test("position measurement leaves velocity unchanged without covariance", () => {
  const predicted = {
    mean: { position: 5, velocity: 2 },
    covariance: {
      positionVariance: 0.5,
      positionVelocityCovariance: 0,
      velocityVariance: 0.4,
    },
  };
  const corrected = correctPosition(predicted, 6, 0.1);

  assertClose(corrected.gain.velocity, 0);
  assertClose(corrected.mean.velocity, 2);
});

test("each corrected estimate can seed the next prediction", () => {
  const firstPrediction = predict(correctedEstimate, 1, 0.2);
  const firstCorrection = correctPosition(firstPrediction, 1.2, 0.25);
  const secondPrediction = predict(firstCorrection, 1, 0.2);

  assertClose(
    secondPrediction.mean.position,
    firstCorrection.mean.position + firstCorrection.mean.velocity
  );
  assert.ok(secondPrediction.covariance.positionVariance >
    firstCorrection.covariance.positionVariance);
});

test("configuration rejects invalid noise scales and time steps", () => {
  assert.throws(() => predict(correctedEstimate, 0, 0.2), RangeError);
  assert.throws(() => predict(correctedEstimate, 1, -0.2), RangeError);
  assert.throws(() => correctPosition(correctedEstimate, 1, 0), RangeError);
});
