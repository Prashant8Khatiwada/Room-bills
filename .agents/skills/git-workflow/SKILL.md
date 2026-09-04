---
name: git-workflow
description: Branching, commit, and PR/merge conventions for this repo. Read before starting any change and before opening a PR.
---

- `main` is always deployable. Never commit directly to `main`.
- Branch naming: `feature/<short-description>`, `fix/<short-description>`, `chore/<short-description>` (e.g. `feature/room-invite-flow`).
- One logical change per branch/PR — don't bundle unrelated fixes into a feature branch.
- Commit messages: short imperative summary line (e.g. "Add room invite endpoint"), no need for a strict format beyond that.
- Before opening a PR: run the linter/build locally, make sure it's green.
- PR description should state what changed and why in 2-3 sentences — no template needed given this is a small solo/small-team project.
- Merge strategy: squash-merge into `main` so history stays one commit per feature/fix.
- Delete the branch after merging.
