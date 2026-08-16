const test = require("node:test");
const assert = require("node:assert/strict");
const {
  wheelTravel,
  updatePose,
  measureTravel,
  poseError,
} = require("../assets/odometry.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("chassis command becomes left and right wheel travel", () => {
  const straight = wheelTravel({ linearVelocity: 1, angularVelocity: 0 }, 0.5, 0.4);
  const turn = wheelTravel({ linearVelocity: 0, angularVelocity: 2 }, 0.5, 0.4);

  assertClose(straight.left, 0.5);
  assertClose(straight.right, 0.5);
  assertClose(turn.left, -0.2);
  assertClose(turn.right, 0.2);
});

test("equal wheel travel advances the pose in its current direction", () => {
  const pose = updatePose({ x: 0, y: 0, heading: Math.PI / 2 }, 1, 1, 0.4);

  assertClose(pose.x, 0);
  assertClose(pose.y, 1);
  assertClose(pose.heading, Math.PI / 2);
});

test("opposite wheel travel rotates in place", () => {
  const pose = updatePose({ x: 2, y: -1, heading: 0 }, -0.2, 0.2, 0.4);

  assertClose(pose.x, 2);
  assertClose(pose.y, -1);
  assertClose(pose.heading, 1);
});

test("unequal wheel travel follows the midpoint heading", () => {
  const pose = updatePose({ x: 0, y: 0, heading: 0 }, 0.8, 1.2, 0.4);

  assertClose(pose.x, Math.cos(0.5));
  assertClose(pose.y, Math.sin(0.5));
  assertClose(pose.heading, 1);
});

test("encoder model separates scale bias from noise", () => {
  assertClose(measureTravel(1, 0.05, 0, 0.5), 1.05);
  assertClose(measureTravel(1, 0.05, 0.02, 0.5), 1.06);
});

test("pose error treats equivalent wrapped headings as equal", () => {
  const error = poseError(
    { x: 0, y: 0, heading: Math.PI - 0.1 },
    { x: 0.3, y: 0.4, heading: -Math.PI - 0.1 }
  );

  assertClose(error.position, 0.5);
  assertClose(error.heading, 0);
});

test("ideal odometry matches the same wheel-driven motion", () => {
  let truth = { x: 0, y: 0, heading: 0 };
  let estimate = { ...truth };
  const command = { linearVelocity: 0.6, angularVelocity: 0.7 };

  for (let step = 0; step < 500; step += 1) {
    const travel = wheelTravel(command, 0.02, 0.32);
    truth = updatePose(truth, travel.left, travel.right, 0.32);
    estimate = updatePose(estimate, travel.left, travel.right, 0.32);
  }

  assertClose(poseError(truth, estimate).position, 0);
  assertClose(poseError(truth, estimate).heading, 0);
});
