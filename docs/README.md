# WhatsApp Clone – Agent Onboarding Guide

Welcome! This documentation set gives incoming contributors the context needed to work efficiently on the WhatsApp clone. Start here, then dive into the focused guides linked below.

## Quickstart Map
- [`architecture.md`](./architecture.md) – App layout, core services, and how data flows across the stack.
- [`messaging-model.md`](./messaging-model.md) – Message schema, media handling, replies, and read/receive tracking.
- [`ui-workflows.md`](./ui-workflows.md) – Key UX flows (auth, chat selection, message lifecycle) with component ownership.
- [`contribution-playbook.md`](./contribution-playbook.md) – Coding conventions, validation steps, and local tooling tips.

## Getting Situated
1. **Environment:** The project uses Next.js 13 (app router), Convex for backend, Clerk for auth, and Tailwind + Shadcn UI. Verify your Node.js version aligns with the one enforced by Next.js (≥ 18.18.0).
2. **Schema Sync:** After pulling schema/API changes run `npx convex codegen` and `npx convex push` to line up generated types and backend tables.
3. **State Stores:** Global chat state lives in `src/store/chat-store.ts`; UI meta state (e.g., mobile sidebar) is in `src/store/ui-store.ts`.

## When You Change Things
| Area | Typical Commands | Notes |
| --- | --- | --- |
| Convex schema/mutations | `npx convex push` / `npx convex codegen` | Keep client/server message contracts aligned. |
| Type checks & lint | `npm run lint` | Requires Node.js >= 18.18; run before pushing. |
| UI tweaks | `npm run dev` | Use the responsive drawer to test mobile behaviours. |

## FAQs
- **Where do message type constants live?** See `types/messages.ts`.
- **How do we manage roles?** User roles are defined in `types/roles.ts`; only `common` and `admin` are supported.
- **Who owns the support docs?** Feel free to extend the files above. Each doc has a “Next Steps” section describing where more detail is helpful.

---
> **Tip:** When the model or UI changes substantially, update the relevant doc quickly—future agents rely on these notes during rapid handoffs.
