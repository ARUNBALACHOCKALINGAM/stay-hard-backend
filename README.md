# stay-hard — linting notes

What I changed

- Added `ignores` to `eslint.config.mjs` so ESLint skips compiled output (`dist/`) and `node_modules/`.
- Removed the legacy `.eslintignore` file (flat config uses the `ignores` property).
- Added an npm `lint` script that runs ESLint only on the `src/` directory.

Why

Compiled JS in `dist/` contains CommonJS artifacts like `require` and `exports`. When ESLint scans `dist/` it reports `no-undef` and other errors. Built files should be ignored by linters.

How to lint

Run the project linting with:

```powershell
npm run lint
```

This runs `eslint src --ext .ts`.

Recommendation

- Run ESLint against source files only (as the `lint` script does).
- If you use CI, add `npm run lint` to your pipeline.
- Keep `dist/` excluded from linting and source control (it's a build artifact).
