---
name: git-workflow
description: Branching, commit, and PR/merge conventions for this repo. Read before starting any change and before opening a PR.
---

- `main` is production deployable. `staging` is pre-release. `development` is the active integration branch. Never commit directly to `main` or `staging`.
- Everything is worked on from feature branches created off `development`.
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>` (e.g. `feat/project-setup`).
- All work is merged into `development` via Pull Requests (PRs) after review/verification.
- One logical change per branch/PR — don't bundle unrelated fixes into a feature branch.
- Commit messages: short imperative summary line (e.g. "Add room invite endpoint").
- Before opening a PR: run the linter/build locally to ensure everything is green.
- Merge strategy: PR merge into `development`. Delete feature branches after merging.

