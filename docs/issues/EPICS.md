# Epic Backlog (from architecture-specification.md)

## EPIC-01: Platform Foundation & DevEx
**Goal:** Establish baseline repo structure, environments, CI/CD, and standards.
- Deliverables: monorepo/app structure, lint/type/test pipeline, env config, Docker baseline.
- Acceptance: CI green, dev/staging bootstrapped.

## EPIC-02: Identity, Auth & RBAC
**Goal:** Secure auth and role-aware access.
- Deliverables: register/login/refresh/logout, JWT rotation, RBAC guards.
- Acceptance: role-based endpoint protection validated.

## EPIC-03: Campus Exchange Marketplace
**Goal:** Listing and reverse-auction flow.
- Deliverables: listing CRUD/filter, offers create/counter/accept/reject, expiration jobs.
- Acceptance: end-to-end sell/buy lifecycle in staging.

## EPIC-04: Realtime Messaging & Notifications
**Goal:** Real-time user feedback loops.
- Deliverables: WS events, in-app notifications, reminder jobs.
- Acceptance: offer and appointment events update live.

## EPIC-05: Student Biz Hub (Appointments + CRM-lite)
**Goal:** Enable student business operations.
- Deliverables: services, availability, appointments, customer profiles/history.
- Acceptance: booking lifecycle complete and auditable.

## EPIC-06: Analytics & Dashboard KPIs
**Goal:** Product and ops insights.
- Deliverables: event ingestion, KPI endpoints, dashboard metrics.
- Acceptance: core KPIs visible and validated.

## EPIC-07: Trust, Safety & Moderation
**Goal:** Abuse controls and admin governance.
- Deliverables: reporting flows, moderation queue/actions, audit logs.
- Acceptance: admin can resolve reports with traceability.

## EPIC-08: Security, Reliability & Observability
**Goal:** Production-readiness against architecture acceptance criteria.
- Deliverables: rate limits, backup/restore runbook, traces/metrics/alerts, load test.
- Acceptance: p95 latency target and recovery test passed.
