const test = require("node:test");
const assert = require("node:assert/strict");
const {
  fromStandardDeviations,
  principalAxes,
  sample,
  mahalanobisSquared,
  ellipsePoint,
} = require("../assets/covariance.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("covariance uses squared marginal spreads and normalized correlation", () => {
  const covariance = fromStandardDeviations(2, 3, -0.5);

  assert.deepEqual(covariance, { xx: 4, xy: -3, yy: 9 });
});

test("principal axes recover axis-aligned marginal standard deviations", () => {
  const axes = principalAxes({ xx: 4, xy: 0, yy: 1 });

  assertClose(axes.majorStandardDeviation, 2);
  assertClose(axes.minorStandardDeviation, 1);
  assertClose(axes.angle, 0);
});

test("positive covariance rotates equal marginal uncertainty by 45 degrees", () => {
  const axes = principalAxes({ xx: 1, xy: 0.75, yy: 1 });

  assertClose(axes.angle, Math.PI / 4);
  assert.ok(axes.majorStandardDeviation > axes.minorStandardDeviation);
});

test("Gaussian sampling introduces the requested shared error", () => {
  const point = sample(
    { x: 10, y: -4 },
    fromStandardDeviations(2, 3, 0.5),
    { x: 1, y: 0 }
  );

  assertClose(point.x, 12);
  assertClose(point.y, -2.5);
});

test("Mahalanobis distance follows covariance scale", () => {
  const covariance = { xx: 4, xy: 0, yy: 1 };

  assertClose(mahalanobisSquared({ x: 2, y: 0 }, { x: 0, y: 0 }, covariance), 1);
  assertClose(mahalanobisSquared({ x: 0, y: 2 }, { x: 0, y: 0 }, covariance), 4);
});

test("ellipse points lie on the requested Mahalanobis contour", () => {
  const mean = { x: 1, y: -2 };
  const covariance = fromStandardDeviations(0.8, 1.2, -0.6);

  for (const phase of [0, 0.7, 1.9, 3.2]) {
    const point = ellipsePoint(mean, covariance, 2, phase);
    assertClose(mahalanobisSquared(point, mean, covariance), 4);
  }
});
