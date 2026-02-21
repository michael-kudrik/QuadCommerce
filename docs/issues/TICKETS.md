# Ticket Backlog

## Foundation
- [ ] TKT-001 Initialize Next.js + NestJS + shared TypeScript config
- [ ] TKT-002 Dockerize API/web/worker with local compose stack
- [ ] TKT-003 Configure CI gates (lint, type-check, unit tests, dependency scan)
- [ ] TKT-004 Environment config management for dev/staging/prod

## Auth & Access
- [ ] TKT-010 Implement user registration + .edu verification policy
- [ ] TKT-011 Implement login/refresh/logout with rotating refresh tokens
- [ ] TKT-012 Add RBAC guards for student/businessOwner/admin roles
- [ ] TKT-013 Add auth rate limiting and brute-force protection

## Marketplace
- [ ] TKT-020 Create listings collection + DTO/schema validation
- [ ] TKT-021 Implement listing CRUD + filter/search endpoints
- [ ] TKT-022 Implement offers collection + create/counter/accept/reject flow
- [ ] TKT-023 Build offer window expiration worker (BullMQ)
- [ ] TKT-024 Add listing/offer Atlas Search and compound indexes

## Business Hub
- [ ] TKT-030 Implement business profiles and service catalog APIs
- [ ] TKT-031 Implement availability model and appointment scheduling API
- [ ] TKT-032 Implement customer profile/history APIs (CRM-lite)
- [ ] TKT-033 Implement appointment reminders job flow

## Realtime + Notifications
- [ ] TKT-040 Implement WebSocket gateway and auth handshake
- [ ] TKT-041 Emit and consume event contracts (offer.*, appointment.*)
- [ ] TKT-042 Build in-app notification read/unread lifecycle
- [ ] TKT-043 Add email notification provider adapter

## Analytics
- [ ] TKT-050 Create events ingestion endpoint and schema
- [ ] TKT-051 Build KPI aggregation jobs (bookings/revenue/retention/no-show)
- [ ] TKT-052 Expose dashboard KPI API endpoints

## Moderation & Safety
- [ ] TKT-060 Implement report submission and moderation queue
- [ ] TKT-061 Implement admin actions with audit logging
- [ ] TKT-062 Add file upload policy (MIME/size/scan pipeline hooks)

## Observability & Ops
- [ ] TKT-070 Add structured logging + request correlation IDs
- [ ] TKT-071 Add OpenTelemetry traces and metrics
- [ ] TKT-072 Add alerting for p95 latency, 5xx spikes, queue backlog
- [ ] TKT-073 Document backup/restore runbook and execute restore drill
- [ ] TKT-074 Run load test and validate p95 < 300ms target

## Open Decisions (Tracking)
- [ ] DEC-001 Select payment/escrow strategy and milestone
- [ ] DEC-002 Decide chat persistence model
- [ ] DEC-003 Decide analytics store strategy (Mongo-only vs warehouse)
- [ ] DEC-004 Confirm multi-campus tenancy isolation policy
