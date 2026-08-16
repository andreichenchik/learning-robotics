(function initializePredictionSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-prediction-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const initialMean = { position: 0, velocity: 1 };
  const positionStandardDeviation = 0.1;
  const sampleCount = 500;
  const timeStepInput = document.querySelector("[data-prediction-time-step]");
  const velocityStandardDeviationInput = document.querySelector(
    "[data-prediction-velocity-standard-deviation]"
  );
  const accelerationStandardDeviationInput = document.querySelector(
    "[data-prediction-acceleration-standard-deviation]"
  );
  const status = document.querySelector("[data-prediction-status]");

  let mean;
  let covariance;
  let samples;
  let stepCount;
  let randomState;

  function timeStep() {
    return Number(timeStepInput.value);
  }

  function accelerationStandardDeviation() {
    return Number(accelerationStandardDeviationInput.value);
  }

  function initialCovariance() {
    const velocityStandardDeviation = Number(velocityStandardDeviationInput.value);
    return {
      xx: positionStandardDeviation ** 2,
      xy: 0,
      yy: velocityStandardDeviation ** 2,
    };
  }

  function randomUniform() {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return (randomState + 1) / 4294967297;
  }

  function randomNormal() {
    const magnitude = Math.sqrt(-2 * Math.log(randomUniform()));
    return magnitude * Math.cos(2 * Math.PI * randomUniform());
  }

  function createSamples() {
    return Array.from({ length: sampleCount }, () => {
      const sampled = Covariance.sample(
        { x: initialMean.position, y: initialMean.velocity },
        covariance,
        { x: randomNormal(), y: randomNormal() }
      );
      return { position: sampled.x, velocity: sampled.y };
    });
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function sampleStatistics() {
    const positionMean = samples.reduce((sum, state) => sum + state.position, 0) / samples.length;
    const velocityMean = samples.reduce((sum, state) => sum + state.velocity, 0) / samples.length;
    const positionVariance = samples.reduce(
      (sum, state) => sum + (state.position - positionMean) ** 2,
      0
    ) / samples.length;
    return { positionMean, velocityMean, positionVariance };
  }

  function viewBounds() {
    const positionStandardDeviation = Math.sqrt(covariance.xx);
    const velocityStandardDeviation = Math.sqrt(covariance.yy);
    return {
      minimumPosition: Math.min(-1.5, mean.position - 3.5 * positionStandardDeviation),
      maximumPosition: Math.max(8.5, mean.position + 3.5 * positionStandardDeviation),
      minimumVelocity: mean.velocity - Math.max(1, 3.5 * velocityStandardDeviation),
      maximumVelocity: mean.velocity + Math.max(1, 3.5 * velocityStandardDeviation),
    };
  }

  function stateToCanvas(state, bounds) {
    const padding = { left: 54, right: 20, top: 24, bottom: 42 };
    const width = canvas.clientWidth - padding.left - padding.right;
    const height = canvas.clientHeight - padding.top - padding.bottom;
    return {
      x:
        padding.left +
        (state.position - bounds.minimumPosition) /
          (bounds.maximumPosition - bounds.minimumPosition) * width,
      y:
        padding.top +
        (bounds.maximumVelocity - state.velocity) /
          (bounds.maximumVelocity - bounds.minimumVelocity) * height,
    };
  }

  function drawGrid(bounds) {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.strokeStyle = "#d8ded5";
    context.fillStyle = "#5f6e64";
    context.lineWidth = 1;
    context.font = "12px system-ui, sans-serif";

    const positionTick = canvas.clientWidth < 500 ? 2 : 1;
    const firstPosition = Math.ceil(bounds.minimumPosition / positionTick) * positionTick;
    for (
      let position = firstPosition;
      position <= bounds.maximumPosition;
      position += positionTick
    ) {
      const point = stateToCanvas({ position, velocity: bounds.minimumVelocity }, bounds);
      context.beginPath();
      context.moveTo(point.x, 24);
      context.lineTo(point.x, canvas.clientHeight - 42);
      context.stroke();
      context.fillText(`${position} m`, point.x - 11, canvas.clientHeight - 20);
    }

    for (let index = 0; index <= 4; index += 1) {
      const velocity =
        bounds.minimumVelocity +
        index / 4 * (bounds.maximumVelocity - bounds.minimumVelocity);
      const point = stateToCanvas({ position: bounds.minimumPosition, velocity }, bounds);
      context.beginPath();
      context.moveTo(54, point.y);
      context.lineTo(canvas.clientWidth - 20, point.y);
      context.stroke();
      context.fillText(`${velocity.toFixed(1)}`, 15, point.y + 4);
    }

    context.fillText("velocity (m/s)", 8, 14);
    context.fillText("position", canvas.clientWidth - 67, canvas.clientHeight - 6);
  }

  function drawPositionBand(bounds) {
    const standardDeviation = Math.sqrt(covariance.xx);
    const left = stateToCanvas(
      { position: mean.position - 2 * standardDeviation, velocity: mean.velocity },
      bounds
    ).x;
    const right = stateToCanvas(
      { position: mean.position + 2 * standardDeviation, velocity: mean.velocity },
      bounds
    ).x;
    context.fillStyle = "rgb(23 107 77 / 10%)";
    context.fillRect(left, 24, right - left, canvas.clientHeight - 66);
  }

  function drawSamples(bounds) {
    samples.forEach((state) => {
      const point = stateToCanvas(state, bounds);
      const velocityError = state.velocity - mean.velocity;
      context.fillStyle = velocityError >= 0
        ? "rgb(183 101 24 / 32%)"
        : "rgb(40 108 143 / 28%)";
      context.beginPath();
      context.arc(point.x, point.y, 2.2, 0, 2 * Math.PI);
      context.fill();
    });
  }

  function drawMean(bounds) {
    const point = stateToCanvas(mean, bounds);
    context.strokeStyle = "#176b4d";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(point.x - 8, point.y);
    context.lineTo(point.x + 8, point.y);
    context.moveTo(point.x, point.y - 8);
    context.lineTo(point.x, point.y + 8);
    context.stroke();
  }

  function correlation() {
    return covariance.xy / Math.sqrt(covariance.xx * covariance.yy);
  }

  function updateReadout() {
    const empirical = sampleStatistics();
    document.querySelector("[data-prediction-time-step-output]").textContent =
      timeStep().toFixed(2);
    document.querySelector("[data-prediction-velocity-standard-deviation-output]").textContent =
      Number(velocityStandardDeviationInput.value).toFixed(2);
    document.querySelector("[data-prediction-acceleration-standard-deviation-output]").textContent =
      accelerationStandardDeviation().toFixed(2);
    document.querySelector("[data-prediction-step]").textContent = String(stepCount);
    document.querySelector("[data-prediction-mean]").textContent =
      `(${mean.position.toFixed(2)} m, ${mean.velocity.toFixed(2)} m/s)`;
    document.querySelector("[data-prediction-position-standard-deviation]").textContent =
      `${Math.sqrt(covariance.xx).toFixed(3)} m`;
    document.querySelector("[data-prediction-empirical-standard-deviation]").textContent =
      `${Math.sqrt(empirical.positionVariance).toFixed(3)} m`;
    document.querySelector("[data-prediction-correlation]").textContent =
      correlation().toFixed(2);
    document.querySelector("[data-prediction-xx]").textContent = covariance.xx.toFixed(3);
    document.querySelector("[data-prediction-xy-a]").textContent = covariance.xy.toFixed(3);
    document.querySelector("[data-prediction-xy-b]").textContent = covariance.xy.toFixed(3);
    document.querySelector("[data-prediction-yy]").textContent = covariance.yy.toFixed(3);
  }

  function render() {
    const bounds = viewBounds();
    drawGrid(bounds);
    drawPositionBand(bounds);
    drawSamples(bounds);
    drawMean(bounds);
    updateReadout();
  }

  function reset(message = "Predict one step and watch faster possibilities move ahead.") {
    mean = { ...initialMean };
    covariance = initialCovariance();
    stepCount = 0;
    randomState = 0x8a31c9;
    samples = createSamples();
    status.textContent = message;
    render();
  }

  function predictOneStep() {
    if (stepCount >= 8) {
      status.textContent = "Reset to start a new eight-step experiment.";
      return;
    }

    const currentTimeStep = timeStep();
    const accelerationNoise = accelerationStandardDeviation();
    const processNoise = LinearPrediction.accelerationNoiseCovariance(
      accelerationNoise,
      currentTimeStep
    );
    mean = LinearPrediction.predictState(mean, 0, currentTimeStep);
    covariance = LinearPrediction.predictCovariance(
      covariance,
      currentTimeStep,
      processNoise
    );
    samples = samples.map((state) =>
      LinearPrediction.predictState(
        state,
        accelerationNoise * randomNormal(),
        currentTimeStep
      )
    );
    stepCount += 1;
    status.textContent = accelerationNoise === 0
      ? "No new process noise: existing velocity uncertainty is becoming position uncertainty."
      : "Process noise adds fresh uncertainty while the motion model propagates what was already present.";
    render();
  }

  document.querySelector("[data-prediction-step-button]").addEventListener("click", predictOneStep);
  document.querySelector("[data-prediction-five-button]").addEventListener("click", () => {
    for (let index = 0; index < 5; index += 1) predictOneStep();
  });
  document.querySelector("[data-prediction-reset]").addEventListener("click", () => reset());
  [timeStepInput, velocityStandardDeviationInput, accelerationStandardDeviationInput].forEach(
    (input) => input.addEventListener("input", () => reset("Parameters changed; the experiment restarted."))
  );
  window.addEventListener("resize", () => {
    resizeCanvas();
    render();
  });

  resizeCanvas();
  reset();
})();
