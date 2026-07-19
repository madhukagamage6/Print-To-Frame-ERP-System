import React, { useState, useEffect, useRef } from "react";
import { Send, Users, User, Circle, MessageSquare } from "lucide-react";
import { showToast, triggerBrowserNotification } from "../../App"; // We will export these from App.jsx

// Helper to sort and create channel IDs (e.g. user1_user2)
function getChannelId(id1, id2) {
  if (!id1 || !id2) return null;
  return [id1, id2].sort().join("_");
}

const Cr = "local_messages_v1";
const To = "local_presence_v1";

const Le = typeof window !== "undefined" ? new EventTarget() : null;
const Fe =
  typeof window !== "undefined" && "BroadcastChannel" in window
    ? new BroadcastChannel("mcp_chat_channel")
    : null;

function getLocalMessages() {
  try {
    const data = localStorage.getItem(Cr) || "[]";
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalMessages(msgs) {
  try {
    localStorage.setItem(Cr, JSON.stringify(msgs));
  } catch {}
}

function getLocalPresence() {
  try {
    const data = localStorage.getItem(To) || "{}";
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function saveLocalPresence(presence) {
  try {
    localStorage.setItem(To, JSON.stringify(presence));
  } catch {}
}

// Update presence for a user
function updatePresence(userId, status) {
  if (!userId) return;
  const current = getLocalPresence();
  current[userId] = { status, ts: Date.now() };
  saveLocalPresence(current);

  if (Le) {
    Le.dispatchEvent(
      new CustomEvent("presence-updated", {
        detail: { userId, status },
      })
    );
  }

  if (Fe) {
    try {
      Fe.postMessage({ type: "presence-updated", userId, status });
    } catch {}
  } else {
    try {
      localStorage.setItem(To + "_signal", Date.now().toString());
    } catch {}
  }
}

// Send typing indicator
function sendTypingSignal(channelId, fromId, isTyping = true) {
  if (!channelId || !fromId) return;

  if (Le) {
    Le.dispatchEvent(
      new CustomEvent("typing", {
        detail: { channelId, fromId, isTyping },
      })
    );
  }

  if (Fe) {
    try {
      Fe.postMessage({
        type: "typing",
        channelId,
        fromId,
        isTyping,
      });
    } catch {}
  } else {
    try {
      localStorage.setItem(
        Cr + "_typing",
        JSON.stringify({
          channelId,
          fromId,
          isTyping,
          t: Date.now(),
        })
      );
    } catch {}
  }
}

// Mark messages as read
function markMessagesAsRead(channelId, messageIds = [], userId) {
  if (!channelId || !userId || !messageIds.length) return;

  const msgs = getLocalMessages();
  let updated = false;

  msgs.forEach((m) => {
    if (m.channelId === channelId && messageIds.includes(m.id)) {
      m.readBy = m.readBy || [];
      if (!m.readBy.includes(userId)) {
        m.readBy.push(userId);
        updated = true;
      }
    }
  });

  if (updated) {
    saveLocalMessages(msgs);
    if (Le) {
      Le.dispatchEvent(
        new CustomEvent("messages-updated", { detail: { channelId } })
      );
    }
    if (Fe) {
      try {
        Fe.postMessage({ type: "messages-updated", channelId });
      } catch {}
    } else {
      try {
        localStorage.setItem(Cr + "_signal", Date.now().toString());
      } catch {}
    }
  }
}

const Messages = ({ users = [], currentUser, onUnreadCountChange }) => {
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [typingState, setTypingState] = useState({});
  const [presenceState, setPresenceState] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastMsgCountRef = useRef(0);

  // Subscribe to messages in active channel
  useEffect(() => {
    if (!currentUser) return;

    const syncMessages = () => {
      if (!activeUser) {
        setMessages([]);
        return;
      }
      const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
      const filtered = getLocalMessages()
        .filter((m) => m.channelId === activeChan)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(filtered);
    };

    syncMessages();

    const handleMessagesUpdated = (e) => {
      const detail = e.detail || {};
      if (!activeUser) return;
      const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
      if (!detail.channelId || detail.channelId === activeChan) {
        syncMessages();
      }
    };

    if (Le) {
      Le.addEventListener("messages-updated", handleMessagesUpdated);
    }

    const handleBroadcastMessage = (e) => {
      try {
        if (e.data?.type === "messages-updated") {
          if (!activeUser) return;
          const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
          if (!e.data.channelId || e.data.channelId === activeChan) {
            syncMessages();
          }
        }
      } catch {}
    };

    if (Fe) {
      Fe.addEventListener("message", handleBroadcastMessage);
    }

    const handleStorageEvent = (e) => {
      if (e.key === Cr + "_signal") {
        syncMessages();
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    return () => {
      if (Le) {
        Le.removeEventListener("messages-updated", handleMessagesUpdated);
      }
      if (Fe) {
        Fe.removeEventListener("message", handleBroadcastMessage);
      }
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [activeUser, currentUser]);

  // Subscribe to user presence updates
  useEffect(() => {
    if (!currentUser) return;

    // Set online
    updatePresence(currentUser.identifier, "online");

    const syncPresence = () => {
      setPresenceState(getLocalPresence());
    };

    syncPresence();

    const handlePresenceUpdated = () => {
      syncPresence();
    };

    if (Le) {
      Le.addEventListener("presence-updated", handlePresenceUpdated);
    }

    const handleBroadcastPresence = (e) => {
      if (e.data?.type === "presence-updated") {
        syncPresence();
      }
    };

    if (Fe) {
      Fe.addEventListener("message", handleBroadcastPresence);
    }

    const handleStorageEvent = (e) => {
      if (e.key === To + "_signal") {
        syncPresence();
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    const handleUnload = () => {
      try {
        updatePresence(currentUser.identifier, "offline");
      } catch {}
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (Le) {
        Le.removeEventListener("presence-updated", handlePresenceUpdated);
      }
      if (Fe) {
        Fe.removeEventListener("message", handleBroadcastPresence);
      }
      window.removeEventListener("storage", handleStorageEvent);
      window.removeEventListener("beforeunload", handleUnload);
      try {
        updatePresence(currentUser.identifier, "offline");
      } catch {}
    };
  }, [currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Calculate unread counts for sidebar users
  useEffect(() => {
    if (!currentUser) return;

    const counts = {};
    users.forEach((u) => {
      if (u.identifier === currentUser.identifier) return;

      if (activeUser?.identifier === u.identifier && messages.length) {
        const unread = messages.filter(
          (m) => m.fromId === u.identifier && !(m.readBy || []).includes(currentUser.identifier)
        ).length;
        counts[u.identifier] = unread;
      } else {
        const chan = getChannelId(currentUser.identifier, u.identifier);
        try {
          const chanMsgs = getLocalMessages().filter((m) => m.channelId === chan);
          const unread = chanMsgs.filter(
            (m) => m.fromId === u.identifier && !(m.readBy || []).includes(currentUser.identifier)
          ).length;
          counts[u.identifier] = unread;
        } catch {
          counts[u.identifier] = 0;
        }
      }
    });

    setUnreadCounts(counts);

    const totalUnread = Object.values(counts).reduce((sum, val) => sum + val, 0);
    if (onUnreadCountChange) {
      onUnreadCountChange(totalUnread);
    }
  }, [messages, activeUser, currentUser, users, onUnreadCountChange]);

  // Notifications for new incoming messages in active chat
  useEffect(() => {
    if (!currentUser || !activeUser || !messages.length) return;

    if (messages.length > lastMsgCountRef.current) {
      const newMsgs = messages.slice(lastMsgCountRef.current);
      newMsgs.forEach((msg) => {
        if (msg.fromId === activeUser.identifier) {
          const title = `Message from ${activeUser.name || activeUser.identifier}`;
          const body = msg.text.substring(0, 100) + (msg.text.length > 100 ? "..." : "");

          // Trigger state context notifications
          if (showToast) {
            showToast({ type: "message", title, message: body });
          }
          if (triggerBrowserNotification) {
            triggerBrowserNotification(title, { body, tag: "chat-message" });
          }
        }
      });
    }

    lastMsgCountRef.current = messages.length;
  }, [messages, currentUser, activeUser]);

  // Mark active chat messages as read
  useEffect(() => {
    if (!currentUser || !activeUser || !messages.length) return;

    const unread = messages.filter(
      (m) => m.fromId === activeUser.identifier && !(m.readBy || []).includes(currentUser.identifier)
    );

    if (unread.length) {
      const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
      markMessagesAsRead(activeChan, unread.map((m) => m.id), currentUser.identifier);
      setTimeout(() => {
        setUnreadCounts((prev) => ({ ...prev, [activeUser.identifier]: 0 }));
      }, 100);
    }
  }, [messages, currentUser, activeUser]);

  // Handle typing signals
  useEffect(() => {
    if (!currentUser || !activeUser) return;

    const handleTypingEvent = (e) => {
      const detail = e.detail || {};
      const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
      if (detail.channelId === activeChan) {
        setTypingState((prev) => ({ ...prev, [detail.fromId]: detail.isTyping }));
      }
    };

    if (Le) {
      Le.addEventListener("typing", handleTypingEvent);
    }

    const handleStorageEvent = (e) => {
      if (e.key === Cr + "_typing") {
        try {
          const data = JSON.parse(e.newValue);
          const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
          if (data.channelId === activeChan) {
            setTypingState((prev) => ({ ...prev, [data.fromId]: data.isTyping }));
          }
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    return () => {
      if (Le) {
        Le.removeEventListener("typing", handleTypingEvent);
      }
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [currentUser, activeUser]);

  // Send message handler
  const handleSendMessage = () => {
    if (!inputText.trim() || !activeUser || !currentUser) return;

    const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
    const msgs = getLocalMessages();

    const newMsg = {
      id: "local_" + Date.now() + "_" + Math.random().toString(36).slice(2),
      channelId: activeChan,
      fromId: currentUser.identifier,
      toId: activeUser.identifier,
      text: inputText.trim(),
      timestamp: Date.now(),
      readBy: [currentUser.identifier],
    };

    msgs.push(newMsg);
    saveLocalMessages(msgs);
    setInputText("");

    // Dispatch update events
    if (Le) {
      Le.dispatchEvent(
        new CustomEvent("messages-updated", { detail: { channelId: activeChan } })
      );
    }

    if (Fe) {
      try {
        Fe.postMessage({ type: "messages-updated", channelId: activeChan });
      } catch {}
    } else {
      try {
        localStorage.setItem(Cr + "_signal", Date.now().toString());
      } catch {}
    }

    // Stop typing indicator
    sendTypingIndicator(false);
  };

  const sendTypingIndicator = (isTyping) => {
    if (!activeUser || !currentUser) return;
    const activeChan = getChannelId(currentUser.identifier, activeUser.identifier);
    sendTypingSignal(activeChan, currentUser.identifier, isTyping);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingSignal(activeChan, currentUser.identifier, false);
      }, 1500);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] border border-outline-variant bg-surface-container rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,218,243,0.05)]">
      {/* Sidebar Employees List */}
      <aside className="w-72 border-r p-4 bg-surface-container-low/50 flex flex-col">
        <h3 className="font-bold text-on-surface text-sm mb-4 flex items-center">
          <Users size={16} className="mr-2 text-on-surface-variant" />
          Employees
        </h3>
        <ul className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
          {users
            .filter((u) => u.identifier !== currentUser?.identifier)
            .map((u) => {
              const isSelected = activeUser?.identifier === u.identifier;
              const isOnline = presenceState[u.identifier]?.status === "online";
              const unreadCount = unreadCounts[u.identifier] || 0;

              return (
                <li key={u.identifier}>
                  <button
                    onClick={() => {
                      setActiveUser(u);
                      lastMsgCountRef.current = 0;
                    }}
                    className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all ${
                      isSelected ? "bg-primary text-on-primary shadow-[0_4px_25px_rgba(0,218,243,0.1)] " : "hover:bg-surface-container border border-transparent hover:border-outline-variant/50 text-on-surface"
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase ${
                          isSelected ? "bg-surface-container/20 text-on-surface" : "bg-primary/20 text-primary"
                        }`}
                      >
                        {u.name?.charAt(0) || u.identifier.charAt(0)}
                      </div>
                      <div className="truncate text-left">
                        <div className={`text-xs font-bold leading-tight ${isSelected ? "text-on-surface" : "text-on-surface"}`}>
                          {u.name || u.identifier}
                        </div>
                        <div className={`text-[9px] mt-0.5 ${isSelected ? "text-indigo-200" : "text-on-surface-variant font-semibold"}`}>
                          {u.role || "Employee"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {unreadCount > 0 && (
                        <span className="bg-error text-on-error text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full border-2 ${
                          isSelected ? "border-indigo-600" : "border-white"
                        } ${isOnline ? "bg-secondary text-on-secondary" : "bg-slate-400"}`}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>
      </aside>

      {/* Chat Conversation */}
      <section className="flex-1 flex flex-col bg-surface-container h-full justify-between">
        {activeUser ? (
          <>
            {/* Active User Header */}
            <div className="p-4 border-b border-outline-variant/50 flex items-center justify-between bg-surface-container-low/20">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-indigo-100 flex items-center justify-center font-bold text-primary">
                  {activeUser.name?.charAt(0) || activeUser.identifier.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-on-surface text-sm">
                    {activeUser.name || activeUser.identifier}
                  </h4>
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {activeUser.role || "Employee"}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    presenceState[activeUser.identifier]?.status === "online"
                      ? "bg-secondary text-on-secondary"
                      : "bg-slate-400"
                  }`}
                />
                <span className="text-[10px] text-on-surface-variant font-semibold uppercase">
                  {presenceState[activeUser.identifier]?.status === "online" ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Messages Pane */}
            <div
              ref={chatContainerRef}
              className="flex-1 p-6 overflow-y-auto space-y-4 bg-surface-container-low/20 custom-scrollbar"
            >
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.fromId === currentUser?.identifier;
                  const msgDate = new Date(msg.timestamp);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-lg p-3.5 rounded-2xl shadow-[0_4px_20px_rgba(0,218,243,0.05)] border ${
                        isMe
                          ? "bg-primary text-on-primary border-indigo-700 text-on-surface rounded-tr-none ml-auto"
                          : "bg-surface-container border-outline-variant/50 text-on-surface rounded-tl-none"
                      }`}
                    >
                      <div className="text-xs font-semibold leading-relaxed break-words">
                        {msg.text}
                      </div>
                      <div
                        className={`flex items-center justify-between mt-2 text-[9px] font-bold ${
                          isMe ? "text-indigo-200" : "text-on-surface-variant"
                        }`}
                      >
                        <span>
                          {msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>
                          {isMe
                            ? (msg.readBy || []).includes(activeUser.identifier)
                              ? "Read"
                              : "Sent"
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center text-on-surface-variant text-xs italic">
                  No messages. Type something below to start conversation.
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-outline-variant/50 bg-surface-container flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    sendTypingIndicator(!!e.target.value);
                  }}
                  onBlur={() => sendTypingIndicator(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${activeUser.name || activeUser.identifier}...`}
                  className="flex-1 p-3 border border-outline-variant rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className="p-3 bg-primary text-on-primary hover:bg-primary/80 text-on-primary disabled:bg-surface-container disabled:text-on-surface rounded-xl transition-all   shadow-[0_0_15px_rgba(0,218,243,0.15)] hover:shadow-[0_0_20px_rgba(0,218,243,0.3)]"
                >
                  <Send size={16} />
                </button>
              </div>
              {typingState[activeUser.identifier] && (
                <div className="text-[10px] text-on-surface-variant italic animate-pulse font-semibold pl-2">
                  {activeUser.name || activeUser.identifier} is typing...
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-on-surface-variant">
            <MessageSquare size={48} className="mb-3 opacity-20" />
            <p className="text-sm font-extrabold">Select an employee to start chatting</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Messages;
