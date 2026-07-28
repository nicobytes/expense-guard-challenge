// Per-request context for a review: the expense submission plus a few trace-identity
// fields. In production a channel maps the POST body onto the session; in dev / eval it
// loads a representative submission from a fixture (override with POC_REQUEST_FILE).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineState } from "eve/context";
import {
  type tExpenseLineItem,
  type tExpenseSubmission,
} from "./expense.schema.js";

export type { tExpenseLineItem, tExpenseSubmission };

// The per-session projection carried by channel state -> metadata(state). `contextProvided`
// tells "bare request, use fixture" apart from "a body was sent but did not survive the
// projection".
export type tRequestView = {
  request: tExpenseSubmission | null;
  contextProvided: boolean;
};

const FIXTURE_PATH = process.env.POC_REQUEST_FILE ?? join(process.cwd(), "fixtures", "request.json");

export function loadExpenseFixture(): tExpenseSubmission {
  return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as tExpenseSubmission;
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isNonEmptyObject(v: unknown): v is Record<string, unknown> {
  return isPlainObject(v) && Object.keys(v).length > 0;
}

// WRITE side — the channel builds the state to seed from the parsed body. A bare body
// (missing/empty/non-object) -> fixture path (contextProvided:false). A non-empty object
// body IS the submission (contextProvided:true). Callers that accept untrusted HTTP bodies
// should Zod-validate with ExpenseSubmissionSchema before treating the body as a submission.
export function buildRequestView(body: unknown): tRequestView {
  if (isNonEmptyObject(body)) {
    return { request: body as tExpenseSubmission, contextProvided: true };
  }
  return { request: null, contextProvided: false };
}

// READ side — loud fallback: a body was provided but did not reach the resolver via the
// metadata projection -> throw (fail the turn). Silently rendering the fixture would
// review another company's submission. Bare / eval requests -> fixture.
export function resolveExpenseSubmission(
  view: { request?: unknown; contextProvided?: unknown } | undefined,
): tExpenseSubmission {
  if (view?.contextProvided === true) {
    if (isPlainObject(view.request)) return view.request as tExpenseSubmission;
    throw new Error(
      "Per-request expense context was provided but did not reach the resolver via channel " +
        "metadata/state. Refusing to fall back to the fixture — that would review another " +
        "company's submission.",
    );
  }
  return loadExpenseFixture();
}

// The authoritative submission for this turn, seeded by the instructions resolver so
// tools can read the real fields instead of relying on model-provided arguments.
export const submissionState = defineState<tExpenseSubmission | null>(
  "expense-guard.submission",
  () => null,
);
