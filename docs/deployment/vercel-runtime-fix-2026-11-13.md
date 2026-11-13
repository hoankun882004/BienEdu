# Vercel learner loading fix — 2026-11-13

## Confirmed cause

The public production site `https://bienedu.vercel.app` returned HTTP 404 for all three browser modules:

- `/scripts/source-first/runtime-v62/learner.mjs`
- `/scripts/source-first/runtime-v62/registry.mjs`
- `/scripts/source-first/runtime-v62/lesson-workspace.mjs`

`main.js → learning-v6.js → learner.mjs` prevented the header/menu from initializing. The import map in `documents.html` also depended on the missing registry/workspace modules, so the curriculum bootstrap entered its error state. Local servers could serve these repository paths, masking the missing deployment assets.

The production JSXGraph `.mjs` asset and knowledge JSON were reachable with the appropriate MIME types. Existing selected JSON payloads also matched their Git blob hashes. Those were not the observed cause.

The screenshot URL `bienedu-4hf9nc2dz-3thaitu.vercel.app` identifies a specific deployment. An anonymous browser is redirected to Vercel login for that protected deployment. The owner can still view it, but pushing a new commit does not replace the version at that URL. Use the project's production domain or its branch URL for the newest deployment. See [Vercel's generated URL documentation](https://vercel.com/docs/deployments/generated-urls).

## Changes

- Added deployable adapters under `assets/js/runtime/{learner,registry,lesson-workspace}.js`.
- Updated `assets/js/learning-v6.js` and the `documents.html` import map to use those public paths.
- Kept the original source-first adapters and historical manifests unchanged; the preparation directory stays excluded by `.vercelignore`.
- Preserved source-context output, source metadata, lesson IDs, progress keys, scoring, native geometry and the selected content payloads. Adapter parity is tested explicitly.
- Replaced the misleading hosted error instruction about running a local server. Direct `file:` access still gets a relevant local-server hint.
- Added exact-byte Git protection for PDF-knowledge and geometry JSON. This is preventative; their current hashes were already correct.
- Added `check:hosting` and `test:hosting`.
- Corrected the source checker to recognize the existing `geometry-preview.html` entry and root-relative `/assets/...` URLs, without removing reachability checks.

No dependency was installed, no PDF/TEX or mathematical content was changed, and no commit/push/deployment was performed by the agent.

## Verification

- `npm.cmd run check`: passed; 71 JavaScript files, 7 HTML entries.
- `npm.cmd run check:hosting`: passed; 5 public pages, 71 reachable modules, 3 selected payload hashes, no private browser imports, case-sensitive paths checked.
- `npm.cmd run test:hosting`: desktop/mobile public-origin simulation denies **all** `/scripts/`, `/.audit/` and `/.content-work/` requests. Covers the header, catalog, Knowledge, independent Examples, native function graph, native 3D geometry, practice/reload, retained progress and explicit missing-module failure.
- 36 existing LaTeX/progress/workspace/practice tests passed.
- `git diff --check`: passed.

The simulated production browser result is recorded in `.audit/hosting-fix/browser.json`; the live pre-fix 404 observations are in `diagnosis.json`. The browser simulation is not a claim that a new Vercel deployment has occurred. Actual desktop/mobile screenshots were inspected.

Historical hash-bound manifests were not rewritten to accept the new runtime. Their old apply/rollback authorizations may now be stale; do not force them over this fix.

## Publish the fix

From `D:\BienEdu`:

```powershell
npm.cmd run check:hosting
npm.cmd run test:hosting
git add .
git commit -m "Fix Vercel learner module loading"
git push origin main
```

Wait for the new Vercel deployment to become **Ready**, then open:

`https://bienedu.vercel.app/documents.html`

Do not keep checking the old hash-specific deployment URL. If a new deployment is not created, check the Vercel project's connected Git repository/Production Branch and deployment logs; repository changes cannot confirm or change those account settings. If the new deployment fails, inspect that new deployment's build log rather than assuming an older Ready deployment contains the fix.

## Changed files

- `.gitattributes`
- `.gitignore`
- `.vercelignore`
- `documents.html`
- `package.json`
- `assets/js/learning-v6.js`
- `assets/js/runtime/learner.js`
- `assets/js/runtime/registry.js`
- `assets/js/runtime/lesson-workspace.js`
- `scripts/check-hosting.mjs`
- `scripts/check-source.mjs`
- `tests/hosting.test.mjs`
- `tests/hosting-browser.test.mjs`
- This report and new `.audit/hosting-fix/` receipts. Screenshots/logs there are ignored by Git.
