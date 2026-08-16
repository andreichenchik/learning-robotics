# Teaching notes

- Language: use English for all new lessons, reference material, terminology, UI copy, and teacher feedback. The learner may answer in Russian or English; evaluate the concepts independently of the response language.
- Preference: a hybrid of project-based and fundamentals-based learning.
- Explanation format: intuition → model/mathematics → code/experiment → limits of applicability.
- Lessons must produce a small, visible result and must not assume a fixed weekly schedule.
- Prior experience: mathematics and ML/DL were studied before, but the details have faded; check understanding and refresh only the prerequisites that are needed.
- Interest in a specific class of robots has not yet been established; alternate among mobile systems, manipulation, and dynamic models.
- Completed direction: the five state-estimation lessons covered uncertainty and covariance, uncertainty prediction, Kalman gain, the complete Kalman filter, and EKF robot localization.
- Feedback after lesson 0007: covariance felt too abstract. Future estimation lessons should begin with one concrete robot state and a numerical predict–measure example before introducing matrix notation or geometric interpretation.
- After the five-lesson state-estimation sequence, transition to practical tasks in which the learner writes the main code and receives requirements, tests, and feedback rather than another sequence of prepared simulators.
- Practical lesson format: keep Jupyter notebooks in `lessons/` and continue the shared lesson numbering. The learner fills cells marked `TODO`, runs immediate checks and visual experiments, saves the notebook, and receives code review. Use one uv-managed project; keep Jupyter itself ephemeral via `uv run --with jupyter jupyter lab` and lock only lesson dependencies.
- Do not ask the learner to choose technical presentation implementations such as math-rendering technology. Own those decisions and use consistent, readable, reusable visual components across lessons.
- Feedback after lesson 0008: prompts such as “compare analytic spread with the sample cloud” are too implicit. Name the exact readouts to compare, state what relationship to look for, and explain why the comparison matters.
