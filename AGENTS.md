# Workspace instructions

## Git checkpoints

- Treat every coherent, verified change as a checkpoint: a lesson, reusable component, reference document, learning record, fix, or other complete unit of work.
- After verifying the change, stage only its related files and create a local Git commit automatically, without asking the user for confirmation.
- Do not commit partial, broken, or purely intermediate states.
- Keep commit messages short and descriptive; message wording is not important.
- If commit signing would require interactive credentials, create the local checkpoint with `--no-gpg-sign`.
- Preserve unrelated user changes and leave them unstaged.
- Do not push commits or create remote branches unless the user explicitly asks.
