# Efficient project workflow

- Complete the requested scope; keep replies concise and avoid optional audits, redesigns, or research.
- Search narrowly and read relevant file sections. Exclude generated output, dependencies, lockfiles, and large bundles unless needed. Read other task histories only when necessary, extracting compact summaries.
- Batch related changes locally. Default to leaving a completed, checked batch ready for release. Publish when the user requests publishing or has already authorized the current release; do not ask again for existing authorization.
- Use one production deployment per completed batch. If Git triggers deployment, do not also deploy through the CLI. Do not push to the production branch merely to save progress.
- Prefer local checks and preview. Use a hosted preview only when needed; do not repeatedly publish production to inspect visual tweaks.
- Run checks appropriate to the change once, repeating only after relevant edits or failures. Before a code release, run `npm test` and `npm run build`; verify the affected live behavior once after deployment completes. Documentation-only changes need no application test run or standalone release.
- Preserve concise handoff notes for unfinished work: changed files, checks completed, remaining work, and whether published. Do not copy full logs or chat history.
- Do not change billing, scheduled jobs, or customer-facing behavior solely on a cost assumption; establish actual usage and functional impact first.

Project map: `scripts/build.cjs` builds an explicit static allowlist into `dist`; `netlify/functions` holds backend functions; `tests` holds Node tests. Read feature-specific root documentation only for the feature being changed. Never publish the repository root.
