# Architecture Specification Document
## QuadCommerce — Campus Exchange + Student Biz Hub
**Version:** 2.0  
**Date:** 2026-02-21  
**Status:** Draft (Expanded Page-Centric Architecture)

---

## 1. Purpose and Scope
This document defines the technical architecture, product boundaries, and implementation requirements for QuadCommerce, a campus-focused web application that combines:

1. A reverse-auction marketplace for student-to-student textbook and dorm-item exchange.
2. A services and appointment management experience for student-run businesses.
3. A role-aware account system anchored by school email verification.
4. A multi-page, modern web interface with real-time communication and state updates.

This version of the architecture explicitly incorporates a page-by-page specification for the following routes:

- `/login`
- `/register`
- `/` (dashboard)
- `/profile`
- `/services`
- `/chats`
- `/sell`

It also codifies technical requirements needed to support these routes at production quality, while preserving the current MVP momentum and existing MongoDB-centered backend direction.

---

## 2. Product Vision and Operating Model
QuadCommerce is designed to solve two high-frequency student workflows inside one campus identity model:

- **Students as consumers/sellers of physical goods** (books, dorm supplies, miscellaneous items)
- **Students as service providers/business operators** (e.g., tutoring, barbering, design, repair services)

The platform adopts role-aware behavior:

- **Student role:** browse listings, place offers, book services, chat
- **Business owner role:** create services, manage appointments, chat, optionally sell products

The system should remain modular so that marketplace and services can evolve independently while sharing identity, trust, notifications, and communications layers.

---

## 3. Architectural Principles
1. **Page-driven domain clarity:** each primary page maps to concrete backend capabilities and domain aggregates.
2. **Secure-by-default auth:** JWT with expiry, bcrypt password hashing, role-scoped authorization, and `.edu` registration constraints.
3. **Realtime where it matters:** listings and chat require low-latency synchronization via WebSockets.
4. **Mongo-first data layer:** document modeling optimized for high iteration speed and evolving product schemas.
5. **Incremental production hardening:** preserve MVP velocity while introducing testability, observability, and failure controls in layers.
6. **Role-aware UX and API contracts:** avoid mixed permissions in UI and enforce access server-side.
7. **Composable modules:** identity, listings, services, appointments, and chat should be separable into services later.

---

## 4. Functional Architecture by Page

### 4.1 Login Page (`/login`)
#### Page Contents
- Email and password fields
- Login action with async state
- Error and invalid credential feedback
- Link to registration
- Optional “remember device” control (planned)

#### Backend Dependencies
- `POST /api/auth/login`

#### Technical Requirements
- Validate payload shape before request submission
- Normalize email to lowercase server-side
- Compare passwords with bcrypt hash
- Issue signed JWT token with `sub`, `role`, and expiry
- Return canonical user payload with `schoolVerified` boolean
- Persist token in secure client storage strategy (currently localStorage for MVP; httpOnly cookie migration planned)

#### Security Requirements
- Rate-limit login endpoint by IP + identifier
- Generic auth failure responses to avoid user enumeration
- Add structured security log events for failed attempts

---

### 4.2 Registration Page (`/register`)
#### Page Contents
- Name
- School email input
- Password input
- Role selector (`student`, `businessOwner`)
- Register CTA
- Inline form validation

#### Backend Dependencies
- `POST /api/auth/register`

#### Technical Requirements
- Enforce `.edu` constraint in validation layer
- Enforce unique email index in MongoDB
- Hash password using bcrypt (cost configurable)
- Return signed JWT and user object after registration
- Provide deterministic error structures for form-level mapping

#### School Verification Requirements
- Current verification policy: `.edu` domain acceptance
- Planned upgrade path:
  - OTP email verification challenge
  - domain trust scoring and allowlist/denylist
  - optional campus tenant mapping by domain

---

### 4.3 Dashboard Page (`/`)
#### Page Contents
- High-level KPI cards (listings, offers, appointments)
- Role-aware summary blocks
- Navigation launch points to key workflows

