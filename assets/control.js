(function exposeControl(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RobotControl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createControlApi() {
  "use strict";

  /** Returns `value` limited to the inclusive `[minimum, maximum]` interval. */
  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  /** Computes a speed command that points toward `target` and respects actuator limits. */
  function proportionalCommand(target, position, gain, maxSpeed) {
    return clamp(gain * (target - position), -maxSpeed, maxSpeed);
  }

  /** Advances the idealized one-dimensional robot by one simulation time step. */
  function integratePosition(position, command, deltaTime) {
    return position + command * deltaTime;
  }

  return { clamp, proportionalCommand, integratePosition };
});
