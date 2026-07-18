const test = require("node:test");
const assert = require("node:assert/strict");
const {
  delayedMeasurement,
  integrateState,
  takeStep,
  simulate,
} = require("../assets/discrete-control.js");

test("integration holds the command for exactly one time step", () => {
  assert.equal(integrateState(0.2, 0.5, 0.4), 0.4);
});

test("a delayed sensor returns an earlier position", () => {
  const history = [0, 0.4, 0.7, 0.9];
  assert.equal(delayedMeasurement(history, 0), 0.9);
  assert.equal(delayedMeasurement(history, 2), 0.4);
});

test("delays before recorded history reuse the oldest measurement", () => {
  assert.equal(delayedMeasurement([0, 0.4], 10), 0);
});

test("one transition exposes state, measurement, error, and command", () => {
  const transition = takeStep(
    { positions: [0, 0.4] },
    { target: 1, gain: 2, stepSize: 0.25, delaySteps: 1 }
  );

  assert.deepEqual(transition.sample, {
    step: 1,
    position: 0.4,
    measurement: 0,
    error: 1,
    command: 2,
    nextPosition: 0.9,
  });
});

test("a small no-delay step converges monotonically", () => {
  const result = simulate(
    0,
    { target: 1, gain: 1, stepSize: 0.5, delaySteps: 0 },
    4
  );

  assert.deepEqual(result.state.positions, [0, 0.5, 0.75, 0.875, 0.9375]);
});

test("a gain-step product above two grows the error", () => {
  const result = simulate(
    0,
    { target: 1, gain: 1.2, stepSize: 1.8, delaySteps: 0 },
    6
  );
  const errors = result.state.positions.map((position) => Math.abs(1 - position));

  assert.ok(errors.at(-1) > errors[0]);
});
