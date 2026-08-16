(function initializeOdometrySimulator() {
  "use strict";

  const canvas = document.querySelector("[data-odometry-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const leftBiasInput = document.querySelector("[data-left-bias]");
  const rightBiasInput = document.querySelector("[data-right-bias]");
  const noiseInput = document.querySelector("[data-encoder-noise]");
  const status = document.querySelector("[data-odometry-status]");
  const world = { minimumX: -2.5, maximumX: 2.5, minimumY: -2.2, maximumY: 2.2 };
  const trackWidth = 0.32;
  const initialPose = { x: -0.9, y: 0, heading: 0 };
  const routes = {
    straight: [{ linearVelocity: 0.65, angularVelocity: 0, duration: 4.2 }],
    circle: [{ linearVelocity: 0.6, angularVelocity: 0.7, duration: 2 * Math.PI / 0.7 }],
    figureEight: [
      { linearVelocity: 0.6, angularVelocity: 0.7, duration: 2 * Math.PI / 0.7 },
      { linearVelocity: 0.6, angularVelocity: -0.7, duration: 2 * Math.PI / 0.7 },
    ],
  };

  let truth = { ...initialPose };
  let estimate = { ...initialPose };
  let truthTrail = [{ x: truth.x, y: truth.y }];
  let estimateTrail = [{ x: estimate.x, y: estimate.y }];
  let measuredDistance = { left: 0, right: 0 };
  let activeRoute = null;
  let segmentIndex = 0;
  let segmentElapsed = 0;
  let previousTime = 0;
  let trailTimer = 0;
  let randomState = 0x5eed1234;
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

  function drawRobot(pose, color, outline) {
    const point = worldToCanvas(pose);
    context.save();
    context.translate(point.x, point.y);
    context.rotate(-pose.heading);
    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(22, 0);
    context.lineTo(-13, -13);
    context.lineTo(-13, 13);
    context.closePath();
    if (outline) context.stroke();
    else context.fill();
    context.restore();
  }

  function draw() {
    drawGrid();
    drawTrail(truthTrail, "#176b4d", false);
    drawTrail(estimateTrail, "#286c8f", true);
    drawRobot(truth, "#176b4d", false);
    drawRobot(estimate, "#286c8f", true);
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

  function sensorSettings() {
    return {
      leftBias: Number(leftBiasInput.value) / 100,
      rightBias: Number(rightBiasInput.value) / 100,
      noise: Number(noiseInput.value) / 100,
    };
  }

  function updateReadout() {
    const error = Odometry.poseError(truth, estimate);
    document.querySelector("[data-truth-pose]").textContent = formatPose(truth);
    document.querySelector("[data-estimated-pose]").textContent = formatPose(estimate);
    document.querySelector("[data-position-error]").textContent = `${error.position.toFixed(3)} m`;
    document.querySelector("[data-heading-error]").textContent =
      `${(error.heading * 180 / Math.PI).toFixed(1)}°`;
    document.querySelector("[data-left-distance]").textContent = `${measuredDistance.left.toFixed(2)} m`;
    document.querySelector("[data-right-distance]").textContent = `${measuredDistance.right.toFixed(2)} m`;
    document.querySelector("[data-left-bias-output]").textContent = `${Number(leftBiasInput.value).toFixed(1)}%`;
    document.querySelector("[data-right-bias-output]").textContent = `${Number(rightBiasInput.value).toFixed(1)}%`;
    document.querySelector("[data-noise-output]").textContent = `${Number(noiseInput.value).toFixed(1)} cm/√m`;
  }

  function formatPose(pose) {
    const degrees = pose.heading * 180 / Math.PI;
    return `(${pose.x.toFixed(2)}, ${pose.y.toFixed(2)}, ${degrees.toFixed(0)}°)`;
  }

  function render() {
    draw();
    updateReadout();
  }

  function reset(message = "Choose a sensor preset and a route.") {
    truth = { ...initialPose };
    estimate = { ...initialPose };
    truthTrail = [{ x: truth.x, y: truth.y }];
    estimateTrail = [{ x: estimate.x, y: estimate.y }];
    measuredDistance = { left: 0, right: 0 };
    activeRoute = null;
    segmentIndex = 0;
    segmentElapsed = 0;
    previousTime = 0;
    trailTimer = 0;
    resetCount += 1;
    randomState = (0x5eed1234 + resetCount * 977) >>> 0;
    status.textContent = message;
    render();
  }

  function loadPreset(leftBias, rightBias, noise, message) {
    leftBiasInput.value = String(leftBias);
    rightBiasInput.value = String(rightBias);
    noiseInput.value = String(noise);
    reset(message);
  }

  function startRoute(route, message) {
    reset(message);
    activeRoute = route;
  }

  function advance(command, stepSize) {
    const actual = Odometry.wheelTravel(command, stepSize, trackWidth);
    const settings = sensorSettings();
    const measuredLeft = Odometry.measureTravel(
      actual.left,
      settings.leftBias,
      settings.noise,
      randomNormal()
    );
    const measuredRight = Odometry.measureTravel(
      actual.right,
      settings.rightBias,
      settings.noise,
      randomNormal()
    );

    truth = Odometry.updatePose(truth, actual.left, actual.right, trackWidth);
    estimate = Odometry.updatePose(estimate, measuredLeft, measuredRight, trackWidth);
    measuredDistance.left += measuredLeft;
    measuredDistance.right += measuredRight;
  }

  function animate(time) {
    const stepSize = Math.min(((time - previousTime) / 1000 || 0) * 2.5, 0.08);
    previousTime = time;

    if (activeRoute) {
      const command = activeRoute[segmentIndex];
      advance(command, stepSize);
      segmentElapsed += stepSize;
      trailTimer += stepSize;

      if (trailTimer >= 0.08) {
        truthTrail.push({ x: truth.x, y: truth.y });
        estimateTrail.push({ x: estimate.x, y: estimate.y });
        trailTimer = 0;
      }

      if (segmentElapsed >= command.duration) {
        segmentIndex += 1;
        segmentElapsed = 0;
        if (segmentIndex >= activeRoute.length) {
          activeRoute = null;
          truthTrail.push({ x: truth.x, y: truth.y });
          estimateTrail.push({ x: estimate.x, y: estimate.y });
          status.textContent = "Route complete. Compare the final poses and errors.";
        }
      }
    }

    render();
    requestAnimationFrame(animate);
  }

  [leftBiasInput, rightBiasInput, noiseInput].forEach((input) => {
    input.addEventListener("input", updateReadout);
  });

  document.querySelector("[data-sensors-ideal]").addEventListener("click", () => {
    loadPreset(0, 0, 0, "Ideal encoders loaded. Choose a route.");
  });
  document.querySelector("[data-sensors-bias]").addEventListener("click", () => {
    loadPreset(0, 5, 0, "The right encoder now over-reports travel by 5%.");
  });
  document.querySelector("[data-sensors-noise]").addEventListener("click", () => {
    loadPreset(0, 0, 2, "Both encoders now include zero-mean random noise.");
  });
  document.querySelector("[data-route-straight]").addEventListener("click", () => {
    startRoute(routes.straight, "Driving a straight route.");
  });
  document.querySelector("[data-route-circle]").addEventListener("click", () => {
    startRoute(routes.circle, "Driving one circle.");
  });
  document.querySelector("[data-route-eight]").addEventListener("click", () => {
    startRoute(routes.figureEight, "Driving a figure eight.");
  });
  document.querySelector("[data-odometry-pause]").addEventListener("click", () => {
    activeRoute = null;
    status.textContent = "Simulation paused.";
  });
  document.querySelector("[data-odometry-reset]").addEventListener("click", () => reset());

  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
  reset();
  requestAnimationFrame(animate);
})();