#### Backend Dependencies
- `GET /api/listings`
- `GET /api/appointments` (authenticated)
- Future: aggregate endpoint (`GET /api/dashboard`)

#### Technical Requirements
- Dashboard should assemble data from multiple bounded contexts
- Prefer a dedicated aggregate endpoint in Phase 2 to reduce client fan-out
- Include timestamped freshness metadata on dashboard payloads
- Add role-specific blocks:
  - student: active bids, upcoming bookings
  - business owner: services count, upcoming appointments, booking status distribution

---

### 4.4 Profile Page (`/profile`)
#### Page Contents
- User identity display (name/email/role)
- Verified school email indicator
- Editable profile fields (name, role in MVP)
- Save action and confirmation state

#### Backend Dependencies
- `GET /api/me`
- `PATCH /api/me`

#### Technical Requirements
- Auth guard required for all profile operations
- Profile writes must be schema-validated
- Role changes should be auditable and optionally restricted
- Store immutable account metadata separately from mutable profile metadata in future schema iterations

#### Governance Requirements
- Add audit logs for profile edits
- Add future field-level privacy controls

---

### 4.5 Services Page (`/services`)
#### Page Contents
- Business owner service creation form
- Service list cards/table
- Student booking interactions
- Appointment section for current user context

#### Backend Dependencies
- `GET /api/services`
- `POST /api/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`
- `POST /api/appointments`
- `GET /api/appointments`
- `PATCH /api/appointments/:id`

#### Technical Requirements
- Service ownership model (`ownerId` must match authenticated user)
- Role guard for service creation and modification (`businessOwner` only)
- Student booking flow must reference active service records
- Appointment model must include:
  - service reference
  - business owner reference
  - customer reference
  - schedule timestamp
  - status lifecycle

#### Data Integrity Requirements
- Validate appointment `startAt` timezone-safe ISO format
- Prevent booking against inactive/deleted services
- Enforce status transition rules (`scheduled -> completed/cancelled`)
- Future: conflict detection for overlapping appointments by owner

---

### 4.6 Chats Page (`/chats`)
#### Page Contents (Current)
- Shared global chat feed
- Message timeline
- Message composer
- Realtime updates

#### Target UX Pattern (Required)
Implement Instagram-desktop-style structure:
- **Left pane:** conversation menu (thread list with unread counters and previews)
- **Right pane:** active thread area with message history
- **Top right header:** participant/thread context
- **Bottom right composer:** sticky input + send control

#### Backend Dependencies
- `GET /api/chats`
- `POST /api/chats`
- Socket event: `chat:new`

#### Technical Requirements
- Move from single global feed to conversation/thread entities in next phase
- Messages should carry sender identity snapshot and timestamp
- Add thread metadata model:
  - participant IDs
  - context type (`listing`, `service`, `support`, `direct`)
  - unread counters per user
- Support pagination and cursor-based loading for long threads

#### Moderation and Safety Requirements
- Message length caps and sanitization
- Report message endpoint (planned)
- Abuse keyword detection pipeline (planned)

---

### 4.7 Sell Products Page (`/sell`)
#### Page Contents
- Listing creation form
- Listing feed/cards
- Offer placement actions
- Seller acceptance controls
- Live status reflection

#### Backend Dependencies
- `GET /api/listings`
- `POST /api/listings`
- `POST /api/listings/:id/offers`
- `POST /api/listings/:id/accept-offer`
- Socket event: `listings:updated`

#### Technical Requirements
- Listing lifecycle state machine: `OPEN`, `SOLD`, `CLOSED`
- Offer window expiration timestamp required
- Offer sorting and winner determination
- Seller action should atomically select accepted offer and close marketplace race

#### Future Reverse-Auction Requirements
- Reserve price and auto-accept thresholds
- Counter-offer support
- countdown timers and urgency indicators
- handoff/workflow confirmation and completion record

---

## 5. System Architecture (Containers and Responsibilities)

### 5.1 Client Container
**Tech:** React + Vite + TypeScript + React Router  
Responsibilities:
- route rendering
- auth state hydration
- form validation and API invocation
- websocket subscription for listings/chat updates
- role-aware navigation and component visibility

