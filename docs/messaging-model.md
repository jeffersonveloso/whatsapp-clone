# Messaging Model Reference

The messaging layer supports rich payloads (media, captions, replies) and read/receipt tracking. Use this guide when extending message features or debugging schema issues.

## Core Types
- **Enum:** `MessageType` (`textMessage`, `imageMessage`, `videoMessage`, `documentMessage`, `audioMessage`)
- **Entities:** Defined in `types/messages.ts`; each message carries _exactly one_ of these payloads (others remain `undefined`).
- **Replies:** Optional `reply` block containing:
  - `messageId`: referenced message
  - `quotedConversationType`: the original message type
  - `quotedMessage`: snapshot of the quoted payload
  - `participant`: snapshot of the quoted sender at the time of reply

## Convex Schema (`convex/schema.ts`)
| Field | Type | Notes |
| --- | --- | --- |
| `conversation` | `Id<"conversations">` | Owning conversation |
| `sender` | `Id<"users"> \| "ChatGPT"` | Allows system messages |
| `participant` | `Id<"users">?` | The human reference when `sender` is a user |
| `textMessage` | `{ content: string }?` | Single field object |
| `imageMessage` | `{ url, caption? }?` | `url` points to Convex storage |
| `videoMessage` | `{ url, caption?, gifPlayback }?` | `gifPlayback` toggle |
| `documentMessage` | `{ mimetype, url, length, title, ... }?` | Extended metadata |
| `audioMessage` | `{ url }?` | Simple audio reference |
| `reply` | Reply schema | Optional |
| `messageType` | union of enum literals | Determines which payload is populated |
| `receivers` | `Id<"users">[]?` | Users who should receive the message |
| `readers` | `Id<"users">[]?` | Users known to have read the message |
| `storageId` | `Id<"_storage">?` | For media cleanup/deletion |

## Sending Messages (`convex/messages.ts`)
- Each send mutation validates:
  - Authenticated user belongs to the conversation.
  - `sender` param matches the identity (guards spoofing).
  - Optional `replyTo` payload is resolved into a reply snapshot.
  - `receivers` set is computed (`participants` minus sender); `readers` initialised to `[sender]`.
- Media senders (`sendImage`, `sendVideo`, `sendDocument`, `sendAudio`) expect the client to upload the file first via `generateUploadUrl`.
- `deleteMessage` now patches the payload back to a placeholder text while clearing media-specific fields and storage references.

## Client Expectations
- `src/store/chat-store.ts` mirrors the Convex message shape (optional payloads, reply data, sender snapshots).
- UI components (`ChatBubble`, `Conversation`) branch on `messageType` and read the relevant payload; avoid referencing deprecated `message.content`.
- Read/receive arrays are stored but not yet surfaced; future features (e.g., delivery indicators) can rely on them.

## Adding New Message Features
1. Extend `types/messages.ts` with the new payload structure or metadata.
2. Update `convex/schema.ts` and corresponding mutations to persist/validate the shape.
3. Regenerate types (`npx convex codegen`) and align `chat-store`.
4. Adjust UI renderers to gracefully handle the new type.

## Open Questions / TODOs
- Track when `receivers` should be pruned if members leave a group.
- Build UI for quoting messages and for showing captioned documents/audios.
