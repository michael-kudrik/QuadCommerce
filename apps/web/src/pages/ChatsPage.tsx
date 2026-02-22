import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API } from "../lib/config";
import { ChatMessage } from "../types";

export function ChatsPage({ token }: { token: string }) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [conversations, setConversations] = useState<Array<{ peerUserId: string; peerName: string; peerEmail: string; lastText: string }>>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePeerUserId, setActivePeerUserId] = useState<string>("");
  const activePeerRef = useRef("");
  const [text, setText] = useState("");

  async function loadConversations() {
    const conv = await fetch(`${API}/chats/conversations`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
    setConversations(conv);
    if (!activePeerUserId && conv[0]?.peerUserId) setActivePeerUserId(conv[0].peerUserId);
  }

  async function loadMessages(peerUserId: string) {
    if (!peerUserId) return setMessages([]);
    const msgs = await fetch(`${API}/chats/${peerUserId}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
    setMessages(msgs);
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
      if (m.senderUserId === activePeer || m.recipientUserId === activePeer) setMessages((prev) => [...prev, m]);
      loadConversations();
    };
    chatSocket.on("chat:new", onNew);
    return () => {
      chatSocket.off("chat:new", onNew);
      chatSocket.disconnect();
    };
  }, [token]);

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
                <div><strong>{c.peerName}</strong></div>
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

          <form onSubmit={send} className="row" style={{ padding: 12, borderTop: "1px solid var(--border)" }}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" disabled={!activePeerUserId} />
            <button className="btn primary" type="submit" disabled={!activePeerUserId}>Send</button>
          </form>
        </div>
      </div>
    </section>
  );
}