### 5.2 API Container
**Tech:** Node.js + Express + TypeScript  
Responsibilities:
- route handling and schema validation (Zod)
- auth and authorization
- domain operations for listings/services/appointments/chat
- event emission through socket server

### 5.3 Realtime Gateway
**Tech:** Socket.IO server in same Node process (current)  
Responsibilities:
- publish listing changes and chat events
- handle client connection lifecycle
- future: namespace/channel isolation by tenant/thread

### 5.4 Database
**Tech:** MongoDB (local service + fallback memory server)  
Responsibilities:
- durable storage of users, listings, services, appointments, chat messages
- indexed query performance
- role ownership checks via document references

### 5.5 Background Processing (Planned)
**Tech:** Redis + BullMQ (future sprint)  
Responsibilities:
- listing expiration jobs
- appointment reminders
- retry-safe notifications
- analytics aggregation

---

## 6. Data Architecture

### 6.1 Collections
- `users`
- `listings`
- `services`
- `appointments`
- `chatmessages` (or `chat_threads` + `chat_messages` in next phase)

### 6.2 Key Entity Requirements

#### users
- unique `email`
- `passwordHash`
- `role`
- `.edu` validation prior to creation

#### listings
- seller metadata
- category and description
- status and offer window
- embedded offers with amount + bidder + timestamp

#### services
- owner reference
- duration and pricing
- active/inactive status

#### appointments
- references service, owner, customer
- scheduled timestamp
- status transitions

#### chat messages
- sender reference and sender snapshot
- message text
- creation time
- migration path to threaded model

### 6.3 Index Requirements
- `users.email` unique
- `services.ownerId` indexed
- `appointments.businessOwnerId`, `appointments.customerUserId`, `appointments.startAt` indexed
- `listings.createdAt` + `status` indexed
- `chatmessages.createdAt` indexed

---

## 7. Authentication and Authorization Specification

### 7.1 Authentication
- JWT signed with environment secret
- expiry controlled by server config
- token payload includes `sub`, `role`, `email`

### 7.2 Authorization
- endpoint-level auth middleware mandatory for protected routes
- role restrictions:
  - only business owners can create/update/delete services
  - only business owners can update appointment statuses
  - all authenticated users can post chat messages

### 7.3 Password Security
- bcrypt hashing at account creation
- bcrypt verification at login
- no plaintext password persistence

### 7.4 Session Evolution Path
- current: bearer token in client storage
- target: refresh token + rotating sessions + optional cookie mode

---

## 8. API Contract Requirements

### 8.1 Response Consistency
All API responses should be typed and stable:
- success payloads with canonical fields
- error payloads with `error` and optional `fieldErrors`

### 8.2 Validation
- Zod schema on every mutation endpoint
- reject invalid payloads with 400-level responses

### 8.3 Versioning Strategy
- current: unversioned `/api/*`
- target: `/api/v1/*` with compatibility policy

