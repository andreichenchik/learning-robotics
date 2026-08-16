(function initializeKalmanGainSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-kalman-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const inputs = {
    predictedMean: document.querySelector("[data-kalman-predicted-mean]"),
    measurement: document.querySelector("[data-kalman-measurement]"),
    predictedStandardDeviation: document.querySelector("[data-kalman-predicted-sigma]"),
    measurementStandardDeviation: document.querySelector("[data-kalman-measurement-sigma]"),
  };

  function value(input) {
    return Number(input.value);
  }

  function currentScenario() {
    const predictedStandardDeviation = value(inputs.predictedStandardDeviation);
    const measurementStandardDeviation = value(inputs.measurementStandardDeviation);
    const predictedMean = value(inputs.predictedMean);
    const measurement = value(inputs.measurement);
    return {
      predictedMean,
      measurement,
      predictedStandardDeviation,
      measurementStandardDeviation,
      result: ScalarKalman.correct(
        predictedMean,
        predictedStandardDeviation ** 2,
        measurement,
        measurementStandardDeviation ** 2
      ),
    };
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function gaussianDensity(x, mean, standardDeviation) {
    const normalized = (x - mean) / standardDeviation;
    return Math.exp(-0.5 * normalized ** 2) /
      (standardDeviation * Math.sqrt(2 * Math.PI));
  }

  function plotBounds(scenario) {
    const correctedStandardDeviation = Math.sqrt(scenario.result.variance);
    const minimum = Math.min(
      scenario.predictedMean - 3.5 * scenario.predictedStandardDeviation,
      scenario.measurement - 3.5 * scenario.measurementStandardDeviation,
      scenario.result.mean - 3.5 * correctedStandardDeviation
    );
    const maximum = Math.max(
      scenario.predictedMean + 3.5 * scenario.predictedStandardDeviation,
      scenario.measurement + 3.5 * scenario.measurementStandardDeviation,
      scenario.result.mean + 3.5 * correctedStandardDeviation
    );
    return { minimum, maximum };
  }

  function positionToX(position, bounds) {
    const left = 46;
    const right = canvas.clientWidth - 18;
    return left + (position - bounds.minimum) /
      (bounds.maximum - bounds.minimum) * (right - left);
  }

  function drawAxis(bounds) {
    const baseline = canvas.clientHeight - 42;
    context.strokeStyle = "#aeb9b0";
    context.fillStyle = "#5f6e64";
    context.lineWidth = 1;
    context.font = "12px system-ui, sans-serif";
    context.beginPath();
    context.moveTo(46, baseline);
    context.lineTo(canvas.clientWidth - 18, baseline);
    context.stroke();

    const interval = bounds.maximum - bounds.minimum;
    const roughTick = interval / 5;
    const power = 10 ** Math.floor(Math.log10(roughTick));
    const normalized = roughTick / power;
    const tick = (normalized < 1.5 ? 1 : normalized < 3.5 ? 2 : normalized < 7.5 ? 5 : 10) * power;
    const first = Math.ceil(bounds.minimum / tick) * tick;
    const decimals = tick < 1 ? 1 : 0;
    for (let position = first; position <= bounds.maximum; position += tick) {
      const x = positionToX(position, bounds);
      context.beginPath();
      context.moveTo(x, baseline);
      context.lineTo(x, baseline + 6);
      context.stroke();
      context.fillText(`${position.toFixed(decimals)} m`, x - 16, baseline + 22);
    }
  }

  function drawDistribution(mean, standardDeviation, color, bounds, maximumDensity, lineWidth) {
    const top = 20;
    const baseline = canvas.clientHeight - 42;
    const usableHeight = baseline - top;
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    for (let pixel = 46; pixel <= canvas.clientWidth - 18; pixel += 2) {
      const position = bounds.minimum +
        (pixel - 46) / (canvas.clientWidth - 64) * (bounds.maximum - bounds.minimum);
      const density = gaussianDensity(position, mean, standardDeviation);
      const y = baseline - density / maximumDensity * usableHeight;
      if (pixel === 46) context.moveTo(pixel, y);
      else context.lineTo(pixel, y);
    }
    context.stroke();

    const meanX = positionToX(mean, bounds);
    context.setLineDash([5, 5]);
    context.beginPath();
    context.moveTo(meanX, top);
    context.lineTo(meanX, baseline);
    context.stroke();
    context.setLineDash([]);
  }

  function draw() {
    const scenario = currentScenario();
    const bounds = plotBounds(scenario);
    const correctedStandardDeviation = Math.sqrt(scenario.result.variance);
    const maximumDensity = Math.max(
      gaussianDensity(scenario.predictedMean, scenario.predictedMean, scenario.predictedStandardDeviation),
      gaussianDensity(scenario.measurement, scenario.measurement, scenario.measurementStandardDeviation),
      gaussianDensity(scenario.result.mean, scenario.result.mean, correctedStandardDeviation)
    ) * 1.08;

    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawAxis(bounds);
    drawDistribution(
      scenario.predictedMean,
      scenario.predictedStandardDeviation,
      "#286c8f",
      bounds,
      maximumDensity,
      2.5
    );
    drawDistribution(
      scenario.measurement,
      scenario.measurementStandardDeviation,
      "#b76518",
      bounds,
      maximumDensity,
      2.5
    );
    drawDistribution(
      scenario.result.mean,
      correctedStandardDeviation,
      "#176b4d",
      bounds,
      maximumDensity,
      4
    );
  }

  function describeTrust(gain) {
    if (gain > 0.8) return "The measurement has much more influence than the prediction.";
    if (gain < 0.2) return "The prediction has much more influence than the measurement.";
    if (Math.abs(gain - 0.5) < 0.02) return "Prediction and measurement have equal influence.";
    return gain > 0.5
      ? "The measurement has more influence than the prediction."
      : "The prediction has more influence than the measurement.";
  }

  function update() {
    const scenario = currentScenario();
    const correctedStandardDeviation = Math.sqrt(scenario.result.variance);
    document.querySelector("[data-kalman-predicted-mean-output]").textContent =
      scenario.predictedMean.toFixed(1);
    document.querySelector("[data-kalman-measurement-output]").textContent =
      scenario.measurement.toFixed(1);
    document.querySelector("[data-kalman-predicted-sigma-output]").textContent =
      scenario.predictedStandardDeviation.toFixed(2);
    document.querySelector("[data-kalman-measurement-sigma-output]").textContent =
      scenario.measurementStandardDeviation.toFixed(2);
    document.querySelector("[data-kalman-innovation]").textContent =
      `${scenario.result.innovation.toFixed(2)} m`;
    document.querySelector("[data-kalman-gain]").textContent =
      scenario.result.gain.toFixed(3);
    document.querySelector("[data-kalman-corrected-mean]").textContent =
      `${scenario.result.mean.toFixed(3)} m`;
    document.querySelector("[data-kalman-corrected-sigma]").textContent =
      `${correctedStandardDeviation.toFixed(3)} m`;
    document.querySelector("[data-kalman-status]").textContent = describeTrust(scenario.result.gain);
    draw();
  }

  document.querySelectorAll("[data-kalman-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      inputs.predictedStandardDeviation.value = button.dataset.predictedSigma;
      inputs.measurementStandardDeviation.value = button.dataset.measurementSigma;
      update();
    });
  });
  Object.values(inputs).forEach((input) => input.addEventListener("input", update));
  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
  update();
})();
