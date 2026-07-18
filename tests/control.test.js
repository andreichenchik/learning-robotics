const test = require("node:test");
const assert = require("node:assert/strict");
const {
  clamp,
  proportionalCommand,
  integratePosition,
} = require("../assets/control.js");

test("proportional command points toward the target", () => {
  assert.ok(Math.abs(proportionalCommand(0.8, 0.2, 1.5, 10) - 0.9) < 1e-12);
  assert.ok(Math.abs(proportionalCommand(0.2, 0.8, 1.5, 10) + 0.9) < 1e-12);
});

test("proportional command respects actuator speed limits", () => {
  assert.equal(proportionalCommand(1, 0, 4, 0.5), 0.5);
  assert.equal(proportionalCommand(0, 1, 4, 0.5), -0.5);
});

test("integration advances position using command and elapsed time", () => {
  assert.equal(integratePosition(0.2, 0.4, 0.5), 0.4);
});

test("clamp keeps positions inside the simulated track", () => {
  assert.equal(clamp(-0.1, 0, 1), 0);
  assert.equal(clamp(0.4, 0, 1), 0.4);
  assert.equal(clamp(1.2, 0, 1), 1);
});

test("the closed feedback loop converges to its target", () => {
  const target = 0.8;
  let position = 0.1;

  for (let step = 0; step < 1_000; step += 1) {
    const command = proportionalCommand(target, position, 1.2, 0.5);
    position = integratePosition(position, command, 0.01);
  }

  assert.ok(Math.abs(target - position) < 1e-4);
});
