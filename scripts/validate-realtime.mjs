import { io } from "socket.io-client";
import assert from "node:assert/strict";

const API = process.env.API_URL || "http://localhost:4000/api";
const WS = process.env.WS_URL || "http://localhost:4000";

function randEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.edu`;
}

async function j(url, opts = {}) {
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} :: ${JSON.stringify(body)}`);
  return body;
}

async function registerAndLogin(name, role = "student") {
  const email = randEmail(name.toLowerCase());
  const password = "password123";
  const reg = await j(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role })
  });
  return reg;
}

function waitFor(socket, event, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const onEvent = (payload) => {
      clearTimeout(t);
      resolve(payload);
    };
    socket.once(event, onEvent);
  });
}

async function run() {
  console.log(`Using API=${API} WS=${WS}`);

  const alice = await registerAndLogin("Alice", "student");
  const bob = await registerAndLogin("Bob", "student");

  // 1) socket auth handshake should reject unauthenticated clients
  const unauth = io(WS, { transports: ["websocket"], timeout: 5000, reconnection: false });
  const unauthErr = await new Promise((resolve) => {
    unauth.on("connect_error", (err) => resolve(err));
    setTimeout(() => resolve(new Error("connect_error_not_emitted")), 5000);
  });
  unauth.close();
  assert.notEqual(String(unauthErr?.message || ""), "connect_error_not_emitted", "unauthenticated socket was not rejected");

  // 2) authenticated sockets should connect and receive events
  const aSock = io(WS, { transports: ["websocket"], auth: { token: alice.token }, timeout: 5000, reconnection: false });
  const bSock = io(WS, { transports: ["websocket"], auth: { token: bob.token }, timeout: 5000, reconnection: false });

  await Promise.all([waitFor(aSock, "connected"), waitFor(bSock, "connected")]);

  const aNewP = waitFor(aSock, "chat:new");
  const bNewP = waitFor(bSock, "chat:new");

  const sent = await j(`${API}/chats/${bob.user.id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${alice.token}`
    },
    body: JSON.stringify({ text: "hello from validator" })
  });

  const [aNew, bNew] = await Promise.all([aNewP, bNewP]);
  assert.equal(aNew.id, sent.id, "sender socket did not receive same chat:new payload id");
  assert.equal(bNew.id, sent.id, "recipient socket did not receive same chat:new payload id");

  // 3) unread/read hydration should be reflected by conversations endpoint
  const bobConvsBefore = await j(`${API}/chats/conversations`, {
    headers: { Authorization: `Bearer ${bob.token}` }
  });
  const bobConvBefore = bobConvsBefore.find((c) => c.peerUserId === alice.user.id);
  assert.ok(bobConvBefore, "missing conversation for Bob->Alice");
  assert.ok((bobConvBefore.unreadCount || 0) >= 1, "unreadCount did not increment");

  const aReadP = waitFor(aSock, "chat:read");
  const bReadP = waitFor(bSock, "chat:read");
  await j(`${API}/chats/${alice.user.id}/read`, {
    method: "POST",
    headers: { Authorization: `Bearer ${bob.token}` }
  });

  const [aRead, bRead] = await Promise.all([aReadP, bReadP]);
  assert.equal(aRead.readerUserId, bob.user.id, "chat:read payload reader mismatch (alice socket)");
  assert.equal(bRead.readerUserId, bob.user.id, "chat:read payload reader mismatch (bob socket)");

  const bobConvsAfter = await j(`${API}/chats/conversations`, {
    headers: { Authorization: `Bearer ${bob.token}` }
  });
  const bobConvAfter = bobConvsAfter.find((c) => c.peerUserId === alice.user.id);
  assert.ok(bobConvAfter, "missing conversation after read");
  assert.equal(bobConvAfter.unreadCount || 0, 0, "unreadCount did not reset after read");

  aSock.close();
  bSock.close();
  console.log("Realtime validation passed.");
}

run().catch((err) => {
  console.error("Realtime validation failed:", err.message);
  process.exit(1);
});
