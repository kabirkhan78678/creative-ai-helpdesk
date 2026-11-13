import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, MessageSquare } from 'lucide-react';
import { ChatMessage, User } from '../../types';
import { useWebSocket } from '../../context/WebSocketContext';
import { getApiBaseUrl } from '../../config/api';

interface LiveChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  recipientUser: User | null;
  linkedTicketId?: number | null;
}

export const LiveChatModal: React.FC<LiveChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  recipientUser,
  linkedTicketId,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const { addListener } = useWebSocket();
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && recipientUser) {
      const fetchChat = async () => {
        try {
          const res = await fetch(
            `${getApiBaseUrl()}/chat/conversation?user_a=${currentUser.id}&user_b=${recipientUser.id}`
          );
          if (res.ok) {
            const data = await res.json();
            setMessages(data);
          }
        } catch (e) {
          console.error('Chat history fetch failed:', e);
        }
      };
      fetchChat();
    }
  }, [isOpen, recipientUser, currentUser.id]);

  useEffect(() => {
    const unsub = addListener('CHAT_MESSAGE', (newMsg: ChatMessage) => {
      if (
        recipientUser &&
        (newMsg.sender_id === recipientUser.id || newMsg.recipient_id === recipientUser.id)
      ) {
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    const unsubSent = addListener('CHAT_MESSAGE_SENT', (newMsg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      unsub();
      unsubSent();
    };
  }, [addListener, recipientUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !recipientUser) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      sender_id: currentUser.id,
      recipient_id: recipientUser.id,
      message_body: inputText.trim(),
      ticket_id: linkedTicketId || null,
    };

    try {
      const res = await fetch(`${getApiBaseUrl()}/chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedMsg = await res.json();
        setMessages((prev) => [...prev, savedMsg]);
        setInputText('');
      }
    } catch (err) {
      console.error('Failed to dispatch message:', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="white-modal max-w-lg w-full h-[580px] rounded-3xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  {recipientUser.full_name}
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  {recipientUser.department} • {recipientUser.role}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/60">
            {messages.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">
                Active troubleshooting chat session. Say hello!
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.sender_id === currentUser.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${
                        isMe
                          ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      {m.message_body}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-600"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
