(function initializeDriveSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-drive-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const linearInput = document.querySelector("[data-linear-velocity]");
  const angularInput = document.querySelector("[data-angular-velocity]");
  const status = document.querySelector("[data-drive-status]");
  const world = { minimumX: -3, maximumX: 3, minimumY: -2, maximumY: 2 };
  const wheel = { radius: 0.08, trackWidth: 0.32 };
  const controller = {
    moveGain: 0.9,
    turnGain: 2.4,
    maxLinearSpeed: 0.75,
    maxAngularSpeed: 1.8,
    positionTolerance: 0.05,
  };
  const initialPose = { x: -2, y: -1, heading: Math.PI / 6 };
  let pose = { ...initialPose };
  let target = { x: 1.5, y: 1 };
  let command = { linearVelocity: 0, angularVelocity: 0 };
  let mode = "paused";
  let trail = [{ x: pose.x, y: pose.y }];
  let previousTime = 0;
  let trailTimer = 0;

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

  function canvasToWorld(point) {
    return {
      x: world.minimumX + point.x / canvas.clientWidth * (world.maximumX - world.minimumX),
      y: world.minimumY +
        (canvas.clientHeight - point.y) / canvas.clientHeight * (world.maximumY - world.minimumY),
    };
  }

  function drawGrid() {
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.strokeStyle = "#d8ded5";
    context.lineWidth = 1;

    for (let x = Math.ceil(world.minimumX); x <= world.maximumX; x += 1) {
      const start = worldToCanvas({ x, y: world.minimumY });
      const end = worldToCanvas({ x, y: world.maximumY });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }

    for (let y = Math.ceil(world.minimumY); y <= world.maximumY; y += 1) {
      const start = worldToCanvas({ x: world.minimumX, y });
      const end = worldToCanvas({ x: world.maximumX, y });
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.stroke();
    }
  }

  function drawTrail() {
    if (trail.length < 2) return;
    context.strokeStyle = "#6da287";
    context.lineWidth = 2;
    context.beginPath();
    trail.forEach((point, index) => {
      const canvasPoint = worldToCanvas(point);
      if (index === 0) context.moveTo(canvasPoint.x, canvasPoint.y);
      else context.lineTo(canvasPoint.x, canvasPoint.y);
    });
    context.stroke();
  }

  function drawTarget() {
    const point = worldToCanvas(target);
    context.strokeStyle = "#b76518";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(point.x, point.y, 11, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(point.x - 16, point.y);
    context.lineTo(point.x + 16, point.y);
    context.moveTo(point.x, point.y - 16);
    context.lineTo(point.x, point.y + 16);
    context.stroke();
  }

  function drawRobot() {
    const point = worldToCanvas(pose);
    context.save();
    context.translate(point.x, point.y);
    context.rotate(-pose.heading);

    context.fillStyle = "#17211b";
    context.fillRect(-18, -19, 8, 38);
    context.fillRect(10, -19, 8, 38);

    context.fillStyle = "#176b4d";
    context.beginPath();
    context.moveTo(26, 0);
    context.lineTo(-14, -15);
    context.lineTo(-14, 15);
    context.closePath();
    context.fill();

    context.restore();
  }

  function draw() {
    drawGrid();
    drawTrail();
    drawTarget();
    drawRobot();
  }

  function updateReadout() {
    const speeds = DifferentialDrive.wheelSpeeds(command, wheel.radius, wheel.trackWidth);
    document.querySelector("[data-pose-x]").textContent = pose.x.toFixed(2);
    document.querySelector("[data-pose-y]").textContent = pose.y.toFixed(2);
    document.querySelector("[data-pose-heading]").textContent =
      `${(pose.heading * 180 / Math.PI).toFixed(0)}°`;
    document.querySelector("[data-command-v]").textContent = command.linearVelocity.toFixed(2);
    document.querySelector("[data-command-omega]").textContent = command.angularVelocity.toFixed(2);
    document.querySelector("[data-wheel-left]").textContent = speeds.left.toFixed(2);
    document.querySelector("[data-wheel-right]").textContent = speeds.right.toFixed(2);
    document.querySelector("[data-linear-output]").textContent =
      Number(linearInput.value).toFixed(2);
    document.querySelector("[data-angular-output]").textContent =
      Number(angularInput.value).toFixed(2);
  }

  function render() {
    draw();
    updateReadout();
  }

  function setManualCommand(linearVelocity, angularVelocity, message) {
    linearInput.value = String(linearVelocity);
    angularInput.value = String(angularVelocity);
    command = { linearVelocity, angularVelocity };
    mode = "manual";
    status.textContent = message;
    updateReadout();
  }

  function reset() {
    pose = { ...initialPose };
    target = { x: 1.5, y: 1 };
    command = { linearVelocity: 0, angularVelocity: 0 };
    mode = "paused";
    trail = [{ x: pose.x, y: pose.y }];
    previousTime = 0;
    trailTimer = 0;
    linearInput.value = "0.5";
    angularInput.value = "0";
    status.textContent = "Choose a motion or click the field to set a target.";
    render();
  }

  function animate(time) {
    const stepSize = Math.min((time - previousTime) / 1000 || 0, 0.04);
    previousTime = time;

    if (mode === "manual") {
      command = {
        linearVelocity: Number(linearInput.value),
        angularVelocity: Number(angularInput.value),
      };
    } else if (mode === "autopilot") {
      command = DifferentialDrive.waypointCommand(pose, target, controller);
      if (command.linearVelocity === 0 && command.angularVelocity === 0) {
        mode = "paused";
        status.textContent = "Target reached.";
      }
    }

    if (mode !== "paused") {
      pose = DifferentialDrive.stepPose(pose, command, stepSize);
      trailTimer += stepSize;
      if (trailTimer >= 0.08) {
        trail.push({ x: pose.x, y: pose.y });
        trailTimer = 0;
      }
    }

    render();
    requestAnimationFrame(animate);
  }

  linearInput.addEventListener("input", () => {
    if (mode === "manual") command.linearVelocity = Number(linearInput.value);
    updateReadout();
  });

  angularInput.addEventListener("input", () => {
    if (mode === "manual") command.angularVelocity = Number(angularInput.value);
    updateReadout();
  });

  canvas.addEventListener("click", (event) => {
    const bounds = canvas.getBoundingClientRect();
    target = canvasToWorld({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    status.textContent = "A new target is selected. Choose \"To target.\"";
    draw();
  });

  document.querySelector("[data-drive-manual]").addEventListener("click", () => {
    setManualCommand(
      Number(linearInput.value),
      Number(angularInput.value),
      "Manual mode: the command is held until paused."
    );
  });
  document.querySelector("[data-drive-straight]").addEventListener("click", () => {
    setManualCommand(0.55, 0, "Equal wheel speeds produce straight motion.");
  });
  document.querySelector("[data-drive-rotate]").addEventListener("click", () => {
    setManualCommand(0, 1.2, "The wheels rotate in opposite directions, so the robot turns in place.");
  });
  document.querySelector("[data-drive-arc]").addEventListener("click", () => {
    setManualCommand(0.5, 0.8, "Linear and angular velocity together produce an arc.");
  });
  document.querySelector("[data-drive-target]").addEventListener("click", () => {
    mode = "autopilot";
    status.textContent = "The controller turns the robot and reduces the distance to the target.";
  });
  document.querySelector("[data-drive-pause]").addEventListener("click", () => {
    mode = "paused";
    command = { linearVelocity: 0, angularVelocity: 0 };
    status.textContent = "The simulation is paused.";
    updateReadout();
  });
  document.querySelector("[data-drive-reset]").addEventListener("click", reset);

  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
  reset();
  requestAnimationFrame(animate);
})();
