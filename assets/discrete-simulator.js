(function initializeDiscreteSimulator() {
  "use strict";

  const canvas = document.querySelector("[data-discrete-canvas]");
  if (!canvas) return;

  const context = canvas.getContext("2d");
  const gainInput = document.querySelector("[data-discrete-gain]");
  const stepSizeInput = document.querySelector("[data-step-size]");
  const delayInput = document.querySelector("[data-delay-steps]");
  const tableBody = document.querySelector("[data-transition-rows]");
  const status = document.querySelector("[data-discrete-status]");
  const initialPosition = 0;
  const target = 1;
  let state = { positions: [initialPosition] };
  let samples = [];

  function configuration() {
    return {
      target,
      gain: Number(gainInput.value),
      stepSize: Number(stepSizeInput.value),
      delaySteps: Number(delayInput.value),
    };
  }

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const bounds = canvas.getBoundingClientRect();
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function drawGraph() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const margin = { left: 48, right: 22, top: 22, bottom: 35 };
    const positions = state.positions;
    const minimum = Math.min(-0.25, target, ...positions);
    const maximum = Math.max(1.25, target, ...positions);
    const range = Math.max(maximum - minimum, 0.1);
    const toX = (index) => margin.left + index * (width - margin.left - margin.right) / Math.max(positions.length - 1, 16);
    const toY = (value) => margin.top + (maximum - value) * (height - margin.top - margin.bottom) / range;

    context.clearRect(0, 0, width, height);
    context.strokeStyle = "#ccd5ce";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(margin.left, toY(0));
    context.lineTo(width - margin.right, toY(0));
    context.stroke();

    context.strokeStyle = "#b76518";
    context.setLineDash([6, 6]);
    context.beginPath();
    context.moveTo(margin.left, toY(target));
    context.lineTo(width - margin.right, toY(target));
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#8f4e13";
    context.font = "600 13px system-ui";
    context.fillText("цель r = 1", margin.left + 5, toY(target) - 7);

    context.strokeStyle = "#176b4d";
    context.fillStyle = "#176b4d";
    context.lineWidth = 3;
    context.beginPath();
    positions.forEach((position, index) => {
      const x = toX(index);
      const y = toY(position);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    positions.forEach((position, index) => {
      context.beginPath();
      context.arc(toX(index), toY(position), 3.5, 0, Math.PI * 2);
      context.fill();
    });

    context.fillStyle = "#5f6e64";
    context.font = "12px system-ui";
    context.textAlign = "center";
    for (let index = 0; index < Math.max(positions.length, 17); index += 4) {
      context.fillText(String(index), toX(index), height - 12);
    }
    context.textAlign = "left";
    context.fillText("шаг k", width - 66, height - 12);
  }

  function format(value) {
    if (Math.abs(value) >= 100) return value.toExponential(2);
    return value.toFixed(3);
  }

  function renderTable() {
    tableBody.replaceChildren();
    samples.slice(-7).forEach((sample) => {
      const row = document.createElement("tr");
      [
        sample.step,
        format(sample.position),
        format(sample.measurement),
        format(sample.error),
        format(sample.command),
        format(sample.nextPosition),
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });
      tableBody.appendChild(row);
    });
  }

  function describeBehavior() {
    const config = configuration();
    const position = state.positions[state.positions.length - 1];
    const measurement = DiscreteControl.delayedMeasurement(state.positions, config.delaySteps);
    const error = target - measurement;
    const command = config.gain * error;
    const product = config.gain * config.stepSize;

    document.querySelector("[data-discrete-gain-output]").textContent = config.gain.toFixed(1);
    document.querySelector("[data-step-size-output]").textContent = config.stepSize.toFixed(2);
    document.querySelector("[data-delay-output]").textContent = String(config.delaySteps);
    document.querySelector("[data-product-output]").textContent = product.toFixed(2);
    document.querySelector("[data-state-output]").textContent = format(position);
    document.querySelector("[data-measurement-output]").textContent = format(measurement);
    document.querySelector("[data-discrete-error-output]").textContent = format(error);
    document.querySelector("[data-discrete-command-output]").textContent = format(command);

    if (Math.abs(position) > 20) {
      status.textContent = "Амплитуда растёт: дискретный контур расходится.";
    } else if (Math.abs(target - position) < 0.01 && config.delaySteps === 0) {
      status.textContent = "Состояние сошлось к цели.";
    } else if (config.delaySteps > 0) {
      status.textContent = "Контроллер действует по прошлому измерению y, а не по текущему x.";
    } else if (product >= 2) {
      status.textContent = "KₚΔt ≥ 2: каждое исправление увеличивает следующую ошибку.";
    } else if (product > 1) {
      status.textContent = "1 < KₚΔt < 2: состояние пересекает цель, но ошибка уменьшается.";
    } else {
      status.textContent = "0 < KₚΔt ≤ 1: состояние приближается к цели без перелёта.";
    }
  }

  function render() {
    drawGraph();
    renderTable();
    describeBehavior();
  }

  function reset() {
    state = { positions: [initialPosition] };
    samples = [];
    render();
  }

  function advance(stepCount) {
    for (let index = 0; index < stepCount; index += 1) {
      const transition = DiscreteControl.takeStep(state, configuration());
      state = transition.state;
      samples.push(transition.sample);
      if (Math.abs(transition.sample.nextPosition) > 1_000) break;
    }
    render();
  }

  [gainInput, stepSizeInput, delayInput].forEach((input) => {
    input.addEventListener("input", reset);
  });

  document.querySelector("[data-one-step]").addEventListener("click", () => advance(1));
  document.querySelector("[data-twelve-steps]").addEventListener("click", () => advance(12));
  document.querySelector("[data-discrete-reset]").addEventListener("click", reset);

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      gainInput.value = button.dataset.gain;
      stepSizeInput.value = button.dataset.stepSize;
      delayInput.value = button.dataset.delay;
      reset();
      advance(16);
    });
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    drawGraph();
  });

  resizeCanvas();
  render();
})();
