# AGENT_PLAYBOOK.md — BBB AI Coding Agent Workflow

**Project:** BBB Digital Library  
**Version:** 1.0  
**Date:** 11 Aug 2026

This file controls how AI agents work on the project.

---

# 1. PRIMARY OBJECTIVE

The goal is not maximum autonomous coding.

The goal is:

> **Maximum continuity with minimum hallucination.**

The second goal is:

> **Protect the 3D Library Room as the hero experience.**

The Library Room has priority over secondary pages and optional features. If the core room is not reliably displaying real archive books and supporting the physical "take a book out" interaction, the agent should not spend a large task on unrelated polish.

The agent must behave as though it has inherited an existing engineering project from another developer.

---

# 1A. HERO EXPERIENCE RULE

Before accepting a task, ask:

```text
Does this improve, enable, stabilize, or verify the 3D Library Room?
```

If yes, it is high priority.

If no, it may be deferred unless it is required infrastructure.

### Library Room acceptance loop

For Library Room tasks, verify the complete loop:

```text
API
 ↓
real books
 ↓
shelf
 ↓
3D book
 ↓
hover/focus
 ↓
pull-out interaction
 ↓
archival history
 ↓
reader/member + meetup + date information
 ↓
book detail
```

A task that only makes the shelf prettier while real data is broken is not considered a successful priority outcome.

# 2. CONTEXT STACK

At the beginning of a session, read:

```text
1. MASTER_FOUNDATION_PROMPT.md
2. BUILD_GUIDE.md
3. SESSION_LOG.md
4. relevant source files
5. relevant task specification
```

Do not read the entire repository blindly unless performing an explicit audit.

---

# 3. SESSION START PROTOCOL

Every new session begins with:

## Phase 1 — Discover

Inspect:

```text
pwd
git status
project tree
package files
Python dependency files
relevant source
```

## Phase 2 — Read project memory

Read:

```text
MASTER_FOUNDATION_PROMPT.md
BUILD_GUIDE.md
SESSION_LOG.md
```

## Phase 3 — Establish current state

Report:

```markdown
## Current State

Backend:
- ...

Frontend:
- ...

Database:
- ...

Library:
- ...

Book detail:
- ...

Known issue:
- ...

Last completed task:
- ...

Next intended task:
- ...
```

## Phase 4 — Do not immediately code

First identify:

- exact problem,
- affected files,
- current behavior,
- expected behavior,
- root cause,
- smallest safe fix.

Then implement.

---

# 4. AGENT ROLES

## 4.1 Architect

Use for:

- architecture decisions,
- API boundaries,
- database changes,
- major refactors.

Read-only by default.

## 4.2 Backend Engineer

Use for:

- FastAPI,
- SQLAlchemy,
- database,
- API endpoints,
- archival data.

Must verify actual database/API behavior.

## 4.3 Frontend Engineer

Use for:

- Next.js,
- React,
- TypeScript,
- Library,
- Book detail,
- visual components.

Must verify the backend contract before changing data consumers.

## 4.4 UI / Interaction Engineer

Use for:

- Library Room,
- 3D book behavior,
- animations,
- shelf interactions,
- responsive behavior.

Must not change data architecture just to make a visual component easier.

## 4.5 Debugger

Use for:

- errors,
- failed fetches,
- broken routes,
- runtime issues,
- integration problems.

Process:

```text
reproduce
→ trace
→ identify root cause
→ propose smallest fix
→ implement
→ verify
```

## 4.6 Reviewer

Read-only.

Checks:

- acceptance criteria,
- architecture,
- API contract,
- regressions,
- unnecessary changes,
- hallucinated assumptions.

---

# 5. TASK FORMAT

Every task should use:

```markdown
# Task: <short title>

## Context

What currently exists.

## Problem

What is wrong.

## Expected behavior

What should happen.

## Acceptance criteria

- [ ] ...
- [ ] ...
- [ ] ...

## Files to inspect

- ...

## Files allowed to modify

- ...

## Out of scope

- ...

## Verification

- ...
```

---

# 6. TASK SIZE

### XS

Small isolated fix.

### S

One feature/component.

### M

Multiple related files.

### L

Architecture or major feature.

