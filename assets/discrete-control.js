(function exposeDiscreteControl(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DiscreteControl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createDiscreteControlApi() {
  "use strict";

  /** Returns the state measurement available after the requested integer delay. */
  function delayedMeasurement(positionHistory, delaySteps) {
    const index = Math.max(0, positionHistory.length - 1 - delaySteps);
    return positionHistory[index];
  }

  /** Advances a position state while the command is held for one time step. */
  function integrateState(position, command, stepSize) {
    return position + command * stepSize;
  }

  /** Produces one inspectable transition of a sampled proportional controller. */
  function takeStep(state, configuration) {
    const position = state.positions[state.positions.length - 1];
    const measurement = delayedMeasurement(state.positions, configuration.delaySteps);
    const error = configuration.target - measurement;
    const command = configuration.gain * error;
    const nextPosition = integrateState(position, command, configuration.stepSize);

    return {
      state: { positions: [...state.positions, nextPosition] },
      sample: {
        step: state.positions.length - 1,
        position,
        measurement,
        error,
        command,
        nextPosition,
      },
    };
  }

  /** Simulates a fixed number of sampled control transitions from one initial position. */
  function simulate(initialPosition, configuration, stepCount) {
    let state = { positions: [initialPosition] };
    const samples = [];

    for (let index = 0; index < stepCount; index += 1) {
      const transition = takeStep(state, configuration);
      state = transition.state;
      samples.push(transition.sample);
    }

    return { state, samples };
  }

  return { delayedMeasurement, integrateState, takeStep, simulate };
});
