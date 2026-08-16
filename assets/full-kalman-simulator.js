(function initializeFullKalmanSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-full-kalman-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const timeStep = 1;
  const measurementInterval = 4;
  const maximumSteps = 24;
  const inputs = {
    accelerationStandardDeviation: document.querySelector("[data-full-kalman-acceleration-sigma]"),
    measurementStandardDeviation: document.querySelector("[data-full-kalman-measurement-sigma]"),
  };
  const status = document.querySelector("[data-full-kalman-status]");

  let truth;
  let estimate;
  let history;
  let stepCount;
  let randomState;
  let lastCorrection;
  let currentEvent;

  function accelerationStandardDeviation() {
    return Number(inputs.accelerationStandardDeviation.value);
  }

  function measurementStandardDeviation() {
    return Number(inputs.measurementStandardDeviation.value);
  }

  function randomUniform() {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return (randomState + 1) / 4294967297;
  }

  function randomNormal() {
    const magnitude = Math.sqrt(-2 * Math.log(randomUniform()));
    return magnitude * Math.cos(2 * Math.PI * randomUniform());
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function physicalStep(state, acceleration) {
    return {
      position: state.position + state.velocity * timeStep + 0.5 * acceleration * timeStep ** 2,
      velocity: state.velocity + acceleration * timeStep,
    };
  }

  function reset(message = "Advance to the next GPS reading and compare uncertainty before and after correction.") {
    truth = { position: 0, velocity: 1 };
    estimate = {
      mean: { position: 0, velocity: 1 },
      covariance: {
        positionVariance: 0.04,
        positionVelocityCovariance: 0,
        velocityVariance: 0.09,
      },
    };
    stepCount = 0;
    randomState = 0x54c3a1;
    lastCorrection = null;
    currentEvent = "Initial posterior";
    history = [{
      step: 0,
      truthPosition: truth.position,
      estimatePosition: estimate.mean.position,
      standardDeviation: Math.sqrt(estimate.covariance.positionVariance),
      measurement: null,
    }];
    status.textContent = message;
    render();
  }

  function advanceOne() {
    if (stepCount >= maximumSteps) {
      status.textContent = "Reset to start a new 24-step run.";
      return;
    }

    const processSigma = accelerationStandardDeviation();
    const gpsSigma = measurementStandardDeviation();
    truth = physicalStep(truth, processSigma * randomNormal());
    const predicted = PositionVelocityKalman.predict(estimate, timeStep, processSigma);
    stepCount += 1;

    let measurement = null;
    if (stepCount % measurementInterval === 0) {
      measurement = truth.position + gpsSigma * randomNormal();
      const corrected = PositionVelocityKalman.correctPosition(
        predicted,
        measurement,
        gpsSigma ** 2
      );
      lastCorrection = {
        innovation: corrected.innovation,
        gain: corrected.gain,
        predictedStandardDeviation: Math.sqrt(predicted.covariance.positionVariance),
        correctedStandardDeviation: Math.sqrt(corrected.covariance.positionVariance),
        predictedVelocity: predicted.mean.velocity,
        correctedVelocity: corrected.mean.velocity,
      };
      estimate = { mean: corrected.mean, covariance: corrected.covariance };
      currentEvent = "GPS correction";
      status.textContent = "GPS arrived: the correction became the posterior used by the next prediction.";
    } else {
      estimate = predicted;
      currentEvent = "Prediction only";
      status.textContent = "No GPS this step: motion moved the estimate and increased its uncertainty.";
    }

    history.push({
      step: stepCount,
      truthPosition: truth.position,
      estimatePosition: estimate.mean.position,
      standardDeviation: Math.sqrt(estimate.covariance.positionVariance),
      measurement,
    });
    render();
  }

  function advanceToNextMeasurement() {
    if (stepCount >= maximumSteps) {
      status.textContent = "Reset to start a new 24-step run.";
      return;
    }
    do advanceOne(); while (stepCount % measurementInterval !== 0 && stepCount < maximumSteps);
  }

  function xForStep(step) {
    const left = 52;
    return left + step / maximumSteps * (canvas.clientWidth - left - 18);
  }

  function chartBounds() {
    const values = history.flatMap((entry) => [
      entry.truthPosition,
      entry.estimatePosition - 2 * entry.standardDeviation,
      entry.estimatePosition + 2 * entry.standardDeviation,
      ...(entry.measurement === null ? [] : [entry.measurement]),
    ]);
    const futurePosition = estimate.mean.position +
      estimate.mean.velocity * (maximumSteps - stepCount);
    values.push(0, futurePosition);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = Math.max(1, (maximum - minimum) * 0.1);
    return { minimum: minimum - padding, maximum: maximum + padding };
  }

  function yForPosition(position, bounds) {
    const top = 22;
    const bottom = canvas.clientHeight - 42;
    return top + (bounds.maximum - position) /
      (bounds.maximum - bounds.minimum) * (bottom - top);
  }

  function drawAxes(bounds) {
    const left = 52;
    const right = canvas.clientWidth - 18;
    const bottom = canvas.clientHeight - 42;
    context.strokeStyle = "#d8ded5";
    context.fillStyle = "#5f6e64";
    context.lineWidth = 1;
    context.font = "12px system-ui, sans-serif";

    for (let step = 0; step <= maximumSteps; step += 4) {
      const x = xForStep(step);
      context.beginPath();
      context.moveTo(x, 22);
      context.lineTo(x, bottom);
      context.stroke();
      context.fillText(`${step} s`, x - 10, bottom + 22);
    }

    for (let index = 0; index <= 4; index += 1) {
      const position = bounds.minimum + index / 4 * (bounds.maximum - bounds.minimum);
      const y = yForPosition(position, bounds);
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
      context.fillText(position.toFixed(0), 20, y + 4);
    }
    context.fillText("position (m)", 8, 14);
  }

  function drawUncertainty(bounds) {
    if (history.length < 2) return;
    context.fillStyle = "rgb(40 108 143 / 13%)";
    context.beginPath();
    history.forEach((entry, index) => {
      const x = xForStep(entry.step);
      const y = yForPosition(
        entry.estimatePosition + 2 * entry.standardDeviation,
        bounds
      );
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    [...history].reverse().forEach((entry) => {
      context.lineTo(
        xForStep(entry.step),
        yForPosition(entry.estimatePosition - 2 * entry.standardDeviation, bounds)
      );
    });
    context.closePath();
    context.fill();
  }

  function drawLine(valueKey, color, bounds, dashed = false) {
    if (history.length < 2) return;
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.setLineDash(dashed ? [7, 5] : []);
    context.beginPath();
    history.forEach((entry, index) => {
      const x = xForStep(entry.step);
      const y = yForPosition(entry[valueKey], bounds);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
    context.setLineDash([]);
  }

  function drawMeasurements(bounds) {
    context.fillStyle = "#b76518";
    history.forEach((entry) => {
      if (entry.measurement === null) return;
      context.beginPath();
      context.arc(
        xForStep(entry.step),
        yForPosition(entry.measurement, bounds),
        5,
        0,
        2 * Math.PI
      );
      context.fill();
    });
  }

  function drawChart() {
    const bounds = chartBounds();
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawAxes(bounds);
    drawUncertainty(bounds);
    drawLine("truthPosition", "#176b4d", bounds);
    drawLine("estimatePosition", "#286c8f", bounds, true);
    drawMeasurements(bounds);
    if (stepCount === 0) {
      context.fillStyle = "#5f6e64";
      context.font = "14px system-ui, sans-serif";
      context.textAlign = "center";
      context.fillText(
        "Advance one step",
        canvas.clientWidth / 2,
        canvas.clientHeight / 2 - 10
      );
      context.fillText(
        "to start the recursive filter.",
        canvas.clientWidth / 2,
        canvas.clientHeight / 2 + 12
      );
      context.textAlign = "start";
    }
  }

  function formatLastCorrection(formatter) {
    return lastCorrection === null ? "—" : formatter(lastCorrection);
  }

  function updateReadout() {
    document.querySelector("[data-full-kalman-acceleration-sigma-output]").textContent =
      accelerationStandardDeviation().toFixed(2);
    document.querySelector("[data-full-kalman-measurement-sigma-output]").textContent =
      measurementStandardDeviation().toFixed(2);
    document.querySelector("[data-full-kalman-step]").textContent = `${stepCount} · ${currentEvent}`;
    document.querySelector("[data-full-kalman-estimate]").textContent =
      `(${estimate.mean.position.toFixed(2)} m, ${estimate.mean.velocity.toFixed(2)} m/s)`;
    document.querySelector("[data-full-kalman-truth]").textContent =
      `(${truth.position.toFixed(2)} m, ${truth.velocity.toFixed(2)} m/s)`;
    document.querySelector("[data-full-kalman-position-sigma]").textContent =
      `${Math.sqrt(estimate.covariance.positionVariance).toFixed(3)} m`;
    document.querySelector("[data-full-kalman-last-gain]").textContent = formatLastCorrection(
      (correction) => `(${correction.gain.position.toFixed(3)}, ${correction.gain.velocity.toFixed(3)})`
    );
    document.querySelector("[data-full-kalman-last-sigma]").textContent = formatLastCorrection(
      (correction) =>
        `${correction.predictedStandardDeviation.toFixed(3)} → ${correction.correctedStandardDeviation.toFixed(3)} m`
    );
    document.querySelector("[data-full-kalman-last-velocity]").textContent = formatLastCorrection(
      (correction) =>
        `${correction.predictedVelocity.toFixed(3)} → ${correction.correctedVelocity.toFixed(3)} m/s`
    );
    document.querySelector("[data-full-kalman-last-innovation]").textContent = formatLastCorrection(
      (correction) => `${correction.innovation.toFixed(3)} m`
    );
    document.querySelector("[data-full-kalman-pp]").textContent =
      estimate.covariance.positionVariance.toFixed(3);
    document.querySelector("[data-full-kalman-pv-a]").textContent =
      estimate.covariance.positionVelocityCovariance.toFixed(3);
    document.querySelector("[data-full-kalman-pv-b]").textContent =
      estimate.covariance.positionVelocityCovariance.toFixed(3);
    document.querySelector("[data-full-kalman-vv]").textContent =
      estimate.covariance.velocityVariance.toFixed(3);
  }

  function render() {
    drawChart();
    updateReadout();
  }

  document.querySelector("[data-full-kalman-step-button]").addEventListener("click", advanceOne);
  document.querySelector("[data-full-kalman-gps-button]").addEventListener("click", advanceToNextMeasurement);
  document.querySelector("[data-full-kalman-run-button]").addEventListener("click", () => {
    for (let index = 0; index < 20 && stepCount < maximumSteps; index += 1) advanceOne();
  });
  document.querySelector("[data-full-kalman-reset]").addEventListener("click", () => reset());
  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", () => reset("Noise settings changed; the run restarted."));
  });
  window.addEventListener("resize", () => {
    resizeCanvas();
    drawChart();
  });

  resizeCanvas();
  reset();
})();