Never allow an L task to become an uncontrolled autonomous rewrite.

Split it.

---

# 7. IMPLEMENTATION PROTOCOL

The agent follows:

```text
READ
 ↓
UNDERSTAND
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
TEST
 ↓
DIFF
 ↓
REPORT
 ↓
UPDATE SESSION_LOG
```

Never:

```text
PROMPT
 ↓
CHANGE 30 FILES
 ↓
"done"
```

---

# 8. ANTI-HALLUCINATION RULES

## Rule A — Evidence tags

When uncertain, use:

```text
VERIFIED
INFERRED
UNVERIFIED
CONTRADICTED
```

Example:

```text
VERIFIED:
GET /books?limit=3000 returns 200.

UNVERIFIED:
The Library Room may be expecting a different response shape.

NEXT:
Inspect the actual JSON and the frontend adapter.
```

## Rule B — No imaginary files

Never say:

```text
I updated src/foo/bar.ts
```

until the file exists.

## Rule C — No imaginary endpoints

Never invent:

```text
/api/library/books
```

because it "sounds right."

Search the backend.

## Rule D — No imaginary data

Never invent archive statistics or records.

## Rule E — No assumption stacking

Bad:

```text
The API probably returns {books: []},
so the adapter is probably wrong,
so I'll rewrite the API.
```

Good:

```text
I need the actual response first.
```

---

# 9. WHEN THE AGENT GETS STUCK

If an error appears:

1. Stop making unrelated changes.
2. Capture the exact error.
3. Identify the command that produced it.
4. Inspect relevant code.
5. Attempt one focused fix.
6. Re-run.
7. If still blocked, report the blocker.

Never endlessly retry the same operation.

---

# 10. RATE LIMIT / AGENT LOOP PROTOCOL

If the coding agent shows:

```text
Too Many Requests
```

or repeated autonomous attempts without meaningful progress:

STOP.

Do not keep feeding it prompts.

Instead:

```text
Esc / interrupt
→ inspect git status
→ inspect git diff
→ inspect current application
→ record state in SESSION_LOG.md
→ restart with a smaller task
```

A rate-limited agent continuing to "think" is not evidence of progress.

---

# 11. MULTI-AGENT HANDOFF

Before ending a session, update:

```text
SESSION_LOG.md
```

with:

- current state,
- completed work,
- unfinished work,
- known bugs,
- exact files changed,
- tests run,
- commands run,
- git state,
- next task,
- decisions made.

The next agent must be able to continue without the previous conversation.

---

# 12. OUTPUT FORMAT

Every coding task must finish with:

```markdown
## Status

SUCCESS / PARTIAL / BLOCKED / FAILED

## What changed

- ...

## Root cause

- ...

## Verification

- Command:
- Result:

## Files changed

- ...

## Files intentionally not changed

- ...

## Risks

- ...

## Remaining work

- ...

## SESSION_LOG

Updated / Not updated
```

---

# 13. REVIEW MODE

When asked to review:

DO NOT modify files.

Return:

```markdown
## Verdict

APPROVED / CHANGES REQUESTED

## Findings

### Critical
...

### Important
...

### Minor
...

## Evidence

file:line
...

## Recommendation

...
```

---

# 14. SAFE AUTONOMY

The agent may autonomously:

- inspect files,
- run tests,
- run the local server,
- inspect API responses,
- make small scoped fixes,
- update documentation,
- update session state.

The agent should stop for human approval before:

- deleting archival data,
- changing database schema,
- changing the API contract,
- replacing a framework,
- removing a major subsystem,
- large-scale refactoring,
- changing the project's core UX direction.

---

# 15. SESSION RESUME PROMPT

If the agent is entering an existing session, it should internally reconstruct:

```text
WHERE WERE WE?
WHAT IS WORKING?
WHAT IS BROKEN?
WHAT CHANGED?
WHAT WAS VERIFIED?
WHAT WAS ONLY CLAIMED?
WHAT IS NEXT?
```

Then continue from the answer.

---

# 16. FINAL RULE

The agent is never rewarded for making the most changes.

It is rewarded for making the **correct smallest change while preserving everything that already works**.

---

# END OF AGENT_PLAYBOOK.md