import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API } from "../lib/config";
import { ChatMessage, ChatReadReceipt } from "../types";

type Conversation = {
  peerUserId: string;
  peerName: string;
  peerEmail: string;
  lastText: string;
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

  async function loadConversations() {
    const conv = await fetch(`${API}/chats/conversations`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
    setConversations(conv);
    if (!activePeerUserId && conv[0]?.peerUserId) setActivePeerUserId(conv[0].peerUserId);
  }

  async function markConversationRead(peerUserId: string) {
    if (!peerUserId) return;
    await fetch(`${API}/chats/${peerUserId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    setUnreadByPeer((prev) => {
      if (!prev[peerUserId]) return prev;
      return { ...prev, [peerUserId]: 0 };
    });
  }

  async function loadMessages(peerUserId: string) {
    if (!peerUserId) return setMessages([]);
    const msgs = await fetch(`${API}/chats/${peerUserId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
    setMessages(msgs);
    await markConversationRead(peerUserId);
  }

  useEffect(() => {
    activePeerRef.current = activePeerUserId;
  }, [activePeerUserId]);

  useEffect(() => {
    fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then(setUsers);
    loadConversations();

    const chatSocket = io("/", { transports: ["websocket"], auth: { token } });
    const onNew = (m: ChatMessage) => {
      const activePeer = activePeerRef.current;
      const isFromActivePeer = m.senderUserId === activePeer;
      const isToActivePeer = m.recipientUserId === activePeer;

      if (isFromActivePeer || isToActivePeer) {
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

  const active = useMemo(() => conversations.find((c) => c.peerUserId === activePeerUserId), [conversations, activePeerUserId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || !activePeerUserId) return;
    await fetch(`${API}/chats/${activePeerUserId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text })
    });
    setText("");
  }

  return (
    <section className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: 520 }}>
        <aside style={{ borderRight: "1px solid var(--border)", padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Conversations</h3>
          <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            {conversations.map((c) => (
              <button key={c.peerUserId} className="btn" style={{ textAlign: "left", background: c.peerUserId === activePeerUserId ? "var(--chip)" : "var(--bg-elev)" }} onClick={() => setActivePeerUserId(c.peerUserId)}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>{c.peerName}</strong>
                  {(unreadByPeer[c.peerUserId] || 0) > 0 ? <span className="meta">{unreadByPeer[c.peerUserId]} new</span> : null}
                </div>
                <div className="meta" style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.lastText}</div>
              </button>
            ))}
          </div>
          <h4 style={{ margin: "10px 0 6px" }}>Start new chat</h4>
          <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
            {users.map((u) => (
              <button key={u.id} className="btn" style={{ textAlign: "left" }} onClick={() => setActivePeerUserId(u.id)}>
                <div><strong>{u.name}</strong></div>
                <div className="meta" style={{ margin: 0 }}>{u.email}</div>
              </button>
            ))}
          </div>
        </aside>

        <div style={{ display: "grid", gridTemplateRows: "56px 1fr auto" }}>
          <header style={{ borderBottom: "1px solid var(--border)", padding: "12px 14px", display: "flex", alignItems: "center" }}>
            <strong>{active?.peerName || "Select a conversation"}</strong>
          </header>

          <div style={{ overflow: "auto", padding: 14 }}>
            {messages.map((m) => (
              <p key={m.id} style={{ margin: "0 0 10px" }}><strong>{m.senderName}</strong>: {m.text}</p>
            ))}
            {messages.length === 0 ? <p className="muted">No messages yet.</p> : null}
          </div>

          <form onSubmit={send} className="row" style={{ padding: 12, borderTop: "1px solid var(--border)", alignItems: "center" }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" disabled={!activePeerUserId} />
            <button className="btn primary" type="submit" disabled={!activePeerUserId}>Send</button>
            {activePeerUserId && lastReadByPeer[activePeerUserId] ? <span className="meta">Seen {new Date(lastReadByPeer[activePeerUserId]).toLocaleTimeString()}</span> : null}
          </form>
        </div>
      </div>
    </section>
  );
}
