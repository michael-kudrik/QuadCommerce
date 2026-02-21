# Architecture Technical Document
## Campus Exchange + Student Biz Hub (MongoDB Edition)

## 1. Purpose
This document defines the target technical architecture for a campus-focused platform with:
1. A reverse-auction marketplace for student textbooks/dorm goods.
2. A business operations dashboard for student-run businesses (appointments, customers, analytics).

## 2. System Scope
### In Scope
- Web and mobile-responsive client application
- Authentication and campus verification
- Marketplace listing + offer lifecycle
- Realtime updates (offers/chat/notifications)
- Business scheduling and CRM-lite features
- Analytics pipeline for operational KPIs

### Out of Scope (Phase 1)
- Full accounting suite
- Complex payment escrow and dispute engine
- Native mobile apps (web-first)

## 3. High-Level Architecture
- **Frontend**: Next.js (React + TypeScript)
- **API Layer**: Node.js (NestJS preferred) REST + WebSocket gateway
- **Primary Database**: MongoDB (replica set)
- **Cache/Queue**: Redis (BullMQ for jobs)
- **Search**: MongoDB Atlas Search
- **Object Storage**: S3-compatible bucket for media
- **Observability**: OpenTelemetry + centralized logs + metrics
- **Deployment**: Dockerized services on cloud VM/Kubernetes

## 4. Logical Components
1. **Auth Service**
   - Email/password + OAuth
   - JWT issuance (short-lived access + refresh tokens)
   - .edu domain verification and role assignment

2. **Marketplace Service**
   - Listing CRUD
   - Offer submission/counter/accept workflows
   - Offer-window expiration jobs

3. **Business Hub Service**
   - Service catalog management
   - Availability rules and booking lifecycle
   - Customer profile and appointment history

4. **Realtime Gateway**
   - WebSocket channels for listing updates, offer events, and chat events

5. **Notification Service**
   - In-app + email notifications
   - Reminder jobs (offer deadline, booking reminders)

6. **Analytics Service**
   - Event ingestion
   - Aggregation for dashboard KPIs

## 5. MongoDB Data Design
Use MongoDB collections with indexed references (not over-embedded for high-churn relations).

### Core Collections
- `users`
- `campuses`
- `listings`
- `offers`
- `transactions`
- `businessProfiles`
- `services`
- `appointments`
- `customers`
- `messages`
- `notifications`
- `events`

### Example Document Shapes (Simplified)
```json
// listings
{
  "_id": "ObjectId",
  "sellerId": "ObjectId",
  "campusId": "ObjectId",
  "title": "Calculus 8th Edition",
  "category": "textbook",
  "condition": "good",
  "images": ["https://..."],
  "status": "active",
  "offerWindowEndsAt": "2026-03-01T15:00:00Z",
  "createdAt": "...",
  "updatedAt": "..."
}

// offers
{
  "_id": "ObjectId",
  "listingId": "ObjectId",
  "bidderId": "ObjectId",
  "amount": 45,
  "status": "pending",
  "createdAt": "..."
}
```

### Recommended Indexes
- `users`: `{ email: 1 }` unique
- `listings`: `{ campusId: 1, status: 1, createdAt: -1 }`
- `listings`: Atlas Search index on title/description/category
- `offers`: `{ listingId: 1, amount: -1, createdAt: -1 }`
- `appointments`: `{ businessId: 1, startAt: 1 }`
- `customers`: `{ businessId: 1, email: 1 }`
- `events`: `{ type: 1, createdAt: -1 }`

## 6. API Design (Initial)
### REST Endpoints (Examples)
- `POST /auth/register`
- `POST /auth/login`
- `GET /listings`
- `POST /listings`
- `POST /listings/:id/offers`
- `POST /offers/:id/accept`
- `GET /business/dashboard`
- `POST /appointments`
- `PATCH /appointments/:id`

### Realtime Events
- `listing.offer.created`
- `listing.offer.accepted`
- `listing.closed`
- `appointment.created`
- `appointment.reminder`

## 7. Security Architecture
- JWT access tokens + refresh token rotation
- Role-based access control (student, businessOwner, admin)
- Input validation at API boundary (Zod/class-validator)
- Rate limiting on auth and offer endpoints
- File upload scanning + MIME checks
- Secrets in vault/provider secret manager
- Encrypted traffic (TLS everywhere)

## 8. Reliability & Scalability
- MongoDB replica set for high availability
- Redis-backed queue workers for async workloads
- Horizontal scaling of stateless API and websocket nodes
- Idempotent job handling for reminders/expirations
- Circuit breakers/retries for third-party integrations

## 9. Observability
- Structured logging with request correlation IDs
- Metrics:
  - API latency p95/p99
  - Offer event throughput
  - Booking conversion rates
- Distributed tracing for auth → service → DB calls
- Alerts for error rate spikes and job backlog growth

## 10. DevOps & Environments
- Environments: dev / staging / prod
- CI pipeline:
  - lint + type-check
  - unit/integration tests
  - security scan (dependencies + SAST)
  - container build + deploy
- IaC for repeatable infra provisioning

## 11. MVP Delivery Plan (Technical)
### Phase 1 (Weeks 1–4)
- Auth, user roles, listing CRUD, basic offer flow, MongoDB schema/index baseline

### Phase 2 (Weeks 5–8)
- Realtime updates, chat, business services/appointments, notification jobs

### Phase 3 (Weeks 9–12)
- Analytics dashboards, moderation tooling, hardening, load/perf testing

## 12. Risks & Mitigations
- **Data model drift in NoSQL** → strict schema validation layer + migration scripts
- **Hot collections under load** → careful indexing + shard-readiness planning
- **Realtime complexity** → event contracts + retry-safe consumers
- **Abuse/fraud risk** → moderation queue + trust scoring + reporting UX

## 13. Future Enhancements
- Escrow/payment provider integration
- Multi-campus federation and tenant isolation controls
- Recommendation engine for price guidance and matching
- Native mobile app clients
