# Contributing to Cadentra

Cadentra uses two permanent branches:

- `main` contains stable release-ready code. Only the repository owner merges into it.
- `develop` is the integration branch for completed development work.

All changes start from an up-to-date `develop` branch and use a short-lived branch:

- `feature/<scope>` for product work
- `fix/<scope>` for bug fixes
- `chore/<scope>` for tooling, documentation, and maintenance

## Development workflow

1. Update local `develop` with `git pull --ff-only origin develop`.
2. Create one short-lived branch for one independently testable process.
3. Implement the process with targeted tests.
4. Run targeted tests, `npm run check`, relevant native builds, and `npm audit`.
5. Inspect the diff and scan changed files for credential leakage.
6. Stage only the files belonging to the process and create a Conventional Commit.
7. Push the short-lived branch and open a pull request into `develop`.
8. Wait for the required `validate` CI check, resolve review threads, then squash merge.
9. Delete the short-lived branch after merge.
10. Start the next process from the updated `develop` branch.

Do not force-push published history. Codex must not push, open a pull request, or merge
into `main` unless the repository owner gives a new direct instruction. The repository
owner promotes `develop` to `main` through a separate pull request.

Dependabot pull requests target `develop`; its generated branches are temporary and are
removed after their pull requests close or merge.

## Secrets

Never commit API keys, OAuth secrets, service-role keys, private keys, or `.env` files.
Use `.env.example` to document required variables with non-secret placeholder values.
