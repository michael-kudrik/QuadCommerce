# Realtime Validation (RT-HARDEN-001)

Lightweight deterministic checks for websocket/chat contract.

## What it validates

1. **Socket auth handshake** rejects unauthenticated websocket clients (`connect_error`).
2. **chat:new fanout** reaches both sender and recipient with the same payload id.
3. **Unread hydration** from `GET /api/chats/conversations` reflects unread count.
4. **chat:read fanout** reaches both participants.
5. **Unread reset** after read receipt persistence (`POST /api/chats/:peerUserId/read`).

## Run

Start API first (and Mongo):

```bash
npm run dev:api
```

Then in another terminal:

```bash
npm run validate:realtime
```

Optional env overrides:

```bash
API_URL=http://localhost:4000/api WS_URL=http://localhost:4000 npm run validate:realtime
```
