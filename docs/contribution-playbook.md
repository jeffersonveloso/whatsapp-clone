# Contribution Playbook

Use this checklist to keep changes consistent and handoff-friendly.

## 1. Environment & Tooling
- Ensure Node.js ≥ 18.18.0 (Next.js requirement); use nvm or asdf to manage versions.
- Install deps with `npm install`.
- Run `npx convex codegen` whenever schema/convex files change to refresh generated types.

## 2. Development Workflow
| Step | Command | Notes |
| --- | --- | --- |
| Start dev server | `npm run dev` | Check both desktop/mobile (mobile drawer). |
| Type check | `npm run lint` | Runs Next.js lint + type checks; upgrade Node if version error. |
| Schema deploy | `npx convex push` | Applies schema/index changes to Convex deployment. |
| Generated API | `npx convex codegen` | Keep the `_generated` files committed. |

## 3. Code Guidelines
- **Schema sync:** Modify `types/messages.ts`, `convex/schema.ts`, and `src/store/chat-store.ts` in tandem.
- **State management:** Use existing Zustand stores (`chat-store`, `ui-store`) before introducing new ones.
- **UI components:** Prefer Shadcn UI components from `src/components/ui` for consistency.
- **Accessibility:** Include `aria-label` for interactive icons, especially in the mobile sidebar controls.

## 4. Testing & Verification
- Manual smoke test:
  - Sign in through Clerk.
  - Send text, image, audio (ensuring upload flow works).
  - Switch conversations and test mobile drawer toggling.
- When working on Convex functions, consider writing simulated tests with `convex dev` (TODO).
- Capture regressions by verifying new schema fields appear correctly in the UI.

## 5. Documentation Hygiene
- Update relevant docs in `/docs` when behaviour or architecture changes.
- Reference doc updates in pull requests to help reviewers understand context adjustments.

## 6. PR Checklist
1. Code formatted (Prettier/ESLint).
2. Lint runs locally (or failure explained, e.g., Node version constraints).
3. Convex schema pushed (if modified) and `_generated` directory included.
4. Docs updated (if you touched major flows or schemas).
5. Summarise testing performed in the PR description.

## TODO / Nice to Have
- Introduce automated lint/type checks via CI with Node 20 runtime.
- Add snapshot/unit tests for critical message mutations.
- Expand documentation with troubleshooting recipes for common Convex errors.
