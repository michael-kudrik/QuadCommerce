# Architecture Specification Document
## Campus Exchange + Student Biz Hub
**Version:** 1.0  
**Date:** 2026-02-21  
**Status:** Draft

---

## 1. Document Purpose
This specification defines the target architecture, constraints, and implementation standards for a platform serving:
1. A student-to-student reverse-auction marketplace for textbooks/dorm goods.
2. A student-business operations dashboard for appointments, customer management, and analytics.

---

## 2. Goals and Non-Goals
### 2.1 Goals
- Deliver an MVP within 8–12 weeks.
- Support multi-campus usage with role-based access.
- Provide real-time offer/booking updates.
- Ensure secure, auditable, and scalable service behavior.

### 2.2 Non-Goals (MVP)
- Full ERP/accounting workflows.
- Advanced escrow/dispute automation.
- Native iOS/Android applications.

---

## 3. Functional Scope
### 3.1 Marketplace (Campus Exchange)
- Listing creation, editing, archive/sold lifecycle.
- Offer submission and seller acceptance/counter-reject.
- Offer windows with expiration handling.
- In-app messaging and handoff coordination.
- Reporting and moderation workflows.

### 3.2 Business Hub
- Service catalog and pricing.
- Business availability and appointment scheduling.
- Customer profile management (CRM-lite).
- Dashboard analytics (bookings, revenue, retention, no-shows).

### 3.3 Shared Platform Capabilities
- Authentication and authorization.
- Notification system (in-app/email).
- Search and filtering.
- Admin moderation controls.

---

## 4. Quality Attributes (NFRs)
- **Availability:** 99.5% MVP target.
- **Performance:** Core API p95 < 300ms under expected load.
- **Scalability:** Horizontal scale for stateless services.
- **Security:** TLS, RBAC, secure secrets, audit logs.
- **Reliability:** Idempotent jobs; retry-safe background processing.
- **Usability:** Mobile-first responsive UX; accessibility baseline WCAG AA.

---

## 5. Architecture Overview
### 5.1 Technology Stack
- **Frontend:** Next.js (React, TypeScript)
- **Backend:** Node.js + NestJS (modular monolith for MVP)
- **Database:** MongoDB (replica set / Atlas)
- **Cache/Queue:** Redis + BullMQ
- **Realtime:** WebSockets (Socket.IO or native WS)
- **Search:** MongoDB Atlas Search
- **Storage:** S3-compatible object storage
- **Observability:** OpenTelemetry + logs + metrics

### 5.2 Architectural Style
- Modular monolith at launch, designed for service extraction if scale requires.
- Domain modules: Auth, Marketplace, BusinessHub, Notifications, Analytics, Moderation.

---

## 6. Context and Containers (C4-style)
### 6.1 System Context
- Primary actors: Students, Student Business Owners, Administrators.
- External systems: Email provider, object storage, optional payment provider.

### 6.2 Containers
1. **Web Client** (Next.js)
2. **API Application** (NestJS REST + WS)
3. **Worker Process** (BullMQ jobs)
4. **MongoDB Cluster**
5. **Redis**
6. **Object Storage**

---

## 7. Domain Model Specification
### 7.1 Core Collections
- `users`, `campuses`, `listings`, `offers`, `transactions`
- `businessProfiles`, `services`, `appointments`, `customers`
- `messages`, `notifications`, `events`, `auditLogs`

### 7.2 Data Constraints
- Strong validation at application layer (DTO + schema validators).
- Unique keys where required (email, external IDs).
- Soft deletes for compliance and recovery.
- Timestamps (`createdAt`, `updatedAt`) mandatory on all mutable entities.

### 7.3 Indexing Requirements
- Compound indexes for top query paths (campus+status, listing+amount, business+time).
- Atlas Search indexes for listing title/description/category.
- Periodic index review based on slow query logs.

---

## 8. API Contract Specification
### 8.1 API Style
- REST for transactional operations.
- WebSocket events for real-time updates.

### 8.2 Minimum Endpoint Set (MVP)
- Auth: register/login/refresh/logout
- Listings: CRUD + list/filter
- Offers: create/counter/accept/reject
- Appointments: CRUD + calendar views
- Customers: CRUD + history
- Dashboard: KPI summary endpoints

### 8.3 Event Contract Examples
- `offer.created`
- `offer.accepted`
- `listing.expired`
- `appointment.created`
- `appointment.reminder.sent`

All events must include `eventId`, `timestamp`, `entityId`, and `actorId` (when available).

---

## 9. Security Specification
- JWT-based auth (short-lived access token + rotating refresh token).
- RBAC: `student`, `businessOwner`, `admin`.
- Endpoint-level authorization guards.
- Input validation + output sanitization.
- Rate limits on auth, messaging, and offer endpoints.
- File upload constraints: type, size, malware scanning pipeline.
- Secrets management through environment vault (no plaintext in repo).
- Audit log for privileged/admin actions.

---

## 10. Reliability and Operations
### 10.1 Background Jobs
- Offer expiration processor
- Reminder scheduler (appointments/offers)
- Notification dispatch retries
- Analytics aggregation jobs

### 10.2 Failure Handling
- Exponential backoff retries with dead-letter queues.
- Idempotency keys for mutation-heavy endpoints.
- Graceful degradation for non-critical services (analytics/notifications).

### 10.3 Backup and Recovery
- Daily MongoDB backups with retention policy.
- Restore runbook tested at least monthly.
- Object storage lifecycle and versioning configured.

---

## 11. Observability Specification
- Structured logs with request correlation IDs.
- Metrics:
  - API latency, throughput, error rates
  - Queue depth and retry counts
  - WebSocket connection health
- Distributed traces across API, DB, queue, and third-party calls.
- Alerting thresholds for p95 latency, 5xx error spikes, and worker backlog.

---

## 12. Deployment Specification
- Environments: `dev`, `staging`, `prod`.
- CI/CD gates: lint, type-check, tests, dependency scan, container scan.
- Blue/green or rolling deployments for API service.
- Configuration via environment variables and centralized secret store.

---

## 13. Compliance and Data Governance
- Data minimization for user profile fields.
- Privacy controls for message and customer data retention.
- Campus-specific policy hooks (if legal requirements differ).
- Export/delete user data workflows (post-MVP recommended, design-ready in MVP).

---

## 14. Acceptance Criteria
Architecture implementation is accepted when:
1. MVP feature set is functional in staging.
2. Required security controls are in place and validated.
3. Load test demonstrates target p95 API latency under expected usage.
4. Backup and restore test has passed.
5. Observability dashboards and alerts are operational.

---

## 15. Open Decisions
1. Payment/escrow provider selection and integration timing.
2. Chat persistence model (single collection vs thread-oriented partitioning).
3. Analytics storage strategy (Mongo-only vs warehouse in Phase 2).
4. Multi-campus tenancy boundaries (soft vs hard isolation).
