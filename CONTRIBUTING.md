# Contributing — Breaking Barriers Team 10

We use a simple branch-and-pull-request workflow so the team can work in
parallel without stepping on each other. `main` is always kept in a working
state; nobody commits to it directly.

## The workflow

1. **Sync `main` before you start.**
   ```bash
   git checkout main
   git pull --rebase origin main
   ```

2. **Create a branch for your work.** Use the naming convention
   `<type>/<your-name>-<short-description>`:
   ```bash
   git checkout -b feature/naren-lesson-viewer
   ```
   Branch types:
   - `feature/` — new functionality
   - `fix/` — bug fixes
   - `chore/` — docs, config, tooling, cleanup

3. **Commit your work** in small, focused commits with clear messages:
   ```bash
   git add <files>
   git commit -m "Add lesson viewer layout"
   ```

4. **Push your branch** and set the upstream:
   ```bash
   git push -u origin feature/naren-lesson-viewer
   ```

5. **Open a pull request** into `main`:
   ```bash
   gh pr create --fill
   ```
   Fill in the summary and testing notes from the PR template.

6. **Get one review, then merge.** At least one teammate approves. Prefer
   "Squash and merge" to keep history tidy.

7. **Delete the branch** after merge (GitHub offers a button, or
   `git push origin --delete <branch>`).

## Keeping your branch up to date

If `main` moves ahead while you work, rebase onto it:
```bash
git fetch origin
git rebase origin/main
```
Resolve any conflicts, then continue with `git rebase --continue`.

## Tips for a smooth hackathon

- Keep branches short-lived — merge small changes often.
- Pull `main` frequently so merges stay painless.
- If two people need the same file, coordinate in chat first.
- Don't force-push to shared branches (your own feature branch is fine).
