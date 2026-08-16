(function initializeEkfLocalizationSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-ekf-localization-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const degrees = Math.PI / 180;
  const cameraInterval = 4;
  const maximumSteps = 24;
  const initialPose = { x: 2.2, y: 1, heading: 0.2 };
  const initialCovariance = [
    [0.0004, 0, 0],
    [0, 0.0004, 0],
    [0, 0, (3 * degrees) ** 2],
  ];
  const processCovariance = [
    [0.0025, 0, 0],
    [0, 0.0025, 0],
    [0, 0, (2 * degrees) ** 2],
  ];
  const scenarios = {
    precise: { label: "Precise camera", positionSigma: 0.12, headingSigma: 6 * degrees },
    noisy: { label: "Noisy camera", positionSigma: 0.45, headingSigma: 20 * degrees },
    off: { label: "Camera disabled", positionSigma: null, headingSigma: null },
  };
  const status = document.querySelector("[data-ekf-localization-status]");

  let scenario = scenarios.precise;
  let truth;
  let deadReckoning;
  let estimate;
  let truthTrail;
  let deadReckoningTrail;
  let estimateTrail;
  let measurements;
  let stepCount;
  let randomState;
  let currentEvent;
  let lastCorrection;

  function cloneMatrix(matrix) {
    return matrix.map((row) => [...row]);
  }

  function randomUniform() {
    randomState = (1664525 * randomState + 1013904223) >>> 0;
    return (randomState + 1) / 4294967297;
  }

  function randomNormal() {
    return Math.sqrt(-2 * Math.log(randomUniform())) *
      Math.cos(2 * Math.PI * randomUniform());
  }

  function movePose(pose, control) {
    const midpointHeading = pose.heading + control.headingChange / 2;
    return {
      x: pose.x + control.distance * Math.cos(midpointHeading),
      y: pose.y + control.distance * Math.sin(midpointHeading),
      heading: Odometry.normalizeAngle(pose.heading + control.headingChange),
    };
  }

  function actualControl() {
    return { distance: 0.5, headingChange: 15 * degrees };
  }

  function measuredControl() {
    const actual = actualControl();
    return {
      distance: actual.distance * 1.03,
      headingChange: actual.headingChange * 0.92,
    };
  }

  function measurementCovariance() {
    return [
      [scenario.positionSigma ** 2, 0, 0],
      [0, scenario.positionSigma ** 2, 0],
      [0, 0, scenario.headingSigma ** 2],
    ];
  }

  function measureTruth() {
    return {
      x: truth.x + scenario.positionSigma * randomNormal(),
      y: truth.y + scenario.positionSigma * randomNormal(),
      heading: Odometry.normalizeAngle(
        truth.heading + scenario.headingSigma * randomNormal()
      ),
    };
  }

  function positionError(pose) {
    return Math.hypot(pose.x - truth.x, pose.y - truth.y);
  }

  function formatPose(pose) {
    return `(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${(pose.heading / degrees).toFixed(0)}°)`;
  }

  function formatEllipse(covariance) {
    const ellipse = EkfPoseLocalization.positionEllipse(covariance, 2);
    return `${ellipse.major.toFixed(2)} × ${ellipse.minor.toFixed(2)} m`;
  }

  function reset(message = "Advance to the first camera update and inspect the ellipse before and after correction.") {
    truth = { ...initialPose };
    deadReckoning = { ...initialPose };
    estimate = { mean: { ...initialPose }, covariance: cloneMatrix(initialCovariance) };
    truthTrail = [{ ...truth }];
    deadReckoningTrail = [{ ...deadReckoning }];
    estimateTrail = [{ ...estimate.mean }];
    measurements = [];
    stepCount = 0;
    randomState = 0x7a11cafe;
    currentEvent = "Initial posterior";
    lastCorrection = null;
    status.textContent = message;
    render();
  }

  function advanceOne() {
    if (stepCount >= maximumSteps) return;

    truth = movePose(truth, actualControl());
    const odometryControl = measuredControl();
    deadReckoning = movePose(deadReckoning, odometryControl);
    const predicted = EkfPoseLocalization.predict(
      estimate,
      odometryControl,
      processCovariance
    );
    estimate = predicted;
    stepCount += 1;
    currentEvent = "Odometry prediction";

    if (stepCount % cameraInterval === 0 && scenario !== scenarios.off) {
      const measurement = measureTruth();
      const prior = predicted;
      const corrected = EkfPoseLocalization.correctPose(
        predicted,
        measurement,
        measurementCovariance()
      );
      lastCorrection = {
        measurement,
        prior,
        posterior: corrected,
        priorEllipse: EkfPoseLocalization.positionEllipse(prior.covariance, 2),
        posteriorEllipse: EkfPoseLocalization.positionEllipse(corrected.covariance, 2),
      };
      measurements.push(measurement);
      estimate = corrected;
      currentEvent = "Camera correction";
      status.textContent = "Camera arrived: compare the prior and posterior ellipse axes and gain.";
    } else if (stepCount % cameraInterval === 0) {
      status.textContent = "No camera correction: odometry drift and the covariance ellipse continue to grow.";
    } else {
      status.textContent = "Prediction only: the pose moved and process uncertainty was added.";
    }

    truthTrail.push({ ...truth });
    deadReckoningTrail.push({ ...deadReckoning });
    estimateTrail.push({ ...estimate.mean });
    render();
  }

  function advanceToCamera() {
    const target = Math.min(
      maximumSteps,
      stepCount + (cameraInterval - stepCount % cameraInterval)
    );
    while (stepCount < target) advanceOne();
  }

  function runSteps(count) {
    const target = Math.min(maximumSteps, stepCount + count);
    while (stepCount < target) advanceOne();
  }

  function canvasTransform() {
    const bounds = { minimumX: -0.5, maximumX: 4.5, minimumY: 0.2, maximumY: 5.2 };
    const padding = 22;
    const scale = Math.min(
      (canvas.clientWidth - 2 * padding) / (bounds.maximumX - bounds.minimumX),
      (canvas.clientHeight - 2 * padding) / (bounds.maximumY - bounds.minimumY)
    );
    const usedWidth = (bounds.maximumX - bounds.minimumX) * scale;
    const usedHeight = (bounds.maximumY - bounds.minimumY) * scale;
    const offsetX = (canvas.clientWidth - usedWidth) / 2;
    const offsetY = (canvas.clientHeight - usedHeight) / 2;

    return {
      scale,
      point: (pose) => ({
        x: offsetX + (pose.x - bounds.minimumX) * scale,
        y: canvas.clientHeight - offsetY - (pose.y - bounds.minimumY) * scale,
      }),
      bounds,
    };
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawGrid(transform) {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.strokeStyle = "#d8ded5";
    context.lineWidth = 1;
    context.setLineDash([]);
    for (let x = 0; x <= 4; x += 1) {
      const start = transform.point({ x, y: transform.bounds.minimumY });
      const end = transform.point({ x, y: transform.bounds.maximumY });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
    for (let y = 1; y <= 5; y += 1) {
      const start = transform.point({ x: transform.bounds.minimumX, y });
      const end = transform.point({ x: transform.bounds.maximumX, y });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  function drawTags(transform) {
    [{ x: 0, y: 0.7 }, { x: 4, y: 0.7 }, { x: 0, y: 4.7 }, { x: 4, y: 4.7 }]
      .forEach((tag, index) => {
        const point = transform.point(tag);
        context.fillStyle = "#fffdf7";
        context.strokeStyle = "#b76518";
        context.lineWidth = 2;
        context.fillRect(point.x - 8, point.y - 8, 16, 16);
        context.strokeRect(point.x - 8, point.y - 8, 16, 16);
        context.fillStyle = "#b76518";
        context.font = "10px ui-sans-serif";
        context.textAlign = "center";
        context.fillText(String(index + 1), point.x, point.y + 3.5);
      });
  }

  function drawTrail(transform, trail, color, dash) {
    if (trail.length < 2) return;
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.setLineDash(dash);
    context.beginPath();
    trail.forEach((pose, index) => {
      const point = transform.point(pose);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.stroke();
    context.setLineDash([]);
  }

  function drawRobot(transform, pose, color, filled) {
    const point = transform.point(pose);
    context.save();
    context.translate(point.x, point.y);
    context.rotate(-pose.heading);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(15, 0);
    context.lineTo(-9, -8);
    context.lineTo(-9, 8);
    context.closePath();
    if (filled) context.fill();
    else context.stroke();
    context.restore();
  }

  function drawMeasurement(transform, measurement) {
    const point = transform.point(measurement);
    context.strokeStyle = "#b76518";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(point.x - 6, point.y - 6);
    context.lineTo(point.x + 6, point.y + 6);
    context.moveTo(point.x - 6, point.y + 6);
    context.lineTo(point.x + 6, point.y - 6);
    context.stroke();
  }

  function drawEllipse(transform, pose, covariance, color, fill) {
    const ellipse = EkfPoseLocalization.positionEllipse(covariance, 2);
    const point = transform.point(pose);
    context.save();
    context.translate(point.x, point.y);
    context.rotate(-ellipse.angle);
    context.beginPath();
    context.ellipse(
      0,
      0,
      Math.max(2, ellipse.major * transform.scale),
      Math.max(2, ellipse.minor * transform.scale),
      0,
      0,
      2 * Math.PI
    );
    context.fillStyle = fill;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.fill();
    context.stroke();
    context.restore();
  }

  function draw() {
    const transform = canvasTransform();
    drawGrid(transform);
    drawTags(transform);
    drawTrail(transform, truthTrail, "#176b4d", []);
    drawTrail(transform, deadReckoningTrail, "#748790", [3, 5]);
    drawTrail(transform, estimateTrail, "#286c8f", [9, 5]);
    measurements.forEach((measurement) => drawMeasurement(transform, measurement));

    if (lastCorrection && currentEvent === "Camera correction") {
      drawEllipse(
        transform,
        lastCorrection.prior.mean,
        lastCorrection.prior.covariance,
        "#748790",
        "rgb(116 135 144 / 8%)"
      );
    }
    drawEllipse(transform, estimate.mean, estimate.covariance, "#286c8f", "rgb(40 108 143 / 12%)");
    drawRobot(transform, truth, "#176b4d", true);
    drawRobot(transform, deadReckoning, "#748790", false);
    drawRobot(transform, estimate.mean, "#286c8f", false);
  }

  function updateReadout() {
    const currentEllipse = EkfPoseLocalization.positionEllipse(estimate.covariance, 2);
    document.querySelector("[data-ekf-step]").textContent = `${stepCount} · ${currentEvent}`;
    document.querySelector("[data-ekf-truth]").textContent = formatPose(truth);
    document.querySelector("[data-ekf-estimate]").textContent = formatPose(estimate.mean);
    document.querySelector("[data-ekf-errors]").textContent =
      `${positionError(deadReckoning).toFixed(3)} → ${positionError(estimate.mean).toFixed(3)} m`;
    document.querySelector("[data-ekf-ellipse]").textContent = formatEllipse(estimate.covariance);
    document.querySelector("[data-ekf-heading-sigma]").textContent =
      `${(Math.sqrt(estimate.covariance[2][2]) / degrees).toFixed(1)}°`;
    document.querySelector("[data-ekf-axis-sigmas]").textContent =
      `(${Math.sqrt(estimate.covariance[0][0]).toFixed(3)}, ${Math.sqrt(estimate.covariance[1][1]).toFixed(3)}) m`;
    document.querySelector("[data-ekf-camera-scenario]").textContent = scenario.label;
    document.querySelector("[data-ekf-last-shrink]").textContent = lastCorrection
      ? `${lastCorrection.priorEllipse.major.toFixed(2)} → ${lastCorrection.posteriorEllipse.major.toFixed(2)} m`
      : "—";
    document.querySelector("[data-ekf-last-gain]").textContent = lastCorrection
      ? `(${lastCorrection.posterior.gain[0][0].toFixed(2)}, ${lastCorrection.posterior.gain[1][1].toFixed(2)}, ${lastCorrection.posterior.gain[2][2].toFixed(2)})`
      : "—";
    document.querySelector("[data-ekf-pxx]").textContent = estimate.covariance[0][0].toFixed(4);
    document.querySelector("[data-ekf-pxy-a]").textContent = estimate.covariance[0][1].toFixed(4);
    document.querySelector("[data-ekf-pxt-a]").textContent = estimate.covariance[0][2].toFixed(4);
    document.querySelector("[data-ekf-pxy-b]").textContent = estimate.covariance[1][0].toFixed(4);
    document.querySelector("[data-ekf-pyy]").textContent = estimate.covariance[1][1].toFixed(4);
    document.querySelector("[data-ekf-pyt-a]").textContent = estimate.covariance[1][2].toFixed(4);
    document.querySelector("[data-ekf-pxt-b]").textContent = estimate.covariance[2][0].toFixed(4);
    document.querySelector("[data-ekf-pyt-b]").textContent = estimate.covariance[2][1].toFixed(4);
    document.querySelector("[data-ekf-ptt]").textContent = estimate.covariance[2][2].toFixed(4);
    document.querySelector("[data-ekf-current-major]").textContent = currentEllipse.major.toFixed(2);
  }

  function render() {
    draw();
    updateReadout();
  }

  function selectScenario(nextScenario) {
    scenario = nextScenario;
    reset(`${scenario.label} selected. Advance to the first camera event.`);
  }

  document.querySelector("[data-ekf-precise]").addEventListener("click", () => {
    selectScenario(scenarios.precise);
  });
  document.querySelector("[data-ekf-noisy]").addEventListener("click", () => {
    selectScenario(scenarios.noisy);
  });
  document.querySelector("[data-ekf-off]").addEventListener("click", () => {
    selectScenario(scenarios.off);
  });
  document.querySelector("[data-ekf-step-button]").addEventListener("click", advanceOne);
  document.querySelector("[data-ekf-camera-button]").addEventListener("click", advanceToCamera);
  document.querySelector("[data-ekf-run-button]").addEventListener("click", () => runSteps(16));
  document.querySelector("[data-ekf-reset]").addEventListener("click", () => reset());
  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
  reset();
})();
