import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare, Minimize2, ExternalLink, Paperclip } from 'lucide-react';
import { useMessaging, getChannelId } from '../../context/MessagingContext';
import { UserAvatar } from '../common/ui';

export default function MiniChatDrawer({ currentUser, setActiveTab }) {
  const { isMiniChatOpen, miniChatContact, closeMiniChat, messages, sendDirectMessage, markChatAsRead, resolveUserProfile } = useMessaging();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef(null);

  const resolvedContact = React.useMemo(() => {
    return resolveUserProfile ? resolveUserProfile(miniChatContact) : miniChatContact;
  }, [miniChatContact, resolveUserProfile]);

  const channelMessages = React.useMemo(() => {
    if (!currentUser?.identifier || !resolvedContact?.identifier) return [];
    const chan = getChannelId(currentUser.identifier, resolvedContact.identifier);
    return messages.filter(m => m.channelId === chan);
  }, [messages, currentUser, resolvedContact]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [channelMessages, isMiniChatOpen]);

  useEffect(() => {
    if (isMiniChatOpen && resolvedContact?.identifier) {
      markChatAsRead(resolvedContact.identifier);
    }
  }, [isMiniChatOpen, resolvedContact, markChatAsRead, channelMessages]);

  if (!isMiniChatOpen || !resolvedContact) return null;

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    setIsSending(true);
    try {
      await sendDirectMessage({
        toId: resolvedContact.identifier,
        text: inputText.trim()
      });
      setInputText('');
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenFullMessages = () => {
    closeMiniChat();
    if (setActiveTab) {
      setActiveTab('messages');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 h-[480px] max-h-[80vh] flex flex-col bg-surface-container/95 backdrop-blur-2xl border border-outline-variant/60 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-300">
      {/* Header */}
      <div className="p-3 bg-surface-container-high border-b border-outline-variant/50 flex items-center justify-between">
        <div className="flex items-center space-x-2.5 min-w-0">
          <UserAvatar user={resolvedContact} size="sm" showStatus status="active" />
          <div className="min-w-0">
            <h4 className="text-xs font-black text-on-surface truncate">{resolvedContact.name || resolvedContact.identifier}</h4>
            <p className="text-[9px] font-bold text-primary uppercase tracking-tight">{resolvedContact.role || 'Online'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleOpenFullMessages}
            className="p-1.5 text-on-surface-variant hover:text-primary rounded-lg hover:bg-surface-container transition-colors"
            title="Open in Full Messages View"
          >
            <ExternalLink size={13} />
          </button>
          <button
            onClick={closeMiniChat}
            className="p-1.5 text-on-surface-variant hover:text-error rounded-lg hover:bg-surface-container transition-colors"
            title="Close Quick Chat"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-2.5 custom-scrollbar bg-surface-container-lowest/50">
        {channelMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-on-surface-variant">
            <MessageSquare size={28} className="opacity-30 mb-2" />
            <p className="text-xs font-bold">Start a conversation</p>
            <p className="text-[10px] opacity-70">Say hello to {miniChatContact.name || 'colleague'}</p>
          </div>
        ) : (
          channelMessages.map((msg) => {
            const isMe = String(msg.fromId || '').toLowerCase() === String(currentUser?.identifier || '').toLowerCase();
            return (
              <div key={msg._firestoreId || msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[82%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                    isMe
                      ? 'bg-primary text-on-primary rounded-br-none shadow-sm'
                      : 'bg-surface-container-high text-on-surface border border-outline-variant/40 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[8px] font-mono text-on-surface-variant/60 mt-0.5 px-1">
                  {new Date(Number(msg.timestamp) || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Input */}
      <form onSubmit={handleSend} className="p-2.5 bg-surface-container border-t border-outline-variant/50 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type message..."
          className="flex-1 px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/50"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-all flex-shrink-0"
        >
          <Send size={13} />
        </button>
      </form>
    </div>
  );
}
