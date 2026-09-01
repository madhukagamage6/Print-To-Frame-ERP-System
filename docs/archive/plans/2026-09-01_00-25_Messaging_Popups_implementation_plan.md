# Implementation Plan — Global Real-Time Messaging & Interactive Pop-Up Notifications

Provide an ultra-responsive, real-time messaging and notification system across the entire Print-To-Frame ERP suite, featuring always-on message synchronization, rich interactive floating pop-ups with inline Quick Reply, a slide-over mini-chat drawer, and live badge updates.

---

## User Review Required

> [!IMPORTANT]
> **Audio Chime:** As requested, audio chimes are **omitted**. Notifications will be purely visual (interactive pop-ups, dynamic tab title counters, and sidebar badges).
>
> **Global Real-Time Listener:** Message synchronization will now run at the application level throughout the entire user session, ensuring zero delay and zero unmounting issues when switching between Leads, Deals, Invoices, or Dashboard.

---

## Proposed Changes

```
┌────────────────────────────────────────────────────────────────────────┐
│                          App.jsx (Root Layer)                          │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                 MessagingContext & State Hub                   │   │
│   │   • Always-On Firestore onSnapshot (participants: myId)        │   │
│   │   • Live Unread Counts (0ms delay)                             │   │
│   │   • Dynamic Tab Title: "(3) Print To Frame ERP"                │   │
│   │   • Dispatches Real-Time Pop-Up Events                         │   │
│   └────────────────────────────────────────────────────────────────┘   │
│               │                                  │                     │
│               ▼                                  ▼                     │
│  ┌─────────────────────────┐        ┌──────────────────────────────┐   │
│  │  FloatingMessageToast   │        │     MiniChatDrawer (Overlay) │   │
│  │  • Sender Avatar & Role │        │  • Slide-Over Chat Panel     │   │
│  │  • Message Preview      │        │  • Chat from any CRM page    │   │
│  │  • Inline Quick Reply   │        │  • Zero context lost         │   │
│  │  • One-Click Open Chat  │        └──────────────────────────────┘   │
│  └─────────────────────────┘                                           │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Component Architecture & State Management

#### [NEW] [`src/context/MessagingContext.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/context/MessagingContext.jsx)
- **Always-on Subscription:** Listens to `COLLECTIONS.MESSAGES` with `where('participants', 'array-contains', myId)` across the entire authenticated session.
- **Unread Sync:** Computes exact unread messages per contact in real time and exposes `totalUnreadCount`.
- **Dynamic Tab Title:** Updates browser tab title with unread indicator (e.g. `(2) Print To Frame ERP`) when window is blurred or backgrounded.
- **Popup Triggering:** Detects incoming messages from other users when the chat window isn't currently focused on that contact and triggers the interactive floating toast.
- **Quick Reply Dispatcher:** Provides `sendDirectMessage(toId, text, replyTo)` allowing instant sending from pop-ups or mini-chat.

---

### Interactive Floating Pop-Up Notification

#### [NEW] [`src/components/common/FloatingMessageToast.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/common/FloatingMessageToast.jsx)
- **Visual Presentation:** Clean, floating glassmorphic card positioned at the top-right / bottom-right.
- **Elements:**
  - Sender `UserAvatar` with live online indicator.
  - Sender name and role badge (e.g. `Madhuka Gamage • Administrator`).
  - Formatted message preview snippet.
  - Expandable **"Quick Reply"** input field with inline `Send` button (replies directly without page navigation).
  - **"Open Chat"** button (opens the thread in the slide-over drawer).
  - Auto-dismiss timer (pauses when user hovers or is typing a reply).

---

### Global Slide-Over Mini-Chat Drawer

#### [NEW] [`src/components/tools/MiniChatDrawer.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/MiniChatDrawer.jsx)
- **Non-Intrusive Multitasking:** Compact slide-over side drawer accessible from anywhere in the ERP via:
  - Clicking "Open Chat" on any floating message toast.
  - Clicking a floating mini-chat toggle button in the bottom-right corner.
- Allows team members to chat, review specs, or share order links without leaving active Lead modals, Deals Kanban boards, or Invoices.

---

### Core Module Updates

#### [MODIFY] [`src/components/tools/Messages.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/tools/Messages.jsx)
- Integrate with `MessagingContext` to consume shared real-time messages and state, eliminating duplicate Firestore queries while retaining full thread features (typing indicators, message search, replies, deletion).

#### [MODIFY] [`src/components/dashboard/NotificationsView.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/components/dashboard/NotificationsView.jsx)
- Add filter tabs (`All Alerts`, `System Alerts`, `Team Messages`).
- Automatically populate incoming direct messages into the history feed with timestamp and sender tags.

#### [MODIFY] [`src/App.jsx`](file:///c:/Users/User/Documents/print-to-frame-erp-system/src/App.jsx)
- Wrap application with `MessagingProvider`.
- Mount `<FloatingMessageToast />` and `<MiniChatDrawer />` at the root layout.
- Bind `totalUnreadCount` to sidebar badge and mobile navigation indicators.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify clean compilation with zero build or syntax errors.

### Manual Verification
1. **Zero-Latency Message Receipt:**
   - Log in with User A and User B in separate windows/tabs.
   - User A sends a message to User B while User B is on the **Deals** or **Invoices** page.
   - Verify User B receives the floating interactive pop-up **instantly (0ms delay)** without navigating to the Messages tab.
2. **Interactive Quick Reply:**
   - On User B's screen, type a reply in the floating pop-up's inline quick reply box and hit `Send`.
   - Verify User A receives the reply in real time and the message is synced to Firestore.
3. **Live Badge Counter Sync:**
   - Verify the sidebar and mobile drawer "Messages" badges increment immediately upon receipt across all tabs.
4. **Slide-Over Mini-Chat Drawer:**
   - Click "Open Chat" on the pop-up while inside a Lead Details modal.
   - Confirm the mini-chat drawer slides open over the modal without closing or losing unsaved lead changes.
5. **Dynamic Tab Title Counter:**
   - Switch to another browser tab when a message arrives; verify the tab title reflects `(1) Print To Frame ERP`.
