# Findings

## 1. Evals broken — custom channel overwrote default Eve

**Found:** `agent/channels/eve.ts` replaced Eve’s default HTTP channel. Evals call `POST /eve/v1/session`; that route was gone → 404 before any model run.

**Confirmed:** `just evals` → `Cannot find any route matching [POST] .../eve/v1/session`.

**Fixed:** Moved the one-shot API to `agent/channels/review.ts` (`POST /eve/v1/review`). Restored `agent/channels/eve.ts` with `eveChannel()` so session routes work again.

**Why:** Evals need the default Eve channel; the review endpoint should be a separate channel, not an override of `eve`.

## 2. Incomplete review bodies still called the model

**Found:** `POST /eve/v1/review` accepted any non-empty JSON (e.g. only `company_id` + `label`) and ran a full model review.

**Confirmed:** Curl with incomplete body → `200` + agent `reject` (paid tokens).

**Fixed:** `ExpenseSubmissionSchema` (Zod) validates required fields before `send()`. Invalid → `400` + `issues`. Vitest covers schema + HTTP 400 via Supertest.

![Incomplete body rejected with 400](./images/review-validate.png)

**Why:** Reject bad input at the edge; don’t spend model calls on incomplete submissions.

