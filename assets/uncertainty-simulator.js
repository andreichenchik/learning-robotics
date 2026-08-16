(function initializeUncertaintySimulator() {
  "use strict";

  const canvas = document.querySelector("[data-uncertainty-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const mean = { x: 0, y: 0 };
  const verticalExtent = 3.2;
  const sampleCount = 600;
  const xInput = document.querySelector("[data-uncertainty-x-standard-deviation]");
  const yInput = document.querySelector("[data-uncertainty-y-standard-deviation]");
  const correlationInput = document.querySelector("[data-uncertainty-correlation]");
  const status = document.querySelector("[data-uncertainty-status]");

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function worldToCanvas(point) {
    const scale = canvas.clientHeight / (2 * verticalExtent);
    return {
      x: canvas.clientWidth / 2 + point.x * scale,
      y: canvas.clientHeight / 2 - point.y * scale,
    };
  }

  function covariance() {
    return Covariance.fromStandardDeviations(
      Number(xInput.value),
      Number(yInput.value),
      Number(correlationInput.value)
    );
  }

  function standardNormalPairs() {
    let state = 0x51a7e5;
    const pairs = [];

    function uniform() {
      state = (1664525 * state + 1013904223) >>> 0;
      return (state + 1) / 4294967297;
    }

    while (pairs.length < sampleCount) {
      const magnitude = Math.sqrt(-2 * Math.log(uniform()));
      const angle = 2 * Math.PI * uniform();
      pairs.push({ x: magnitude * Math.cos(angle), y: magnitude * Math.sin(angle) });
    }
    return pairs;
  }

  const normalPairs = standardNormalPairs();

  function drawGrid() {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.strokeStyle = "#d8ded5";
    context.lineWidth = 1;

    for (let coordinate = -6; coordinate <= 6; coordinate += 1) {
      const x = worldToCanvas({ x: coordinate, y: 0 }).x;
      if (x < 0 || x > canvas.clientWidth) continue;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.clientHeight);
      context.stroke();
    }

    for (let coordinate = -3; coordinate <= 3; coordinate += 1) {
      const y = worldToCanvas({ x: 0, y: coordinate }).y;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.clientWidth, y);
      context.stroke();
    }

    const origin = worldToCanvas(mean);
    context.strokeStyle = "#9aa89e";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(0, origin.y);
    context.lineTo(canvas.clientWidth, origin.y);
    context.moveTo(origin.x, 0);
    context.lineTo(origin.x, canvas.clientHeight);
    context.stroke();

    context.fillStyle = "#5f6e64";
    context.font = "13px system-ui, sans-serif";
    context.fillText("x error", canvas.clientWidth - 48, origin.y - 8);
    context.fillText("y error", origin.x + 8, 18);
  }

  function drawSamples(currentCovariance) {
    let inside = 0;
    normalPairs.forEach((pair) => {
      const point = Covariance.sample(mean, currentCovariance, pair);
      const distanceSquared = Covariance.mahalanobisSquared(point, mean, currentCovariance);
      if (distanceSquared <= 1) inside += 1;
      const canvasPoint = worldToCanvas(point);
      context.fillStyle = distanceSquared <= 1 ? "rgb(23 107 77 / 48%)" : "rgb(95 110 100 / 28%)";
      context.beginPath();
      context.arc(canvasPoint.x, canvasPoint.y, 2.2, 0, 2 * Math.PI);
      context.fill();
    });
    return inside / sampleCount;
  }

  function drawEllipse(currentCovariance, radius, color, dashed) {
    context.strokeStyle = color;
    context.lineWidth = radius === 1 ? 3 : 2;
    context.setLineDash(dashed ? [7, 6] : []);
    context.beginPath();
    for (let index = 0; index <= 120; index += 1) {
      const phase = index / 120 * 2 * Math.PI;
      const point = worldToCanvas(
        Covariance.ellipsePoint(mean, currentCovariance, radius, phase)
      );
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    }
    context.closePath();
    context.stroke();
    context.setLineDash([]);
  }

  function drawMean() {
    const point = worldToCanvas(mean);
    context.fillStyle = "#b76518";
    context.beginPath();
    context.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    context.fill();
  }

  function updateReadout(currentCovariance, insideFraction) {
    const axes = Covariance.principalAxes(currentCovariance);
    document.querySelector("[data-uncertainty-x-output]").textContent = Number(xInput.value).toFixed(2);
    document.querySelector("[data-uncertainty-y-output]").textContent = Number(yInput.value).toFixed(2);
    document.querySelector("[data-uncertainty-correlation-output]").textContent =
      Number(correlationInput.value).toFixed(2);
    document.querySelector("[data-uncertainty-xx]").textContent = currentCovariance.xx.toFixed(2);
    document.querySelector("[data-uncertainty-xy-a]").textContent = currentCovariance.xy.toFixed(2);
    document.querySelector("[data-uncertainty-xy-b]").textContent = currentCovariance.xy.toFixed(2);
    document.querySelector("[data-uncertainty-yy]").textContent = currentCovariance.yy.toFixed(2);
    document.querySelector("[data-uncertainty-angle]").textContent =
      `${(axes.angle * 180 / Math.PI).toFixed(0)}°`;
    document.querySelector("[data-uncertainty-inside]").textContent =
      `${(insideFraction * 100).toFixed(1)}%`;
  }

  function render() {
    const currentCovariance = covariance();
    drawGrid();
    const insideFraction = drawSamples(currentCovariance);
    drawEllipse(currentCovariance, 2, "#286c8f", true);
    drawEllipse(currentCovariance, 1, "#176b4d", false);
    drawMean();
    updateReadout(currentCovariance, insideFraction);
  }

  function selectPreset(xStandardDeviation, yStandardDeviation, correlation, message) {
    xInput.value = String(xStandardDeviation);
    yInput.value = String(yStandardDeviation);
    correlationInput.value = String(correlation);
    status.textContent = message;
    render();
  }

  [xInput, yInput, correlationInput].forEach((input) => {
    input.addEventListener("input", () => {
      status.textContent = "The same mean now represents a differently shaped belief.";
      render();
    });
  });

  document.querySelector("[data-uncertainty-independent]").addEventListener("click", () => {
    selectPreset(0.8, 0.35, 0, "Independent errors: the ellipse remains aligned with the axes.");
  });
  document.querySelector("[data-uncertainty-positive]").addEventListener("click", () => {
    selectPreset(0.8, 0.8, 0.85, "Positive covariance: x and y errors tend to have the same sign.");
  });
  document.querySelector("[data-uncertainty-negative]").addEventListener("click", () => {
    selectPreset(0.8, 0.8, -0.85, "Negative covariance: x and y errors tend to have opposite signs.");
  });
  document.querySelector("[data-uncertainty-isotropic]").addEventListener("click", () => {
    selectPreset(0.65, 0.65, 0, "Isotropic uncertainty: no direction is preferred.");
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    render();
  });
  resizeCanvas();
  render();
})();
