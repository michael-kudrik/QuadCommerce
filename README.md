# QuadCommerce

Reverse-auction MVP (student marketplace slice) with MongoDB persistence + realtime listing updates.

## Run

```bash
npm install
npm run dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

## MongoDB behavior
- The API first tries `MONGO_URI` (default: `mongodb://127.0.0.1:27017/quadcommerce`).
- If no local MongoDB server is running, it automatically starts an in-process local MongoDB via `mongodb-memory-server`.

Optional API env file:
- `apps/api/.env` (see `apps/api/.env.example`)

## MVP scope implemented
- Create listing
- View listings
- Place offers
- Accept an offer (seller action)
- Mark listing sold
- Realtime listing refresh via WebSockets
- Polished UI with light/dark mode, icons, motion, skeleton loaders, and empty-state illustration
