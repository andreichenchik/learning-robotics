const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeAngle,
  stepPose,
  wheelSpeeds,
  waypointCommand,
} = require("../assets/differential-drive.js");

function assertClose(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected}`);
}

test("angles wrap to the canonical interval", () => {
  assertClose(normalizeAngle(3 * Math.PI), -Math.PI);
  assertClose(normalizeAngle(-3 * Math.PI), -Math.PI);
});

test("forward velocity follows the robot heading", () => {
  const east = stepPose(
    { x: 0, y: 0, heading: 0 },
    { linearVelocity: 2, angularVelocity: 0 },
    0.5
  );
  const north = stepPose(
    { x: 0, y: 0, heading: Math.PI / 2 },
    { linearVelocity: 2, angularVelocity: 0 },
    0.5
  );

  assertClose(east.x, 1);
  assertClose(east.y, 0);
  assertClose(north.x, 0);
  assertClose(north.y, 1);
});

test("pure rotation changes heading without translating", () => {
  const pose = stepPose(
    { x: 1, y: -2, heading: 0 },
    { linearVelocity: 0, angularVelocity: 1 },
    0.25
  );

  assertClose(pose.x, 1);
  assertClose(pose.y, -2);
  assertClose(pose.heading, 0.25);
});

test("equal wheel speeds move straight and opposite speeds rotate", () => {
  const straight = wheelSpeeds(
    { linearVelocity: 0.4, angularVelocity: 0 },
    0.1,
    0.5
  );
  const rotate = wheelSpeeds(
    { linearVelocity: 0, angularVelocity: 0.8 },
    0.1,
    0.5
  );

  assertClose(straight.left, straight.right);
  assertClose(rotate.left, -rotate.right);
});

test("waypoint controller turns toward a target before driving", () => {
  const command = waypointCommand(
    { x: 0, y: 0, heading: 0 },
    { x: -1, y: 0 },
    {
      moveGain: 1,
      turnGain: 2,
      maxLinearSpeed: 1,
      maxAngularSpeed: 2,
      positionTolerance: 0.01,
    }
  );

  assertClose(command.linearVelocity, 0);
  assert.ok(command.angularVelocity < 0);
});

test("waypoint controller reaches a target in closed loop", () => {
  const target = { x: 1.5, y: 1 };
  const configuration = {
    moveGain: 0.9,
    turnGain: 2.4,
    maxLinearSpeed: 0.75,
    maxAngularSpeed: 1.8,
    positionTolerance: 0.03,
  };
  let pose = { x: -2, y: -1, heading: Math.PI / 6 };

  for (let step = 0; step < 2_000; step += 1) {
    pose = stepPose(pose, waypointCommand(pose, target, configuration), 0.02);
  }

  assert.ok(Math.hypot(target.x - pose.x, target.y - pose.y) <= 0.03);
});
