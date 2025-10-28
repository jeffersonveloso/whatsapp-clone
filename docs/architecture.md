# System Architecture

This project recreates a WhatsApp-style experience using a hybrid of Next.js (front-end) and Convex (backend). The following overview helps agents spot where to implement new features or debug issues.

## High-Level Diagram
```
Client (Next.js 13 App Router, React Server/Client Components)
│
├─ Providers
│   ├─ Theme provider (next-themes)
│   ├─ Convex + Clerk auth bridge (`src/providers/convex-client-provider.tsx`)
│   └─ Toast notifications
│
├─ Feature Areas
│   ├─ Home Shell (`src/app/page.tsx`)
│   │   ├─ LeftPanel (conversation list)
│   │   └─ RightPanel (active chat)
│   └─ Video call pages (placeholder demo)
│
└─ State
    ├─ `src/store/chat-store.ts` – current conversation + message typings
    └─ `src/store/ui-store.ts` – responsive sidebar state

Backend (Convex Functions)
│
├─ Schema (`convex/schema.ts`)
│   ├─ users
│   ├─ conversations
│   └─ messages (typed media payloads, replies, receivers/readers)
│
├─ Mutations/Queries
│   ├─ `convex/users.ts` – sync with Clerk webhooks, pagination
│   ├─ `convex/conversations.ts` – CRUD/group membership
│   ├─ `convex/messages.ts` – send text/media, delete, prune old data
│   └─ `convex/openai.ts` – ChatGPT & DALL·E integrations
│
└─ Integration
    ├─ Clerk webhooks (`convex/http.ts`)
    └─ Cron cleanup jobs (`convex/crons.ts`)
```

## Data Flow
1. **Auth handshake**: Clerk authenticates the user; the Convex provider uses `ConvexProviderWithClerk` to attach auth headers to queries/mutations.
2. **Conversations**: `LeftPanel` fetches `api.conversations.getMyConversations`. Selecting a chat updates `useConversationStore`.
3. **Messages**: `MessageContainer` performs `api.messages.getMessages` using the conversation id; Convex automatically hydrates sender/participant snapshots.
4. **Sending**: Client-side mutations call Convex endpoints (`sendTextMessage`, `sendImage`, etc.), which now store structured payloads and manage receivers/readers.
5. **Media uploads**: UI components first request `generateUploadUrl`, upload to Convex storage, then reference the storage id when inserting messages.

## Key Couplings
- `types/messages.ts` ↔ `convex/schema.ts`: keep enums and field shapes synchronised.
- `src/store/chat-store.ts` ↔ Convex message return shape: any schema changes must be mirrored here.
- `LeftPanel` mobile drawer ↔ `RightPanel` toggle: ensure new UI changes preserve the responsive sidebar behaviour.

## Next Steps
- Add a diagram for the reply flow once UI support is finished.
- Document how receivers/readers arrays will be consumed in the UI (e.g., read receipts).
