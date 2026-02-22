# Multi-Agent Board (Fix Execution)

## Run: Prompt #1 Fix Pack

### ORCH-003 Execute required fixes from Prompts/prompts.md
- Owner: orchestrator(main)
- Status: IN_PROGRESS

## Task Set

### FE-003 Marketplace UI identity constraints
- Owner: subagent-frontend-a
- Status: IN_PROGRESS
- Scope:
  1) Remove bidder input from sell offers UI
  2) Use logged-in user name for bidder
  3) Show "Logged in as <user>" top-right

### BE-003 Marketplace bidder/seller guard
- Owner: subagent-backend-a
- Status: IN_PROGRESS
- Scope:
  1) Enforce bidder != seller in API
  2) Use authed user identity for bids (no bidderName from client)

### FE-004 Dashboard + profile UX
- Owner: subagent-frontend-b
- Status: IN_PROGRESS
- Scope:
  1) Dashboard sales graphics
  2) Owner-scoped products/services sold only
  3) Profile description + portfolio URL fields

### BE-004 Appointments approval + chat bootstrap
- Owner: subagent-backend-b
- Status: IN_PROGRESS
- Scope:
  1) Appointment pending status + approve/deny endpoints
  2) Auto chat thread seed on appointment creation/approval

### FE-005 Services scheduling + discovery
- Owner: subagent-frontend-c
- Status: IN_PROGRESS
- Scope:
  1) Calendar date selection for booking
  2) Services page shows all available business services

### QA-003 Integrated regression
- Owner: subagent-qa-a
- Status: IN_PROGRESS
- Scope: Validate all required fixes with pass/fail matrix

## Required reporting
1. Task ID
2. Files changed
3. Validation commands/evidence
4. Remaining risks
