const test = require("node:test");
const assert = require("node:assert/strict");
const {
  poseInnovation,
  correctPose,
  measurePose,
} = require("../assets/pose-correction.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("pose innovation points from the prediction to the measurement", () => {
  const innovation = poseInnovation(
    { x: 1, y: -2, heading: 0.2 },
    { x: 1.4, y: -1.7, heading: 0.5 }
  );

  assertClose(innovation.x, 0.4);
  assertClose(innovation.y, 0.3);
  assertClose(innovation.heading, 0.3);
});

test("zero correction weight preserves the predicted pose", () => {
  const predicted = { x: 1, y: 2, heading: 0.4 };
  const corrected = correctPose(predicted, { x: 4, y: -1, heading: -0.8 }, 0);

  assertClose(corrected.x, predicted.x);
  assertClose(corrected.y, predicted.y);
  assertClose(corrected.heading, predicted.heading);
});

test("full correction weight accepts the absolute measurement", () => {
  const measurement = { x: 4, y: -1, heading: -0.8 };
  const corrected = correctPose({ x: 1, y: 2, heading: 0.4 }, measurement, 1);

  assertClose(corrected.x, measurement.x);
  assertClose(corrected.y, measurement.y);
  assertClose(corrected.heading, measurement.heading);
});

test("partial correction applies the selected fraction of the innovation", () => {
  const corrected = correctPose(
    { x: 1, y: 2, heading: 0.2 },
    { x: 5, y: -2, heading: 1.0 },
    0.25
  );

  assertClose(corrected.x, 2);
  assertClose(corrected.y, 1);
  assertClose(corrected.heading, 0.4);
});

test("heading correction follows the shortest wrapped difference", () => {
  const predicted = 179 * Math.PI / 180;
  const measured = -179 * Math.PI / 180;
  const innovation = poseInnovation(
    { x: 0, y: 0, heading: predicted },
    { x: 0, y: 0, heading: measured }
  );
  const corrected = correctPose(
    { x: 0, y: 0, heading: predicted },
    { x: 0, y: 0, heading: measured },
    0.5
  );

  assertClose(innovation.heading, 2 * Math.PI / 180);
  assertClose(Math.abs(corrected.heading), Math.PI);
});

test("absolute pose measurement applies configured noise in world coordinates", () => {
  const measurement = measurePose(
    { x: 2, y: -1, heading: 0.5 },
    0.2,
    0.1,
    { x: 1.5, y: -0.5, heading: 2 }
  );

  assertClose(measurement.x, 2.3);
  assertClose(measurement.y, -1.1);
  assertClose(measurement.heading, 0.7);
});
