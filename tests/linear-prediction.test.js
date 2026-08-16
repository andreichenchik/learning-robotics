const test = require("node:test");
const assert = require("node:assert/strict");
const {
  predictState,
  accelerationNoiseCovariance,
  predictCovariance,
} = require("../assets/linear-prediction.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("constant velocity advances position without changing velocity", () => {
  const predicted = predictState({ position: 2, velocity: 3 }, 0, 0.5);

  assert.deepEqual(predicted, { position: 3.5, velocity: 3 });
});

test("constant acceleration changes both position and velocity", () => {
  const predicted = predictState({ position: 2, velocity: 3 }, 4, 0.5);

  assert.deepEqual(predicted, { position: 4, velocity: 5 });
});

test("velocity uncertainty becomes position uncertainty and covariance", () => {
  const predicted = predictCovariance(
    { xx: 0.01, xy: 0, yy: 0.25 },
    2,
    { xx: 0, xy: 0, yy: 0 }
  );

  assertClose(predicted.xx, 1.01);
  assertClose(predicted.xy, 0.5);
  assertClose(predicted.yy, 0.25);
});

test("acceleration noise produces correlated position and velocity uncertainty", () => {
  const processNoise = accelerationNoiseCovariance(0.4, 0.5);

  assertClose(processNoise.xx, 0.0025);
  assertClose(processNoise.xy, 0.01);
  assertClose(processNoise.yy, 0.04);
});

test("prediction adds process noise after propagating prior covariance", () => {
  const processNoise = { xx: 0.02, xy: 0.01, yy: 0.03 };
  const predicted = predictCovariance({ xx: 0.4, xy: -0.1, yy: 0.2 }, 0.5, processNoise);

  assertClose(predicted.xx, 0.37);
  assertClose(predicted.xy, 0.01);
  assertClose(predicted.yy, 0.23);
});
