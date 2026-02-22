# Multi-Agent Board (Orchestrator)

## Status Legend
- TODO
- IN_PROGRESS
- DONE
- BLOCKED

## Active Sprint: Multi-Agent Kickoff

### ORCH-001 Establish orchestration artifacts
- Owner: orchestrator(main)
- Status: DONE
- Output: board + task packets + run log

### BE-001 Backend hardening packet execution
- Owner: subagent-backend
- Status: IN_PROGRESS
- Scope:
  - auth robustness checks
  - chat user-scope verification
  - endpoint contract sanity checks

### FE-001 Frontend structure + auth-flow reliability packet
- Owner: subagent-frontend
- Status: IN_PROGRESS
- Scope:
  - route/component structure audit
  - login/register timeout UX checks
  - route guard behavior validation

### RT-001 Realtime/Chat packet
- Owner: subagent-realtime
- Status: IN_PROGRESS
- Scope:
  - socket room isolation validation
  - conversation-pane behavior against API
  - event contract consistency

### QA-001 Integration smoke packet
- Owner: subagent-qa
- Status: IN_PROGRESS
- Scope:
  - register/login/book/send-message smoke script
  - bug list + repro steps

## Merge Gate
All IN_PROGRESS tasks must provide:
1. Changed files
2. Commands run
3. Pass/fail evidence
4. Open risks
