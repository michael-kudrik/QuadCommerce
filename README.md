# QuadCommerce

QuadCommerce is a campus-focused platform built for **HackURI**.
It combines:

1. **Campus Reverse Marketplace** — students list textbooks/dorm items and accept the best offer before a deadline.
2. **Student Business Dashboard** — student-run businesses manage appointments, customers, and performance metrics.

---

## Elevator Pitch

QuadCommerce helps students save money and reduce waste through peer resale, while giving student entrepreneurs simple tools to run and grow their businesses.

---

## What It Does

### Campus Reverse Marketplace
- Create listings for textbooks, dorm supplies, and other student goods
- Submit offers on active listings
- Seller accepts best offer (or declines)
- Mark listings as sold
- Realtime updates for listing activity

### Student Business Dashboard (project direction)
- Manage services and appointments
- Track customer interactions
- View business stats like bookings, repeat users, and no-shows

---

## Why We Built It

We noticed two common campus pain points:
- Students struggle to quickly resell old items at fair prices.
- Student entrepreneurs often juggle fragmented tools for scheduling and customer tracking.

QuadCommerce addresses both in one student-first product.

---

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB (local or in-memory fallback)
- **Realtime:** Socket.IO
- **Monorepo:** npm workspaces

---

## Repository Structure

```text
apps/
  api/   # Express API + Mongo persistence + realtime server
  web/   # React/Vite client
packages/
  ...    # shared packages (if present)
scripts/
  validate-realtime.mjs
```

---

## Getting Started (Run Locally)

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm 9+

### 1) Install dependencies

```bash
npm install
```

### 2) Start the app (API + Web)

```bash
npm run dev
```

### 3) Open in browser
- **Web app:** http://localhost:5173
- **API:** http://localhost:4000

---

## Environment & Database

The API uses `MONGO_URI` if provided.

- Default: `mongodb://127.0.0.1:27017/quadcommerce`
- If local MongoDB is unavailable, the API falls back to `mongodb-memory-server` automatically.

Optional env file:
- `apps/api/.env` (see `apps/api/.env.example`)

---

## Scripts

```bash
npm run dev            # run API + web concurrently
npm run dev:api        # run only API
npm run dev:web        # run only frontend
npm run validate:realtime
npm run build
```

---

## Current MVP Scope

- Create listing
- View listings
- Place offers
- Accept offer (seller)
- Mark listing sold
- Realtime listing refresh
- Responsive polished UI (light/dark mode, loading states, icons)

---

## Challenges We Tackled

- Keeping the reverse-offer flow intuitive
- Designing for both marketplace users and student entrepreneurs
- Building realtime UX with stable state updates
- Prioritizing a focused MVP under hackathon time limits

---

## What’s Next

- Expand the student business dashboard (appointments + CRM depth)
- Add in-app messaging and stronger notification workflows
- Improve trust/safety tooling and moderation flows
- Pilot on campus and iterate from user feedback

---

## Team

Built at **HackURI** by Team **QuadCommerce**.