### 8.4 Endpoint Inventory (Current)
Auth:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`
- `PATCH /api/me`

Listings:
- `GET /api/listings`
- `POST /api/listings`
- `POST /api/listings/:id/offers`
- `POST /api/listings/:id/accept-offer`

Services:
- `GET /api/services`
- `POST /api/services`
- `PATCH /api/services/:id`
- `DELETE /api/services/:id`

Appointments:
- `POST /api/appointments`
- `GET /api/appointments`
- `PATCH /api/appointments/:id`

Chats:
- `GET /api/chats`
- `POST /api/chats`

Realtime events:
- `listings:updated`
- `chat:new`

---

## 9. Realtime Architecture Requirements
1. Socket connections must be resilient to reconnects.
2. Event payloads should be minimal and typed.
3. Client should support optimistic and server-confirmed updates where applicable.
4. Event channels should move toward scoped streams (by conversation/listing) to reduce broadcast noise.
5. Add event-level telemetry for publish failures and lag.

---

## 10. UX and Frontend Routing Requirements

### 10.1 Route Map
- Public routes: `/login`, `/register`
- Protected routes: `/`, `/profile`, `/services`, `/chats`, `/sell`

### 10.2 Route Guards
- redirect unauthenticated users to login
- enforce role-specific actions inside pages

### 10.3 Shared Layout
- persistent top nav
- theme toggle
- role-aware menu visibility
- notification entrypoint (planned)

### 10.4 Design Language
- polished, modern, high-contrast in both light and dark themes
- motion should be subtle and not block interaction
- skeleton loading and empty states required for non-instant data paths

---

## 11. Quality Attributes and SLO Targets
- Availability target: 99.5% (MVP baseline)
- API p95 latency target: <300ms under expected campus load
- realtime event propagation target: <500ms median
- auth failure false-positive rate: near zero
- UI first-content interaction target: <2s on common devices

---

## 12. Testing and Verification Requirements

### 12.1 Required Test Layers
1. Unit tests for validation and domain logic
2. API integration tests for auth/listings/services/appointments/chat
3. Realtime event tests for listings and chat broadcasts
4. Role authorization tests (student vs businessOwner)

### 12.2 Priority Test Cases
- reject non-`.edu` registration
- reject invalid login
- service creation forbidden for student role
- appointment booking only against active services
- listing acceptance changes status to `SOLD`
- chat message broadcast reaches connected clients

### 12.3 Build and CI Gates
- lint
- type-check
- test suite
- optional dependency security scan

---

## 13. Observability and Operational Requirements

### 13.1 Logging
- structured JSON logs preferred in production
- include request IDs, route, response code, latency
- redact sensitive data (passwords, tokens)

### 13.2 Metrics
- API route latency and error rates
- websocket connected clients and event throughput
- Mongo query latency and slow query tracking

### 13.3 Alerts (Planned)
- sustained 5xx spikes
- websocket disconnect storm
- failed auth anomaly thresholds
- elevated DB write failures

---

## 14. Security and Privacy Requirements
1. Enforce TLS for production deployments.
2. Store secrets in environment/secret manager; never in source control.
3. Keep JWT secret rotation capability.
4. Add request throttling on auth and chat endpoints.
5. Validate and sanitize all user-generated text content.
6. Introduce moderation/reporting primitives for chat and listings.
7. Build data deletion/export workflows for compliance readiness.

---

## 15. Deployment Requirements
- Environment tiers: local, staging, production
- Environment-specific configuration via env vars
- MongoDB must run as replica set in production for reliability
- stateless API horizontal scaling supported
- sticky session not required if JWT + socket auth strategy is correctly implemented

---

## 16. Roadmap Alignment to Current Tickets
This architecture maps to existing issue categories:
- Sprint 1: auth hardening, base CRUD, role controls, initial appointments
- Sprint 2: threaded chat model, richer service scheduling, dashboard aggregate endpoint
- Sprint 3: moderation/admin tooling, observability hardening, load testing and operational drills

---

## 17. Open Decisions
1. Chat architecture migration timeline (global feed to thread model).
2. Token storage model in web client (localStorage vs cookie strategy).
3. Whether role changes should be user-controlled or admin-controlled.
4. Appointment conflict policy (hard block overlaps vs allow with warning).
5. Whether reverse-auction reserve/counter mechanics ship in next sprint or after notifications layer.

---

## 18. Acceptance Criteria for This Spec Version
This architecture version is accepted when:
1. Multi-page route architecture is implemented and documented.
2. `.edu` registration policy and JWT+bcrypt auth are operational.
3. Services, appointments, and reverse-auction listings have stable APIs.
4. Chat page supports realtime interactions and defines Instagram-style thread-menu target.
5. Build, type-check, and baseline endpoint verification pass in local environment.

---

## 19. Summary
QuadCommerce now has a clear, page-centered technical blueprint with explicit route contracts, domain responsibilities, role constraints, and realtime behavior expectations. The system remains MVP-friendly while introducing foundational production practices: secure auth, typed validation, modular data boundaries, and path-to-scale architecture. The next iterations should focus on thread-based chat UX, scheduling sophistication, operational observability, and deeper marketplace trust features.
