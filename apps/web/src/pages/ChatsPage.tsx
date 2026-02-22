import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API } from "../lib/config";
import { ChatMessage, ChatReadReceipt } from "../types";
import { 
  Search, 
  Send, 
  User as UserIcon, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Circle,
  MessageSquareOff
} from "lucide-react";

type Conversation = {
  peerUserId: string;
  peerName: string;
  peerEmail: string;
  lastText: string;
  lastAt?: string;
  unreadCount?: number;
  myReadAt?: string | null;
  peerReadAt?: string | null;
};

export function ChatsPage({ token, meUserId }: { token: string; meUserId: string }) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePeerUserId, setActivePeerUserId] = useState<string>("");
  const activePeerRef = useRef("");
  const [text, setText] = useState("");
  const [unreadByPeer, setUnreadByPeer] = useState<Record<string, number>>({});
  const [lastReadByPeer, setLastReadByPeer] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await fetch(`${API}/chats/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const conv = await res.json();
      const normalized: Conversation[] = Array.isArray(conv) ? conv : [];
      setConversations(normalized);
      setUnreadByPeer(Object.fromEntries(normalized.map((c) => [c.peerUserId, c.unreadCount || 0])));
      setLastReadByPeer((prev) => ({
        ...prev,
        ...Object.fromEntries(normalized.filter((c) => c.peerReadAt).map((c) => [c.peerUserId, c.peerReadAt as string]))
      }));
      if (!activePeerUserId && normalized[0]?.peerUserId) setActivePeerUserId(normalized[0].peerUserId);
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  }

  async function markConversationRead(peerUserId: string) {
    if (!peerUserId) return;
    try {
      await fetch(`${API}/chats/${peerUserId}/read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadByPeer((prev) => ({ ...prev, [peerUserId]: 0 }));
    } catch (err) {
      console.error("Failed to mark read", err);
    }
  }

  async function loadMessages(peerUserId: string) {
    if (!peerUserId) {
      messageIdsRef.current = new Set();
      return setMessages([]);
    }
    try {
      const msgs = await fetch(`${API}/chats/${peerUserId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      const normalized: ChatMessage[] = Array.isArray(msgs) ? msgs : [];
      messageIdsRef.current = new Set(normalized.map((m) => m.id));
      setMessages(normalized);
      await markConversationRead(peerUserId);
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  }

  useEffect(() => {
    activePeerRef.current = activePeerUserId;
  }, [activePeerUserId]);

  useEffect(() => {
    fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []));
    
    loadConversations();

    const chatSocket = io("/", { transports: ["websocket"], auth: { token } });
    
    const onNew = (m: ChatMessage) => {
      if (!m?.id || messageIdsRef.current.has(m.id)) return;

      const activePeer = activePeerRef.current;
      const isFromActivePeer = m.senderUserId === activePeer;
      const isToActivePeer = m.recipientUserId === activePeer;

      if (isFromActivePeer || isToActivePeer) {
        messageIdsRef.current.add(m.id);
        setMessages((prev) => [...prev, m]);
      }

      if (!isFromActivePeer && m.recipientUserId === meUserId) {
        setUnreadByPeer((prev) => ({ ...prev, [m.senderUserId]: (prev[m.senderUserId] || 0) + 1 }));
      }

      if (isFromActivePeer && m.recipientUserId === meUserId) {
        markConversationRead(activePeer).catch(() => undefined);
      }

      loadConversations();
    };

    const onRead = (receipt: ChatReadReceipt) => {
      if (receipt.readerUserId === activePeerRef.current) {
        setLastReadByPeer((prev) => ({ ...prev, [receipt.readerUserId]: receipt.readAt }));
      }
    };

    chatSocket.on("chat:new", onNew);
    chatSocket.on("chat:read", onRead);

    return () => {
      chatSocket.off("chat:new", onNew);
      chatSocket.off("chat:read", onRead);
      chatSocket.disconnect();
    };
  }, [token, meUserId]);

  useEffect(() => {
    loadMessages(activePeerUserId);
  }, [activePeerUserId]);

  const activeConv = useMemo(() => 
    conversations.find((c) => c.peerUserId === activePeerUserId) || 
    users.find(u => u.id === activePeerUserId) as any
  , [conversations, users, activePeerUserId]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    return users.filter(u => 
      u.id !== meUserId && 
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery, meUserId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activePeerUserId) return;
    try {
      await fetch(`${API}/chats/${activePeerUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text })
      });
      setText("");
    } catch (err) {
      console.error("Failed to send message", err);
    }
  }

  return (
    <div className="card-premium h-[calc(100vh-180px)] min-h-[500px] flex overflow-hidden border-none shadow-xl">
      {/* Sidebar */}
      <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-[var(--border)] bg-[var(--bg-elev)]">
        <div className="p-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-black text-[var(--text)] mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} />
            <input 
              className="input-premium pl-10 py-2 text-sm" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {searchQuery ? (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Search Results</div>
              {filteredUsers.map(u => (
                <ConversationItem 
                  key={u.id}
                  name={u.name}
                  sub={u.email}
                  active={u.id === activePeerUserId}
                  onClick={() => {
                    setActivePeerUserId(u.id);
                    setSearchQuery("");
                  }}
                />
              ))}
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-sm text-[var(--muted)] italic">No users found</div>
              )}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2 text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">Recent Chats</div>
              {conversations.map((c) => (
                <ConversationItem 
                  key={c.peerUserId}
                  name={c.peerName}
                  sub={c.lastText}
                  active={c.peerUserId === activePeerUserId}
                  unread={unreadByPeer[c.peerUserId] || 0}
                  onClick={() => setActivePeerUserId(c.peerUserId)}
                />
              ))}
              {conversations.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 bg-[var(--chip)] rounded-full flex items-center justify-center mx-auto mb-3 text-[var(--muted)]">
                    <UserIcon size={24} />
                  </div>
                  <p className="text-sm text-[var(--muted)] italic">Search for a user to start chatting</p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-[var(--bg)]">
        {activePeerUserId ? (
          <>
            {/* Header */}
            <header className="h-16 px-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg-elev)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--chip)] flex items-center justify-center text-[var(--accent)] font-bold">
                  {activeConv?.peerName?.charAt(0) || activeConv?.name?.charAt(0) || "U"}
                </div>
                <div>
                  <div className="font-bold text-[var(--text)]">{activeConv?.peerName || activeConv?.name}</div>
                  <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <Circle size={8} fill="currentColor" /> Online
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[var(--muted)]">
                <button className="hover:text-[var(--accent)] transition-colors"><Phone size={20} /></button>
                <button className="hover:text-[var(--accent)] transition-colors"><Video size={20} /></button>
                <button className="hover:text-[var(--accent)] transition-colors"><Info size={20} /></button>
                <button className="hover:text-[var(--accent)] transition-colors border-l border-[var(--border)] pl-4 ml-1"><MoreVertical size={20} /></button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-[var(--muted)] opacity-50">
                  <div className="p-4 bg-[var(--chip)] rounded-full mb-4"><UserIcon size={32} /></div>
                  <p className="text-sm font-medium">Say hello to {activeConv?.peerName || activeConv?.name}!</p>
                </div>
              )}
              {messages.map((m) => {
                const isMe = m.senderUserId === meUserId;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] group`}>
                      {!isMe && (
                        <div className="text-[10px] font-bold text-[var(--muted)] mb-1 ml-1 uppercase tracking-tighter">
                          {m.senderName}
                        </div>
                      )}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm relative ${
                        isMe 
                          ? 'bg-[var(--accent)] text-white rounded-tr-none' 
                          : 'bg-[var(--bg-elev)] text-[var(--text)] border border-[var(--border)] rounded-tl-none'
                      }`}>
                        {m.text}
                      </div>
                      <div className={`text-[9px] mt-1 text-[var(--muted)] font-medium px-1 flex items-center gap-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-[var(--bg-elev)] border-t border-[var(--border)]">
              <form onSubmit={send} className="flex items-center gap-3">
                <input 
                  className="input-premium py-3 bg-[var(--bg)]" 
                  value={text} 
                  onChange={(e) => setText(e.target.value)} 
                  placeholder="Type a message..." 
                  disabled={!activePeerUserId} 
                />
                <button 
                  className={`p-3 rounded-xl transition-all shadow-md active:scale-95 ${
                    text.trim() ? 'bg-[var(--accent)] text-white' : 'bg-[var(--chip)] text-[var(--muted)]'
                  }`}
                  type="submit" 
                  disabled={!activePeerUserId || !text.trim()}
                >
                  <Send size={20} />
                </button>
              </form>
              {activePeerUserId && lastReadByPeer[activePeerUserId] && (
                <div className="mt-2 text-[9px] text-right font-bold text-emerald-500 uppercase tracking-widest px-1">
                  Seen {new Date(lastReadByPeer[activePeerUserId]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-[var(--chip)] rounded-3xl flex items-center justify-center mb-6 text-[var(--muted)] animate-bounce duration-[3000ms]">
              <MessageSquareOff size={40} />
            </div>
            <h3 className="text-xl font-black text-[var(--text)] mb-2">No active conversation</h3>
            <p className="text-[var(--muted)] max-w-xs mx-auto text-sm leading-relaxed font-medium">
              Select a chat from the sidebar or search for a student to start messaging.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function ConversationItem({ name, sub, active, unread, onClick }: any) {
  return (
    <button 
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative ${
        active 
          ? 'bg-[var(--chip)] shadow-sm' 
          : 'hover:bg-[var(--bg)]'
      }`}
      onClick={onClick}
    >
      <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border ${
        active 
          ? 'bg-[var(--bg-elev)] text-[var(--accent)] border-[var(--accent)]/20' 
          : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)]'
      }`}>
        {name.charAt(0)}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex justify-between items-center mb-0.5">
          <div className={`font-bold truncate text-sm ${active ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
            {name}
          </div>
          {unread > 0 && (
            <span className="bg-[var(--accent)] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
              {unread}
            </span>
          )}
        </div>
        <div className="text-[11px] text-[var(--muted)] truncate font-medium group-hover:text-[var(--text)] transition-colors opacity-80">
          {sub}
        </div>
      </div>
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--accent)] rounded-r-full shadow-[2px_0_8px_rgba(109,94,252,0.4)]" />
      )}
    </button>
  );
}
