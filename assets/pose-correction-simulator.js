(function initializePoseCorrectionSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-correction-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const weightInput = document.querySelector("[data-correction-weight]");
  const status = document.querySelector("[data-correction-status]");
  const world = { minimumX: -2.5, maximumX: 2.5, minimumY: -2.2, maximumY: 2.2 };
  const trackWidth = 0.32;
  const initialPose = { x: -0.9, y: 0, heading: 0 };
  const route = [
    { linearVelocity: 0.6, angularVelocity: 0.7, duration: 2 * Math.PI / 0.7 },
    { linearVelocity: 0.6, angularVelocity: -0.7, duration: 2 * Math.PI / 0.7 },
  ];
  const scenarios = {
    frequentPrecise: {
      interval: 0.9,
      positionNoise: 0.04,
      headingNoise: 2 * Math.PI / 180,
      label: "Frequent, precise measurements",
    },
    frequentNoisy: {
      interval: 0.9,
      positionNoise: 0.18,
      headingNoise: 12 * Math.PI / 180,
      label: "Frequent, noisy measurements",
    },
    rarePrecise: {
      interval: 2.5,
      positionNoise: 0.04,
      headingNoise: 2 * Math.PI / 180,
      label: "Rare, precise measurements",
    },
  };

  let scenario = scenarios.frequentNoisy;
  let truth = { ...initialPose };
  let estimate = { ...initialPose };
  let truthTrail = [{ x: truth.x, y: truth.y }];
  let estimateTrail = [{ x: estimate.x, y: estimate.y }];
  let correctionEvents = [];
  let correctionCount = 0;
  let lastCorrection = null;
  let running = false;
  let segmentIndex = 0;
  let segmentElapsed = 0;
  let correctionElapsed = 0;
  let previousTime = 0;
  let trailElapsed = 0;
  let randomState = 0x6eed1234;
  let resetCount = 0;

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function worldToCanvas(point) {
    return {
      x: (point.x - world.minimumX) / (world.maximumX - world.minimumX) * canvas.clientWidth,
      y: canvas.clientHeight -
        (point.y - world.minimumY) / (world.maximumY - world.minimumY) * canvas.clientHeight,
    };
  }

  function drawGrid() {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.strokeStyle = "#d8ded5";
    context.lineWidth = 1;
    context.setLineDash([]);

    for (let x = Math.ceil(world.minimumX); x <= world.maximumX; x += 0.5) {
      const start = worldToCanvas({ x, y: world.minimumY });
      const end = worldToCanvas({ x, y: world.maximumY });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }

    for (let y = Math.ceil(world.minimumY); y <= world.maximumY; y += 0.5) {
      const start = worldToCanvas({ x: world.minimumX, y });
      const end = worldToCanvas({ x: world.maximumX, y });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  function drawTrail(points, color, dashed) {
    if (points.length < 2) return;
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.setLineDash(dashed ? [7, 6] : []);
    context.beginPath();
    points.forEach((point, index) => {
      const canvasPoint = worldToCanvas(point);
      if (index === 0) context.moveTo(canvasPoint.x, canvasPoint.y);
      else context.lineTo(canvasPoint.x, canvasPoint.y);
    });
    context.stroke();
    context.setLineDash([]);
  }

  function drawRobot(pose, color, filled, size = 1) {
    const point = worldToCanvas(pose);
    context.save();
    context.translate(point.x, point.y);
    context.rotate(-pose.heading);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(20 * size, 0);
    context.lineTo(-12 * size, -11 * size);
    context.lineTo(-12 * size, 11 * size);
    context.closePath();
    if (filled) context.fill();
    else context.stroke();
    context.restore();
  }

  function drawMeasurement(measurement, prominent) {
    const point = worldToCanvas(measurement);
    const radius = prominent ? 8 : 5;
    context.strokeStyle = prominent ? "#b76518" : "#cf9a64";
    context.lineWidth = prominent ? 2.5 : 1.5;
    context.beginPath();
    context.moveTo(point.x - radius, point.y - radius);
    context.lineTo(point.x + radius, point.y + radius);
    context.moveTo(point.x - radius, point.y + radius);
    context.lineTo(point.x + radius, point.y - radius);
    context.stroke();
  }

  function drawCorrection(event) {
    const prior = worldToCanvas(event.prior);
    const posterior = worldToCanvas(event.posterior);
    const measurement = worldToCanvas(event.measurement);

    context.strokeStyle = "#b76518";
    context.lineWidth = 1.5;
    context.setLineDash([3, 4]);
    context.beginPath();
    context.moveTo(prior.x, prior.y);
    context.lineTo(measurement.x, measurement.y);
    context.stroke();

    context.strokeStyle = "#286c8f";
    context.lineWidth = 3;
    context.setLineDash([]);
    context.beginPath();
    context.moveTo(prior.x, prior.y);
    context.lineTo(posterior.x, posterior.y);
    context.stroke();

    drawRobot(event.prior, "#748790", false, 0.7);
    drawMeasurement(event.measurement, true);
  }

  function draw() {
    drawGrid();
    drawTrail(truthTrail, "#176b4d", false);
    drawTrail(estimateTrail, "#286c8f", true);
    correctionEvents.forEach((event, index) => {
      drawMeasurement(event.measurement, index === correctionEvents.length - 1);
    });
    if (lastCorrection) drawCorrection(lastCorrection);
    drawRobot(truth, "#176b4d", true);
    drawRobot(estimate, "#286c8f", false);
  }

  function randomUniform() {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return (randomState + 1) / 4294967297;
  }

  function randomNormal() {
    const first = randomUniform();
    const second = randomUniform();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  }

  function correctionWeight() {
    return Number(weightInput.value);
  }

  function formatPose(pose) {
    return `(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${(pose.heading * 180 / Math.PI).toFixed(0)}°)`;
  }

  function updateReadout() {
    const error = Odometry.poseError(truth, estimate);
    document.querySelector("[data-correction-weight-output]").textContent =
      correctionWeight().toFixed(2);
    document.querySelector("[data-correction-truth]").textContent = formatPose(truth);
    document.querySelector("[data-correction-estimate]").textContent = formatPose(estimate);
    document.querySelector("[data-correction-position-error]").textContent =
      `${error.position.toFixed(3)} m`;
    document.querySelector("[data-correction-heading-error]").textContent =
      `${(error.heading * 180 / Math.PI).toFixed(1)}°`;
    document.querySelector("[data-correction-count]").textContent = String(correctionCount);
    document.querySelector("[data-correction-shift]").textContent = lastCorrection
      ? `${Math.hypot(
        lastCorrection.posterior.x - lastCorrection.prior.x,
        lastCorrection.posterior.y - lastCorrection.prior.y
      ).toFixed(3)} m`
      : "—";
    document.querySelector("[data-measurement-scenario]").textContent = scenario.label;
  }

  function render() {
    draw();
    updateReadout();
  }

  function reset(message = "Choose a measurement scenario, then run the figure eight.") {
    truth = { ...initialPose };
    estimate = { ...initialPose };
    truthTrail = [{ x: truth.x, y: truth.y }];
    estimateTrail = [{ x: estimate.x, y: estimate.y }];
    correctionEvents = [];
    correctionCount = 0;
    lastCorrection = null;
    running = false;
    segmentIndex = 0;
    segmentElapsed = 0;
    correctionElapsed = 0;
    previousTime = 0;
    trailElapsed = 0;
    resetCount += 1;
    randomState = (0x6eed1234 + resetCount * 977) >>> 0;
    status.textContent = message;
    render();
  }

  function selectScenario(nextScenario) {
    scenario = nextScenario;
    reset(`${scenario.label} selected. Run the figure eight.`);
  }

  function applyExternalCorrection() {
    const measurement = PoseCorrection.measurePose(
      truth,
      scenario.positionNoise,
      scenario.headingNoise,
      { x: randomNormal(), y: randomNormal(), heading: randomNormal() }
    );
    const prior = { ...estimate };
    estimate = PoseCorrection.correctPose(prior, measurement, correctionWeight());
    lastCorrection = { prior, measurement, posterior: { ...estimate } };
    correctionEvents.push(lastCorrection);
    correctionCount += 1;
    if (correctionEvents.length > 12) correctionEvents.shift();
  }

  function advance(command, stepSize) {
    const actual = Odometry.wheelTravel(command, stepSize, trackWidth);
    const measuredLeft = Odometry.measureTravel(actual.left, 0, 0.002, randomNormal());
    const measuredRight = Odometry.measureTravel(actual.right, 0.04, 0.002, randomNormal());

    truth = Odometry.updatePose(truth, actual.left, actual.right, trackWidth);
    estimate = Odometry.updatePose(estimate, measuredLeft, measuredRight, trackWidth);
    correctionElapsed += stepSize;

    if (correctionElapsed >= scenario.interval) {
      applyExternalCorrection();
      correctionElapsed -= scenario.interval;
    }
  }

  function animate(time) {
    const stepSize = Math.min(((time - previousTime) / 1000 || 0) * 2.5, 0.08);
    previousTime = time;

    if (running) {
      const command = route[segmentIndex];
      advance(command, stepSize);
      segmentElapsed += stepSize;
      trailElapsed += stepSize;

      if (trailElapsed >= 0.08) {
        truthTrail.push({ x: truth.x, y: truth.y });
        estimateTrail.push({ x: estimate.x, y: estimate.y });
        trailElapsed = 0;
      }

      if (segmentElapsed >= command.duration) {
        segmentIndex += 1;
        segmentElapsed = 0;
        if (segmentIndex >= route.length) {
          running = false;
          truthTrail.push({ x: truth.x, y: truth.y });
          estimateTrail.push({ x: estimate.x, y: estimate.y });
          status.textContent = "Route complete. Compare drift, measurement noise, and corrections.";
        }
      }
    }

    render();
    requestAnimationFrame(animate);
  }

  weightInput.addEventListener("input", updateReadout);
  document.querySelector("[data-scenario-precise]").addEventListener("click", () => {
    selectScenario(scenarios.frequentPrecise);
  });
  document.querySelector("[data-scenario-noisy]").addEventListener("click", () => {
    selectScenario(scenarios.frequentNoisy);
  });
  document.querySelector("[data-scenario-rare]").addEventListener("click", () => {
    selectScenario(scenarios.rarePrecise);
  });
  document.querySelector("[data-correction-run]").addEventListener("click", () => {
    reset("Running the figure eight. Watch each correction event.");
    running = true;
  });
  document.querySelector("[data-correction-pause]").addEventListener("click", () => {
    running = false;
    status.textContent = "Simulation paused.";
  });
  document.querySelector("[data-correction-reset]").addEventListener("click", () => reset());

  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
  reset();
  requestAnimationFrame(animate);
})();
