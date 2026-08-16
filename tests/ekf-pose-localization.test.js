const test = require("node:test");
const assert = require("node:assert/strict");
const {
  predict,
  correctPose,
  positionEllipse,
} = require("../assets/ekf-pose-localization.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

const zeroCovariance = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0],
];

test("nonlinear prediction moves the pose along the motion midpoint", () => {
  const predicted = predict({
    mean: { x: 0, y: 0, heading: 0 },
    covariance: zeroCovariance,
  }, { distance: 1, headingChange: Math.PI / 2 }, zeroCovariance);

  assertClose(predicted.mean.x, Math.SQRT1_2);
  assertClose(predicted.mean.y, Math.SQRT1_2);
  assertClose(predicted.mean.heading, Math.PI / 2);
  assertClose(predicted.transition[0][2], -Math.SQRT1_2);
  assertClose(predicted.transition[1][2], Math.SQRT1_2);
});

test("heading uncertainty spreads into lateral position uncertainty", () => {
  const predicted = predict({
    mean: { x: 0, y: 0, heading: 0 },
    covariance: [
      [0.01, 0, 0],
      [0, 0.01, 0],
      [0, 0, 0.04],
    ],
  }, { distance: 1, headingChange: 0 }, zeroCovariance);

  assertClose(predicted.covariance[0][0], 0.01);
  assertClose(predicted.covariance[1][1], 0.05);
  assertClose(predicted.covariance[1][2], 0.04);
});

test("process covariance adds fresh uncertainty after propagation", () => {
  const processCovariance = [
    [0.0025, 0, 0],
    [0, 0.0025, 0],
    [0, 0, 0.001],
  ];
  const predicted = predict({
    mean: { x: 0, y: 0, heading: 0 },
    covariance: zeroCovariance,
  }, { distance: 0, headingChange: 0 }, processCovariance);

  assert.deepEqual(predicted.covariance, processCovariance);
});

test("equal predicted and measurement covariance give a halfway correction", () => {
  const covariance = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const corrected = correctPose({
    mean: { x: 0, y: 0, heading: 0 },
    covariance,
  }, { x: 2, y: -2, heading: 0.4 }, covariance);

  assertClose(corrected.gain[0][0], 0.5);
  assertClose(corrected.gain[1][1], 0.5);
  assertClose(corrected.gain[2][2], 0.5);
  assertClose(corrected.mean.x, 1);
  assertClose(corrected.mean.y, -1);
  assertClose(corrected.mean.heading, 0.2);
});

test("heading innovation follows the shortest wrapped difference", () => {
  const degrees = (value) => value * Math.PI / 180;
  const covariance = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const corrected = correctPose({
    mean: { x: 0, y: 0, heading: degrees(179) },
    covariance,
  }, { x: 0, y: 0, heading: degrees(-179) }, covariance);

  assertClose(corrected.innovation[2], degrees(2));
  assertClose(corrected.mean.heading, degrees(-180));
});

test("a precise camera pulls more and leaves less covariance", () => {
  const predicted = {
    mean: { x: 0, y: 0, heading: 0 },
    covariance: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  };
  const precise = correctPose(predicted, { x: 1, y: 1, heading: 0.2 }, [
    [0.01, 0, 0],
    [0, 0.01, 0],
    [0, 0, 0.01],
  ]);
  const noisy = correctPose(predicted, { x: 1, y: 1, heading: 0.2 }, [
    [100, 0, 0],
    [0, 100, 0],
    [0, 0, 100],
  ]);

  assert.ok(precise.gain[0][0] > noisy.gain[0][0]);
  assert.ok(precise.mean.x > noisy.mean.x);
  assert.ok(precise.covariance[0][0] < noisy.covariance[0][0]);
});

test("position ellipse exposes the covariance principal axes", () => {
  const ellipse = positionEllipse([
    [4, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ], 2);

  assertClose(ellipse.major, 4);
  assertClose(ellipse.minor, 2);
  assertClose(ellipse.angle, 0);
});
