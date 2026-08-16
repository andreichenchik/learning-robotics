(function initializeQuizzes() {
  "use strict";

  document.querySelectorAll("[data-quiz]").forEach((quiz) => {
    quiz.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = quiz.querySelector("input[type='radio']:checked");
      const result = quiz.querySelector("[data-quiz-result]");

      if (!selected) {
        result.textContent = quiz.dataset.empty || "Снача выбери ответ.";
        result.className = "quiz-result incorrect";
        return;
      }

      const correct = selected.value === quiz.dataset.correct;
      result.textContent = correct ? quiz.dataset.success : quiz.dataset.retry;
      result.className = `quiz-result ${correct ? "correct" : "incorrect"}`;
    });
  });
})();
