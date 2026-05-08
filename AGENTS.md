# Repo Notes

- This is a single-package Vue 3 app. `pnpm-workspace.yaml` is only used for Vite+/catalog overrides; there are no workspace packages.
- Runtime entry flow is `index.html` -> `src/main.ts` -> `src/App.vue`.
- Main persisted state lives in `src/composables/useStorage.ts` and is stored in `localStorage` under `gtab_settings`.
- UI is mostly in `src/components/*`; the animated background is `src/canvas/MeteorShower.ts`.

# Commands

- Install deps with `vp install`.
- Start dev server with `vp dev`.
- Run formatting, lint, and type-aware checks with `vp check`.
- Auto-fix formatting/lint issues with `vp check --fix`.
- Build the production bundle with `vp build`.

# Validation Gotchas

- `vite.config.ts` is the main source of tool config. There is no separate ESLint/Prettier/Vitest config in this repo.
- Pre-commit runs `.vite-hooks/pre-commit` -> `vp staged`.
- `vp staged` uses the `staged` block in `vite.config.ts`, which currently runs `vp check --fix` for every staged file. Expect commits to rewrite staged files.
- `vp test run` exits with code 1 when no tests exist; this repo currently has no `*.test.*` or `*.spec.*` files.
- `package.json` `build` runs `tsc && vp build`. As checked in the current repo state, `tsc` fails because Vue SFC imports do not have a `.vue` module declaration, while `vp build` itself succeeds.

# Editing Notes

- Do not hand-edit `dist/`; it is build output and ignored.
- If you change settings shape or defaults, update both `Settings`/`defaults` in `src/composables/useStorage.ts` and the settings UI in `src/components/SettingsPanel.vue`.
