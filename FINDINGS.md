# Findings

## 1. Evals broken — custom channel overwrote default Eve

**Found:** `agent/channels/eve.ts` replaced Eve’s default HTTP channel. Evals call `POST /eve/v1/session`; that route was gone → 404 before any model run.

**Confirmed:** `just evals` → `Cannot find any route matching [POST] .../eve/v1/session`.

**Fixed:** Moved the one-shot API to `agent/channels/review.ts` (`POST /eve/v1/review`). Restored `agent/channels/eve.ts` with `eveChannel()` so session routes work again.

**Why:** Evals need the default Eve channel; the review endpoint should be a separate channel, not an override of `eve`.
