const test = require("node:test");
const assert = require("node:assert/strict");
const {
  innovation,
  innovationVariance,
  kalmanGain,
  correctMean,
  correctVariance,
  correct,
} = require("../assets/scalar-kalman.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("equal uncertainties split the correction equally", () => {
  assertClose(kalmanGain(0.25, 0.25), 0.5);
  assertClose(correctMean(10, 12, 0.5), 11);
});

test("a precise measurement receives a large gain", () => {
  assert.ok(kalmanGain(1, 0.01) > 0.99);
});

test("a noisy measurement receives a small gain", () => {
  assert.ok(kalmanGain(0.01, 1) < 0.01);
});

test("one correction computes the expected numerical example", () => {
  const result = correct(10, 0.25, 10.8, 0.09);

  assertClose(result.innovation, 0.8);
  assertClose(result.innovationVariance, 0.34);
  assertClose(result.gain, 0.25 / 0.34);
  assertClose(result.mean, 10 + 0.8 * 0.25 / 0.34);
  assertClose(result.variance, 0.25 * 0.09 / 0.34);
});

test("corrected variance is smaller than either independent input variance", () => {
  const result = correct(4, 0.64, 7, 0.16);

  assert.ok(result.variance < 0.64);
  assert.ok(result.variance < 0.16);
});

test("gain and corrected variance do not depend on the measured value", () => {
  const first = correct(10, 0.25, 9, 0.09);
  const second = correct(10, 0.25, 40, 0.09);

  assertClose(first.gain, second.gain);
  assertClose(first.variance, second.variance);
});

test("scalar pieces expose innovation and residual variance directly", () => {
  assertClose(innovation(2, 2.75), 0.75);
  assertClose(innovationVariance(0.4, 0.1), 0.5);
  assertClose(correctVariance(0.4, 0.8), 0.08);
});

test("variances must be positive and finite", () => {
  assert.throws(() => kalmanGain(0, 1), RangeError);
  assert.throws(() => kalmanGain(1, Number.POSITIVE_INFINITY), RangeError);
});
