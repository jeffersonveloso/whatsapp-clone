# UI Workflows & Component Ownership

This guide maps core user flows to components and state, enabling quick orientation when iterating on the front-end.

## Entry Flow
1. **Layout** – `src/app/layout.tsx` wraps the app with theme, Convex, and toast providers.
2. **Home shell** – `src/app/page.tsx` renders:
   - `<LeftPanel />` – conversation list + global UI controls.
   - `<RightPanel />` – active chat view or placeholder.

## Conversation Selection
- **Query:** `api.conversations.getMyConversations`
- **State:** `useConversationStore` (stores `selectedConversation`)
- **Components:**  
  - `LeftPanel` – handles responsive drawer; mobile version sits in a shared Zustand store (`useSidebarStore`).  
  - `Conversation` – each row showing preview + last message snippet.  
  - `ChatOptionsMenu` – per-conversation actions (delete, exit group).
- **Edge Cases:** When a conversation is deleted or the user is removed, `LeftPanel` resets the selection to `null` to avoid stale state.

## Messaging Flow
1. **Loading messages** – `MessageContainer` invokes `api.messages.getMessages` for the selected conversation. The Convex query now returns sender/participant snapshots.
2. **Rendering bubbles** – `ChatBubble` branches on `message.messageType`, renders text/media/document payloads, and shows reply previews (pending UI enhancements).
3. **Header controls** – `RightPanel` includes:
   - `<GroupMembersDialog />` for member management.
   - Mobile menu toggle to reopen the sidebar.
4. **Sending messages** – `MessageInput` orchestrates:
   - Text submission (`sendTextMessage`)
   - Media dropdown uploads (image/video/document) using `generateUploadUrl`
   - Audio recorder dialogue (`sendAudio`)
   - Emoji picker courtesy of `useComponentVisible`
   - Reply UX is not yet wired; plan to add message context to the input.

## Responsive Sidebar
- **Stores:** `useSidebarStore` (open/close/toggle)
- **Hooks:** `useMediaQuery` hides the drawer on desktop
- **Components:**  
  - `LeftPanel` – decides when to show overlay vs fixed sidebar.  
  - `RightPanel` & `ChatPlaceHolder` – expose a button to reopen the sidebar on mobile.

## Role-Based UI Guards
- Admin-only actions (e.g., group creation, member removal) are enforced in components such as:
  - `UserListDialog` – prevents non-admins from selecting multiple participants when creating chats.
  - `MessageOptionsMenu` – hides destructive actions if not admin or sender.

## Pending Enhancements
- **Reply UI:** Display quoted message content in `ChatBubble` and provide “reply” affordances in the options menu.
- **Read indicators:** Use `message.readers` to drive read receipts; update `MessageSeenSvg` accordingly.
- **Document previews:** Add thumbnail or file metadata preview before download.

Refer back to this doc when introducing new flows—tie them to the owning components and stores so future agents can locate the relevant code quickly.
