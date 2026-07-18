(function initializeFeedbackSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-simulator-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const gainInput = document.querySelector("[data-gain]");
  const targetInput = document.querySelector("[data-target]");
  const runButton = document.querySelector("[data-run]");
  const resetButton = document.querySelector("[data-reset]");
  const disturbButton = document.querySelector("[data-disturb]");
  const gainOutput = document.querySelector("[data-gain-output]");
  const positionOutput = document.querySelector("[data-position-output]");
  const errorOutput = document.querySelector("[data-error-output]");
  const commandOutput = document.querySelector("[data-command-output]");
  const status = document.querySelector("[data-status]");

  const initial = { position: 0.14, target: 0.78, gain: 1.0 };
  const model = { ...initial, command: 0, running: false, lastTime: 0 };
  const maxSpeed = 0.52;

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function toCanvasX(normalizedPosition) {
    const margin = 36;
    return margin + normalizedPosition * (canvas.clientWidth - margin * 2);
  }

  function draw() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const trackY = height * 0.62;
    const robotX = toCanvasX(model.position);
    const targetX = toCanvasX(model.target);

    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#aebbb2";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(34, trackY);
    context.lineTo(width - 34, trackY);
    context.stroke();

    context.strokeStyle = "#b76518";
    context.setLineDash([6, 6]);
    context.beginPath();
    context.moveTo(targetX, 30);
    context.lineTo(targetX, trackY + 42);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#8f4e13";
    context.font = "600 14px system-ui";
    context.textAlign = "center";
    context.fillText("цель r", targetX, 22);

    context.fillStyle = "#176b4d";
    context.beginPath();
    context.roundRect(robotX - 27, trackY - 36, 54, 34, 9);
    context.fill();
    context.fillStyle = "#17211b";
    context.beginPath();
    context.arc(robotX - 17, trackY + 2, 8, 0, Math.PI * 2);
    context.arc(robotX + 17, trackY + 2, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#176b4d";
    context.font = "600 14px system-ui";
    context.fillText("позиция x", robotX, trackY + 42);
  }

  function updateReadout() {
    const error = model.target - model.position;
    gainOutput.textContent = model.gain.toFixed(1);
    positionOutput.textContent = model.position.toFixed(3);
    errorOutput.textContent = error.toFixed(3);
    commandOutput.textContent = model.command.toFixed(3);
  }

  function render() {
    draw();
    updateReadout();
  }

  function animate(time) {
    const deltaTime = Math.min((time - model.lastTime) / 1000 || 0, 0.04);
    model.lastTime = time;

    if (model.running) {
      model.command = RobotControl.proportionalCommand(
        model.target,
        model.position,
        model.gain,
        maxSpeed
      );
      model.position = RobotControl.clamp(
        RobotControl.integratePosition(model.position, model.command, deltaTime),
        0,
        1
      );

      if (Math.abs(model.target - model.position) < 0.002) {
        model.position = model.target;
        model.command = 0;
        model.running = false;
        runButton.textContent = "Запустить";
        status.textContent = "Цель достигнута: ошибка практически равна нулю.";
      }
    }

    render();
    requestAnimationFrame(animate);
  }

  gainInput.addEventListener("input", () => {
    model.gain = Number(gainInput.value);
    updateReadout();
  });

  targetInput.addEventListener("input", () => {
    model.target = Number(targetInput.value);
    status.textContent = "Цель изменилась — контроллер видит новую ошибку.";
    render();
  });

  runButton.addEventListener("click", () => {
    model.running = !model.running;
    model.lastTime = performance.now();
    runButton.textContent = model.running ? "Пауза" : "Продолжить";
    status.textContent = model.running
      ? "Контур замкнут: команда пересчитывается на каждом шаге."
      : "Симуляция приостановлена.";
  });

  resetButton.addEventListener("click", () => {
    Object.assign(model, initial, { command: 0, running: false, lastTime: 0 });
    gainInput.value = String(initial.gain);
    targetInput.value = String(initial.target);
    runButton.textContent = "Запустить";
    status.textContent = "Исходное состояние восстановлено.";
    render();
  });

  disturbButton.addEventListener("click", () => {
    model.position = RobotControl.clamp(model.position - 0.22, 0, 1);
    status.textContent = model.running
      ? "Возмущение изменило позицию; наблюдай, как контур исправляет ошибку."
      : "Возмущение изменило позицию. Запусти контур, чтобы робот восстановился.";
    render();
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    draw();
  });

  resizeCanvas();
  render();
  requestAnimationFrame(animate);
})();
